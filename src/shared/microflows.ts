/**
 * Mind Garden - Wellness Flows Library
 * 
 * Complete collection of micro-flows (2-3 min) for calendar plugin
 * and extended flows (5-30 min) for web dashboard.
 * 
 * All scripts are verbatim from the Mind Garden specification.
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

// Flow type identifiers
export type MicroFlowType = 
  // Micro-flows (Calendar Plugin, 2-3 min)
  | 'pre-meeting-focus'
  | 'pre-presentation-power'
  | 'difficult-conversation-prep'
  | 'quick-reset'
  | 'post-meeting-decompress'
  | 'end-of-day-transition'
  // Extended flows (Web Dashboard, 5-30 min)
  | 'morning-intention'
  | 'evening-wind-down'
  | 'weekend-wellness'
  | 'deep-meditation'
  // Simple flows
  | 'breathing'
  | 'body-scan';

// Meditation types for Deep Meditation flow
export type MeditationType = 
  | 'breath-focused'
  | 'body-scan'
  | 'loving-kindness'
  | 'open-awareness'
  | 'visualization';

// Breathing pattern types
export type BreathingPattern = 
  | 'box'           // 4-4-4-4 (in-hold-out-hold)
  | 'calming'       // 4-7-8 (in-hold-out) - activates parasympathetic
  | 'extended-exhale' // 4-6-8 (in-hold-out) - calms nervous system
  | 'energizing'    // 4-2-4-2 (quick, energizing)
  | 'cleansing';    // 4-0-6-0 (in-out focus)

// Audio mood for pairing
export type AudioMood = 
  | 'neutral-instrumental'      // 70 BPM, minimal melody
  | 'confidence-uplifting'      // 90-100 BPM, building energy
  | 'calming-reassuring'        // 60 BPM, reassuring tones
  | 'energizing-refresh'        // Brief energizing pulse
  | 'soothing-release'          // Gentle, releasing tones
  | 'calming-transition'        // Golden hour vibes
  | 'morning-energize'          // 50→100 BPM progression
  | 'evening-wind-down'         // 70→40 BPM progression
  | 'ambient-spacious'          // 60 BPM steady, nature sounds
  | 'meditation-deep';          // Ambient drones, binaural beats

// Plant type that grows in garden after flow
export type GardenPlant = 
  | 'daisy'            // Pre-Meeting Focus
  | 'sunflower'        // Pre-Presentation Power
  | 'lavender'         // Difficult Conversation Prep
  | 'chamomile'        // Quick Reset
  | 'evening-primrose' // Post-Meeting Decompress
  | 'moonflower'       // End-of-Day Transition
  | 'morning-glory'    // Morning Intention
  | 'night-jasmine'    // Evening Wind-Down
  | 'lotus'            // Weekend Wellness
  | 'mature-tree';     // Deep Meditation

// Step in a flow
export interface FlowStep {
  id: string;
  type: 'intro' | 'breathing' | 'visualization' | 'body-scan' | 'affirmation' | 'movement' | 'journaling' | 'closing' | 'letting-go' | 'perspective' | 'power-pose' | 'voice-warmup' | 'shake-out' | 'mental-clear' | 'stretch' | 'acknowledgment' | 'reflection' | 'gratitude' | 'self-compassion' | 'meditation';
  startTime: number;   // seconds from start
  endTime: number;     // seconds from start
  duration: number;    // seconds
  text: string;        // Display text
  guidance: string;    // Audio guidance (verbatim script)
  animation?: 'breathe' | 'expand' | 'pulse' | 'fade' | 'shake' | 'stretch' | 'none';
  breathingCycles?: number; // For breathing steps
}

// Complete flow definition
export interface MicroFlow {
  id: MicroFlowType;
  name: string;
  shortName: string;
  description: string;
  duration: number;           // total seconds
  bestFor: string[];          // Meeting/context types
  breathingPattern: BreathingPattern;
  audioMood: AudioMood;
  audioBPM: string;         // BPM description
  gardenPlant: GardenPlant;   // Plant that grows
  steps: FlowStep[];
  benefits: string[];
  icon: string;               // emoji
  meditationOptions?: MeditationType[]; // For deep meditation
}

// ============================================
// MICRO-FLOWS (Calendar Plugin, 2-3 min)
// ============================================

/**
 * PRE-MEETING FOCUS (2 min)
 * Box breathing + quick body scan + intention setting
 * Plants: Small daisy
 */
const preMeetingFocus: MicroFlow = {
  id: 'pre-meeting-focus',
  name: 'Pre-Meeting Focus',
  shortName: 'Focus',
  description: 'Center yourself before any meeting with focused breathing and intention setting.',
  duration: 120,
  bestFor: ['Standard meetings', 'Check-ins', 'Team calls', 'One-on-ones'],
  breathingPattern: 'box',
  audioMood: 'neutral-instrumental',
  audioBPM: '70 BPM, minimal melody',
  gardenPlant: 'daisy',
  icon: '🎯',
  benefits: ['Increased presence', 'Better listening', 'Clearer thinking'],
  steps: [
    {
      id: 'intro',
      type: 'intro',
      startTime: 0,
      endTime: 10,
      duration: 10,
      text: 'Prepare for Your Meeting',
      guidance: "Let's take two minutes to prepare for your meeting.",
      animation: 'fade',
    },
    {
      id: 'settle',
      type: 'body-scan',
      startTime: 10,
      endTime: 30,
      duration: 20,
      text: 'Find Your Position',
      guidance: 'Find a comfortable seated position. Close your eyes or soften your gaze.',
      animation: 'fade',
    },
    {
      id: 'breathing',
      type: 'breathing',
      startTime: 30,
      endTime: 100,
      duration: 70,
      text: 'Box Breathing',
      guidance: 'Breathe in for 4… hold for 4… out for 4… hold for 4.',
      animation: 'breathe',
      breathingCycles: 6,
    },
    {
      id: 'body-scan',
      type: 'body-scan',
      startTime: 100,
      endTime: 110,
      duration: 10,
      text: 'Release Tension',
      guidance: 'Scan your body. Release tension in your shoulders, jaw, and hands.',
      animation: 'pulse',
    },
    {
      id: 'intention',
      type: 'visualization',
      startTime: 110,
      endTime: 120,
      duration: 10,
      text: 'Set Your Intention',
      guidance: 'Set one intention for this meeting. You are prepared and present.',
      animation: 'expand',
    },
  ],
};

/**
 * PRE-PRESENTATION POWER (3 min)
 * Power pose + visualization + voice warm-up + affirmation
 * Plants: Bold sunflower
 */
const prePresentationPower: MicroFlow = {
  id: 'pre-presentation-power',
  name: 'Pre-Presentation Power',
  shortName: 'Power Up',
  description: 'Build confidence and presence before presentations, pitches, and speeches.',
  duration: 180,
  bestFor: ['Presentations', 'Pitches', 'Speeches', 'Demos', 'Webinars'],
  breathingPattern: 'energizing',
  audioMood: 'confidence-uplifting',
  audioBPM: '90-100 BPM, building energy',
  gardenPlant: 'sunflower',
  icon: '⚡',
  benefits: ['Increased confidence', 'Better projection', 'Reduced anxiety'],
  steps: [
    {
      id: 'intro',
      type: 'intro',
      startTime: 0,
      endTime: 15,
      duration: 15,
      text: 'Step Into the Spotlight',
      guidance: "You're about to step into the spotlight. Let's build your confidence.",
      animation: 'expand',
    },
    {
      id: 'power-pose',
      type: 'power-pose',
      startTime: 15,
      endTime: 60,
      duration: 45,
      text: 'Power Pose',
      guidance: 'Stand tall. Expand your body. Take up space. Hold for 30 seconds.',
      animation: 'expand',
    },
    {
      id: 'visualization',
      type: 'visualization',
      startTime: 60,
      endTime: 120,
      duration: 60,
      text: 'Visualize Success',
      guidance: 'Picture yourself presenting with confidence. See the audience engaged. Hear your clear, steady voice.',
      animation: 'pulse',
    },
    {
      id: 'voice-warmup',
      type: 'voice-warmup',
      startTime: 120,
      endTime: 150,
      duration: 30,
      text: 'Voice Warm-Up',
      guidance: "Hum gently. Say 'I am ready' three times, louder each time.",
      animation: 'pulse',
    },
    {
      id: 'closing',
      type: 'closing',
      startTime: 150,
      endTime: 180,
      duration: 30,
      text: "You've Got This",
      guidance: "Take a deep breath. You've got this. Walk in with power.",
      animation: 'fade',
    },
  ],
};

/**
 * DIFFICULT CONVERSATION PREP (3 min)
 * Extended exhale breathing + perspective taking + grounding
 * Plants: Resilient lavender
 */
const difficultConversationPrep: MicroFlow = {
  id: 'difficult-conversation-prep',
  name: 'Difficult Conversation Prep',
  shortName: 'Ground',
  description: 'Ground yourself before challenging discussions with emotional regulation techniques.',
  duration: 180,
  bestFor: ['Performance reviews', 'Conflict resolution', 'Hard feedback', 'Terminations', 'Negotiations'],
  breathingPattern: 'extended-exhale',
  audioMood: 'calming-reassuring',
  audioBPM: '60 BPM, calming',
  gardenPlant: 'lavender',
  icon: '🌿',
  benefits: ['Emotional regulation', 'Better listening', 'Clearer communication'],
  steps: [
    {
      id: 'intro',
      type: 'intro',
      startTime: 0,
      endTime: 20,
      duration: 20,
      text: 'Approach with Calm',
      guidance: "Difficult conversations are challenging. Let's approach with calm and clarity.",
      animation: 'fade',
    },
    {
      id: 'breathing',
      type: 'breathing',
      startTime: 20,
      endTime: 90,
      duration: 70,
      text: 'Extended Exhale',
      guidance: 'Breathe in for 4… hold for 6… out for 8.',
      animation: 'breathe',
      breathingCycles: 5,
    },
    {
      id: 'perspective',
      type: 'perspective',
      startTime: 90,
      endTime: 140,
      duration: 50,
      text: 'Consider Their View',
      guidance: 'Consider their viewpoint. What might they be feeling? What outcome do you both want?',
      animation: 'pulse',
    },
    {
      id: 'intention',
      type: 'visualization',
      startTime: 140,
      endTime: 170,
      duration: 30,
      text: 'Communication Intention',
      guidance: 'Choose one word for how you want to show up: Patient? Clear? Compassionate?',
      animation: 'expand',
    },
    {
      id: 'closing',
      type: 'closing',
      startTime: 170,
      endTime: 180,
      duration: 10,
      text: 'You Can Handle This',
      guidance: 'Ground yourself. You can handle this with grace.',
      animation: 'fade',
    },
  ],
};

/**
 * QUICK RESET (90 sec)
 * Shake-out + cleansing breath + mental clear
 * Plants: Quick-blooming chamomile
 */
const quickReset: MicroFlow = {
  id: 'quick-reset',
  name: 'Quick Reset',
  shortName: 'Reset',
  description: 'A rapid 90-second reset to clear your mind between meetings.',
  duration: 90,
  bestFor: ['Between meetings', 'Context switching', 'Mental fatigue', 'Overwhelm'],
  breathingPattern: 'cleansing',
  audioMood: 'energizing-refresh',
  audioBPM: 'Brief energizing pulse',
  gardenPlant: 'chamomile',
  icon: '🔄',
  benefits: ['Mental clarity', 'Energy boost', 'Context shift'],
  steps: [
    {
      id: 'intro',
      type: 'intro',
      startTime: 0,
      endTime: 15,
      duration: 15,
      text: 'Clear the Clutter',
      guidance: "Let's clear the mental clutter in 90 seconds.",
      animation: 'fade',
    },
    {
      id: 'shake-out',
      type: 'shake-out',
      startTime: 15,
      endTime: 35,
      duration: 20,
      text: 'Shake It Out',
      guidance: 'Shake out your hands. Roll your shoulders. Wiggle in your seat.',
      animation: 'shake',
    },
    {
      id: 'breathing',
      type: 'breathing',
      startTime: 35,
      endTime: 55,
      duration: 20,
      text: 'Cleansing Breath',
      guidance: 'Big inhale through nose… Audible exhale through mouth. Again. Once more.',
      animation: 'breathe',
      breathingCycles: 3,
    },
    {
      id: 'mental-clear',
      type: 'mental-clear',
      startTime: 55,
      endTime: 80,
      duration: 25,
      text: 'Mental Reset',
      guidance: 'Imagine closing a browser tab. That meeting is over. Open a fresh, blank page.',
      animation: 'expand',
    },
    {
      id: 'closing',
      type: 'closing',
      startTime: 80,
      endTime: 90,
      duration: 10,
      text: 'Ready for Next',
      guidance: "One centering breath. You're ready for what's next.",
      animation: 'fade',
    },
  ],
};

/**
 * POST-MEETING DECOMPRESS (2 min)
 * Tension release + stretches + letting go
 * Plants: Calming evening primrose
 */
const postMeetingDecompress: MicroFlow = {
  id: 'post-meeting-decompress',
  name: 'Post-Meeting Decompress',
  shortName: 'Decompress',
  description: 'Release tension and transition after difficult or long meetings.',
  duration: 120,
  bestFor: ['After difficult meetings', 'Long meetings', 'Emotionally draining sessions'],
  breathingPattern: 'calming',
  audioMood: 'soothing-release',
  audioBPM: 'Soothing, releasing tones, gentle melody',
  gardenPlant: 'evening-primrose',
  icon: '🌊',
  benefits: ['Tension release', 'Emotional processing', 'Return to baseline'],
  steps: [
    {
      id: 'intro',
      type: 'intro',
      startTime: 0,
      endTime: 20,
      duration: 20,
      text: 'Release & Let Go',
      guidance: "That meeting is over. Let's release what you're carrying.",
      animation: 'fade',
    },
    {
      id: 'tension-release',
      type: 'breathing',
      startTime: 20,
      endTime: 60,
      duration: 40,
      text: 'Tension Release',
      guidance: 'Breathe deeply. On exhale, drop your shoulders. Unclench your jaw. Relax your hands.',
      animation: 'breathe',
    },
    {
      id: 'stretches',
      type: 'stretch',
      startTime: 60,
      endTime: 90,
      duration: 30,
      text: 'Neck & Shoulders',
      guidance: 'Gently roll your neck. Shrug shoulders up and drop. Side to side.',
      animation: 'stretch',
    },
    {
      id: 'letting-go',
      type: 'letting-go',
      startTime: 90,
      endTime: 110,
      duration: 20,
      text: 'Let It Go',
      guidance: "Breathe out stress you can't control. What's done is done.",
      animation: 'expand',
    },
    {
      id: 'closing',
      type: 'closing',
      startTime: 110,
      endTime: 120,
      duration: 10,
      text: 'Return to Now',
      guidance: "Return to this moment. You're here now.",
      animation: 'fade',
    },
  ],
};

/**
 * END-OF-DAY TRANSITION (3 min)
 * Work-life boundary + acknowledgment + evening intention
 * Plants: Twilight moonflower
 */
const endOfDayTransition: MicroFlow = {
  id: 'end-of-day-transition',
  name: 'End-of-Day Transition',
  shortName: 'Transition',
  description: 'Create a mental boundary between work and personal life.',
  duration: 180,
  bestFor: ['After last meeting', 'Before commute', 'Work-life boundary setting'],
  breathingPattern: 'calming',
  audioMood: 'calming-transition',
  audioBPM: 'Calming, transitional, golden hour vibes',
  gardenPlant: 'moonflower',
  icon: '🌅',
  benefits: ['Work-life boundary', 'Mental closure', 'Evening presence'],
  steps: [
    {
      id: 'intro',
      type: 'intro',
      startTime: 0,
      endTime: 30,
      duration: 30,
      text: 'Workday Ending',
      guidance: "The workday is ending. Let's create a boundary between work and home.",
      animation: 'fade',
    },
    {
      id: 'acknowledgment',
      type: 'acknowledgment',
      startTime: 30,
      endTime: 80,
      duration: 50,
      text: 'Acknowledge Your Day',
      guidance: "Think of one thing you accomplished today. Something you're proud of, big or small.",
      animation: 'pulse',
    },
    {
      id: 'letting-go',
      type: 'letting-go',
      startTime: 80,
      endTime: 130,
      duration: 50,
      text: 'Close the Chapter',
      guidance: "Visualize closing your laptop. Work stays here. You're transitioning to personal time.",
      animation: 'expand',
    },
    {
      id: 'breathing',
      type: 'breathing',
      startTime: 130,
      endTime: 170,
      duration: 40,
      text: 'Transition Breathing',
      guidance: "Breathe in calm. Breathe out work stress. You're shifting modes now.",
      animation: 'breathe',
    },
    {
      id: 'closing',
      type: 'closing',
      startTime: 170,
      endTime: 180,
      duration: 10,
      text: 'Evening Begins',
      guidance: "Set one intention for your evening. You've earned this time.",
      animation: 'fade',
    },
  ],
};

// ============================================
// EXTENDED FLOWS (Web Dashboard, 5-30 min)
// ============================================

/**
 * MORNING INTENTION FLOW (10 min)
 * Gentle wake-up + gratitude + calendar review + intention + movement + centering
 * Plants: Morning glory vine
 */
const morningIntention: MicroFlow = {
  id: 'morning-intention',
  name: 'Morning Intention Flow',
  shortName: 'Morning',
  description: 'Start your day with gratitude, intention setting, and gentle energizing movement.',
  duration: 600,
  bestFor: ['Morning routine', '6:00-9:00 AM', 'Before workday begins'],
  breathingPattern: 'energizing',
  audioMood: 'morning-energize',
  audioBPM: 'Starts soft (50 BPM), gradually energizes to uplifting (100 BPM)',
  gardenPlant: 'morning-glory',
  icon: '☀️',
  benefits: ['Clear intention', 'Positive mindset', 'Day preparation'],
  steps: [
    {
      id: 'gentle-wake',
      type: 'body-scan',
      startTime: 0,
      endTime: 60,
      duration: 60,
      text: 'Gentle Wake-Up',
      guidance: 'Awareness of breathing, body sensations, transitioning from sleep.',
      animation: 'fade',
    },
    {
      id: 'gratitude',
      type: 'gratitude',
      startTime: 60,
      endTime: 120,
      duration: 60,
      text: 'Gratitude Practice',
      guidance: "Name three things you're grateful for. They can be small.",
      animation: 'pulse',
    },
    {
      id: 'calendar-review',
      type: 'visualization',
      startTime: 120,
      endTime: 240,
      duration: 120,
      text: 'Calendar Review',
      guidance: "Look at your schedule with curiosity, not judgment. Notice what's ahead.",
      animation: 'pulse',
    },
    {
      id: 'intention',
      type: 'visualization',
      startTime: 240,
      endTime: 360,
      duration: 120,
      text: 'Intention Setting',
      guidance: "What's one thing you want to prioritize? How do you want to feel today?",
      animation: 'expand',
    },
    {
      id: 'movement',
      type: 'movement',
      startTime: 360,
      endTime: 480,
      duration: 120,
      text: 'Energizing Movement',
      guidance: 'Gentle stretches, shoulder rolls, standing poses, optional sun salutation.',
      animation: 'stretch',
    },
    {
      id: 'centering',
      type: 'affirmation',
      startTime: 480,
      endTime: 600,
      duration: 120,
      text: 'Centering',
      guidance: 'Final breaths, affirmation - "I am ready. I am capable. I begin with intention."',
      animation: 'expand',
    },
  ],
};

/**
 * EVENING WIND-DOWN FLOW (15 min)
 * Transition + body scan + reflection + gratitude + sleep prep
 * Plants: Serene night jasmine
 */
const eveningWindDown: MicroFlow = {
  id: 'evening-wind-down',
  name: 'Evening Wind-Down Flow',
  shortName: 'Wind Down',
  description: 'Transition from work mode with body scan, reflection, and sleep preparation.',
  duration: 900,
  bestFor: ['Evening routine', '7:00-10:00 PM', 'Before bedtime routine'],
  breathingPattern: 'calming',
  audioMood: 'evening-wind-down',
  audioBPM: 'Starts moderate (70 BPM), progressively calms to sleep-ready (40 BPM)',
  gardenPlant: 'night-jasmine',
  icon: '🌙',
  benefits: ['Work-life separation', 'Better sleep', 'Day closure'],
  steps: [
    {
      id: 'transition',
      type: 'intro',
      startTime: 0,
      endTime: 120,
      duration: 120,
      text: 'Transition',
      guidance: 'The workday is over. Give yourself permission to let go.',
      animation: 'fade',
    },
    {
      id: 'body-scan',
      type: 'body-scan',
      startTime: 120,
      endTime: 300,
      duration: 180,
      text: 'Body Scan',
      guidance: 'Head to toe, noticing and releasing tension in each area.',
      animation: 'pulse',
    },
    {
      id: 'reflection',
      type: 'reflection',
      startTime: 300,
      endTime: 480,
      duration: 180,
      text: 'Day Reflection',
      guidance: 'What went well? What was challenging? No judgment, just notice.',
      animation: 'pulse',
    },
    {
      id: 'gratitude',
      type: 'gratitude',
      startTime: 480,
      endTime: 660,
      duration: 180,
      text: 'Gratitude Journaling',
      guidance: 'Prompted questions, can write or think through.',
      animation: 'expand',
    },
    {
      id: 'letting-go',
      type: 'letting-go',
      startTime: 660,
      endTime: 780,
      duration: 120,
      text: 'Letting Go',
      guidance: 'Imagine stress leaving your body like sand through fingers.',
      animation: 'expand',
    },
    {
      id: 'sleep-prep',
      type: 'breathing',
      startTime: 780,
      endTime: 900,
      duration: 120,
      text: 'Sleep Preparation',
      guidance: '4-7-8 breathing (4 in, 7 hold, 8 out), activates parasympathetic nervous system.',
      animation: 'breathe',
    },
  ],
};

/**
 * WEEKEND WELLNESS FLOW (20 min)
 * Settling + week reflection + meditation + self-compassion + intention
 * Plants: Contemplative lotus
 */
const weekendWellness: MicroFlow = {
  id: 'weekend-wellness',
  name: 'Weekend Wellness Flow',
  shortName: 'Weekend',
  description: 'Longer meditation session for weekends with week reflection and self-compassion.',
  duration: 1200,
  bestFor: ['Weekends', 'Saturday or Sunday morning/afternoon', 'Deep relaxation'],
  breathingPattern: 'calming',
  audioMood: 'ambient-spacious',
  audioBPM: 'Ambient, spacious soundscapes, nature sounds, 60 BPM steady',
  gardenPlant: 'lotus',
  icon: '🧘',
  benefits: ['Deep relaxation', 'Week closure', 'Self-compassion'],
  steps: [
    {
      id: 'settling',
      type: 'intro',
      startTime: 0,
      endTime: 180,
      duration: 180,
      text: 'Settling',
      guidance: "Arriving in the moment, letting go of week's momentum.",
      animation: 'fade',
    },
    {
      id: 'week-reflection',
      type: 'reflection',
      startTime: 180,
      endTime: 480,
      duration: 300,
      text: 'Week Reflection',
      guidance: 'Guided questions about the week without judgment.',
      animation: 'pulse',
    },
    {
      id: 'meditation',
      type: 'meditation',
      startTime: 480,
      endTime: 780,
      duration: 300,
      text: 'Extended Meditation',
      guidance: 'Choice of breath focus, body scan, or loving-kindness.',
      animation: 'breathe',
    },
    {
      id: 'self-compassion',
      type: 'self-compassion',
      startTime: 780,
      endTime: 1020,
      duration: 240,
      text: 'Self-Compassion',
      guidance: 'How would you talk to a friend who had your week? Offer yourself that kindness.',
      animation: 'expand',
    },
    {
      id: 'intention',
      type: 'visualization',
      startTime: 1020,
      endTime: 1200,
      duration: 180,
      text: 'Week-Ahead Intention',
      guidance: 'Light planning, hopes for the coming week (not work tasks).',
      animation: 'expand',
    },
  ],
};

/**
 * DEEP MEDITATION (30 min)
 * Multiple meditation type options with minimal or light guidance
 * Plants: Mature tree (grows slowly over multiple sessions)
 * Unlocked: After 2 weeks of consistent practice
 */
const deepMeditation: MicroFlow = {
  id: 'deep-meditation',
  name: 'Deep Meditation',
  shortName: 'Deep',
  description: 'Extended meditation session with multiple style options. Minimal guidance for experienced practitioners.',
  duration: 1800,
  bestFor: ['Deep practice', 'After 2 weeks consistency', 'Experienced meditators'],
  breathingPattern: 'calming',
  audioMood: 'meditation-deep',
  audioBPM: 'Ambient drones, binaural beats, nature sounds, or silence option',
  gardenPlant: 'mature-tree',
  icon: '🌳',
  benefits: ['Deep calm', 'Mental clarity', 'Profound relaxation'],
  meditationOptions: ['breath-focused', 'body-scan', 'loving-kindness', 'open-awareness', 'visualization'],
  steps: [
    {
      id: 'settling',
      type: 'intro',
      startTime: 0,
      endTime: 120,
      duration: 120,
      text: 'Settling In',
      guidance: 'Find your comfortable position. This is your sanctuary for the next 30 minutes.',
      animation: 'fade',
    },
    {
      id: 'breath-anchor',
      type: 'breathing',
      startTime: 120,
      endTime: 420,
      duration: 300,
      text: 'Breath Anchor',
      guidance: 'Attention on natural breath, returning when mind wanders.',
      animation: 'breathe',
    },
    {
      id: 'main-practice',
      type: 'meditation',
      startTime: 420,
      endTime: 1320,
      duration: 900,
      text: 'Main Practice',
      guidance: 'Choose your focus: breath, body scan, loving-kindness, open awareness, or visualization.',
      animation: 'pulse',
    },
    {
      id: 'integration',
      type: 'body-scan',
      startTime: 1320,
      endTime: 1620,
      duration: 300,
      text: 'Integration',
      guidance: 'Gradually expand awareness. Notice sounds, sensations, the space around you.',
      animation: 'expand',
    },
    {
      id: 'return',
      type: 'closing',
      startTime: 1620,
      endTime: 1800,
      duration: 180,
      text: 'Gentle Return',
      guidance: 'Begin to return. Gentle movements. Carry this peace with you.',
      animation: 'fade',
    },
  ],
};

/**
 * SIMPLE BREATHING (1 min)
 * Quick breathing exercise for immediate calm
 */
const simpleBreathing: MicroFlow = {
  id: 'breathing',
  name: 'Simple Breathing',
  shortName: 'Breathe',
  description: 'A calming breathing exercise to center your mind.',
  duration: 60,
  bestFor: ['Quick calm', 'Anxiety relief', 'Focus boost'],
  breathingPattern: 'box',
  audioMood: 'calming-reassuring',
  audioBPM: '60 BPM',
  gardenPlant: 'chamomile',
  icon: '🌬️',
  benefits: ['Instant calm', 'Focus', 'Stress relief'],
  steps: [
    {
      id: 'intro',
      type: 'intro',
      startTime: 0,
      endTime: 5,
      duration: 5,
      text: 'One Minute of Calm',
      guidance: 'Close your eyes if comfortable.',
      animation: 'fade',
    },
    {
      id: 'breathing',
      type: 'breathing',
      startTime: 5,
      endTime: 55,
      duration: 50,
      text: 'Box Breathing',
      guidance: 'In for 4... hold for 4... out for 4... hold for 4.',
      animation: 'breathe',
      breathingCycles: 3,
    },
    {
      id: 'closing',
      type: 'closing',
      startTime: 55,
      endTime: 60,
      duration: 5,
      text: 'Centered',
      guidance: 'You are centered.',
      animation: 'fade',
    },
  ],
};

/**
 * FULL BODY SCAN (25 min)
 * Complete body awareness meditation for tension release
 */
const fullBodyScan: MicroFlow = {
  id: 'body-scan',
  name: 'Full Body Scan',
  shortName: 'Body Scan',
  description: 'Complete body awareness meditation for tension release and deep relaxation.',
  duration: 1500,
  bestFor: ['Physical tension', 'Body awareness', 'Deep relaxation'],
  breathingPattern: 'calming',
  audioMood: 'soothing-release',
  audioBPM: 'Gentle ambient, 50 BPM',
  gardenPlant: 'lotus',
  icon: '✨',
  benefits: ['Tension release', 'Body awareness', 'Deep relaxation'],
  steps: [
    {
      id: 'intro',
      type: 'intro',
      startTime: 0,
      endTime: 60,
      duration: 60,
      text: 'Begin Your Journey',
      guidance: 'Lie down or sit comfortably. This is a journey through your body.',
      animation: 'fade',
    },
    {
      id: 'settling',
      type: 'breathing',
      startTime: 60,
      endTime: 180,
      duration: 120,
      text: 'Settling',
      guidance: 'A few deep breaths to settle in.',
      animation: 'breathe',
    },
    {
      id: 'feet',
      type: 'body-scan',
      startTime: 180,
      endTime: 300,
      duration: 120,
      text: 'Feet',
      guidance: 'Bring attention to your feet. Notice sensations in your toes, soles, heels.',
      animation: 'pulse',
    },
    {
      id: 'legs',
      type: 'body-scan',
      startTime: 300,
      endTime: 450,
      duration: 150,
      text: 'Legs',
      guidance: 'Move up to your ankles, calves, knees, thighs. Release any tension.',
      animation: 'pulse',
    },
    {
      id: 'hips',
      type: 'body-scan',
      startTime: 450,
      endTime: 570,
      duration: 120,
      text: 'Hips & Lower Back',
      guidance: 'Notice your hips, lower back. Let them sink into support.',
      animation: 'pulse',
    },
    {
      id: 'abdomen',
      type: 'body-scan',
      startTime: 570,
      endTime: 720,
      duration: 150,
      text: 'Abdomen & Chest',
      guidance: 'Feel your belly rise and fall. Notice your chest, ribs.',
      animation: 'pulse',
    },
    {
      id: 'hands',
      type: 'body-scan',
      startTime: 720,
      endTime: 840,
      duration: 120,
      text: 'Hands & Arms',
      guidance: 'Awareness to your fingertips, hands, forearms, upper arms.',
      animation: 'pulse',
    },
    {
      id: 'shoulders',
      type: 'body-scan',
      startTime: 840,
      endTime: 990,
      duration: 150,
      text: 'Shoulders & Neck',
      guidance: 'Common tension areas. Soften your shoulders. Release your neck.',
      animation: 'pulse',
    },
    {
      id: 'face',
      type: 'body-scan',
      startTime: 990,
      endTime: 1140,
      duration: 150,
      text: 'Face & Head',
      guidance: 'Relax your jaw, eyes, forehead. Let your face be soft.',
      animation: 'pulse',
    },
    {
      id: 'whole-body',
      type: 'body-scan',
      startTime: 1140,
      endTime: 1320,
      duration: 180,
      text: 'Whole Body',
      guidance: 'Feel your entire body as one. A sense of wholeness and peace.',
      animation: 'expand',
    },
    {
      id: 'reawaken',
      type: 'movement',
      startTime: 1320,
      endTime: 1440,
      duration: 120,
      text: 'Gentle Reawakening',
      guidance: 'Slowly wiggle fingers and toes. Gentle movements to return.',
      animation: 'pulse',
    },
    {
      id: 'closing',
      type: 'closing',
      startTime: 1440,
      endTime: 1500,
      duration: 60,
      text: 'Renewed',
      guidance: 'You are renewed. Take your time opening your eyes.',
      animation: 'fade',
    },
  ],
};

// ============================================
// FLOWS COLLECTION
// ============================================

export const MICRO_FLOWS: Record<MicroFlowType, MicroFlow> = {
  // Micro-flows (Calendar Plugin)
  'pre-meeting-focus': preMeetingFocus,
  'pre-presentation-power': prePresentationPower,
  'difficult-conversation-prep': difficultConversationPrep,
  'quick-reset': quickReset,
  'post-meeting-decompress': postMeetingDecompress,
  'end-of-day-transition': endOfDayTransition,
  // Extended flows (Web Dashboard)
  'morning-intention': morningIntention,
  'evening-wind-down': eveningWindDown,
  'weekend-wellness': weekendWellness,
  'deep-meditation': deepMeditation,
  // Simple flows
  'breathing': simpleBreathing,
  'body-scan': fullBodyScan,
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
 * Get micro-flows only (2-3 min, for calendar plugin)
 */
export function getMicroFlows(): MicroFlow[] {
  const microFlowIds: MicroFlowType[] = [
    'pre-meeting-focus',
    'pre-presentation-power',
    'difficult-conversation-prep',
    'quick-reset',
    'post-meeting-decompress',
    'end-of-day-transition',
  ];
  return microFlowIds.map(id => MICRO_FLOWS[id]);
}

/**
 * Get extended flows only (5-30 min, for web dashboard)
 */
export function getExtendedFlows(): MicroFlow[] {
  const extendedFlowIds: MicroFlowType[] = [
    'morning-intention',
    'evening-wind-down',
    'weekend-wellness',
    'deep-meditation',
    'body-scan',
  ];
  return extendedFlowIds.map(id => MICRO_FLOWS[id]);
}

/**
 * Get flows by duration
 */
export function getFlowsByDuration(maxSeconds: number): MicroFlow[] {
  return Object.values(MICRO_FLOWS).filter(flow => flow.duration <= maxSeconds);
}

/**
 * Suggest a flow based on meeting context
 */
export function suggestFlowForMeeting(meeting: {
  title: string;
  duration: number;
  attendeeCount: number;
}): MicroFlowType {
  const title = meeting.title.toLowerCase();
  
  // Check for presentation/pitch keywords
  if (
    title.includes('presentation') ||
    title.includes('demo') ||
    title.includes('pitch') ||
    title.includes('interview') ||
    title.includes('speech') ||
    title.includes('webinar')
  ) {
    return 'pre-presentation-power';
  }
  
  // Check for difficult conversation keywords
  if (
    title.includes('review') ||
    title.includes('feedback') ||
    title.includes('performance') ||
    title.includes('conflict') ||
    title.includes('difficult') ||
    title.includes('termination') ||
    title.includes('negotiation')
  ) {
    return 'difficult-conversation-prep';
  }
  
  // Default to pre-meeting focus
  return 'pre-meeting-focus';
}

/**
 * Suggest post-meeting flow
 */
export function suggestPostMeetingFlow(meeting: {
  title: string;
  duration: number;
}): MicroFlowType {
  // Long meetings (over 60 min) need decompression
  if (meeting.duration >= 60) {
    return 'post-meeting-decompress';
  }
  
  // Check for difficult meeting keywords
  const title = meeting.title.toLowerCase();
  if (
    title.includes('review') ||
    title.includes('feedback') ||
    title.includes('difficult')
  ) {
    return 'post-meeting-decompress';
  }
  
  // Quick reset for standard meetings
  return 'quick-reset';
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
      return { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 };
    case 'extended-exhale':
      return { inhale: 4, holdIn: 6, exhale: 8, holdOut: 0 };
    case 'energizing':
      return { inhale: 4, holdIn: 2, exhale: 4, holdOut: 2 };
    case 'cleansing':
      return { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 };
    default:
      return { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 };
  }
}

/**
 * Map flow to audio search query for ambient sounds
 */
export function getAudioSearchQuery(mood: AudioMood): string {
  const queries: Record<AudioMood, string> = {
    'neutral-instrumental': 'instrumental focus ambient lo-fi 70 bpm',
    'confidence-uplifting': 'uplifting motivational instrumental energy',
    'calming-reassuring': 'calming ambient meditation peaceful 60 bpm',
    'energizing-refresh': 'energizing upbeat instrumental',
    'soothing-release': 'soothing ambient relaxation gentle melody',
    'calming-transition': 'evening calm ambient golden hour',
    'morning-energize': 'morning meditation gentle uplifting',
    'evening-wind-down': 'sleep meditation calming relaxation',
    'ambient-spacious': 'ambient spacious nature sounds meditation',
    'meditation-deep': 'deep meditation binaural ambient drone',
  };
  return queries[mood];
}

/**
 * Get meditation type descriptions
 */
export function getMeditationTypeDescription(type: MeditationType): {
  name: string;
  description: string;
  guidance: string;
} {
  const descriptions: Record<MeditationType, { name: string; description: string; guidance: string }> = {
    'breath-focused': {
      name: 'Breath-Focused',
      description: 'Attention on natural breath, returning when mind wanders.',
      guidance: 'Simply observe your breath. When thoughts arise, gently return.',
    },
    'body-scan': {
      name: 'Body Scan',
      description: 'Progressive awareness through entire body.',
      guidance: 'Move attention slowly from feet to head, noticing sensations.',
    },
    'loving-kindness': {
      name: 'Loving-Kindness (Metta)',
      description: 'Cultivating compassion for self and others.',
      guidance: 'May I be happy. May I be healthy. May I be at peace.',
    },
    'open-awareness': {
      name: 'Open Awareness',
      description: 'Non-judgmental observation of thoughts, sensations, sounds.',
      guidance: 'Notice whatever arises without attachment. Let it pass.',
    },
    'visualization': {
      name: 'Visualization',
      description: 'Guided imagery for peace, nature scenes, safe spaces.',
      guidance: 'Imagine a peaceful place. See the details. Feel the calm.',
    },
  };
  return descriptions[type];
}
