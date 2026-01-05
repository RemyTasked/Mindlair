import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

// ============================================
// TYPE DEFINITIONS - ONE PLANT SYSTEM
// ============================================

// Free plant types (available to all users)
export type FreePlantType = 'classic' | 'succulent' | 'flowering';

// Premium plant types (unlock after first plant matures)
export type PremiumPlantType = 'fern' | 'bonsai' | 'monstera' | 'bamboo' | 'orchid' | 'ivy';

// All plant types
export type PlantType = FreePlantType | PremiumPlantType;

// Growth stages based on action count
export type GrowthStage = 'seed' | 'seedling' | 'growing' | 'maturing' | 'mature';

// Plant data structure
export interface OnePlant {
  id: string;
  type: PlantType;
  actionsCount: number;       // Total actions for this plant (0-30+)
  leavesCount: number;        // Number of leaves (1 per action, max 35)
  flowersCount: number;       // Number of bloomed flowers (0-3)
  flowerBudsCount: number;    // Number of flower buds (0-2)
  growthStage: GrowthStage;
  plantedAt: string;
  maturedAt?: string;         // When the plant reached 30 actions
  position: number;           // Position in the garden (0, 1, 2, ...)
}

// Activity tracking for insights
export interface ActivityCounts {
  morningFlows: number;
  eveningFlows: number;
  extendedFlows: number;
  deepMeditations: number;
  presentationPreps: number;
  difficultConversationPreps: number;
  gratitudeEntries: number;
  breathingPractices: number;
  thoughtReframes: number;
  mindfulMoments: number;
  quickResets: number;
  preMeetingFocus: number;
  games: number;
  totalActions: number;       // Grand total of all actions ever
}

// Garden data - CUMULATIVE GARDEN SYSTEM
export interface OneGardenData {
  // All plants in the garden (growing and mature together)
  plants: OnePlant[];
  
  // Currently active plant being grown (by ID)
  activePlantId: string | null;
  
  // Activity tracking
  activityCounts: ActivityCounts;
  
  // Streaks (still valuable for milestones)
  streak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  totalActiveDays: number;
  
  // Premium unlock - unlocks after first plant matures
  premiumUnlocked: boolean;
  firstPlantMaturedAt: string | null;
  
  // Milestone tracking - which milestones have been achieved
  achievedMilestones: MilestoneType[];
  
  // Onboarding
  hasCompletedOnboarding: boolean;
  
  // Version marker (for migration detection)
  version: 'one-plant-v2';
}

// ============================================
// CONSTANTS
// ============================================

// Growth thresholds
export const GROWTH_THRESHOLDS = {
  SEEDLING_MAX: 10,      // 0-10 actions = seedling
  GROWING_MAX: 20,       // 11-20 actions = growing
  MATURING_MAX: 30,      // 21-30 actions = maturing
  MATURE: 30,            // 30+ actions = mature (can add new plant)
  MAX_LEAVES: 35,        // Visual cap for leaves
  FIRST_BUD: 15,         // First flower bud appears
  SECOND_BUD: 25,        // Second flower bud appears
  FIRST_BLOOM: 20,       // First flower blooms
  SECOND_BLOOM: 25,      // Second flower blooms (from first bud)
  THIRD_BLOOM: 30,       // Third flower blooms (from second bud)
};

// Milestone types
export type MilestoneType = 
  | 'plant_sprouted'      // First action on a plant
  | 'plant_seedling'      // 10 actions
  | 'plant_first_bud'     // 15 actions  
  | 'plant_first_bloom'   // 20 actions
  | 'plant_second_bud'    // 25 actions
  | 'plant_mature'        // 30 actions
  | 'streak_3'            // 3-day streak
  | 'streak_7'            // 7-day streak
  | 'streak_14'           // 14-day streak
  | 'streak_30'           // 30-day streak
  | 'streak_60'           // 60-day streak
  | 'streak_100'          // 100-day streak
  | 'total_actions_10'    // 10 total actions
  | 'total_actions_25'    // 25 total actions
  | 'total_actions_50'    // 50 total actions
  | 'total_actions_100'   // 100 total actions
  | 'total_actions_250'   // 250 total actions
  | 'total_actions_500'   // 500 total actions
  | 'plants_grown_2'      // 2 mature plants
  | 'plants_grown_5'      // 5 mature plants
  | 'plants_grown_10'     // 10 mature plants
  | 'premium_unlocked'    // First plant matured, premium unlocked
  | 'morning_master'      // 10 morning flows
  | 'breathing_champion'  // 20 breathing exercises
  | 'meeting_prep_pro'    // 15 meeting preps
  | 'game_enthusiast';    // 25 games played

// Milestone notification data
export interface MilestoneNotification {
  type: MilestoneType;
  title: string;
  message: string;
  emoji: string;
  points?: number;  // Bonus points awarded
}

// Milestone definitions
export const MILESTONE_DEFINITIONS: Record<MilestoneType, Omit<MilestoneNotification, 'type'>> = {
  // Plant growth milestones
  plant_sprouted: { title: 'First Sprout! 🌱', message: 'Your seed has sprouted! Keep practicing.', emoji: '🌱' },
  plant_seedling: { title: 'Seedling Stage! 🌿', message: 'Your plant is growing strong!', emoji: '🌿' },
  plant_first_bud: { title: 'Flower Bud! 🌼', message: 'A flower bud appeared on your plant!', emoji: '🌼' },
  plant_first_bloom: { title: 'First Bloom! 🌸', message: 'Your first flower has bloomed!', emoji: '🌸' },
  plant_second_bud: { title: 'Another Bud! 💐', message: 'A second flower bud appeared!', emoji: '💐' },
  plant_mature: { title: 'Plant Matured! 🎉', message: 'Your plant is fully grown! Add another to your garden.', emoji: '🎉' },
  
  // Streak milestones
  streak_3: { title: '3-Day Streak! 🔥', message: 'You\'re building a habit!', emoji: '🔥', points: 2 },
  streak_7: { title: 'Week Streak! 🔥', message: 'A full week of practice!', emoji: '🔥', points: 3 },
  streak_14: { title: '2-Week Streak! 💪', message: 'Two weeks strong!', emoji: '💪', points: 5 },
  streak_30: { title: 'Month Streak! 🏆', message: 'An entire month! Incredible!', emoji: '🏆', points: 10 },
  streak_60: { title: '60-Day Streak! 🌟', message: 'Two months of dedication!', emoji: '🌟', points: 15 },
  streak_100: { title: '100-Day Streak! 👑', message: 'You are unstoppable!', emoji: '👑', points: 25 },
  
  // Total actions milestones
  total_actions_10: { title: '10 Actions! ✨', message: 'Your journey is underway!', emoji: '✨' },
  total_actions_25: { title: '25 Actions! 🌟', message: 'A quarter century of mindfulness!', emoji: '🌟' },
  total_actions_50: { title: '50 Actions! 💫', message: 'Half a hundred practices!', emoji: '💫' },
  total_actions_100: { title: '100 Actions! 🎯', message: 'Triple digits! Amazing dedication!', emoji: '🎯', points: 5 },
  total_actions_250: { title: '250 Actions! 🏅', message: 'A true practitioner!', emoji: '🏅', points: 10 },
  total_actions_500: { title: '500 Actions! 🏆', message: 'Wellness master!', emoji: '🏆', points: 20 },
  
  // Garden growth milestones
  plants_grown_2: { title: 'Growing Garden! 🪴', message: 'Two plants in your garden!', emoji: '🪴' },
  plants_grown_5: { title: 'Garden Blooming! 🌻', message: 'Five beautiful plants!', emoji: '🌻', points: 5 },
  plants_grown_10: { title: 'Garden Master! 🌳', message: 'Ten plants! A true garden!', emoji: '🌳', points: 10 },
  
  // Special milestones
  premium_unlocked: { title: 'Premium Unlocked! 💎', message: 'New plant types are now available!', emoji: '💎' },
  
  // Activity-specific milestones
  morning_master: { title: 'Morning Master! ☀️', message: '10 morning flows completed!', emoji: '☀️', points: 3 },
  breathing_champion: { title: 'Breathing Champion! 🌬️', message: '20 breathing exercises done!', emoji: '🌬️', points: 3 },
  meeting_prep_pro: { title: 'Meeting Prep Pro! 🎯', message: '15 meeting preparations!', emoji: '🎯', points: 3 },
  game_enthusiast: { title: 'Game Enthusiast! 🎮', message: '25 mindfulness games played!', emoji: '🎮', points: 3 },
};

// Milestone bonuses (streak-based) - kept for backward compat
export const MILESTONE_BONUSES = {
  STREAK_7: { extraLeaves: 2, stemGrowthPercent: 10 },
  STREAK_14: { triggerBloom: true },
  STREAK_30: { extraFlower: true },
  ACTIONS_50: { goldenLeaf: true },
  ACTIONS_100: { secondPlantUnlocked: true },
};

// Plant visual configurations
export const PLANT_CONFIGS: Record<PlantType, {
  name: string;
  leafColor: string;
  flowerColor: string;
  potColor: string;
  description: string;
  isPremium: boolean;
}> = {
  // Free tier
  classic: {
    name: 'Classic Houseplant',
    leafColor: '#4CAF50',
    flowerColor: '#FF69B4',
    potColor: '#8B4513',
    description: 'Reliable, friendly, approachable',
    isPremium: false,
  },
  succulent: {
    name: 'Succulent',
    leafColor: '#90EE90',
    flowerColor: '#FFD700',
    potColor: '#D2691E',
    description: 'Resilient, patient, steady',
    isPremium: false,
  },
  flowering: {
    name: 'Flowering Plant',
    leafColor: '#32CD32',
    flowerColor: '#FF1493',
    potColor: '#8B7355',
    description: 'Vibrant, joyful, celebratory',
    isPremium: false,
  },
  // Premium tier (unlocks after first plant matures)
  fern: {
    name: 'Fern',
    leafColor: '#228B22',
    flowerColor: 'none',
    potColor: '#5D4037',
    description: 'Lush, tropical, abundant',
    isPremium: true,
  },
  bonsai: {
    name: 'Bonsai',
    leafColor: '#9DC183',
    flowerColor: '#FFB7C5',
    potColor: '#4A3728',
    description: 'Zen, patient, meditative',
    isPremium: true,
  },
  monstera: {
    name: 'Monstera',
    leafColor: '#0F5D3E',
    flowerColor: 'none',
    potColor: '#37474F',
    description: 'Bold, modern, stylish',
    isPremium: true,
  },
  bamboo: {
    name: 'Bamboo',
    leafColor: '#7CB342',
    flowerColor: 'none',
    potColor: '#607D8B',
    description: 'Strong, flexible, zen',
    isPremium: true,
  },
  orchid: {
    name: 'Orchid',
    leafColor: '#2E7D32',
    flowerColor: '#DA70D6',
    potColor: '#ECEFF1',
    description: 'Exotic, elegant, sophisticated',
    isPremium: true,
  },
  ivy: {
    name: 'Ivy',
    leafColor: '#388E3C',
    flowerColor: '#FFFFFF',
    potColor: '#795548',
    description: 'Flowing, romantic, wild',
    isPremium: true,
  },
};

// Activity type mapping (for tracking)
const ACTIVITY_TO_KEY: Record<string, keyof Omit<ActivityCounts, 'totalActions'>> = {
  'pre-meeting-focus': 'preMeetingFocus',
  'pre-presentation-power': 'presentationPreps',
  'difficult-conversation-prep': 'presentationPreps',
  'quick-reset': 'quickResets',
  'post-meeting-decompress': 'eveningFlows',
  'end-of-day-transition': 'eveningFlows',
  'morning-intention': 'morningFlows',
  'evening-wind-down': 'eveningFlows',
  'weekend-wellness': 'extendedFlows',
  'deep-meditation': 'deepMeditations',
  'breathing': 'breathingPractices',
  'body-scan': 'extendedFlows',
  'thought-popper': 'games',
  'zen-match': 'games',
  'thought-sorter': 'games',
  'thought-reframing': 'thoughtReframes',
  'mandala': 'games',
  'sound-bowl': 'games',
  'thought-tidy': 'games',
  'gratitude': 'gratitudeEntries',
  'emotional-checkin': 'mindfulMoments',
  'flow': 'morningFlows',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate growth stage based on action count
 */
export function calculateGrowthStage(actionsCount: number): GrowthStage {
  if (actionsCount === 0) return 'seed';
  if (actionsCount <= GROWTH_THRESHOLDS.SEEDLING_MAX) return 'seedling';
  if (actionsCount <= GROWTH_THRESHOLDS.GROWING_MAX) return 'growing';
  if (actionsCount < GROWTH_THRESHOLDS.MATURE) return 'maturing';
  return 'mature';
}

/**
 * Calculate stem height percentage based on actions
 */
export function calculateStemHeight(actionsCount: number): number {
  if (actionsCount <= GROWTH_THRESHOLDS.SEEDLING_MAX) return 30;
  if (actionsCount <= GROWTH_THRESHOLDS.GROWING_MAX) return 60;
  if (actionsCount < GROWTH_THRESHOLDS.MATURE) return 90;
  return 100;
}

/**
 * Calculate flower buds count based on actions
 */
export function calculateFlowerBuds(actionsCount: number): number {
  let buds = 0;
  if (actionsCount >= GROWTH_THRESHOLDS.FIRST_BUD && actionsCount < GROWTH_THRESHOLDS.FIRST_BLOOM) buds++;
  if (actionsCount >= GROWTH_THRESHOLDS.SECOND_BUD && actionsCount < GROWTH_THRESHOLDS.SECOND_BLOOM) buds++;
  return buds;
}

/**
 * Calculate flowers count based on actions
 */
export function calculateFlowers(actionsCount: number): number {
  let flowers = 0;
  if (actionsCount >= GROWTH_THRESHOLDS.FIRST_BLOOM) flowers++;
  if (actionsCount >= GROWTH_THRESHOLDS.SECOND_BLOOM) flowers++;
  if (actionsCount >= GROWTH_THRESHOLDS.THIRD_BLOOM) flowers++;
  return flowers;
}

/**
 * Create default garden data for new users
 */
export function createDefaultOneGardenData(): OneGardenData {
  return {
    plants: [],
    activePlantId: null,
    activityCounts: {
      morningFlows: 0,
      eveningFlows: 0,
      extendedFlows: 0,
      deepMeditations: 0,
      presentationPreps: 0,
      difficultConversationPreps: 0,
      gratitudeEntries: 0,
      breathingPractices: 0,
      thoughtReframes: 0,
      mindfulMoments: 0,
      quickResets: 0,
      preMeetingFocus: 0,
      games: 0,
      totalActions: 0,
    },
    streak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    totalActiveDays: 0,
    premiumUnlocked: false,
    firstPlantMaturedAt: null,
    achievedMilestones: [],
    hasCompletedOnboarding: false,
    version: 'one-plant-v2',
  };
}

/**
 * Create a new plant with the given type
 */
export function createNewPlant(type: PlantType, position: number): OnePlant {
  return {
    id: `plant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    actionsCount: 0,
    leavesCount: 0,
    flowersCount: 0,
    flowerBudsCount: 0,
    growthStage: 'seed',
    plantedAt: new Date().toISOString(),
    position,
  };
}

/**
 * Update plant's visual state based on action count
 */
export function updatePlantVisuals(plant: OnePlant): OnePlant {
  return {
    ...plant,
    leavesCount: Math.min(plant.actionsCount, GROWTH_THRESHOLDS.MAX_LEAVES),
    flowerBudsCount: calculateFlowerBuds(plant.actionsCount),
    flowersCount: calculateFlowers(plant.actionsCount),
    growthStage: calculateGrowthStage(plant.actionsCount),
  };
}

/**
 * Check for newly achieved milestones and return them
 */
export function checkMilestones(
  gardenData: OneGardenData,
  previousState: {
    streak: number;
    totalActions: number;
    maturePlants: number;
    activePlantActions: number;
  }
): MilestoneNotification[] {
  const newMilestones: MilestoneNotification[] = [];
  const achieved = gardenData.achievedMilestones || [];
  
  const addMilestone = (type: MilestoneType) => {
    if (!achieved.includes(type)) {
      achieved.push(type);
      const def = MILESTONE_DEFINITIONS[type];
      newMilestones.push({ type, ...def });
    }
  };
  
  const activePlant = getActivePlant(gardenData);
  const currentActions = activePlant?.actionsCount || 0;
  const prevActions = previousState.activePlantActions;
  
  // Plant growth milestones (for active plant)
  if (prevActions === 0 && currentActions >= 1) addMilestone('plant_sprouted');
  if (prevActions < 10 && currentActions >= 10) addMilestone('plant_seedling');
  if (prevActions < 15 && currentActions >= 15) addMilestone('plant_first_bud');
  if (prevActions < 20 && currentActions >= 20) addMilestone('plant_first_bloom');
  if (prevActions < 25 && currentActions >= 25) addMilestone('plant_second_bud');
  if (prevActions < 30 && currentActions >= 30) addMilestone('plant_mature');
  
  // Streak milestones
  const prevStreak = previousState.streak;
  const currStreak = gardenData.streak;
  if (prevStreak < 3 && currStreak >= 3) addMilestone('streak_3');
  if (prevStreak < 7 && currStreak >= 7) addMilestone('streak_7');
  if (prevStreak < 14 && currStreak >= 14) addMilestone('streak_14');
  if (prevStreak < 30 && currStreak >= 30) addMilestone('streak_30');
  if (prevStreak < 60 && currStreak >= 60) addMilestone('streak_60');
  if (prevStreak < 100 && currStreak >= 100) addMilestone('streak_100');
  
  // Total actions milestones
  const prevTotal = previousState.totalActions;
  const currTotal = gardenData.activityCounts.totalActions;
  if (prevTotal < 10 && currTotal >= 10) addMilestone('total_actions_10');
  if (prevTotal < 25 && currTotal >= 25) addMilestone('total_actions_25');
  if (prevTotal < 50 && currTotal >= 50) addMilestone('total_actions_50');
  if (prevTotal < 100 && currTotal >= 100) addMilestone('total_actions_100');
  if (prevTotal < 250 && currTotal >= 250) addMilestone('total_actions_250');
  if (prevTotal < 500 && currTotal >= 500) addMilestone('total_actions_500');
  
  // Plants grown milestones
  const maturePlants = gardenData.plants.filter(p => p.actionsCount >= 30).length;
  const prevMature = previousState.maturePlants;
  if (prevMature < 2 && maturePlants >= 2) addMilestone('plants_grown_2');
  if (prevMature < 5 && maturePlants >= 5) addMilestone('plants_grown_5');
  if (prevMature < 10 && maturePlants >= 10) addMilestone('plants_grown_10');
  
  // Premium unlock milestone
  if (!achieved.includes('premium_unlocked') && gardenData.premiumUnlocked) {
    addMilestone('premium_unlocked');
  }
  
  // Activity-specific milestones
  const counts = gardenData.activityCounts;
  if (counts.morningFlows >= 10 && !achieved.includes('morning_master')) addMilestone('morning_master');
  if (counts.breathingPractices >= 20 && !achieved.includes('breathing_champion')) addMilestone('breathing_champion');
  if ((counts.preMeetingFocus + counts.presentationPreps) >= 15 && !achieved.includes('meeting_prep_pro')) addMilestone('meeting_prep_pro');
  if (counts.games >= 25 && !achieved.includes('game_enthusiast')) addMilestone('game_enthusiast');
  
  // Update the achieved milestones array
  gardenData.achievedMilestones = achieved;
  
  return newMilestones;
}

/**
 * Get growth message based on action count
 */
export function getGrowthMessage(actionsCount: number, _previousCount?: number): string {
  // Milestone messages
  if (actionsCount === 1) return 'Your seed is sprouting! 🌱';
  if (actionsCount === 5) return 'Your seedling is growing! 🌿';
  if (actionsCount === 10) return 'Almost ready to grow taller! 🪴';
  if (actionsCount === 11) return 'Your plant is growing! 🌿';
  if (actionsCount === 15) return 'A flower bud appeared! Keep going! 🌸';
  if (actionsCount === 20) return 'Your flower bloomed! 🌺';
  if (actionsCount === 25) return 'Another flower bud! Your plant is thriving! 💐';
  if (actionsCount === 30) return '🎉 Your plant is fully grown! You can now add a new plant to your garden!';
  
  // General progress messages
  if (actionsCount <= 10) return `${actionsCount} leaves grown - keep practicing!`;
  if (actionsCount <= 20) return `Your plant is maturing beautifully! (${actionsCount}/30)`;
  if (actionsCount < 30) return `Just ${30 - actionsCount} more practices until maturity!`;
  return 'Your plant is thriving! Add another plant to grow your garden!';
}

// ============================================
// MAIN SERVICE FUNCTIONS
// ============================================

/**
 * Get garden state for a user
 */
export async function getGardenState(userId: string): Promise<OneGardenData> {
  const gardenState = await prisma.emotionGardenState.findUnique({
    where: { userId },
  });
  
  if (!gardenState || !gardenState.gardenData) {
    return createDefaultOneGardenData();
  }
  
  const data = gardenState.gardenData as any;
  
  // Check if this is the new one-plant v2 system
  if (data.version === 'one-plant-v2') {
    return data as OneGardenData;
  }
  
  // Migration from v1 or old system - start fresh
  return createDefaultOneGardenData();
}

/**
 * Get the active plant (the one currently being grown)
 */
export function getActivePlant(gardenData: OneGardenData): OnePlant | null {
  if (!gardenData.activePlantId) return null;
  return gardenData.plants.find(p => p.id === gardenData.activePlantId) || null;
}

/**
 * Check if user can add a new plant
 * - First plant: always allowed
 * - Additional plants: only when current active plant is mature (30+ actions)
 */
export function canAddNewPlant(gardenData: OneGardenData): boolean {
  // No plants yet - can add first one
  if (gardenData.plants.length === 0) return true;
  
  // No active plant - can add one
  if (!gardenData.activePlantId) return true;
  
  // Check if active plant is mature
  const activePlant = getActivePlant(gardenData);
  if (!activePlant) return true;
  
  return activePlant.actionsCount >= GROWTH_THRESHOLDS.MATURE;
}

/**
 * Check if premium plants are unlocked
 * Premium unlocks after user matures their first plant
 */
export function isPremiumUnlocked(gardenData: OneGardenData): boolean {
  return gardenData.premiumUnlocked || gardenData.firstPlantMaturedAt !== null;
}

/**
 * Select and plant a seed (either first plant or adding to garden)
 */
export async function selectSeed(userId: string, plantType: PlantType): Promise<{
  success: boolean;
  plant: OnePlant | null;
  message: string;
  isFirstPlant: boolean;
}> {
  try {
    const gardenData = await getGardenState(userId);
    
    // Check if user can add a new plant
    if (!canAddNewPlant(gardenData)) {
      return {
        success: false,
        plant: getActivePlant(gardenData),
        message: 'Your current plant needs to mature (30 actions) before you can add another!',
        isFirstPlant: false,
      };
    }
    
    // Check if premium plant is accessible
    const config = PLANT_CONFIGS[plantType];
    if (config.isPremium && !isPremiumUnlocked(gardenData)) {
      return {
        success: false,
        plant: null,
        message: 'Premium plants unlock after your first plant matures! Keep growing!',
        isFirstPlant: gardenData.plants.length === 0,
      };
    }
    
    const isFirstPlant = gardenData.plants.length === 0;
    
    // Create new plant at next position
    const position = gardenData.plants.length;
    const newPlant = createNewPlant(plantType, position);
    
    // Add to garden and set as active
    gardenData.plants.push(newPlant);
    gardenData.activePlantId = newPlant.id;
    gardenData.hasCompletedOnboarding = true;
    
    // Save
    await prisma.emotionGardenState.upsert({
      where: { userId },
      update: {
        gardenData: gardenData as any,
        lastUpdated: new Date(),
      },
      create: {
        userId,
        gardenData: gardenData as any,
        lastUpdated: new Date(),
      },
    });
    
    logger.info('Seed planted', { userId, plantType, position, isFirstPlant });
    
    const message = isFirstPlant
      ? `Your ${config.name} seed is planted! 🌱 Complete your first flow to help it sprout!`
      : `A new ${config.name} joins your garden! 🌱`;
    
    return {
      success: true,
      plant: newPlant,
      message,
      isFirstPlant,
    };
  } catch (error) {
    logger.error('Error selecting seed:', error);
    throw error;
  }
}

/**
 * Record an activity and grow the active plant
 * This is the CORE function - each action = 1 growth increment
 * IMPORTANT: Actions ONLY apply to the active growing plant, never to mature plants
 */
export async function recordActivity(userId: string, activityType: string): Promise<{
  success: boolean;
  plant: OnePlant | null;
  message: string;
  milestones: MilestoneNotification[];
  plantMatured?: boolean;
  premiumJustUnlocked?: boolean;
  canAddNewPlant?: boolean;
}> {
  try {
    const gardenData = await getGardenState(userId);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Initialize achievedMilestones if not present (migration)
    if (!gardenData.achievedMilestones) {
      gardenData.achievedMilestones = [];
    }
    
    // Check if user has an active plant
    let activePlant = getActivePlant(gardenData);
    
    // If no active plant OR active plant is mature, we need to handle it
    if (!activePlant) {
      return {
        success: false,
        plant: null,
        message: 'Please plant a seed first to start growing!',
        milestones: [],
        canAddNewPlant: true,
      };
    }
    
    // If active plant is already mature, user needs to add a new plant
    if (activePlant.actionsCount >= GROWTH_THRESHOLDS.MATURE) {
      return {
        success: false,
        plant: activePlant,
        message: 'Your current plant is fully grown! Add a new plant to continue growing.',
        milestones: [],
        canAddNewPlant: true,
        plantMatured: true,
      };
    }
    
    // CAPTURE PREVIOUS STATE (for milestone checking)
    const previousState = {
      streak: gardenData.streak,
      totalActions: gardenData.activityCounts.totalActions,
      maturePlants: gardenData.plants.filter(p => p.actionsCount >= 30).length,
      activePlantActions: activePlant.actionsCount,
    };
    
    // 1. INCREMENT ACTION COUNT (core mechanic) - ONLY on growing plant
    activePlant.actionsCount += 1;
    
    // 2. UPDATE PLANT VISUALS
    const updatedPlant = updatePlantVisuals(activePlant);
    Object.assign(activePlant, updatedPlant);
    
    // 3. CHECK FOR MATURITY
    let plantMatured = false;
    let premiumJustUnlocked = false;
    
    if (previousState.activePlantActions < GROWTH_THRESHOLDS.MATURE && 
        activePlant.actionsCount >= GROWTH_THRESHOLDS.MATURE) {
      activePlant.maturedAt = now.toISOString();
      plantMatured = true;
      
      // Check if this is the first mature plant (unlocks premium)
      if (!gardenData.firstPlantMaturedAt) {
        gardenData.firstPlantMaturedAt = now.toISOString();
        gardenData.premiumUnlocked = true;
        premiumJustUnlocked = true;
      }
    }
    
    // 4. UPDATE ACTIVITY COUNTS (for insights)
    const activityKey = ACTIVITY_TO_KEY[activityType];
    if (activityKey) {
      gardenData.activityCounts[activityKey]++;
    }
    gardenData.activityCounts.totalActions++;
    
    // 5. UPDATE STREAKS
    if (gardenData.lastActiveDate) {
      const lastDate = gardenData.lastActiveDate.split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastDate === yesterdayStr) {
        // Consecutive day - increment streak
        gardenData.streak++;
      } else if (lastDate !== todayStr) {
        // Streak broken - reset to 1
        gardenData.streak = 1;
      }
      // If lastDate === todayStr, streak stays the same (already practiced today)
    } else {
      gardenData.streak = 1;
    }
    gardenData.longestStreak = Math.max(gardenData.longestStreak, gardenData.streak);
    
    if (gardenData.lastActiveDate?.split('T')[0] !== todayStr) {
      gardenData.totalActiveDays++;
    }
    gardenData.lastActiveDate = now.toISOString();
    
    // 6. CHECK ALL MILESTONES
    const milestones = checkMilestones(gardenData, previousState);
    
    // 7. APPLY BONUS POINTS FROM MILESTONES (to growing plant if not mature)
    if (activePlant.actionsCount < GROWTH_THRESHOLDS.MATURE) {
      for (const milestone of milestones) {
        if (milestone.points && milestone.points > 0) {
          activePlant.actionsCount += milestone.points;
          // Re-check visuals after bonus
          const bonusUpdated = updatePlantVisuals(activePlant);
          Object.assign(activePlant, bonusUpdated);
          
          // Check if bonus caused maturity
          if (activePlant.actionsCount >= GROWTH_THRESHOLDS.MATURE && !activePlant.maturedAt) {
            activePlant.maturedAt = now.toISOString();
            plantMatured = true;
          }
        }
      }
    }
    
    // 8. SAVE
    await prisma.emotionGardenState.upsert({
      where: { userId },
      update: {
        gardenData: gardenData as any,
        lastUpdated: now,
      },
      create: {
        userId,
        gardenData: gardenData as any,
        lastUpdated: now,
      },
    });
    
    // 9. GENERATE MESSAGE
    const message = getGrowthMessage(activePlant.actionsCount, previousState.activePlantActions);
    
    logger.info('Activity recorded', { 
      userId, 
      activityType, 
      actionsCount: activePlant.actionsCount,
      plantMatured,
      milestonesEarned: milestones.length,
      totalPlants: gardenData.plants.length,
    });
    
    return {
      success: true,
      plant: activePlant,
      message,
      milestones,
      plantMatured,
      premiumJustUnlocked,
      canAddNewPlant: canAddNewPlant(gardenData),
    };
  } catch (error) {
    logger.error('Error recording activity:', error);
    throw error;
  }
}

/**
 * Get garden insights for the user
 */
export async function getGardenInsights(userId: string): Promise<{
  activePlant: OnePlant | null;
  plants: OnePlant[];
  totalActions: number;
  currentStreak: number;
  longestStreak: number;
  progressToMature: number;
  canAddNewPlant: boolean;
  premiumUnlocked: boolean;
  nextMilestone: { action: number; description: string } | null;
  activityBreakdown: ActivityCounts;
  maturePlantsCount: number;
  growingPlantsCount: number;
}> {
  const gardenData = await getGardenState(userId);
  const activePlant = getActivePlant(gardenData);
  
  const currentActions = activePlant?.actionsCount || 0;
  const progressToMature = Math.min(100, Math.round((currentActions / GROWTH_THRESHOLDS.MATURE) * 100));
  
  // Count plants by status
  const maturePlantsCount = gardenData.plants.filter(p => p.actionsCount >= GROWTH_THRESHOLDS.MATURE).length;
  const growingPlantsCount = gardenData.plants.filter(p => p.actionsCount < GROWTH_THRESHOLDS.MATURE).length;
  
  // Calculate next milestone
  let nextMilestone: { action: number; description: string } | null = null;
  if (activePlant) {
    const milestones = [
      { action: 10, description: 'Seedling stage complete' },
      { action: 15, description: 'First flower bud' },
      { action: 20, description: 'First flower bloom' },
      { action: 25, description: 'Second flower bud' },
      { action: 30, description: 'Plant maturity!' },
    ];
    
    for (const milestone of milestones) {
      if (currentActions < milestone.action) {
        nextMilestone = milestone;
        break;
      }
    }
  }
  
  return {
    activePlant,
    plants: gardenData.plants,
    totalActions: gardenData.activityCounts.totalActions,
    currentStreak: gardenData.streak,
    longestStreak: gardenData.longestStreak,
    progressToMature,
    canAddNewPlant: canAddNewPlant(gardenData),
    premiumUnlocked: isPremiumUnlocked(gardenData),
    nextMilestone,
    activityBreakdown: gardenData.activityCounts,
    maturePlantsCount,
    growingPlantsCount,
  };
}

/**
 * Complete onboarding
 */
export async function completeOnboarding(userId: string): Promise<void> {
  const gardenData = await getGardenState(userId);
  gardenData.hasCompletedOnboarding = true;
  
  await prisma.emotionGardenState.upsert({
    where: { userId },
    update: {
      gardenData: gardenData as any,
      lastUpdated: new Date(),
    },
    create: {
      userId,
      gardenData: gardenData as any,
      lastUpdated: new Date(),
    },
  });
}

// Legacy compatibility - maps old updateGarden calls to new system
export async function updateGarden(userId: string, activityType: string, _pointsOverride?: number) {
  const result = await recordActivity(userId, activityType);
  // Map milestones to single milestoneReached for backward compatibility
  const milestoneReached = result.milestones.length > 0 
    ? `${result.milestones[0].emoji} ${result.milestones[0].title}`
    : undefined;
  return { ...result, milestoneReached };
}

// Legacy compatibility
export async function applyPendingGrowth(_userId: string) {
  // No longer needed in one-plant system - growth is instant
  return { applied: false, pointsApplied: 0, newPlant: null };
}

// Legacy - expandGarden is now just selectSeed
export async function expandGarden(userId: string, plantType: PlantType) {
  const result = await selectSeed(userId, plantType);
  return {
    success: result.success,
    newPlant: result.plant,
    maturePlant: null, // Plants don't get moved anymore
    message: result.message,
    totalPlantsGrown: result.success ? (await getGardenState(userId)).plants.length : 0,
  };
}
