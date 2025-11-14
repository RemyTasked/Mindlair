/**
 * Level 2 Cue Companion - Audio Analysis Service
 * 
 * Real-time, on-device audio analysis for composure coaching
 * Privacy-first: No recording, no transcription, no cloud processing
 * 
 * Analyzes:
 * - Pace (speaking speed)
 * - Volume (loudness)
 * - Pause rhythm (breathlessness, hesitation)
 * - Energy curve (escalation)
 * - Monologuing (talking too long)
 */

export interface AudioFeatures {
  rms: number;              // Root Mean Square (volume/loudness)
  zcr: number;              // Zero Crossing Rate (voicing indicator)
  pauseRatio: number;       // Ratio of silence to speech
  speechRate: number;       // Estimated syllables per second
  energy: number;           // Overall energy level
  isSpeaking: boolean;      // Voice activity detection
}

export interface UserBaseline {
  avgRMS: number;
  avgSpeechRate: number;
  avgPauseRatio: number;
  avgEnergy: number;
  calibrationComplete: boolean;
  samplesCollected: number;
}

export interface CueTrigger {
  type: 'pace' | 'volume' | 'pause' | 'energy' | 'monologue';
  severity: number;         // 0-1, how far from baseline
  message: string;          // The cue to display
  timestamp: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  
  // Analysis settings
  private readonly SAMPLE_RATE = 16000;
  private readonly FFT_SIZE = 2048;
  private readonly SMOOTHING = 0.8;
  
  // Voice Activity Detection (VAD) thresholds
  private readonly SPEECH_THRESHOLD_RMS = 0.02;  // Minimum RMS to consider speech
  private readonly SILENCE_THRESHOLD_RMS = 0.01;  // Below this is silence
  
  // Baseline learning
  private baseline: UserBaseline = {
    avgRMS: 0,
    avgSpeechRate: 0,
    avgPauseRatio: 0,
    avgEnergy: 0,
    calibrationComplete: false,
    samplesCollected: 0,
  };
  
  private readonly CALIBRATION_SAMPLES = 60; // 60 seconds warmup
  
  // Cue throttling
  private lastCueTime = 0;
  private readonly MIN_CUE_INTERVAL_MS = 30000; // 30 seconds between cues
  private cuesThisMeeting = 0;
  private readonly MAX_CUES_PER_MEETING = 3;
  
  // Callbacks
  private onFeaturesCallback: ((features: AudioFeatures) => void) | null = null;
  private onCueCallback: ((cue: CueTrigger) => void) | null = null;
  
  /**
   * Initialize audio capture and analysis
   */
  async start(): Promise<void> {
    try {
      console.log('🎤 Level 2 Cue Companion: Requesting microphone access...');
      
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // We want to detect natural volume changes
          sampleRate: this.SAMPLE_RATE,
        },
      });
      
      console.log('✅ Microphone access granted');
      
      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
      
      // Create analyser node
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.FFT_SIZE;
      this.analyserNode.smoothingTimeConstant = this.SMOOTHING;
      
      // Connect media stream to analyser
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyserNode);
      
      // Start analysis loop
      this.analyze();
      
      console.log('🎧 Audio analysis started');
    } catch (error) {
      console.error('❌ Failed to start audio analysis:', error);
      throw error;
    }
  }
  
  /**
   * Stop audio capture and analysis
   */
  stop(): void {
    console.log('🛑 Stopping audio analysis...');
    
    // Stop animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Stop media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyserNode = null;
    
    console.log('✅ Audio analysis stopped');
  }
  
  /**
   * Main analysis loop (runs ~60 times per second)
   */
  private analyze(): void {
    if (!this.analyserNode) return;
    
    // Get time-domain data (waveform)
    const bufferLength = this.analyserNode.fftSize;
    const dataArray = new Float32Array(bufferLength);
    this.analyserNode.getFloatTimeDomainData(dataArray);
    
    // Extract features
    const features = this.extractFeatures(dataArray);
    
    // Update baseline during warmup period
    if (!this.baseline.calibrationComplete) {
      this.updateBaseline(features);
    }
    
    // Trigger cues if baseline is ready
    if (this.baseline.calibrationComplete && features.isSpeaking) {
      this.checkForCueTriggers(features);
    }
    
    // Notify listeners
    if (this.onFeaturesCallback) {
      this.onFeaturesCallback(features);
    }
    
    // Schedule next analysis
    this.animationFrameId = requestAnimationFrame(() => this.analyze());
  }
  
  /**
   * Extract audio features from time-domain data
   */
  private extractFeatures(data: Float32Array): AudioFeatures {
    // 1. Calculate RMS (Root Mean Square) - Volume proxy
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      sumSquares += data[i] * data[i];
    }
    const rms = Math.sqrt(sumSquares / data.length);
    
    // 2. Calculate ZCR (Zero Crossing Rate) - Voicing indicator
    let zeroCrossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i - 1] >= 0 && data[i] < 0) || (data[i - 1] < 0 && data[i] >= 0)) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / data.length;
    
    // 3. Voice Activity Detection (simple threshold-based)
    const isSpeaking = rms > this.SPEECH_THRESHOLD_RMS;
    
    // 4. Pause ratio (simplified - actual implementation would track over time)
    const pauseRatio = rms < this.SILENCE_THRESHOLD_RMS ? 1.0 : 0.0;
    
    // 5. Speech rate estimation (very rough - counts energy peaks as syllable proxy)
    let peaks = 0;
    const peakThreshold = rms * 0.7;
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > peakThreshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
        peaks++;
      }
    }
    // Normalize to syllables per second (very rough approximation)
    const speechRate = peaks / (data.length / this.SAMPLE_RATE) / 10; // Divided by 10 for scaling
    
    // 6. Overall energy
    const energy = rms * 100; // Scale for easier interpretation
    
    return {
      rms,
      zcr,
      pauseRatio,
      speechRate,
      energy,
      isSpeaking,
    };
  }
  
  /**
   * Update baseline during calibration period
   */
  private updateBaseline(features: AudioFeatures): void {
    if (!features.isSpeaking) return; // Only calibrate during speech
    
    this.baseline.samplesCollected++;
    
    // Running average
    const n = this.baseline.samplesCollected;
    this.baseline.avgRMS = ((this.baseline.avgRMS * (n - 1)) + features.rms) / n;
    this.baseline.avgSpeechRate = ((this.baseline.avgSpeechRate * (n - 1)) + features.speechRate) / n;
    this.baseline.avgPauseRatio = ((this.baseline.avgPauseRatio * (n - 1)) + features.pauseRatio) / n;
    this.baseline.avgEnergy = ((this.baseline.avgEnergy * (n - 1)) + features.energy) / n;
    
    // Check if calibration is complete
    if (this.baseline.samplesCollected >= this.CALIBRATION_SAMPLES) {
      this.baseline.calibrationComplete = true;
      console.log('✅ Baseline calibration complete:', this.baseline);
    }
  }
  
  /**
   * Check if current features warrant a cue
   */
  private checkForCueTriggers(features: AudioFeatures): void {
    // Don't trigger if we've hit the max for this meeting
    if (this.cuesThisMeeting >= this.MAX_CUES_PER_MEETING) return;
    
    // Don't trigger if too soon after last cue
    const now = Date.now();
    if (now - this.lastCueTime < this.MIN_CUE_INTERVAL_MS) return;
    
    // Check for volume spike (getting loud)
    if (features.rms > this.baseline.avgRMS * 1.5) {
      this.triggerCue({
        type: 'volume',
        severity: (features.rms - this.baseline.avgRMS) / this.baseline.avgRMS,
        message: 'Softer tone',
        timestamp: now,
      });
      return;
    }
    
    // Check for pace spike (speaking too fast)
    if (features.speechRate > this.baseline.avgSpeechRate * 1.4) {
      this.triggerCue({
        type: 'pace',
        severity: (features.speechRate - this.baseline.avgSpeechRate) / this.baseline.avgSpeechRate,
        message: 'Slow your pace',
        timestamp: now,
      });
      return;
    }
    
    // Check for insufficient pauses (breathless)
    if (features.pauseRatio < this.baseline.avgPauseRatio * 0.5) {
      this.triggerCue({
        type: 'pause',
        severity: 1 - (features.pauseRatio / this.baseline.avgPauseRatio),
        message: 'Add a pause',
        timestamp: now,
      });
      return;
    }
    
    // Note: Monologue detection and energy curve tracking would require
    // time-series analysis over multiple seconds - to be implemented in Phase 7
  }
  
  /**
   * Trigger a cue
   */
  private triggerCue(cue: CueTrigger): void {
    this.lastCueTime = cue.timestamp;
    this.cuesThisMeeting++;
    
    console.log(`💡 Level 2 Cue (${this.cuesThisMeeting}/${this.MAX_CUES_PER_MEETING}):`, cue.message);
    
    if (this.onCueCallback) {
      this.onCueCallback(cue);
    }
  }
  
  /**
   * Register callback for feature updates
   */
  onFeatures(callback: (features: AudioFeatures) => void): void {
    this.onFeaturesCallback = callback;
  }
  
  /**
   * Register callback for cue triggers
   */
  onCue(callback: (cue: CueTrigger) => void): void {
    this.onCueCallback = callback;
  }
  
  /**
   * Get current baseline
   */
  getBaseline(): UserBaseline {
    return { ...this.baseline };
  }
  
  /**
   * Reset for new meeting
   */
  reset(): void {
    this.baseline = {
      avgRMS: 0,
      avgSpeechRate: 0,
      avgPauseRatio: 0,
      avgEnergy: 0,
      calibrationComplete: false,
      samplesCollected: 0,
    };
    this.lastCueTime = 0;
    this.cuesThisMeeting = 0;
    console.log('🔄 Audio analyzer reset for new meeting');
  }
  
  /**
   * Check if browser supports audio analysis
   */
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.AudioContext
    );
  }
}

// Singleton instance
let analyzerInstance: AudioAnalyzer | null = null;

export function getAudioAnalyzer(): AudioAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new AudioAnalyzer();
  }
  return analyzerInstance;
}

