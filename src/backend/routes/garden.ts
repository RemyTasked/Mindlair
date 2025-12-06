/**
 * Mind Garden - Garden State API
 * 
 * Endpoints for garden visualization and state management
 */

import express from 'express';
import { Prisma } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

const router = express.Router();

// Plant types that can be grown (aligned with spec)
type PlantType = 
  | 'sunflower' | 'moonflower' | 'lavender' | 'chamomile' | 'daisy'
  | 'rose' | 'lotus' | 'bamboo' | 'fern' | 'cherry-tree' | 'oak-sapling'
  | 'golden-flower' | 'ivy' | 'succulent'
  // New plants from spec
  | 'evening-primrose'  // Post-Meeting Decompress
  | 'morning-glory'     // Morning Intention Flow
  | 'night-jasmine'     // Evening Wind-Down Flow
  | 'mature-tree';      // Deep Meditation

type GrowthStage = 'seed' | 'sprout' | 'growing' | 'blooming' | 'full';

interface Plant {
  id: string;
  type: PlantType;
  x: number;
  y: number;
  growthStage: GrowthStage;
  plantedAt: string;
  lastWatered?: string;
  bloomCount: number;
  associatedWith?: string;
}

interface GardenData {
  health: number;
  plants: Plant[];
  weather: 'sunny' | 'cloudy' | 'rain';
  streak: number;
  lastFlowDate: string | null;
  totalFlows: number;
  flowsToday: number;
  growth: number;
  gridSize: number;
  theme: string;
  decorations: Array<{ id: string; type: string; x: number; y: number }>;
  [key: string]: unknown; // Index signature for Prisma JSON compatibility
}

// Map flow types to plant types (aligned with Mind Garden spec)
const FLOW_TO_PLANT: Record<string, PlantType> = {
  // Micro-flows (Calendar Plugin)
  'pre-meeting-focus': 'daisy',              // Small daisy
  'pre-presentation-power': 'sunflower',     // Bold sunflower
  'difficult-conversation-prep': 'lavender', // Resilient lavender
  'quick-reset': 'chamomile',                // Quick-blooming chamomile
  'post-meeting-decompress': 'evening-primrose', // Calming evening primrose
  'end-of-day-transition': 'moonflower',     // Twilight moonflower
  // Extended flows (Web Dashboard)
  'morning-intention': 'morning-glory',      // Morning glory vine
  'evening-wind-down': 'night-jasmine',      // Serene night jasmine
  'weekend-wellness': 'lotus',               // Contemplative lotus
  'deep-meditation': 'mature-tree',          // Mature tree (grows slowly)
  // Other flows
  'breathing': 'bamboo',
  'body-scan': 'lotus',
  'gratitude': 'golden-flower',
};

// Calculate grid size based on progress
function calculateGridSize(totalFlows: number): number {
  if (totalFlows >= 200) return 15;
  if (totalFlows >= 100) return 12;
  if (totalFlows >= 50) return 10;
  if (totalFlows >= 20) return 7;
  return 5;
}

// Find empty position in grid
function findEmptyPosition(plants: Plant[], gridSize: number): { x: number; y: number } | null {
  const occupied = new Set(plants.map(p => `${p.x},${p.y}`));
  
  // Try to find position near center first, then expand
  const center = Math.floor(gridSize / 2);
  for (let radius = 0; radius <= center; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = center + dx;
        const y = center + dy;
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
          if (!occupied.has(`${x},${y}`)) {
            return { x, y };
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * GET /api/garden/state
 * Get user's garden state for visualization
 */
router.get(
  '/state',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    // Get garden state
    let gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    // Get today's flow count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysFlows = await prisma.wellnessCheckIn.count({
      where: {
        userId,
        type: { startsWith: 'flow-' },
        createdAt: { gte: today },
      },
    });
    
    // Get total flows
    const totalFlows = await prisma.wellnessCheckIn.count({
      where: {
        userId,
        type: { startsWith: 'flow-' },
      },
    });
    
    // Calculate streak
    const recentCheckIns = await prisma.wellnessCheckIn.findMany({
      where: { userId, type: { startsWith: 'flow-' } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) {
      const hasFlowOnDate = recentCheckIns.some(ci => {
        const ciDate = new Date(ci.createdAt);
        ciDate.setHours(0, 0, 0, 0);
        return ciDate.getTime() === currentDate.getTime();
      });
      
      if (hasFlowOnDate) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (i === 0) {
        // Allow today to be skipped if checking during the day
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    const gridSize = calculateGridSize(totalFlows);
    
    // Default garden data
    const defaultData: GardenData = {
      health: 50 + Math.min(streak * 5, 30) + Math.min(todaysFlows * 5, 20),
      plants: [],
      weather: 'sunny',
      streak,
      lastFlowDate: recentCheckIns[0]?.createdAt?.toISOString() || null,
      totalFlows,
      flowsToday: todaysFlows,
      growth: 0,
      gridSize,
      theme: 'cottage',
      decorations: [],
    };
    
    let gardenData = gardenState?.gardenData as GardenData || defaultData;
    
    // Ensure gardenData has all required fields
    gardenData = {
      ...defaultData,
      ...gardenData,
      flowsToday: todaysFlows,
      totalFlows,
      streak,
      gridSize,
      health: Math.min(100, Math.max(0, 50 + streak * 5 + todaysFlows * 5)),
    };
    
    // Determine visual state based on health and activity
    let visualState: 'thriving' | 'growing' | 'stable' | 'idle' | 'dormant' = 'stable';
    if (gardenData.health >= 80 && streak >= 3) {
      visualState = 'thriving';
    } else if (gardenData.health >= 60 || todaysFlows > 0) {
      visualState = 'growing';
    } else if (gardenData.health >= 40) {
      visualState = 'stable';
    } else if (gardenData.health >= 20) {
      visualState = 'idle';
    } else {
      visualState = 'dormant';
    }
    
    // Determine weather based on recent activity
    let weather: 'sunny' | 'cloudy' | 'rain' = 'sunny';
    if (gardenData.health < 40) {
      weather = 'rain'; // Nourishing rain for struggling gardens
    } else if (gardenData.health < 70) {
      weather = 'cloudy';
    }
    
    res.json({
      ...gardenData,
      weather,
      visualState,
      lastUpdated: gardenState?.lastUpdated || new Date(),
    });
  })
);

/**
 * POST /api/garden/checkin
 * Record an emotion check-in and update garden
 */
router.post(
  '/checkin',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { emotion, intensity, notes } = req.body;
    
    // Record check-in
    const checkIn = await prisma.emotionCheckIn.create({
      data: {
        userId,
        emotion,
        intensity: intensity || 5,
        notes,
      },
    });
    
    logger.info('Emotion check-in recorded', { userId, emotion, intensity });
    
    // Update garden based on emotion
    const gardenState = await updateGardenFromEmotion(userId, emotion, intensity);
    
    res.json({
      success: true,
      checkIn,
      gardenState,
    });
  })
);

/**
 * POST /api/garden/plant
 * Plant a new flower in the garden after completing a flow
 */
router.post(
  '/plant',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { flowType, flowName } = req.body;
    
    // Get current garden state
    let gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    const totalFlows = await prisma.wellnessCheckIn.count({
      where: { userId, type: { startsWith: 'flow-' } },
    });
    
    const gridSize = calculateGridSize(totalFlows);
    
    const defaultData: GardenData = {
      health: 50,
      plants: [],
      weather: 'sunny',
      streak: 0,
      lastFlowDate: null,
      totalFlows: 0,
      flowsToday: 0,
      growth: 0,
      gridSize,
      theme: 'cottage',
      decorations: [],
    };
    
    let gardenData = (gardenState?.gardenData as unknown as GardenData) || defaultData;
    
    // Determine plant type
    const plantType: PlantType = FLOW_TO_PLANT[flowType] || 'daisy';
    
    // Find empty position
    const position = findEmptyPosition(gardenData.plants, gridSize);
    
    if (position) {
      const newPlant: Plant = {
        id: `plant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: plantType,
        x: position.x,
        y: position.y,
        growthStage: 'sprout',
        plantedAt: new Date().toISOString(),
        bloomCount: 0,
        associatedWith: flowName || flowType,
      };
      
      gardenData.plants.push(newPlant);
      gardenData.growth++;
      gardenData.health = Math.min(100, gardenData.health + 5);
      gardenData.gridSize = gridSize;
      
      // Save garden state
      if (gardenState) {
        await prisma.emotionGardenState.update({
          where: { userId },
          data: { gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
        });
      } else {
        await prisma.emotionGardenState.create({
          data: { userId, gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
        });
      }
      
      logger.info('Plant added to garden', { userId, plantType, position });
      
      res.json({
        success: true,
        plant: newPlant,
        gardenHealth: gardenData.health,
      });
    } else {
      // Garden is full - need to expand
      res.json({
        success: false,
        message: 'Garden is full! Complete more flows to expand.',
        gardenHealth: gardenData.health,
      });
    }
  })
);

/**
 * POST /api/garden/water
 * Water the garden (cosmetic effect)
 */
router.post(
  '/water',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    if (!gardenState) {
      return res.status(404).json({ error: 'Garden not found' });
    }
    
    const gardenData = JSON.parse(JSON.stringify(gardenState.gardenData)) as GardenData;
    
    // Update last watered time on all plants
    gardenData.plants = gardenData.plants.map(plant => ({
      ...plant,
      lastWatered: new Date().toISOString(),
    }));
    
    // Small health boost
    gardenData.health = Math.min(100, gardenData.health + 2);
    
    await prisma.emotionGardenState.update({
      where: { userId },
      data: { gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
    });
    
    logger.info('Garden watered', { userId });
    
    return res.json({
      success: true,
      message: 'Garden watered! ✨',
      gardenHealth: gardenData.health,
    });
  })
);

/**
 * POST /api/garden/grow
 * Progress plant growth stages
 */
router.post(
  '/grow',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { plantId } = req.body;
    
    const gardenState = await prisma.emotionGardenState.findUnique({
      where: { userId },
    });
    
    if (!gardenState) {
      return res.status(404).json({ error: 'Garden not found' });
    }
    
    const gardenData = JSON.parse(JSON.stringify(gardenState.gardenData)) as GardenData;
    const growthOrder: GrowthStage[] = ['seed', 'sprout', 'growing', 'blooming', 'full'];
    
    gardenData.plants = gardenData.plants.map(plant => {
      if (plant.id === plantId) {
        const currentIndex = growthOrder.indexOf(plant.growthStage);
        if (currentIndex < growthOrder.length - 1) {
          return {
            ...plant,
            growthStage: growthOrder[currentIndex + 1],
            bloomCount: plant.growthStage === 'growing' ? plant.bloomCount + 1 : plant.bloomCount,
          };
        }
      }
      return plant;
    });
    
    await prisma.emotionGardenState.update({
      where: { userId },
      data: { gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
    });
    
    const updatedPlant = gardenData.plants.find(p => p.id === plantId);
    
    return res.json({
      success: true,
      plant: updatedPlant,
    });
  })
);

/**
 * GET /api/garden/insights
 * Get insights about user's garden and patterns
 */
router.get(
  '/insights',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    // Get recent check-ins (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentCheckIns = await prisma.emotionCheckIn.findMany({
      where: {
        userId,
        createdAt: { gte: weekAgo },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Get recent flows
    const recentFlows = await prisma.wellnessCheckIn.findMany({
      where: {
        userId,
        type: { startsWith: 'flow-' },
        createdAt: { gte: weekAgo },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Calculate emotion distribution
    const emotionCounts: Record<string, number> = {};
    recentCheckIns.forEach(ci => {
      emotionCounts[ci.emotion] = (emotionCounts[ci.emotion] || 0) + 1;
    });
    
    // Find most common emotion
    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'neutral';
    
    // Calculate average intensity
    const avgIntensity = recentCheckIns.length > 0
      ? recentCheckIns.reduce((sum, ci) => sum + ci.intensity, 0) / recentCheckIns.length
      : 5;
    
    // Generate insights
    const insights: string[] = [];
    
    if (recentFlows.length >= 7) {
      insights.push('Great consistency! You completed flows every day this week.');
    } else if (recentFlows.length >= 3) {
      insights.push('Good progress! Keep building your flow habit.');
    } else {
      insights.push('Try adding more flows to your routine for better results.');
    }
    
    if (avgIntensity > 7) {
      insights.push('Your emotions have been intense lately. Consider more calming flows.');
    } else if (avgIntensity < 4) {
      insights.push('You seem balanced. Energizing flows might boost your day.');
    }
    
    res.json({
      period: '7 days',
      totalCheckIns: recentCheckIns.length,
      totalFlows: recentFlows.length,
      dominantEmotion,
      averageIntensity: Math.round(avgIntensity * 10) / 10,
      emotionDistribution: emotionCounts,
      insights,
    });
  })
);

/**
 * Update garden state based on emotion
 */
async function updateGardenFromEmotion(userId: string, emotion: string, intensity: number) {
  let gardenState = await prisma.emotionGardenState.findUnique({
    where: { userId },
  });
  
  const defaultData = {
    health: 50,
    plants: [],
    weather: 'sunny',
    streak: 0,
    lastFlowDate: null,
    totalFlows: 0,
    flowsToday: 0,
    growth: 0,
  };
  
  let gardenData = (gardenState?.gardenData as unknown as GardenData) || defaultData;
  
  // Positive emotions boost health
  const positiveEmotions = ['calm', 'joy', 'gratitude', 'confidence', 'peace'];
  const negativeEmotions = ['anxiety', 'anger', 'overwhelm', 'frustration', 'sadness'];
  
  if (positiveEmotions.includes(emotion)) {
    gardenData.health = Math.min(100, gardenData.health + Math.round(intensity / 2));
  } else if (negativeEmotions.includes(emotion)) {
    // Don't punish for negative emotions - garden just doesn't grow
    // But acknowledge that user checked in
    gardenData.health = Math.max(10, gardenData.health - 1);
  }
  
  // Update weather based on recent emotions
  if (positiveEmotions.includes(emotion) && intensity >= 7) {
    gardenData.weather = 'sunny';
  } else if (negativeEmotions.includes(emotion) && intensity >= 7) {
    gardenData.weather = 'cloudy';
  }
  
  // Save garden state
  if (gardenState) {
    gardenState = await prisma.emotionGardenState.update({
      where: { userId },
      data: { gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
    });
  } else {
    gardenState = await prisma.emotionGardenState.create({
      data: { userId, gardenData: gardenData as Prisma.InputJsonValue, lastUpdated: new Date() },
    });
  }
  
  return gardenData;
}

export default router;

