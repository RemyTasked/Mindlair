/**
 * Adaptive Learning System for Level 2 Cue Companion
 * 
 * Tracks user patterns over time and adapts the system to be more helpful:
 * - Learns which cues are most effective
 * - Predicts when spikes are likely to occur
 * - Adjusts thresholds based on user's natural patterns
 * - Considers meeting context (time of day, duration, type)
 * 
 * Privacy: All data stored locally in localStorage, never uploaded
 */

import type { CueTrigger } from './audioAnalyzer';

export interface MeetingContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: 'weekday' | 'weekend';
  duration: number;           // Expected duration in minutes
  meetingType?: 'presentation' | '1-on-1' | 'team' | 'external';
}

export interface CueEffectiveness {
  cueType: string;
  timesShown: number;
  timesDismissed: number;     // User manually dismissed
  timesHelped: number;        // Inferred from behavior after cue
  averageImpact: number;      // 0-1 score of how much it helped
  lastShown: number;          // Timestamp
}

export interface UserPattern {
  // Spike tendencies
  paceSpikeTimes: number[];   // Minutes into meeting when pace spikes occur
  volumeSpikeTimes: number[];
  breathlessTimes: number[];
  
  // Context patterns
  morningTendency: 'calm' | 'rushed' | 'tired' | 'energetic' | 'variable';
  afternoonTendency: 'calm' | 'rushed' | 'tired' | 'energetic' | 'variable';
  eveningTendency: 'calm' | 'rushed' | 'tired' | 'energetic' | 'variable';
  
  // Meeting type patterns
  presentationStress: number; // 0-1 score
  oneOnOneComfort: number;
  teamMeetingEnergy: number;
  
  // Threshold adjustments
  paceThresholdMultiplier: number;    // 1.0 = default, >1.0 = more lenient
  volumeThresholdMultiplier: number;
  pauseThresholdMultiplier: number;
  
  // Learning metadata
  totalMeetings: number;
  totalCuesReceived: number;
  lastUpdated: number;
}

export interface SpikePrediction {
  type: 'pace' | 'volume' | 'breathless';
  probability: number;        // 0-1
  expectedTime: number;       // Minutes into meeting
  confidence: number;         // 0-1 based on historical data
  reason: string;             // Human-readable explanation
}

export class AdaptiveLearningSystem {
  private readonly STORAGE_KEY = 'meetcute_adaptive_learning';
  private readonly CUE_EFFECTIVENESS_KEY = 'meetcute_cue_effectiveness';
  
  private userPattern: UserPattern;
  private cueEffectiveness: Map<string, CueEffectiveness> = new Map();
  private currentMeetingContext: MeetingContext | null = null;
  private currentMeetingStartTime = 0;
  private currentMeetingCues: CueTrigger[] = [];
  
  constructor() {
    this.userPattern = this.loadUserPattern();
    this.loadCueEffectiveness();
  }
  
  /**
   * Load user pattern from localStorage
   */
  private loadUserPattern(): UserPattern {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        console.log('📂 Loaded adaptive learning data:', {
          totalMeetings: data.totalMeetings,
          totalCues: data.totalCuesReceived,
        });
        return data;
      }
    } catch (error) {
      console.error('Failed to load adaptive learning data:', error);
    }
    
    // Default pattern
    return {
      paceSpikeTimes: [],
      volumeSpikeTimes: [],
      breathlessTimes: [],
      morningTendency: 'variable',
      afternoonTendency: 'variable',
      eveningTendency: 'variable',
      presentationStress: 0.5,
      oneOnOneComfort: 0.7,
      teamMeetingEnergy: 0.6,
      paceThresholdMultiplier: 1.0,
      volumeThresholdMultiplier: 1.0,
      pauseThresholdMultiplier: 1.0,
      totalMeetings: 0,
      totalCuesReceived: 0,
      lastUpdated: Date.now(),
    };
  }
  
  /**
   * Load cue effectiveness from localStorage
   */
  private loadCueEffectiveness(): void {
    try {
      const stored = localStorage.getItem(this.CUE_EFFECTIVENESS_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.cueEffectiveness = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load cue effectiveness:', error);
    }
  }
  
  /**
   * Save user pattern to localStorage
   */
  private saveUserPattern(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.userPattern));
    } catch (error) {
      console.error('Failed to save adaptive learning data:', error);
    }
  }
  
  /**
   * Save cue effectiveness to localStorage
   */
  private saveCueEffectiveness(): void {
    try {
      const data = Object.fromEntries(this.cueEffectiveness);
      localStorage.setItem(this.CUE_EFFECTIVENESS_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save cue effectiveness:', error);
    }
  }
  
  /**
   * Start a new meeting session
   */
  startMeeting(context: MeetingContext): void {
    this.currentMeetingContext = context;
    this.currentMeetingStartTime = Date.now();
    this.currentMeetingCues = [];
    
    console.log('🎯 Adaptive learning: Meeting started', {
      timeOfDay: context.timeOfDay,
      meetingType: context.meetingType,
    });
  }
  
  /**
   * Record a cue that was shown
   */
  recordCue(cue: CueTrigger): void {
    this.currentMeetingCues.push(cue);
    
    // Update cue effectiveness
    const key = cue.type;
    const effectiveness = this.cueEffectiveness.get(key) || {
      cueType: key,
      timesShown: 0,
      timesDismissed: 0,
      timesHelped: 0,
      averageImpact: 0.5,
      lastShown: 0,
    };
    
    effectiveness.timesShown++;
    effectiveness.lastShown = Date.now();
    this.cueEffectiveness.set(key, effectiveness);
    
    // Record spike time (minutes into meeting)
    const minutesIntoMeeting = (Date.now() - this.currentMeetingStartTime) / 60000;
    
    if (cue.type === 'pace') {
      this.userPattern.paceSpikeTimes.push(minutesIntoMeeting);
    } else if (cue.type === 'volume') {
      this.userPattern.volumeSpikeTimes.push(minutesIntoMeeting);
    } else if (cue.type === 'breathless') {
      this.userPattern.breathlessTimes.push(minutesIntoMeeting);
    }
    
    // Keep only last 100 spike times
    if (this.userPattern.paceSpikeTimes.length > 100) {
      this.userPattern.paceSpikeTimes.shift();
    }
    if (this.userPattern.volumeSpikeTimes.length > 100) {
      this.userPattern.volumeSpikeTimes.shift();
    }
    if (this.userPattern.breathlessTimes.length > 100) {
      this.userPattern.breathlessTimes.shift();
    }
    
    this.saveCueEffectiveness();
    this.saveUserPattern();
  }
  
  /**
   * Record that a cue was manually dismissed
   */
  recordCueDismissed(cueType: string): void {
    const effectiveness = this.cueEffectiveness.get(cueType);
    if (effectiveness) {
      effectiveness.timesDismissed++;
      
      // Lower average impact if frequently dismissed
      const dismissRate = effectiveness.timesDismissed / effectiveness.timesShown;
      if (dismissRate > 0.5) {
        effectiveness.averageImpact = Math.max(0.2, effectiveness.averageImpact * 0.9);
      }
      
      this.cueEffectiveness.set(cueType, effectiveness);
      this.saveCueEffectiveness();
    }
  }
  
  /**
   * Record that a cue was helpful (inferred from behavior)
   */
  recordCueHelped(cueType: string, impact: number): void {
    const effectiveness = this.cueEffectiveness.get(cueType);
    if (effectiveness) {
      effectiveness.timesHelped++;
      
      // Update running average
      const n = effectiveness.timesHelped;
      effectiveness.averageImpact = ((effectiveness.averageImpact * (n - 1)) + impact) / n;
      
      this.cueEffectiveness.set(cueType, effectiveness);
      this.saveCueEffectiveness();
    }
  }
  
  /**
   * End meeting and update patterns
   */
  endMeeting(summary: { paceTrend: string; volumeTrend: string }): void {
    if (!this.currentMeetingContext) return;
    
    this.userPattern.totalMeetings++;
    this.userPattern.totalCuesReceived += this.currentMeetingCues.length;
    
    // Update time-of-day tendencies
    const { timeOfDay } = this.currentMeetingContext;
    const tendency = this.inferTendency(summary);
    
    if (timeOfDay === 'morning') {
      this.userPattern.morningTendency = tendency;
    } else if (timeOfDay === 'afternoon') {
      this.userPattern.afternoonTendency = tendency;
    } else if (timeOfDay === 'evening') {
      this.userPattern.eveningTendency = tendency;
    }
    
    // Update meeting type patterns
    if (this.currentMeetingContext.meetingType === 'presentation') {
      const stress = this.currentMeetingCues.length / 3; // Normalize to 0-1
      this.userPattern.presentationStress = (this.userPattern.presentationStress + stress) / 2;
    }
    
    // Adjust thresholds based on cue frequency
    this.adjustThresholds();
    
    this.userPattern.lastUpdated = Date.now();
    this.saveUserPattern();
    
    console.log('📊 Adaptive learning: Meeting ended', {
      cuesReceived: this.currentMeetingCues.length,
      totalMeetings: this.userPattern.totalMeetings,
    });
    
    this.currentMeetingContext = null;
  }
  
  /**
   * Infer tendency from meeting summary
   */
  private inferTendency(summary: { paceTrend: string; volumeTrend: string }): 'calm' | 'rushed' | 'tired' | 'energetic' | 'variable' {
    if (summary.paceTrend.includes('fast') || summary.volumeTrend.includes('high')) {
      return 'rushed';
    } else if (summary.paceTrend.includes('slow') || summary.volumeTrend.includes('low')) {
      return 'tired';
    } else if (summary.paceTrend === 'steady' && summary.volumeTrend === 'stable') {
      return 'calm';
    } else {
      return 'variable';
    }
  }
  
  /**
   * Adjust thresholds based on cue frequency
   */
  private adjustThresholds(): void {
    // If user gets too many cues, make thresholds more lenient
    const cuesPerMeeting = this.userPattern.totalCuesReceived / Math.max(this.userPattern.totalMeetings, 1);
    
    if (cuesPerMeeting > 2.5) {
      // Too many cues - make thresholds more lenient
      this.userPattern.paceThresholdMultiplier = Math.min(1.5, this.userPattern.paceThresholdMultiplier * 1.05);
      this.userPattern.volumeThresholdMultiplier = Math.min(1.5, this.userPattern.volumeThresholdMultiplier * 1.05);
      this.userPattern.pauseThresholdMultiplier = Math.min(1.5, this.userPattern.pauseThresholdMultiplier * 1.05);
    } else if (cuesPerMeeting < 1.0) {
      // Too few cues - make thresholds more sensitive
      this.userPattern.paceThresholdMultiplier = Math.max(0.7, this.userPattern.paceThresholdMultiplier * 0.98);
      this.userPattern.volumeThresholdMultiplier = Math.max(0.7, this.userPattern.volumeThresholdMultiplier * 0.98);
      this.userPattern.pauseThresholdMultiplier = Math.max(0.7, this.userPattern.pauseThresholdMultiplier * 0.98);
    }
  }
  
  /**
   * Predict when spikes are likely to occur in current meeting
   */
  predictSpikes(currentMinute: number): SpikePrediction[] {
    const predictions: SpikePrediction[] = [];
    
    if (!this.currentMeetingContext) return predictions;
    
    // Predict pace spikes
    if (this.userPattern.paceSpikeTimes.length >= 3) {
      const avgPaceSpikeTime = this.userPattern.paceSpikeTimes.reduce((sum, t) => sum + t, 0) / this.userPattern.paceSpikeTimes.length;
      const stdDev = Math.sqrt(
        this.userPattern.paceSpikeTimes.reduce((sum, t) => sum + Math.pow(t - avgPaceSpikeTime, 2), 0) / this.userPattern.paceSpikeTimes.length
      );
      
      if (Math.abs(currentMinute - avgPaceSpikeTime) < stdDev) {
        predictions.push({
          type: 'pace',
          probability: 0.7,
          expectedTime: avgPaceSpikeTime,
          confidence: Math.min(this.userPattern.paceSpikeTimes.length / 10, 1.0),
          reason: `You typically speed up around minute ${Math.round(avgPaceSpikeTime)}`,
        });
      }
    }
    
    // Predict volume spikes
    if (this.userPattern.volumeSpikeTimes.length >= 3) {
      const avgVolumeSpikeTime = this.userPattern.volumeSpikeTimes.reduce((sum, t) => sum + t, 0) / this.userPattern.volumeSpikeTimes.length;
      const stdDev = Math.sqrt(
        this.userPattern.volumeSpikeTimes.reduce((sum, t) => sum + Math.pow(t - avgVolumeSpikeTime, 2), 0) / this.userPattern.volumeSpikeTimes.length
      );
      
      if (Math.abs(currentMinute - avgVolumeSpikeTime) < stdDev) {
        predictions.push({
          type: 'volume',
          probability: 0.65,
          expectedTime: avgVolumeSpikeTime,
          confidence: Math.min(this.userPattern.volumeSpikeTimes.length / 10, 1.0),
          reason: `You typically get louder around minute ${Math.round(avgVolumeSpikeTime)}`,
        });
      }
    }
    
    // Context-based predictions
    if (this.currentMeetingContext.timeOfDay === 'afternoon' && this.userPattern.afternoonTendency === 'tired') {
      predictions.push({
        type: 'breathless',
        probability: 0.5,
        expectedTime: currentMinute + 5,
        confidence: 0.6,
        reason: 'Afternoon meetings often lead to breathless speech for you',
      });
    }
    
    return predictions;
  }
  
  /**
   * Get threshold multiplier for a given cue type
   */
  getThresholdMultiplier(type: 'pace' | 'volume' | 'pause'): number {
    if (type === 'pace') return this.userPattern.paceThresholdMultiplier;
    if (type === 'volume') return this.userPattern.volumeThresholdMultiplier;
    if (type === 'pause') return this.userPattern.pauseThresholdMultiplier;
    return 1.0;
  }
  
  /**
   * Get cue effectiveness score (0-1)
   */
  getCueEffectiveness(cueType: string): number {
    const effectiveness = this.cueEffectiveness.get(cueType);
    return effectiveness?.averageImpact ?? 0.5;
  }
  
  /**
   * Get user pattern summary for debugging
   */
  getPatternSummary(): {
    totalMeetings: number;
    averageCuesPerMeeting: number;
    mostEffectiveCue: string;
    leastEffectiveCue: string;
    thresholdAdjustments: {
      pace: number;
      volume: number;
      pause: number;
    };
  } {
    const cuesPerMeeting = this.userPattern.totalCuesReceived / Math.max(this.userPattern.totalMeetings, 1);
    
    let mostEffective = 'none';
    let leastEffective = 'none';
    let maxImpact = 0;
    let minImpact = 1;
    
    this.cueEffectiveness.forEach((eff, type) => {
      if (eff.averageImpact > maxImpact) {
        maxImpact = eff.averageImpact;
        mostEffective = type;
      }
      if (eff.averageImpact < minImpact) {
        minImpact = eff.averageImpact;
        leastEffective = type;
      }
    });
    
    return {
      totalMeetings: this.userPattern.totalMeetings,
      averageCuesPerMeeting: cuesPerMeeting,
      mostEffectiveCue: mostEffective,
      leastEffectiveCue: leastEffective,
      thresholdAdjustments: {
        pace: this.userPattern.paceThresholdMultiplier,
        volume: this.userPattern.volumeThresholdMultiplier,
        pause: this.userPattern.pauseThresholdMultiplier,
      },
    };
  }
  
  /**
   * Reset all adaptive learning data
   */
  static resetAll(): void {
    try {
      localStorage.removeItem('meetcute_adaptive_learning');
      localStorage.removeItem('meetcute_cue_effectiveness');
      console.log('🗑️ Adaptive learning data reset');
    } catch (error) {
      console.error('Failed to reset adaptive learning:', error);
    }
  }
}

// Singleton instance
let adaptiveSystemInstance: AdaptiveLearningSystem | null = null;

export function getAdaptiveLearningSystem(): AdaptiveLearningSystem {
  if (!adaptiveSystemInstance) {
    adaptiveSystemInstance = new AdaptiveLearningSystem();
  }
  return adaptiveSystemInstance;
}

