/**
 * Mind Garden - Micro-Flow Definitions
 * 
 * These are the core wellness flows available in both the Calendar Plugin (extension)
 * and the Web Dashboard. Each flow is designed to be completed in 90 seconds to 3 minutes.
 */

// Flow type identifiers
export type MicroFlowType = 
  | 'pre-meeting-focus'
  | 'pre-presentation-power'
  | 'difficult-conversation-prep'
  | 'quick-reset'
  | 'post-meeting-decompress'
  | 'end-of-day-transition';

// Breathing pattern types
export type BreathingPattern = 
  | 'box'           // 4-4-4-4 (in-hold-out-hold)
  | 'calming'       // 4-6-4-8 (in-hold-out-long-hold)
  | 'energizing'    // 4-2-4-2 (quick, energizing)
  | 'cleansing';    // 4-0-6-0 (in-out focus)

// Spotify mood for each flow
export type SpotifyMood = 
  | 'neutral-instrumental'
  | 'confidence-uplifting'
  | 'calming-reassuring'
  | 'energizing-refresh'
  | 'soothing-release'
  | 'calming-transition';

// Step in a flow
export interface FlowStep {
  id: string;
  type: 'intro' | 'breathing' | 'visualization' | 'body-scan' | 'affirmation' | 'movement' | 'journaling' | 'closing';
  duration: number; // seconds
  text: string;
  guidance?: string; // Audio guidance text
  animation?: 'breathe' | 'expand' | 'pulse' | 'fade' | 'none';
}

// Complete flow definition
export interface MicroFlow {
  id: MicroFlowType;
  name: string;
  shortName: string;
  description: string;
  duration: number; // total seconds
  bestFor: string[]; // Meeting types this is best for
  breathingPattern: BreathingPattern;
  spotifyMood: SpotifyMood;
  steps: FlowStep[];
  benefits: string[];
  icon: string; // emoji
}

// ============================================
// THE 6 CORE MICRO-FLOWS
// ============================================

export const MICRO_FLOWS: Record<MicroFlowType, MicroFlow> = {
  /**
   * 1. PRE-MEETING FOCUS (2 minutes)
   * Box breathing + quick body scan + intention setting
   */
  'pre-meeting-focus': {
    id: 'pre-meeting-focus',
    name: 'Pre-Meeting Focus',
    shortName: 'Focus',
    description: 'Center yourself before any meeting with focused breathing and intention setting.',
    duration: 120, // 2 minutes
    bestFor: ['Standard meetings', 'Check-ins', 'One-on-ones', 'Team syncs'],
    breathingPattern: 'box',
    spotifyMood: 'neutral-instrumental',
    icon: '🎯',
    benefits: ['Increased presence', 'Better listening', 'Clearer thinking'],
    steps: [
      {
        id: 'intro',
        type: 'intro',
        duration: 10,
        text: "Let's take 2 minutes to prepare for this meeting.",
        guidance: "Find a comfortable position. You're about to step into an important moment.",
        animation: 'fade',
      },
      {
        id: 'breathing-1',
        type: 'breathing',
        duration: 32,
        text: 'Box Breathing',
        guidance: 'Breathe in for 4... hold for 4... breathe out for 4... hold for 4.',
        animation: 'breathe',
      },
      {
        id: 'body-scan',
        type: 'body-scan',
        duration: 30,
        text: 'Quick Body Scan',
        guidance: 'Notice any tension in your shoulders, jaw, or hands. Let it soften.',
        animation: 'pulse',
      },
      {
        id: 'breathing-2',
        type: 'breathing',
        duration: 32,
        text: 'Continue Breathing',
        guidance: 'One more round. In... hold... out... hold.',
        animation: 'breathe',
      },
      {
        id: 'intention',
        type: 'visualization',
        duration: 10,
        text: 'Set Your Intention',
        guidance: "What's your focus for this meeting? Hold that intention clearly.",
        animation: 'expand',
      },
      {
        id: 'closing',
        type: 'closing',
        duration: 6,
        text: "You're ready.",
        guidance: 'Enter your meeting with confidence.',
        animation: 'fade',
      },
    ],
  },

  /**
   * 2. PRE-PRESENTATION POWER (3 minutes)
   * Power pose + confidence visualization + voice warm-up + affirmation
   */
  'pre-presentation-power': {
    id: 'pre-presentation-power',
    name: 'Pre-Presentation Power',
    shortName: 'Power Up',
    description: 'Build confidence and presence before presentations, pitches, and speeches.',
    duration: 180, // 3 minutes
    bestFor: ['Presentations', 'Pitches', 'Speeches', 'Demos', 'Interviews'],
    breathingPattern: 'energizing',
    spotifyMood: 'confidence-uplifting',
    icon: '⚡',
    benefits: ['Increased confidence', 'Better projection', 'Reduced anxiety'],
    steps: [
      {
        id: 'intro',
        type: 'intro',
        duration: 10,
        text: "Let's build your presence for this moment.",
        guidance: "Stand tall if you can. You have something valuable to share.",
        animation: 'expand',
      },
      {
        id: 'power-pose',
        type: 'movement',
        duration: 40,
        text: 'Power Pose',
        guidance: 'Stand with feet shoulder-width apart, hands on hips or raised. Expand your body. Take up space.',
        animation: 'expand',
      },
      {
        id: 'breathing',
        type: 'breathing',
        duration: 32,
        text: 'Energizing Breath',
        guidance: 'Quick, energizing breaths. In for 4... quick hold... out for 4... quick hold.',
        animation: 'breathe',
      },
      {
        id: 'visualization',
        type: 'visualization',
        duration: 40,
        text: 'See Your Success',
        guidance: "Picture yourself delivering with confidence. See the audience engaged. Feel their attention.",
        animation: 'pulse',
      },
      {
        id: 'voice-warmup',
        type: 'movement',
        duration: 30,
        text: 'Voice Warm-Up',
        guidance: 'Hum gently. Roll your shoulders. Loosen your jaw. Your voice is your instrument.',
        animation: 'pulse',
      },
      {
        id: 'affirmation',
        type: 'affirmation',
        duration: 20,
        text: 'I am prepared and capable.',
        guidance: 'Say to yourself: "I am prepared. I am capable. I have value to share."',
        animation: 'expand',
      },
      {
        id: 'closing',
        type: 'closing',
        duration: 8,
        text: "Go share your brilliance.",
        guidance: "You've got this.",
        animation: 'fade',
      },
    ],
  },

  /**
   * 3. DIFFICULT CONVERSATION PREP (3 minutes)
   * Emotional regulation breathing + perspective taking + grounding
   */
  'difficult-conversation-prep': {
    id: 'difficult-conversation-prep',
    name: 'Difficult Conversation Prep',
    shortName: 'Ground',
    description: 'Ground yourself before challenging discussions with emotional regulation techniques.',
    duration: 180, // 3 minutes
    bestFor: ['Performance reviews', 'Conflicts', 'Hard feedback', 'Negotiations', 'Sensitive topics'],
    breathingPattern: 'calming',
    spotifyMood: 'calming-reassuring',
    icon: '🌿',
    benefits: ['Emotional regulation', 'Better listening', 'Clearer communication'],
    steps: [
      {
        id: 'intro',
        type: 'intro',
        duration: 10,
        text: 'Prepare for this conversation with compassion.',
        guidance: "Difficult conversations are opportunities for growth. Let's approach this one grounded.",
        animation: 'fade',
      },
      {
        id: 'breathing-1',
        type: 'breathing',
        duration: 48,
        text: 'Calming Breath',
        guidance: 'Extended exhale calms your nervous system. In for 4... hold for 6... out for 8.',
        animation: 'breathe',
      },
      {
        id: 'perspective',
        type: 'visualization',
        duration: 40,
        text: 'Perspective Taking',
        guidance: "Consider the other person's position. What might they be feeling? What do they need?",
        animation: 'pulse',
      },
      {
        id: 'breathing-2',
        type: 'breathing',
        duration: 32,
        text: 'Continue Calming',
        guidance: 'In for 4... hold for 6... out for 8.',
        animation: 'breathe',
      },
      {
        id: 'intention',
        type: 'visualization',
        duration: 30,
        text: 'Communication Intention',
        guidance: 'What outcome would serve everyone? Hold that intention. Speak from your values.',
        animation: 'expand',
      },
      {
        id: 'grounding',
        type: 'body-scan',
        duration: 15,
        text: 'Ground in Values',
        guidance: 'Feel your feet on the ground. You are grounded in your integrity.',
        animation: 'pulse',
      },
      {
        id: 'closing',
        type: 'closing',
        duration: 5,
        text: 'Enter with compassion.',
        guidance: 'You are ready.',
        animation: 'fade',
      },
    ],
  },

  /**
   * 4. QUICK RESET (90 seconds)
   * Shake-out movement + cleansing breath + mental clear
   */
  'quick-reset': {
    id: 'quick-reset',
    name: 'Quick Reset',
    shortName: 'Reset',
    description: 'A rapid 90-second reset to clear your mind between meetings.',
    duration: 90, // 90 seconds
    bestFor: ['Between meetings', 'Context switching', 'Mental fatigue', 'After stress'],
    breathingPattern: 'cleansing',
    spotifyMood: 'energizing-refresh',
    icon: '🔄',
    benefits: ['Mental clarity', 'Energy boost', 'Context shift'],
    steps: [
      {
        id: 'intro',
        type: 'intro',
        duration: 5,
        text: 'Quick reset in 90 seconds.',
        guidance: 'Stand up if you can.',
        animation: 'fade',
      },
      {
        id: 'shake-out',
        type: 'movement',
        duration: 20,
        text: 'Shake It Out',
        guidance: 'Shake your hands, arms, shoulders. Let go of the last meeting.',
        animation: 'pulse',
      },
      {
        id: 'breathing',
        type: 'breathing',
        duration: 36,
        text: 'Cleansing Breaths',
        guidance: 'Deep breath in through nose... long exhale through mouth. Three cycles.',
        animation: 'breathe',
      },
      {
        id: 'mental-clear',
        type: 'visualization',
        duration: 20,
        text: 'Clear Your Mind',
        guidance: "Imagine a gentle breeze clearing away thoughts. You're in the present now.",
        animation: 'expand',
      },
      {
        id: 'closing',
        type: 'closing',
        duration: 9,
        text: 'Reset complete. Fresh start.',
        guidance: "You're ready for what's next.",
        animation: 'fade',
      },
    ],
  },

  /**
   * 5. POST-MEETING DECOMPRESS (2 minutes)
   * Tension release + stress acknowledgment + present moment return
   */
  'post-meeting-decompress': {
    id: 'post-meeting-decompress',
    name: 'Post-Meeting Decompress',
    shortName: 'Decompress',
    description: 'Release tension and transition after difficult or long meetings.',
    duration: 120, // 2 minutes
    bestFor: ['After difficult meetings', 'After long meetings', 'Emotionally draining sessions'],
    breathingPattern: 'calming',
    spotifyMood: 'soothing-release',
    icon: '🌊',
    benefits: ['Tension release', 'Emotional processing', 'Return to baseline'],
    steps: [
      {
        id: 'intro',
        type: 'intro',
        duration: 8,
        text: "Let's release what just happened.",
        guidance: 'That meeting is over. Allow yourself to transition.',
        animation: 'fade',
      },
      {
        id: 'breathing-1',
        type: 'breathing',
        duration: 32,
        text: 'Tension Release Breathing',
        guidance: 'Breathe in... hold... long exhale, releasing tension.',
        animation: 'breathe',
      },
      {
        id: 'body-release',
        type: 'body-scan',
        duration: 30,
        text: 'Release Physical Tension',
        guidance: 'Roll your shoulders back... release your jaw... unclench your hands.',
        animation: 'pulse',
      },
      {
        id: 'acknowledgment',
        type: 'visualization',
        duration: 20,
        text: 'Acknowledge & Release',
        guidance: "Whatever happened, acknowledge it without judgment. Then let it go.",
        animation: 'expand',
      },
      {
        id: 'breathing-2',
        type: 'breathing',
        duration: 20,
        text: 'Final Release',
        guidance: 'One more deep breath. In... and release everything on the exhale.',
        animation: 'breathe',
      },
      {
        id: 'closing',
        type: 'closing',
        duration: 10,
        text: "You're back in the present.",
        guidance: 'Take this clarity with you.',
        animation: 'fade',
      },
    ],
  },

  /**
   * 6. END-OF-DAY TRANSITION (3 minutes)
   * Work-to-home boundary + day acknowledgment + evening intention
   */
  'end-of-day-transition': {
    id: 'end-of-day-transition',
    name: 'End-of-Day Transition',
    shortName: 'Transition',
    description: 'Create a mental boundary between work and personal life.',
    duration: 180, // 3 minutes
    bestFor: ['After last meeting', 'Before commute', 'Work-from-home transition'],
    breathingPattern: 'calming',
    spotifyMood: 'calming-transition',
    icon: '🌅',
    benefits: ['Work-life boundary', 'Mental closure', 'Evening presence'],
    steps: [
      {
        id: 'intro',
        type: 'intro',
        duration: 10,
        text: 'Time to close the work chapter.',
        guidance: 'The workday is complete. Honor what you accomplished.',
        animation: 'fade',
      },
      {
        id: 'breathing-1',
        type: 'breathing',
        duration: 32,
        text: 'Transitional Breathing',
        guidance: 'Deep, slow breaths. In for 4... hold for 6... out for 8.',
        animation: 'breathe',
      },
      {
        id: 'acknowledgment',
        type: 'visualization',
        duration: 40,
        text: 'Acknowledge Your Day',
        guidance: "What did you accomplish today? Give yourself credit without judgment. It's enough.",
        animation: 'pulse',
      },
      {
        id: 'letting-go',
        type: 'visualization',
        duration: 40,
        text: 'Let Go of Work',
        guidance: "Visualize closing a door. Work stays on the other side. You're stepping into personal time.",
        animation: 'expand',
      },
      {
        id: 'breathing-2',
        type: 'breathing',
        duration: 32,
        text: 'Calming Breath',
        guidance: 'In for 4... hold for 6... out for 8.',
        animation: 'breathe',
      },
      {
        id: 'intention',
        type: 'visualization',
        duration: 18,
        text: 'Evening Intention',
        guidance: 'What will make this evening meaningful? Hold that intention.',
        animation: 'expand',
      },
      {
        id: 'closing',
        type: 'closing',
        duration: 8,
        text: 'Your evening begins now.',
        guidance: 'Be present for what matters.',
        animation: 'fade',
      },
    ],
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a flow by ID
 */
export function getFlow(id: MicroFlowType): MicroFlow {
  return MICRO_FLOWS[id];
}

/**
 * Get all flows
 */
export function getAllFlows(): MicroFlow[] {
  return Object.values(MICRO_FLOWS);
}

/**
 * Get flows by duration (short, medium, long)
 */
export function getFlowsByDuration(maxSeconds: number): MicroFlow[] {
  return Object.values(MICRO_FLOWS).filter(flow => flow.duration <= maxSeconds);
}

/**
 * Suggest a flow based on meeting context
 */
export function suggestFlowForMeeting(meeting: {
  title: string;
  duration: number; // minutes
  attendeeCount: number;
}): MicroFlowType {
  const title = meeting.title.toLowerCase();
  
  // Check for presentation/pitch keywords
  if (
    title.includes('presentation') ||
    title.includes('demo') ||
    title.includes('pitch') ||
    title.includes('interview') ||
    title.includes('speech')
  ) {
    return 'pre-presentation-power';
  }
  
  // Check for difficult conversation keywords
  if (
    title.includes('review') ||
    title.includes('feedback') ||
    title.includes('performance') ||
    title.includes('conflict') ||
    title.includes('difficult')
  ) {
    return 'difficult-conversation-prep';
  }
  
  // Default to pre-meeting focus
  return 'pre-meeting-focus';
}

/**
 * Get breathing timing for a pattern
 */
export function getBreathingTiming(pattern: BreathingPattern): {
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
} {
  switch (pattern) {
    case 'box':
      return { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 };
    case 'calming':
      return { inhale: 4, holdIn: 6, exhale: 4, holdOut: 8 };
    case 'energizing':
      return { inhale: 4, holdIn: 2, exhale: 4, holdOut: 2 };
    case 'cleansing':
      return { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 };
    default:
      return { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 };
  }
}

/**
 * Map flow type to Spotify search query
 */
export function getSpotifySearchQuery(mood: SpotifyMood): string {
  const queries: Record<SpotifyMood, string> = {
    'neutral-instrumental': 'instrumental focus ambient lo-fi',
    'confidence-uplifting': 'uplifting motivational instrumental',
    'calming-reassuring': 'calming ambient meditation peaceful',
    'energizing-refresh': 'energizing upbeat instrumental',
    'soothing-release': 'soothing ambient relaxation',
    'calming-transition': 'evening calm ambient wind down',
  };
  return queries[mood];
}

