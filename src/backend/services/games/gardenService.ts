import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type PlantType = 
  | 'daisy' | 'chamomile' | 'marigold' | 'morning-glory' | 'lavender'
  | 'sunflower' | 'evening-primrose' | 'rose' | 'lotus' | 'poppy' 
  | 'violet' | 'fern' | 'bamboo' | 'succulent' | 'herb' | 'ivy'
  | 'moonflower' | 'night-jasmine' | 'golden-flower' | 'cherry-tree' 
  | 'oak-sapling' | 'willow' | 'mature-tree' | 'tulip' | 'lily' | 'orchid' | 'clover' | 'snapdragon';

export type GrowthStage = 'seed' | 'sprout' | 'growing' | 'blooming' | 'full' | 'mature';

export type GardenState = 'thriving' | 'growing' | 'stable' | 'idle' | 'dormant';

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export type WeatherType = 'sunny' | 'partly-cloudy' | 'cloudy' | 'golden-hour' | 'mist' | 'gentle-rain' | 'soft-snow';

export interface Plant {
  id: string;
  type: string;
  x: number;
  y: number;
  growthStage: string;
  plantedAt: string;
  lastWatered?: string;
  bloomCount: number;
  associatedWith?: string;
}

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
  microFlows: number;
  games: number;
}

export interface GardenData {
  growthPoints: number;
  totalPoints: number;
  plants: Plant[];
  gridSize: number;
  activityCounts: ActivityCounts;
  activitiesThisWeek: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  daysSinceActive: number;
  totalActiveDays: number;
  unlockedPlants: string[];
  visualState: string;
  weather: string;
  season: string;
  growth: number;
  health: number;
  totalFlows: number;
  [key: string]: any;
}

// ============================================
// CONSTANTS
// ============================================

const NEW_PLANT_THRESHOLD = 20;
const BLOOM_THRESHOLD = 5;

export const ACTIVITY_POINTS: Record<string, number> = {
  'pre-meeting-focus': 20,
  'pre-presentation-power': 25,
  'difficult-conversation-prep': 25,
  'quick-reset': 15,
  'post-meeting-decompress': 20,
  'end-of-day-transition': 25,
  'morning-intention': 30,
  'evening-wind-down': 35,
  'weekend-wellness': 40,
  'deep-meditation': 50,
  'breathing': 10,
  'body-scan': 25,
  'thought-popper': 20,
  'zen-match': 20,
  'thought-sorter': 20,
  'thought-reframing': 30,
  'mandala': 40,
  'sound-bowl': 25,
  'thought-tidy': 20,
  'gratitude': 15,
};

const ACTIVITY_TO_PLANT: Record<string, string> = {
  'pre-meeting-focus': 'daisy',
  'pre-presentation-power': 'poppy',
  'difficult-conversation-prep': 'violet',
  'quick-reset': 'chamomile',
  'post-meeting-decompress': 'lavender',
  'end-of-day-transition': 'marigold',
  'morning-intention': 'morning-glory',
  'evening-wind-down': 'night-jasmine',
  'weekend-wellness': 'lotus',
  'deep-meditation': 'mature-tree',
  'breathing': 'bamboo',
  'body-scan': 'fern',
  'thought-popper': 'tulip',
  'zen-match': 'succulent',
  'thought-sorter': 'lily',
  'thought-reframing': 'orchid',
  'mandala': 'rose',
  'sound-bowl': 'bluebell',
  'thought-tidy': 'clover',
  'gratitude': 'golden-flower',
};

const ACTIVITY_TO_KEY: Record<string, keyof ActivityCounts> = {
  'pre-meeting-focus': 'preMeetingFocus',
  'pre-presentation-power': 'presentationPreps',
  'difficult-conversation-prep': 'difficultConversationPreps',
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
};

/**
 * Update garden state with proper plant growth from any activity
 */
export async function updateGarden(
  userId: string, 
  activityType: string, 
  pointsOverride?: number
) {
  try {
    let gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Default data structure
    const defaultData: GardenData = {
      growthPoints: 0,
      totalPoints: 0,
      plants: [],
      gridSize: 5,
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
        microFlows: 0,
        games: 0,
      },
      activitiesThisWeek: 0,
      streak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      daysSinceActive: 0,
      totalActiveDays: 0,
      unlockedPlants: ['daisy', 'chamomile', 'marigold', 'morning-glory', 'lavender'],
      visualState: 'stable',
      weather: 'sunny',
      season: getCurrentSeason(),
      growth: 0,
      health: 50,
      totalFlows: 0,
    };
    
    let gardenData: GardenData = gardenState?.gardenData 
      ? { ...defaultData, ...(gardenState.gardenData as object) }
      : defaultData;
    
    // 1. AWARD POINTS
    const points = pointsOverride || ACTIVITY_POINTS[activityType] || 10;
    gardenData.growthPoints += points;
    gardenData.totalPoints += points;
    
    // 2. UPDATE ACTIVITY COUNTS
    const key = ACTIVITY_TO_KEY[activityType];
    if (key && gardenData.activityCounts[key] !== undefined) {
      gardenData.activityCounts[key]++;
    }
    if (activityType.includes('flow')) {
      gardenData.totalFlows++;
      if (activityType.includes('pre-') || activityType.includes('quick-')) {
        gardenData.activityCounts.microFlows++;
      }
    }
    
    // 3. UPDATE STREAKS
    if (gardenData.lastActiveDate) {
      const lastDate = gardenData.lastActiveDate.split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastDate === yesterdayStr) {
        gardenData.streak++;
      } else if (lastDate !== todayStr) {
        gardenData.streak = 1;
      }
    } else {
      gardenData.streak = 1;
    }
    gardenData.longestStreak = Math.max(gardenData.longestStreak, gardenData.streak);
    
    if (gardenData.lastActiveDate?.split('T')[0] !== todayStr) {
      gardenData.totalActiveDays++;
    }
    gardenData.lastActiveDate = now.toISOString();
    
    // 4. PLANT GROWTH LOGIC
    let newPlant: Plant | null = null;
    if (!Array.isArray(gardenData.plants)) gardenData.plants = [];
    
    // Check for new plant
    if (gardenData.plants.length === 0 || gardenData.growthPoints >= NEW_PLANT_THRESHOLD) {
      if (gardenData.growthPoints >= NEW_PLANT_THRESHOLD) {
        gardenData.growthPoints -= NEW_PLANT_THRESHOLD;
      }
      
      const plantType = ACTIVITY_TO_PLANT[activityType] || 'daisy';
      const position = findEmptyPosition(gardenData.plants, gardenData.gridSize);
      
      if (position) {
        newPlant = {
          id: `plant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: plantType,
          x: position.x,
          y: position.y,
          growthStage: gardenData.plants.length === 0 ? 'growing' : 'sprout',
          plantedAt: now.toISOString(),
          bloomCount: 0,
          associatedWith: activityType,
        };
        gardenData.plants.push(newPlant);
        gardenData.growth++;
      }
    } else if (gardenData.growthPoints >= BLOOM_THRESHOLD && gardenData.plants.length > 0) {
      // Bloom an existing plant
      const randomPlant = gardenData.plants[Math.floor(Math.random() * gardenData.plants.length)];
      randomPlant.bloomCount++;
      
      const stages = ['seed', 'sprout', 'growing', 'blooming', 'full', 'mature'];
      const currentIdx = stages.indexOf(randomPlant.growthStage);
      if (currentIdx < stages.length - 1 && randomPlant.bloomCount >= (currentIdx + 1) * 2) {
        randomPlant.growthStage = stages[currentIdx + 1];
      }
    }
    
    // 5. UPDATE VISUALS & HEALTH
    gardenData.gridSize = calculateGridSize(gardenData.totalPoints);
    gardenData.health = Math.min(100, 50 + (gardenData.streak * 2) + (gardenData.plants.length * 2));
    gardenData.visualState = 'thriving';
    gardenData.weather = 'sunny';
    
    // 6. SAVE
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
    
    return {
      success: true,
      newPlant,
      pointsEarned: points,
      totalPoints: gardenData.totalPoints,
      streak: gardenData.streak,
    };
  } catch (error) {
    logger.error('Error in gardenService.updateGarden:', error);
    throw error;
  }
}

function findEmptyPosition(plants: Plant[], gridSize: number): { x: number; y: number } | null {
  const occupied = new Set(plants.map(p => `${p.x},${p.y}`));
  for (let attempts = 0; attempts < 100; attempts++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    if (!occupied.has(`${x},${y}`)) return { x, y };
  }
  return null;
}

function calculateGridSize(totalPoints: number): number {
  if (totalPoints >= 5000) return 15;
  if (totalPoints >= 2000) return 12;
  if (totalPoints >= 1000) return 10;
  if (totalPoints >= 500) return 7;
  return 5;
}

function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}
