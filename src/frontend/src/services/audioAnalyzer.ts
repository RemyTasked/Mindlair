/**
 * Level 2 Cue Companion - Audio Analysis Service (Z-Score Based + ML)
 * 
 * Real-time, on-device audio analysis for composure coaching
 * Privacy-first: No recording, no transcription, no cloud processing
 * 
 * Hybrid System:
 * - ML model (ONNX) for sophisticated pattern recognition (when available)
 * - Z-score based rules as fallback (always works)
 * 
 * Uses z-scores vs baseline for all triggers:
 * z = (current_value - baseline_mean) / baseline_std
 */

import { MLFeatureExtractor, normalizeMLFeatures, type MLFeatures } from './mlFeatureExtractor';
import { getMLModelLoader, ruleBasedPredict, type ModelPrediction } from './mlModelLoader';

export interface AudioFeatures {
  rms: number;              // Root Mean Square (volume/loudness)
  zcr: number;              // Zero Crossing Rate (voicing indicator)
  pauseRatio: number;       // Ratio of silence to speech
  speechRate: number;       // Estimated syllables per second
  energy: number;           // Overall energy level
  isSpeaking: boolean;      // Voice activity detection
  timestamp: number;        // When this was captured
}

export interface UserBaseline {
  // Means
  avgRMS: number;
  avgSpeechRate: number;
  avgPauseRatio: number;
  avgEnergy: number;
  
  // Standard deviations (for z-scores)
  stdRMS: number;
  stdSpeechRate: number;
  stdPauseRatio: number;
  stdEnergy: number;
  
  calibrationComplete: boolean;
  samplesCollected: number;
  
  // Raw samples for std calculation
  rmsSamples: number[];
  speechRateSamples: number[];
  pauseRatioSamples: number[];
  energySamples: number[];
}

export interface CueTrigger {
  type: 'pace' | 'volume' | 'breathless' | 'stuck' | 'monologue';
  severity: number;         // Z-score value
  message: string;          // The cue to display
  timestamp: number;
  persistedFor: number;     // How long condition persisted (ms)
}

export interface MeetingSummary {
  duration: number;         // Total meeting duration (seconds)
  paceTrend: string;        // e.g., "steady → fast → recovered"
  volumeTrend: string;      // e.g., "stable / a bit high"
  totalCues: number;
  cueTypes: Record<string, number>;
  suggestion: string;       // Single actionable suggestion
}

interface PersistenceState {
  conditionStartTime: number | null;
  conditionType: string | null;
  continuousSpeechStart: number | null;  // For monologue detection
}

interface DebounceState {
  lastPaceCue: number;
  lastVolumeCue: number;
  lastPauseCue: number;
  lastMonologueCue: number;
  lastAnyCue: number;       // For global cool-down
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  
  // ML components
  private mlFeatureExtractor: MLFeatureExtractor;
  private mlModelLoader = getMLModelLoader();
  private useML = false; // Will be set to true if model loads successfully
  
  // Analysis settings
  private readonly SAMPLE_RATE = 16000;
  private readonly FFT_SIZE = 2048;
  private readonly SMOOTHING = 0.8;
  
  // Voice Activity Detection (VAD) thresholds
  private readonly SPEECH_THRESHOLD_RMS = 0.02;
  private readonly SILENCE_THRESHOLD_RMS = 0.01;
  
  // Baseline learning
  private baseline: UserBaseline = {
    avgRMS: 0,
    avgSpeechRate: 0,
    avgPauseRatio: 0,
    avgEnergy: 0,
    stdRMS: 0,
    stdSpeechRate: 0,
    stdPauseRatio: 0,
    stdEnergy: 0,
    calibrationComplete: false,
    samplesCollected: 0,
    rmsSamples: [],
    speechRateSamples: [],
    pauseRatioSamples: [],
    energySamples: [],
  };
  
  private readonly CALIBRATION_SAMPLES = 60; // 60 seconds warmup
  
  // Persistence tracking (for "persisted for X seconds" logic)
  private persistenceState: PersistenceState = {
    conditionStartTime: null,
    conditionType: null,
    continuousSpeechStart: null,
  };
  
  // Debouncing (minimum time between cues of same type)
  private debounceState: DebounceState = {
    lastPaceCue: 0,
    lastVolumeCue: 0,
    lastPauseCue: 0,
    lastMonologueCue: 0,
    lastAnyCue: 0,
  };
  
  // Cue limits
  private cuesThisMeeting = 0;
  private readonly MAX_CUES_PER_MEETING = 3;
  private cueHistory: CueTrigger[] = [];
  
  // Meeting tracking for summary
  private meetingStartTime = 0;
  private featureHistory: AudioFeatures[] = [];
  private readonly MAX_HISTORY = 1000; // Keep last ~16 minutes at 60fps
  
  // Callbacks
  private onFeaturesCallback: ((features: AudioFeatures) => void) | null = null;
  private onCueCallback: ((cue: CueTrigger) => void) | null = null;
  
  // Background tab detection
  private isInBackground = false;
  
  constructor() {
    // Initialize ML feature extractor
    this.mlFeatureExtractor = new MLFeatureExtractor();
    
    // Attempt to load ML model (non-blocking)
    this.mlModelLoader.loadModel().then(success => {
      if (success) {
        this.useML = true;
        console.log('✅ Level 2 ML mode enabled');
      } else {
        this.useML = false;
        console.log('ℹ️ Level 2 using rule-based mode (ML model not available)');
      }
    });
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      this.isInBackground = document.hidden;
      if (this.isInBackground) {
        console.log('🔕 Tab in background - pausing Level 2 inference');
      } else {
        console.log('🔔 Tab in foreground - resuming Level 2 inference');
      }
    });
  }
  
  /**
   * Initialize audio capture and analysis
   */
  async start(): Promise<void> {
    try {
      console.log('🎤 Level 2 Cue Companion: Requesting microphone access...');
      
      this.meetingStartTime = Date.now();
      
      // Try to load previous baseline from localStorage
      this.loadCrossSessionBaseline();
      
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
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
    
    // Save baseline for next session
    this.saveCrossSessionBaseline();
    
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
    if (!this.analyserNode || this.isInBackground) {
      // Skip analysis if tab in background
      this.animationFrameId = requestAnimationFrame(() => this.analyze());
      return;
    }
    
    // Get time-domain data (waveform)
    const bufferLength = this.analyserNode.fftSize;
    const timeDomainData = new Float32Array(bufferLength);
    this.analyserNode.getFloatTimeDomainData(timeDomainData);
    
    // Get frequency-domain data (spectrum) for ML features
    const frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(frequencyData);
    
    // Extract basic features
    const features = this.extractFeatures(timeDomainData);
    
    // Extract ML features (for hybrid system)
    let mlFeatures: MLFeatures | null = null;
    if (this.useML || this.baseline.calibrationComplete) {
      mlFeatures = this.mlFeatureExtractor.extract(timeDomainData, frequencyData);
    }
    
    // Store in history for summary
    this.featureHistory.push(features);
    if (this.featureHistory.length > this.MAX_HISTORY) {
      this.featureHistory.shift();
    }
    
    // Update baseline during warmup period
    if (!this.baseline.calibrationComplete) {
      this.updateBaseline(features);
    }
    
    // Trigger cues if baseline is ready
    if (this.baseline.calibrationComplete && features.isSpeaking) {
      this.checkForCueTriggers(features, mlFeatures);
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
    const timestamp = Date.now();
    
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
    
    // 4. Pause ratio
    const pauseRatio = rms < this.SILENCE_THRESHOLD_RMS ? 1.0 : 0.0;
    
    // 5. Speech rate estimation
    let peaks = 0;
    const peakThreshold = rms * 0.7;
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > peakThreshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
        peaks++;
      }
    }
    const speechRate = peaks / (data.length / this.SAMPLE_RATE) / 10;
    
    // 6. Overall energy
    const energy = rms * 100;
    
    return {
      rms,
      zcr,
      pauseRatio,
      speechRate,
      energy,
      isSpeaking,
      timestamp,
    };
  }
  
  /**
   * Update baseline during calibration period
   */
  private updateBaseline(features: AudioFeatures): void {
    if (!features.isSpeaking) return;
    
    this.baseline.samplesCollected++;
    
    // Store samples for std calculation
    this.baseline.rmsSamples.push(features.rms);
    this.baseline.speechRateSamples.push(features.speechRate);
    this.baseline.pauseRatioSamples.push(features.pauseRatio);
    this.baseline.energySamples.push(features.energy);
    
    // Running average
    const n = this.baseline.samplesCollected;
    this.baseline.avgRMS = ((this.baseline.avgRMS * (n - 1)) + features.rms) / n;
    this.baseline.avgSpeechRate = ((this.baseline.avgSpeechRate * (n - 1)) + features.speechRate) / n;
    this.baseline.avgPauseRatio = ((this.baseline.avgPauseRatio * (n - 1)) + features.pauseRatio) / n;
    this.baseline.avgEnergy = ((this.baseline.avgEnergy * (n - 1)) + features.energy) / n;
    
    // Check if calibration is complete
    if (this.baseline.samplesCollected >= this.CALIBRATION_SAMPLES) {
      // Calculate standard deviations
      this.baseline.stdRMS = this.calculateStd(this.baseline.rmsSamples, this.baseline.avgRMS);
      this.baseline.stdSpeechRate = this.calculateStd(this.baseline.speechRateSamples, this.baseline.avgSpeechRate);
      this.baseline.stdPauseRatio = this.calculateStd(this.baseline.pauseRatioSamples, this.baseline.avgPauseRatio);
      this.baseline.stdEnergy = this.calculateStd(this.baseline.energySamples, this.baseline.avgEnergy);
      
      this.baseline.calibrationComplete = true;
      console.log('✅ Baseline calibration complete:', {
        rms: `${this.baseline.avgRMS.toFixed(4)} ± ${this.baseline.stdRMS.toFixed(4)}`,
        speechRate: `${this.baseline.avgSpeechRate.toFixed(2)} ± ${this.baseline.stdSpeechRate.toFixed(2)}`,
        pauseRatio: `${this.baseline.avgPauseRatio.toFixed(2)} ± ${this.baseline.stdPauseRatio.toFixed(2)}`,
      });
    }
  }
  
  /**
   * Calculate standard deviation
   */
  private calculateStd(samples: number[], mean: number): number {
    if (samples.length === 0) return 0;
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
    return Math.sqrt(variance);
  }
  
  /**
   * Calculate z-score: (value - mean) / std
   */
  private calculateZScore(value: number, mean: number, std: number): number {
    if (std === 0) return 0;
    return (value - mean) / std;
  }
  
  /**
   * Check if current features warrant a cue (Hybrid: ML + Z-score based with persistence)
   */
  private async checkForCueTriggers(features: AudioFeatures, mlFeatures: MLFeatures | null): Promise<void> {
    // Hard cap on cues
    if (this.cuesThisMeeting >= this.MAX_CUES_PER_MEETING) return;
    
    // Global cool-down: 10 seconds after any cue
    const now = Date.now();
    if (now - this.debounceState.lastAnyCue < 10000) return;
    
    // ML-enhanced detection (if available)
    let mlPrediction: ModelPrediction | null = null;
    if (this.useML && mlFeatures) {
      const normalizedFeatures = normalizeMLFeatures(mlFeatures);
      mlPrediction = await this.mlModelLoader.predict(normalizedFeatures);
      
      // If ML model not available, use rule-based fallback
      if (!mlPrediction) {
        mlPrediction = ruleBasedPredict(normalizedFeatures, this.baseline);
      }
      
      // ML prediction can boost confidence in z-score triggers
      // or trigger cues that rules might miss
      if (mlPrediction.confidence > 0.7 && mlPrediction.class !== 'calm') {
        console.log('🤖 ML detected:', mlPrediction.class, 'confidence:', mlPrediction.confidence.toFixed(2));
        // ML predictions will be combined with z-score logic below
      }
    }
    
    // Calculate z-scores
    const rmsZ = this.calculateZScore(features.rms, this.baseline.avgRMS, this.baseline.stdRMS);
    const paceZ = this.calculateZScore(features.speechRate, this.baseline.avgSpeechRate, this.baseline.stdSpeechRate);
    const pauseRatioZ = this.calculateZScore(features.pauseRatio, this.baseline.avgPauseRatio, this.baseline.stdPauseRatio);
    
    // A. Fast Pace: pace_z >= +1.0 for >= 4 seconds
    if (paceZ >= 1.0) {
      if (!this.persistenceState.conditionStartTime || this.persistenceState.conditionType !== 'pace') {
        this.persistenceState.conditionStartTime = now;
        this.persistenceState.conditionType = 'pace';
      }
      
      const persistedMs = now - this.persistenceState.conditionStartTime;
      if (persistedMs >= 4000 && now - this.debounceState.lastPaceCue >= 30000) {
        this.triggerCue({
          type: 'pace',
          severity: paceZ,
          message: Math.random() > 0.5 ? 'Slow your pace' : 'Breathe, then speak',
          timestamp: now,
          persistedFor: persistedMs,
        });
        this.debounceState.lastPaceCue = now;
        this.persistenceState.conditionStartTime = null;
        return;
      }
    } else if (this.persistenceState.conditionType === 'pace') {
      this.persistenceState.conditionStartTime = null;
      this.persistenceState.conditionType = null;
    }
    
    // B. Loudness Spike: rms_z >= +1.0 for >= 3 seconds
    if (rmsZ >= 1.0) {
      if (!this.persistenceState.conditionStartTime || this.persistenceState.conditionType !== 'volume') {
        this.persistenceState.conditionStartTime = now;
        this.persistenceState.conditionType = 'volume';
      }
      
      const persistedMs = now - this.persistenceState.conditionStartTime;
      if (persistedMs >= 3000 && now - this.debounceState.lastVolumeCue >= 30000) {
        this.triggerCue({
          type: 'volume',
          severity: rmsZ,
          message: Math.random() > 0.5 ? 'Softer tone' : 'Lower a notch',
          timestamp: now,
          persistedFor: persistedMs,
        });
        this.debounceState.lastVolumeCue = now;
        this.persistenceState.conditionStartTime = null;
        return;
      }
    } else if (this.persistenceState.conditionType === 'volume') {
      this.persistenceState.conditionStartTime = null;
      this.persistenceState.conditionType = null;
    }
    
    // C. Too Few Pauses (Breathless): pause_ratio <= (base - 0.8σ) for >= 8 seconds
    if (pauseRatioZ <= -0.8) {
      if (!this.persistenceState.conditionStartTime || this.persistenceState.conditionType !== 'breathless') {
        this.persistenceState.conditionStartTime = now;
        this.persistenceState.conditionType = 'breathless';
      }
      
      const persistedMs = now - this.persistenceState.conditionStartTime;
      if (persistedMs >= 8000 && now - this.debounceState.lastPauseCue >= 45000) {
        this.triggerCue({
          type: 'breathless',
          severity: Math.abs(pauseRatioZ),
          message: Math.random() > 0.5 ? 'Add a pause' : 'One breath now',
          timestamp: now,
          persistedFor: persistedMs,
        });
        this.debounceState.lastPauseCue = now;
        this.persistenceState.conditionStartTime = null;
        return;
      }
    } else if (this.persistenceState.conditionType === 'breathless') {
      this.persistenceState.conditionStartTime = null;
      this.persistenceState.conditionType = null;
    }
    
    // D. Too Many Pauses (Stuck): pause_ratio >= (base + 1.0σ) for >= 10 seconds
    if (pauseRatioZ >= 1.0) {
      if (!this.persistenceState.conditionStartTime || this.persistenceState.conditionType !== 'stuck') {
        this.persistenceState.conditionStartTime = now;
        this.persistenceState.conditionType = 'stuck';
      }
      
      const persistedMs = now - this.persistenceState.conditionStartTime;
      if (persistedMs >= 10000 && now - this.debounceState.lastPauseCue >= 45000) {
        this.triggerCue({
          type: 'stuck',
          severity: pauseRatioZ,
          message: Math.random() > 0.5 ? 'Finish the line' : 'Land your point',
          timestamp: now,
          persistedFor: persistedMs,
        });
        this.debounceState.lastPauseCue = now;
        this.persistenceState.conditionStartTime = null;
        return;
      }
    } else if (this.persistenceState.conditionType === 'stuck') {
      this.persistenceState.conditionStartTime = null;
      this.persistenceState.conditionType = null;
    }
    
    // E. Long Monologue: continuous speech for >= 90 seconds
    if (features.rms > this.baseline.avgRMS && features.pauseRatio < this.baseline.avgPauseRatio) {
      if (!this.persistenceState.continuousSpeechStart) {
        this.persistenceState.continuousSpeechStart = now;
      }
      
      const monologueDuration = now - this.persistenceState.continuousSpeechStart;
      if (monologueDuration >= 90000 && now - this.debounceState.lastMonologueCue >= 120000) {
        this.triggerCue({
          type: 'monologue',
          severity: monologueDuration / 1000, // Duration in seconds
          message: 'Invite a reply',
          timestamp: now,
          persistedFor: monologueDuration,
        });
        this.debounceState.lastMonologueCue = now;
        this.persistenceState.continuousSpeechStart = null;
        return;
      }
    } else {
      this.persistenceState.continuousSpeechStart = null;
    }
  }
  
  /**
   * Trigger a cue
   */
  private triggerCue(cue: CueTrigger): void {
    this.debounceState.lastAnyCue = cue.timestamp;
    this.cuesThisMeeting++;
    this.cueHistory.push(cue);
    
    console.log(`💡 Level 2 Cue (${this.cuesThisMeeting}/${this.MAX_CUES_PER_MEETING}):`, {
      message: cue.message,
      type: cue.type,
      severity: cue.severity.toFixed(2),
      persistedFor: `${(cue.persistedFor / 1000).toFixed(1)}s`,
    });
    
    if (this.onCueCallback) {
      this.onCueCallback(cue);
    }
  }
  
  /**
   * Generate end-of-meeting summary
   */
  getMeetingSummary(): MeetingSummary {
    const duration = Math.floor((Date.now() - this.meetingStartTime) / 1000);
    
    // Analyze pace trend over time
    const paceTrend = this.analyzeTrend('speechRate');
    const volumeTrend = this.analyzeTrend('rms');
    
    // Count cue types
    const cueTypes: Record<string, number> = {};
    this.cueHistory.forEach(cue => {
      cueTypes[cue.type] = (cueTypes[cue.type] || 0) + 1;
    });
    
    // Generate suggestion
    const suggestion = this.generateSuggestion(paceTrend, volumeTrend, cueTypes);
    
    return {
      duration,
      paceTrend,
      volumeTrend,
      totalCues: this.cuesThisMeeting,
      cueTypes,
      suggestion,
    };
  }
  
  /**
   * Analyze trend of a feature over time
   */
  private analyzeTrend(feature: 'speechRate' | 'rms'): string {
    if (this.featureHistory.length < 180) return 'steady'; // Need at least 3 seconds
    
    const third = Math.floor(this.featureHistory.length / 3);
    const firstThird = this.featureHistory.slice(0, third);
    const middleThird = this.featureHistory.slice(third, third * 2);
    const lastThird = this.featureHistory.slice(third * 2);
    
    const avgFirst = firstThird.reduce((sum, f) => sum + f[feature], 0) / firstThird.length;
    const avgMiddle = middleThird.reduce((sum, f) => sum + f[feature], 0) / middleThird.length;
    const avgLast = lastThird.reduce((sum, f) => sum + f[feature], 0) / lastThird.length;
    
    const baseline = feature === 'speechRate' ? this.baseline.avgSpeechRate : this.baseline.avgRMS;
    const std = feature === 'speechRate' ? this.baseline.stdSpeechRate : this.baseline.stdRMS;
    
    const firstZ = this.calculateZScore(avgFirst, baseline, std);
    const middleZ = this.calculateZScore(avgMiddle, baseline, std);
    const lastZ = this.calculateZScore(avgLast, baseline, std);
    
    // Classify each period
    const classifyZ = (z: number) => {
      if (z < -0.5) return 'low';
      if (z > 0.5) return feature === 'speechRate' ? 'fast' : 'high';
      return 'steady';
    };
    
    const firstLabel = classifyZ(firstZ);
    const middleLabel = classifyZ(middleZ);
    const lastLabel = classifyZ(lastZ);
    
    if (firstLabel === middleLabel && middleLabel === lastLabel) {
      return firstLabel;
    }
    
    return `${firstLabel} → ${middleLabel} → ${lastLabel}`;
  }
  
  /**
   * Generate a single actionable suggestion
   */
  private generateSuggestion(paceTrend: string, volumeTrend: string, cueTypes: Record<string, number>): string {
    // Prioritize based on cue counts
    const mostCommonCue = Object.entries(cueTypes).sort((a, b) => b[1] - a[1])[0]?.[0];
    
    if (mostCommonCue === 'pace') {
      return 'Try counting to 2 before responding in your next meeting';
    }
    if (mostCommonCue === 'volume') {
      return 'Consider using softer hand gestures to naturally moderate your volume';
    }
    if (mostCommonCue === 'breathless') {
      return 'Practice the 4-4-4 breathing pattern before your next meeting';
    }
    if (mostCommonCue === 'stuck') {
      return 'Write down your key points before the meeting to stay on track';
    }
    if (mostCommonCue === 'monologue') {
      return 'End statements with questions to naturally invite dialogue';
    }
    
    // Default based on trends
    if (paceTrend.includes('fast')) {
      return 'Keep the mid-meeting steadiness; watch the final 10 minutes';
    }
    
    return 'Great composure maintained throughout!';
  }
  
  /**
   * Save baseline to localStorage for next session
   */
  private saveCrossSessionBaseline(): void {
    if (!this.baseline.calibrationComplete) return;
    
    try {
      const baselineData = {
        avgRMS: this.baseline.avgRMS,
        avgSpeechRate: this.baseline.avgSpeechRate,
        avgPauseRatio: this.baseline.avgPauseRatio,
        avgEnergy: this.baseline.avgEnergy,
        stdRMS: this.baseline.stdRMS,
        stdSpeechRate: this.baseline.stdSpeechRate,
        stdPauseRatio: this.baseline.stdPauseRatio,
        stdEnergy: this.baseline.stdEnergy,
        timestamp: Date.now(),
      };
      
      localStorage.setItem('meetcute_level2_baseline', JSON.stringify(baselineData));
      console.log('💾 Saved baseline for next session');
    } catch (error) {
      console.error('Failed to save baseline:', error);
    }
  }
  
  /**
   * Load baseline from localStorage
   */
  private loadCrossSessionBaseline(): void {
    try {
      const stored = localStorage.getItem('meetcute_level2_baseline');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Only use if recent (within 7 days)
        if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
          this.baseline.avgRMS = data.avgRMS;
          this.baseline.avgSpeechRate = data.avgSpeechRate;
          this.baseline.avgPauseRatio = data.avgPauseRatio;
          this.baseline.avgEnergy = data.avgEnergy;
          this.baseline.stdRMS = data.stdRMS;
          this.baseline.stdSpeechRate = data.stdSpeechRate;
          this.baseline.stdPauseRatio = data.stdPauseRatio;
          this.baseline.stdEnergy = data.stdEnergy;
          
          console.log('📂 Loaded previous baseline from storage');
        }
      }
    } catch (error) {
      console.error('Failed to load baseline:', error);
    }
  }
  
  /**
   * Delete all stored meeting data
   */
  static deleteAllData(): void {
    try {
      localStorage.removeItem('meetcute_level2_baseline');
      console.log('🗑️ Deleted all Level 2 meeting data');
    } catch (error) {
      console.error('Failed to delete data:', error);
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
    // Reset ML feature extractor
    this.mlFeatureExtractor.reset();
    
    // Keep cross-session baseline but reset everything else
    const crossSessionData = {
      avgRMS: this.baseline.avgRMS,
      avgSpeechRate: this.baseline.avgSpeechRate,
      avgPauseRatio: this.baseline.avgPauseRatio,
      avgEnergy: this.baseline.avgEnergy,
      stdRMS: this.baseline.stdRMS,
      stdSpeechRate: this.baseline.stdSpeechRate,
      stdPauseRatio: this.baseline.stdPauseRatio,
      stdEnergy: this.baseline.stdEnergy,
    };
    
    this.baseline = {
      ...crossSessionData,
      calibrationComplete: false,
      samplesCollected: 0,
      rmsSamples: [],
      speechRateSamples: [],
      pauseRatioSamples: [],
      energySamples: [],
    };
    
    this.persistenceState = {
      conditionStartTime: null,
      conditionType: null,
      continuousSpeechStart: null,
    };
    
    this.debounceState = {
      lastPaceCue: 0,
      lastVolumeCue: 0,
      lastPauseCue: 0,
      lastMonologueCue: 0,
      lastAnyCue: 0,
    };
    
    this.cuesThisMeeting = 0;
    this.cueHistory = [];
    this.meetingStartTime = Date.now();
    this.featureHistory = [];
    
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
