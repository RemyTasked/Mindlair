/**
 * Mind Garden - Flows API
 * 
 * Endpoints for micro-flow management in the calendar extension
 */

import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

const router = express.Router();

// Type definitions for flows (mirrors shared/microflows.ts)
interface MicroFlow {
  id: string;
  name: string;
  shortName: string;
  description: string;
  duration: number;
  bestFor: string[];
  icon: string;
}

// Available flows (simplified version for API)
const AVAILABLE_FLOWS: MicroFlow[] = [
  {
    id: 'pre-meeting-focus',
    name: 'Pre-Meeting Focus',
    shortName: 'Focus',
    description: 'Center yourself before any meeting with focused breathing and intention setting.',
    duration: 120,
    bestFor: ['Standard meetings', 'Check-ins', 'One-on-ones'],
    icon: '🎯',
  },
  {
    id: 'pre-presentation-power',
    name: 'Pre-Presentation Power',
    shortName: 'Power Up',
    description: 'Build confidence and presence before presentations, pitches, and speeches.',
    duration: 180,
    bestFor: ['Presentations', 'Pitches', 'Demos', 'Interviews'],
    icon: '⚡',
  },
  {
    id: 'difficult-conversation-prep',
    name: 'Difficult Conversation Prep',
    shortName: 'Ground',
    description: 'Ground yourself before challenging discussions.',
    duration: 180,
    bestFor: ['Performance reviews', 'Conflicts', 'Hard feedback'],
    icon: '🌿',
  },
  {
    id: 'quick-reset',
    name: 'Quick Reset',
    shortName: 'Reset',
    description: 'A rapid 90-second reset to clear your mind between meetings.',
    duration: 90,
    bestFor: ['Between meetings', 'Context switching'],
    icon: '🔄',
  },
  {
    id: 'post-meeting-decompress',
    name: 'Post-Meeting Decompress',
    shortName: 'Decompress',
    description: 'Release tension and transition after difficult meetings.',
    duration: 120,
    bestFor: ['After difficult meetings', 'After long meetings'],
    icon: '🌊',
  },
  {
    id: 'end-of-day-transition',
    name: 'End-of-Day Transition',
    shortName: 'Transition',
    description: 'Create a mental boundary between work and personal life.',
    duration: 180,
    bestFor: ['After last meeting', 'Before commute'],
    icon: '🌅',
  },
];

/**
 * GET /api/flows
 * Get all available micro-flows
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({
      flows: AVAILABLE_FLOWS,
      count: AVAILABLE_FLOWS.length,
    });
  })
);

/**
 * GET /api/flows/:flowId
 * Get a specific flow by ID
 */
router.get(
  '/:flowId',
  asyncHandler(async (req, res) => {
    const { flowId } = req.params;
    const flow = AVAILABLE_FLOWS.find(f => f.id === flowId);
    
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    
    return res.json({ flow });
  })
);

// Points for each flow type
const FLOW_POINTS: Record<string, number> = {
  'pre-meeting-focus': 10,
  'pre-presentation-power': 15,
  'difficult-conversation-prep': 15,
  'quick-reset': 5,
  'post-meeting-decompress': 10,
  'end-of-day-transition': 15,
  'morning-intention': 20,
  'evening-wind-down': 25,
  'weekend-wellness': 30,
  'deep-meditation': 40,
  'breathing': 5,
  'body-scan': 20,
};

// Map flow types to plant types
const FLOW_TO_PLANT: Record<string, string> = {
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
};

// Map flow types to activity count keys
const FLOW_TO_ACTIVITY: Record<string, string> = {
  'pre-meeting-focus': 'microFlows',
  'pre-presentation-power': 'microFlows',
  'difficult-conversation-prep': 'microFlows',
  'quick-reset': 'microFlows',
  'post-meeting-decompress': 'microFlows',
  'end-of-day-transition': 'microFlows',
  'morning-intention': 'morningFlows',
  'evening-wind-down': 'eveningFlows',
  'weekend-wellness': 'extendedFlows',
  'deep-meditation': 'deepMeditations',
  'breathing': 'breathingPractices',
  'body-scan': 'deepMeditations',
};

/**
 * POST /api/flows/complete
 * Record a completed flow and update garden state with proper plant growth
 */
router.post(
  '/complete',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { flowType, meetingId, duration } = req.body;
    
    logger.info('Flow completed', { userId, flowType, meetingId, duration });
    
    // Record in FocusSession if meeting-related
    if (meetingId) {
      await prisma.focusSession.upsert({
        where: { meetingId },
        create: {
          userId,
          meetingId,
          breathingExerciseCompleted: true,
          prepMode: flowType,
          duration: duration || 120,
          completedAt: new Date(),
        },
        update: {
          breathingExerciseCompleted: true,
          prepMode: flowType,
          duration: duration || 120,
          completedAt: new Date(),
        },
      });
    }
    
    // Record in WellnessCheckIn for tracking
    await prisma.wellnessCheckIn.create({
      data: {
        userId,
        type: `flow-${flowType}`,
        completed: true,
        notes: meetingId ? `Meeting: ${meetingId}` : null,
      },
    });
    
    // Update garden state with proper plant growth
    const gardenResult = await updateGardenWithPlants(userId, flowType, duration);
    
    res.json({
      success: true,
      message: gardenResult.newPlant 
        ? '🌱 New plant added to your garden!' 
        : '✨ Your garden is growing!',
      gardenState: gardenResult,
    });
  })
);

// Plant interface
interface Plant {
  id: string;
  type: string;
  x: number;
  y: number;
  growthStage: 'seed' | 'sprout' | 'growing' | 'blooming' | 'mature';
  plantedAt: string;
  bloomCount: number;
  associatedWith?: string;
}

// Garden data structure (must match garden.ts)
interface GardenData {
  growthPoints: number;
  totalPoints: number;
  activityCounts: Record<string, number>;
  streak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  totalActiveDays: number;
  plants: Plant[];
  gridSize: number;
  unlockedPlants: string[];
  visualState: string;
  weather: string;
  growth: number;
}

// Find empty position in grid
function findEmptyPosition(plants: Plant[], gridSize: number): { x: number; y: number } | null {
  const occupied = new Set(plants.map(p => `${p.x},${p.y}`));
  
  // Try to find a random empty spot
  for (let attempts = 0; attempts < 50; attempts++) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    if (!occupied.has(`${x},${y}`)) {
      return { x, y };
    }
  }
  
  // Fallback: linear search
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      if (!occupied.has(`${x},${y}`)) {
        return { x, y };
      }
    }
  }
  
  return null;
}

// Calculate grid size based on points
function calculateGridSize(totalPoints: number): number {
  if (totalPoints >= 5000) return 15;
  if (totalPoints >= 2000) return 12;
  if (totalPoints >= 1000) return 10;
  if (totalPoints >= 500) return 7;
  return 5;
}

// Calculate garden visual state
function calculateVisualState(activitiesThisWeek: number): string {
  if (activitiesThisWeek >= 5) return 'thriving';
  if (activitiesThisWeek >= 3) return 'growing';
  if (activitiesThisWeek >= 1) return 'stable';
  return 'idle';
}

/**
 * Update garden state with proper plant growth
 */
async function updateGardenWithPlants(userId: string, flowType: string, duration?: number) {
  // Get or create garden state
  let gardenState = await prisma.emotionGardenState.findUnique({
    where: { userId },
  });
  
  const today = new Date().toISOString().split('T')[0];
  
  // Default garden data
  const defaultData: GardenData = {
    growthPoints: 0,
    totalPoints: 0,
    activityCounts: {
      microFlows: 0,
      morningFlows: 0,
      eveningFlows: 0,
      extendedFlows: 0,
      deepMeditations: 0,
      games: 0,
      gratitudeEntries: 0,
      breathingPractices: 0,
      thoughtReframes: 0,
    },
    streak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    totalActiveDays: 0,
    plants: [],
    gridSize: 5,
    unlockedPlants: ['daisy', 'chamomile', 'marigold', 'morning-glory', 'lavender'],
    visualState: 'idle',
    weather: 'sunny',
    growth: 0,
  };
  
  let gardenData: GardenData = gardenState?.gardenData 
    ? { ...defaultData, ...(gardenState.gardenData as object) }
    : defaultData;
  
  // Calculate points
  let points = FLOW_POINTS[flowType] || 10;
  if (duration && duration > 300) {
    points = Math.floor(points * 1.5); // 50% bonus for longer sessions
  }
  
  // Update activity counts
  const activityKey = FLOW_TO_ACTIVITY[flowType];
  if (activityKey && gardenData.activityCounts[activityKey] !== undefined) {
    gardenData.activityCounts[activityKey]++;
  }
  
  // Award points
  gardenData.growthPoints += points;
  gardenData.totalPoints += points;
  
  // Update streak
  if (gardenData.lastActiveDate) {
    const lastDate = gardenData.lastActiveDate.split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastDate === yesterdayStr) {
      gardenData.streak++;
    } else if (lastDate !== today) {
      gardenData.streak = 1;
    }
  } else {
    gardenData.streak = 1;
  }
  
  // Update longest streak
  if (gardenData.streak > gardenData.longestStreak) {
    gardenData.longestStreak = gardenData.streak;
  }
  
  // Track active day
  if (gardenData.lastActiveDate?.split('T')[0] !== today) {
    gardenData.totalActiveDays++;
  }
  gardenData.lastActiveDate = new Date().toISOString();
  
  // Check for new plant (every 30 points)
  let newPlant: Plant | null = null;
  const NEW_PLANT_THRESHOLD = 30;
  
  if (gardenData.growthPoints >= NEW_PLANT_THRESHOLD) {
    gardenData.growthPoints -= NEW_PLANT_THRESHOLD;
    
    const plantType = FLOW_TO_PLANT[flowType] || 'daisy';
    const position = findEmptyPosition(gardenData.plants, gardenData.gridSize);
    
    if (position) {
      newPlant = {
        id: `plant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: plantType,
        x: position.x,
        y: position.y,
        growthStage: 'sprout',
        plantedAt: new Date().toISOString(),
        bloomCount: 0,
        associatedWith: flowType,
      };
      
      gardenData.plants.push(newPlant);
      gardenData.growth++;
      
      logger.info('New plant added to garden', { userId, plantType, position });
    }
  } else if (gardenData.plants.length > 0) {
    // Bloom existing plant
    const randomIdx = Math.floor(Math.random() * gardenData.plants.length);
    gardenData.plants[randomIdx].bloomCount++;
    
    // Progress growth stage
    const plant = gardenData.plants[randomIdx];
    const stages: Plant['growthStage'][] = ['seed', 'sprout', 'growing', 'blooming', 'mature'];
    const currentIdx = stages.indexOf(plant.growthStage);
    if (currentIdx < stages.length - 1 && plant.bloomCount >= (currentIdx + 1) * 2) {
      plant.growthStage = stages[currentIdx + 1];
    }
  }
  
  // Update grid size
  gardenData.gridSize = calculateGridSize(gardenData.totalPoints);
  
  // Calculate activities this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const activitiesThisWeek = await prisma.wellnessCheckIn.count({
    where: {
      userId,
      createdAt: { gte: weekAgo },
      completed: true,
    },
  });
  
  // Update visual state
  gardenData.visualState = calculateVisualState(activitiesThisWeek);
  
  // Update weather based on streak
  if (gardenData.streak >= 7) {
    gardenData.weather = 'sunny';
  } else if (gardenData.streak >= 3) {
    gardenData.weather = 'partly-cloudy';
  } else {
    gardenData.weather = 'gentle-rain';
  }
  
  // Save garden state (cast to Prisma-compatible JSON type)
  if (gardenState) {
    await prisma.emotionGardenState.update({
      where: { userId },
      data: { gardenData: gardenData as any, lastUpdated: new Date() },
    });
  } else {
    await prisma.emotionGardenState.create({
      data: { userId, gardenData: gardenData as any, lastUpdated: new Date() },
    });
  }
  
  return {
    pointsEarned: points,
    totalPoints: gardenData.totalPoints,
    newPlant,
    plantCount: gardenData.plants.length,
    streak: gardenData.streak,
    visualState: gardenData.visualState,
  };
}

export default router;

