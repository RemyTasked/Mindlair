/**
 * ML Feature Extractor for Level 2 Cue Companion
 * 
 * Extracts advanced audio features for machine learning models:
 * - MFCCs (Mel-Frequency Cepstral Coefficients)
 * - Spectral features (centroid, rolloff, flux)
 * - Prosodic features (pitch, energy contour)
 * 
 * These features enable more sophisticated pattern recognition than
 * simple RMS/ZCR thresholds.
 */

export interface MLFeatures {
  // MFCCs (13 coefficients)
  mfccs: number[];
  
  // Spectral features
  spectralCentroid: number;    // "Brightness" of sound
  spectralRolloff: number;     // Frequency below which 85% of energy is contained
  spectralFlux: number;        // Rate of change in spectrum
  spectralBandwidth: number;   // Width of the spectrum
  
  // Prosodic features
  pitchEstimate: number;       // Fundamental frequency (F0)
  energyContour: number[];     // Energy over time (for detecting escalation)
  
  // Temporal features
  zeroCrossingRate: number;
  rmsEnergy: number;
  
  // Context (for sequence models)
  timestamp: number;
}

/**
 * Extract MFCCs from frequency domain data
 * 
 * MFCCs are the industry standard for speech/audio ML.
 * They capture the spectral envelope in a compact form.
 */
export class MLFeatureExtractor {
  private readonly NUM_MFCC = 13;
  private readonly NUM_MEL_FILTERS = 26;
  private readonly SAMPLE_RATE = 16000;
  private readonly FFT_SIZE = 2048;
  
  // Mel filter bank (precomputed for efficiency)
  private melFilterBank: number[][] = [];
  
  // Previous spectrum for flux calculation
  private previousSpectrum: Float32Array | null = null;
  
  // Energy history for contour
  private energyHistory: number[] = [];
  private readonly ENERGY_HISTORY_LENGTH = 10; // ~167ms at 60fps
  
  constructor() {
    this.initializeMelFilterBank();
  }
  
  /**
   * Initialize Mel filter bank
   * 
   * Mel scale approximates human perception of pitch.
   * Formula: mel = 2595 * log10(1 + f/700)
   */
  private initializeMelFilterBank(): void {
    const minFreq = 0;
    const maxFreq = this.SAMPLE_RATE / 2;
    
    // Convert to Mel scale
    const minMel = this.hzToMel(minFreq);
    const maxMel = this.hzToMel(maxFreq);
    
    // Create equally spaced points in Mel scale
    const melPoints: number[] = [];
    for (let i = 0; i < this.NUM_MEL_FILTERS + 2; i++) {
      const mel = minMel + (i / (this.NUM_MEL_FILTERS + 1)) * (maxMel - minMel);
      melPoints.push(this.melToHz(mel));
    }
    
    // Convert Mel points to FFT bin indices
    const fftBins = melPoints.map(freq => 
      Math.floor((this.FFT_SIZE + 1) * freq / this.SAMPLE_RATE)
    );
    
    // Create triangular filters
    for (let i = 1; i <= this.NUM_MEL_FILTERS; i++) {
      const filter: number[] = new Array(this.FFT_SIZE / 2 + 1).fill(0);
      
      const left = fftBins[i - 1];
      const center = fftBins[i];
      const right = fftBins[i + 1];
      
      // Rising slope
      for (let j = left; j < center; j++) {
        filter[j] = (j - left) / (center - left);
      }
      
      // Falling slope
      for (let j = center; j < right; j++) {
        filter[j] = (right - j) / (right - center);
      }
      
      this.melFilterBank.push(filter);
    }
  }
  
  /**
   * Convert Hz to Mel scale
   */
  private hzToMel(hz: number): number {
    return 2595 * Math.log10(1 + hz / 700);
  }
  
  /**
   * Convert Mel scale to Hz
   */
  private melToHz(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }
  
  /**
   * Extract all ML features from audio data
   */
  extract(
    timeDomainData: Float32Array,
    frequencyData: Uint8Array
  ): MLFeatures {
    const timestamp = Date.now();
    
    // Convert frequency data to linear scale
    const spectrum = new Float32Array(frequencyData.length);
    for (let i = 0; i < frequencyData.length; i++) {
      // Convert from dB scale (0-255) to linear
      spectrum[i] = Math.pow(10, (frequencyData[i] - 255) / 20);
    }
    
    // 1. Extract MFCCs
    const mfccs = this.extractMFCCs(spectrum);
    
    // 2. Extract spectral features
    const spectralCentroid = this.calculateSpectralCentroid(spectrum);
    const spectralRolloff = this.calculateSpectralRolloff(spectrum);
    const spectralFlux = this.calculateSpectralFlux(spectrum);
    const spectralBandwidth = this.calculateSpectralBandwidth(spectrum, spectralCentroid);
    
    // 3. Extract prosodic features
    const pitchEstimate = this.estimatePitch(timeDomainData);
    const rmsEnergy = this.calculateRMS(timeDomainData);
    
    // Update energy history for contour
    this.energyHistory.push(rmsEnergy);
    if (this.energyHistory.length > this.ENERGY_HISTORY_LENGTH) {
      this.energyHistory.shift();
    }
    const energyContour = [...this.energyHistory];
    
    // 4. Calculate ZCR
    const zeroCrossingRate = this.calculateZCR(timeDomainData);
    
    // Store spectrum for next flux calculation
    this.previousSpectrum = spectrum;
    
    return {
      mfccs,
      spectralCentroid,
      spectralRolloff,
      spectralFlux,
      spectralBandwidth,
      pitchEstimate,
      energyContour,
      zeroCrossingRate,
      rmsEnergy,
      timestamp,
    };
  }
  
  /**
   * Extract MFCCs (Mel-Frequency Cepstral Coefficients)
   */
  private extractMFCCs(spectrum: Float32Array): number[] {
    // 1. Apply Mel filter bank
    const melEnergies: number[] = [];
    for (const filter of this.melFilterBank) {
      let energy = 0;
      for (let i = 0; i < spectrum.length && i < filter.length; i++) {
        energy += spectrum[i] * filter[i];
      }
      melEnergies.push(energy);
    }
    
    // 2. Take log
    const logMelEnergies = melEnergies.map(e => Math.log(Math.max(e, 1e-10)));
    
    // 3. Apply DCT (Discrete Cosine Transform)
    const mfccs: number[] = [];
    for (let i = 0; i < this.NUM_MFCC; i++) {
      let sum = 0;
      for (let j = 0; j < logMelEnergies.length; j++) {
        sum += logMelEnergies[j] * Math.cos((Math.PI * i * (j + 0.5)) / logMelEnergies.length);
      }
      mfccs.push(sum);
    }
    
    return mfccs;
  }
  
  /**
   * Calculate spectral centroid (center of mass of spectrum)
   * Higher values = "brighter" sound
   */
  private calculateSpectralCentroid(spectrum: Float32Array): number {
    let weightedSum = 0;
    let sum = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      weightedSum += i * spectrum[i];
      sum += spectrum[i];
    }
    
    return sum > 0 ? weightedSum / sum : 0;
  }
  
  /**
   * Calculate spectral rolloff (frequency below which 85% of energy is contained)
   * Useful for detecting voiced vs unvoiced speech
   */
  private calculateSpectralRolloff(spectrum: Float32Array): number {
    const totalEnergy = spectrum.reduce((sum, val) => sum + val, 0);
    const threshold = 0.85 * totalEnergy;
    
    let cumulativeEnergy = 0;
    for (let i = 0; i < spectrum.length; i++) {
      cumulativeEnergy += spectrum[i];
      if (cumulativeEnergy >= threshold) {
        return i / spectrum.length;
      }
    }
    
    return 1.0;
  }
  
  /**
   * Calculate spectral flux (rate of change in spectrum)
   * High values indicate rapid changes (e.g., speech onset, emotional shifts)
   */
  private calculateSpectralFlux(spectrum: Float32Array): number {
    if (!this.previousSpectrum) {
      return 0;
    }
    
    let flux = 0;
    const length = Math.min(spectrum.length, this.previousSpectrum.length);
    
    for (let i = 0; i < length; i++) {
      const diff = spectrum[i] - this.previousSpectrum[i];
      flux += diff * diff;
    }
    
    return Math.sqrt(flux / length);
  }
  
  /**
   * Calculate spectral bandwidth (spread of spectrum around centroid)
   */
  private calculateSpectralBandwidth(spectrum: Float32Array, centroid: number): number {
    let sum = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const diff = i - centroid;
      sum += diff * diff * spectrum[i];
      totalEnergy += spectrum[i];
    }
    
    return totalEnergy > 0 ? Math.sqrt(sum / totalEnergy) : 0;
  }
  
  /**
   * Estimate pitch using autocorrelation
   * This is a simplified pitch detector (not perfect, but fast)
   */
  private estimatePitch(timeDomainData: Float32Array): number {
    const minPeriod = Math.floor(this.SAMPLE_RATE / 500); // Max 500 Hz
    const maxPeriod = Math.floor(this.SAMPLE_RATE / 80);  // Min 80 Hz
    
    let bestCorrelation = 0;
    let bestPeriod = 0;
    
    // Autocorrelation
    for (let period = minPeriod; period < maxPeriod; period++) {
      let correlation = 0;
      for (let i = 0; i < timeDomainData.length - period; i++) {
        correlation += timeDomainData[i] * timeDomainData[i + period];
      }
      
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = period;
      }
    }
    
    return bestPeriod > 0 ? this.SAMPLE_RATE / bestPeriod : 0;
  }
  
  /**
   * Calculate RMS energy
   */
  private calculateRMS(data: Float32Array): number {
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      sumSquares += data[i] * data[i];
    }
    return Math.sqrt(sumSquares / data.length);
  }
  
  /**
   * Calculate Zero Crossing Rate
   */
  private calculateZCR(data: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i - 1] >= 0 && data[i] < 0) || (data[i - 1] < 0 && data[i] >= 0)) {
        crossings++;
      }
    }
    return crossings / data.length;
  }
  
  /**
   * Reset state (call when starting new meeting)
   */
  reset(): void {
    this.previousSpectrum = null;
    this.energyHistory = [];
  }
}

/**
 * Normalize ML features for model input
 * 
 * Models expect features in a specific range (usually -1 to 1 or 0 to 1)
 */
export function normalizeMLFeatures(features: MLFeatures): Float32Array {
  // Create feature vector
  const featureVector: number[] = [
    // MFCCs (already somewhat normalized by DCT)
    ...features.mfccs.map(v => v / 100),
    
    // Spectral features (normalize to 0-1 range)
    features.spectralCentroid / 1000,
    features.spectralRolloff,
    features.spectralFlux * 10,
    features.spectralBandwidth / 100,
    
    // Prosodic features
    features.pitchEstimate / 500,
    features.rmsEnergy * 10,
    features.zeroCrossingRate,
    
    // Energy contour (last 5 values for temporal context)
    ...features.energyContour.slice(-5).map(v => v * 10),
  ];
  
  // Pad to fixed length if needed
  while (featureVector.length < 32) {
    featureVector.push(0);
  }
  
  return new Float32Array(featureVector.slice(0, 32));
}

/**
 * Detect emotional escalation from energy contour
 * 
 * Returns a score 0-1 indicating how much energy is rising
 */
export function detectEscalation(energyContour: number[]): number {
  if (energyContour.length < 3) return 0;
  
  let risingCount = 0;
  for (let i = 1; i < energyContour.length; i++) {
    if (energyContour[i] > energyContour[i - 1]) {
      risingCount++;
    }
  }
  
  return risingCount / (energyContour.length - 1);
}

/**
 * Detect breathlessness from spectral features
 * 
 * Breathless speech has:
 * - Higher spectral centroid (more high-frequency energy)
 * - Higher ZCR (more noise-like)
 * - Lower pitch stability
 */
export function detectBreathlessness(features: MLFeatures): number {
  const highCentroid = features.spectralCentroid > 500 ? 0.3 : 0;
  const highZCR = features.zeroCrossingRate > 0.1 ? 0.3 : 0;
  const lowPitch = features.pitchEstimate < 100 ? 0.4 : 0;
  
  return Math.min(highCentroid + highZCR + lowPitch, 1.0);
}

