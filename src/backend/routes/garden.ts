/**
 * Mind Garden - Garden State API
 * 
 * Endpoints for garden visualization and state management
 */

import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

const router = express.Router();

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
    
    // Default garden data
    const defaultData = {
      health: 50,
      plants: [],
      weather: 'sunny',
      streak: 0,
      lastFlowDate: null,
      totalFlows,
      flowsToday: todaysFlows,
      growth: 0,
    };
    
    const gardenData = gardenState?.gardenData as typeof defaultData || defaultData;
    
    // Override with actual counts
    gardenData.flowsToday = todaysFlows;
    gardenData.totalFlows = totalFlows;
    
    // Determine visual state based on health
    let visualState: 'thriving' | 'growing' | 'stable' | 'idle' = 'stable';
    if (gardenData.health >= 80 && gardenData.streak >= 3) {
      visualState = 'thriving';
    } else if (gardenData.health >= 60 || gardenData.flowsToday > 0) {
      visualState = 'growing';
    } else if (gardenData.health >= 40) {
      visualState = 'stable';
    } else {
      visualState = 'idle';
    }
    
    res.json({
      ...gardenData,
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
  
  let gardenData = gardenState?.gardenData as typeof defaultData || defaultData;
  
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
      data: { gardenData, lastUpdated: new Date() },
    });
  } else {
    gardenState = await prisma.emotionGardenState.create({
      data: { userId, gardenData, lastUpdated: new Date() },
    });
  }
  
  return gardenData;
}

export default router;

