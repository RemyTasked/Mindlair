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
    
    res.json({ flow });
  })
);

/**
 * POST /api/flows/complete
 * Record a completed flow and update garden state
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
    
    // Update emotion garden state
    const gardenState = await updateGardenState(userId, flowType);
    
    res.json({
      success: true,
      message: 'Flow completed! Your garden is growing.',
      gardenState,
    });
  })
);

/**
 * Update garden state after completing a flow
 */
async function updateGardenState(userId: string, flowType: string) {
  // Get or create garden state
  let gardenState = await prisma.emotionGardenState.findUnique({
    where: { userId },
  });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Default garden data structure
  const defaultGardenData = {
    health: 50, // 0-100
    plants: [],
    weather: 'sunny',
    streak: 0,
    lastFlowDate: null,
    totalFlows: 0,
    flowsToday: 0,
    growth: 0,
  };
  
  let gardenData = gardenState?.gardenData as typeof defaultGardenData || defaultGardenData;
  
  // Check if last flow was yesterday for streak
  const lastFlowDate = gardenData.lastFlowDate ? new Date(gardenData.lastFlowDate) : null;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (lastFlowDate) {
    const lastFlowDay = new Date(lastFlowDate);
    lastFlowDay.setHours(0, 0, 0, 0);
    
    if (lastFlowDay.getTime() === yesterday.getTime()) {
      // Continue streak
      gardenData.streak = (gardenData.streak || 0) + 1;
    } else if (lastFlowDay.getTime() < yesterday.getTime()) {
      // Break streak (but don't reset on same day)
      gardenData.streak = 1;
    }
    
    // Reset flows today if new day
    if (lastFlowDay.getTime() < today.getTime()) {
      gardenData.flowsToday = 0;
    }
  } else {
    gardenData.streak = 1;
  }
  
  // Update garden metrics
  gardenData.lastFlowDate = new Date().toISOString();
  gardenData.totalFlows = (gardenData.totalFlows || 0) + 1;
  gardenData.flowsToday = (gardenData.flowsToday || 0) + 1;
  gardenData.health = Math.min(100, (gardenData.health || 50) + 5); // Increase health
  gardenData.growth = (gardenData.growth || 0) + 1;
  
  // Determine weather based on streak
  if (gardenData.streak >= 7) {
    gardenData.weather = 'rainbow';
  } else if (gardenData.streak >= 3) {
    gardenData.weather = 'sunny';
  } else if (gardenData.streak >= 1) {
    gardenData.weather = 'partly-cloudy';
  }
  
  // Update or create garden state
  if (gardenState) {
    gardenState = await prisma.emotionGardenState.update({
      where: { userId },
      data: {
        gardenData,
        lastUpdated: new Date(),
      },
    });
  } else {
    gardenState = await prisma.emotionGardenState.create({
      data: {
        userId,
        gardenData,
        lastUpdated: new Date(),
      },
    });
  }
  
  return gardenData;
}

export default router;

