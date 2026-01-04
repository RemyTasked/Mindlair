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
import * as gardenService from '../services/games/gardenService';

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

// Flow points mapping
export const FLOW_POINTS: Record<string, number> = {
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
  'breathing': 5,
  'body-scan': 20,
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
    
    // Calculate points
    let points = FLOW_POINTS[flowType] || 10;
    if (duration && duration > 300) {
      points = Math.floor(points * 1.5); // 50% bonus for longer sessions
    }

    // Update garden state with proper plant growth
    const gardenResult = await gardenService.updateGarden(userId, flowType, points);
    
    res.json({
      success: true,
      message: gardenResult.newPlant 
        ? '🌱 New plant added to your garden!' 
        : '✨ Your garden is growing!',
      gardenState: gardenResult,
    });
  })
);

export default router;
