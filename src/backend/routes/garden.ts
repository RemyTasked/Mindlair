/**
 * Mind Garden - Cumulative Garden API
 * 
 * A cumulative plant growth system where:
 * - Users select plants to grow in their garden
 * - Each action (flow, game, activity) = 1 growth increment on active plant
 * - Mature plants stay in the garden (no archiving)
 * - Users add new plants next to mature ones to build their garden
 * - Premium plants unlock after first plant matures
 */

import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import * as gardenService from '../services/games/gardenService';
import { MILESTONE_DEFINITIONS } from '../services/games/gardenService';
import { logger } from '../utils/logger';
import { pushNotificationService } from '../services/delivery/pushNotificationService';
import { prisma } from '../utils/prisma';

const router = express.Router();

// ============================================
// CORE ENDPOINTS
// ============================================

/**
 * GET /api/garden/state
 * Get user's complete garden state
 */
router.get(
  '/state',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const gardenData = await gardenService.getGardenState(userId);
    const insights = await gardenService.getGardenInsights(userId);
    const activePlant = gardenService.getActivePlant(gardenData);
    
    // Calculate progress message
    let stateTitle = 'Welcome to Mind Garden';
    let stateMessage = 'Plant a seed to begin your mental wellness journey.';
    
    if (activePlant) {
      const actions = activePlant.actionsCount;
      if (actions === 0) {
        stateTitle = 'Your seed is planted!';
        stateMessage = 'Complete your first flow to help your seed sprout.';
      } else if (actions < 10) {
        stateTitle = 'Your seedling is sprouting! 🌱';
        stateMessage = `${actions}/10 - Keep practicing to grow stronger!`;
      } else if (actions < 20) {
        stateTitle = 'Your plant is growing! 🌿';
        stateMessage = `${actions}/30 - A flower bud will appear soon!`;
      } else if (actions < 30) {
        stateTitle = 'Your plant is maturing! 🌸';
        stateMessage = `${actions}/30 - Almost fully grown!`;
      } else {
        stateTitle = '🎉 Your plant is fully grown!';
        stateMessage = gardenData.plants.length === 1 
          ? 'Congratulations! Premium plants are now unlocked. Add another plant to your garden!'
          : 'Ready to add another plant to your growing garden?';
      }
    } else if (gardenData.plants.length > 0) {
      // Has plants but no active one (shouldn't happen, but handle it)
      stateTitle = 'Your garden awaits!';
      stateMessage = 'Add a new plant to continue growing.';
    }
    
    res.json({
      // Garden data
      plants: gardenData.plants,
      activePlantId: gardenData.activePlantId,
      activePlant,
      
      // Status flags
      needsSeedSelection: gardenData.plants.length === 0,
      canAddNewPlant: insights.canAddNewPlant,
      premiumUnlocked: insights.premiumUnlocked,
      hasCompletedOnboarding: gardenData.hasCompletedOnboarding,
      
      // Progress info
      progressToMature: insights.progressToMature,
      nextMilestone: insights.nextMilestone,
      
      // Streaks and stats
      streak: gardenData.streak,
      longestStreak: gardenData.longestStreak,
      totalActions: gardenData.activityCounts.totalActions,
      totalActiveDays: gardenData.totalActiveDays,
      totalPlants: gardenData.plants.length,
      maturePlantsCount: insights.maturePlantsCount,
      growingPlantsCount: insights.growingPlantsCount,
      
      // Activity breakdown
      activityCounts: gardenData.activityCounts,
      
      // Milestones
      achievedMilestones: gardenData.achievedMilestones || [],
      milestonesCount: (gardenData.achievedMilestones || []).length,
      
      // UI messages
      stateTitle,
      stateMessage,
      
      // Available plant types
      availablePlantTypes: Object.entries(gardenService.PLANT_CONFIGS).map(([type, config]) => ({
        type,
        ...config,
        isUnlocked: !config.isPremium || insights.premiumUnlocked,
      })),
      
      // Version marker
      version: 'one-plant-v2',
    });
  })
);

/**
 * POST /api/garden/select-seed
 * Plant a new seed in the garden
 */
router.post(
  '/select-seed',
  authenticate,
  asyncHandler(async (req, res): Promise<void> => {
    const userId = req.userId!;
    const { plantType } = req.body;
    
    if (!plantType) {
      res.status(400).json({ error: 'Plant type is required' });
      return;
    }
    
    // Validate plant type
    if (!gardenService.PLANT_CONFIGS[plantType as keyof typeof gardenService.PLANT_CONFIGS]) {
      res.status(400).json({ error: 'Invalid plant type' });
      return;
    }
    
    const result = await gardenService.selectSeed(userId, plantType);
    
    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }
    
    logger.info('Seed planted', { userId, plantType, isFirstPlant: result.isFirstPlant });
    
    res.json({
      success: true,
      plant: result.plant,
      message: result.message,
      isFirstPlant: result.isFirstPlant,
    });
  })
);

/**
 * POST /api/garden/activity
 * Record an activity and grow the active plant
 * This is the main endpoint called after completing any flow/game/activity
 */
router.post(
  '/activity',
  authenticate,
  asyncHandler(async (req, res): Promise<void> => {
    const userId = req.userId!;
    const { activityType, flowType } = req.body;
    
    // Use flowType if provided (for backward compatibility), otherwise activityType
    const type = flowType || activityType;
    
    if (!type) {
      res.status(400).json({ error: 'Activity type is required' });
      return;
    }
    
    const result = await gardenService.recordActivity(userId, type);
    
    if (!result.success) {
      // If no seed selected, return specific message
      if (!result.plant) {
        res.status(400).json({ 
          error: 'no_seed_selected',
          message: result.message,
          needsSeedSelection: true,
          canAddNewPlant: result.canAddNewPlant,
        });
        return;
      }
      // If plant is mature and user needs to add new plant
      if (result.plantMatured && result.canAddNewPlant) {
        res.status(200).json({
          success: false,
          plant: result.plant,
          message: result.message,
          plantMatured: true,
          canAddNewPlant: true,
          milestones: result.milestones,
        });
        return;
      }
      res.status(400).json({ error: result.message });
      return;
    }
    
    // Send push notification for milestones (plant growth achievements)
    if (result.milestones && result.milestones.length > 0) {
      // Check if user has push notifications enabled for milestones
      const userDeliverySettings = await prisma.deliverySettings.findUnique({
        where: { userId },
      });
      
      if (userDeliverySettings?.pushEnabled) {
        // Send push notification for each milestone achieved
        for (const milestone of result.milestones) {
          try {
            await pushNotificationService.sendMilestoneNotification(
              userId,
              milestone.title,
              milestone.message,
              milestone.emoji
            );
            logger.info('🎉 Milestone push notification sent', {
              userId,
              milestone: milestone.title,
            });
          } catch (error: any) {
            logger.error('Failed to send milestone push notification', {
              userId,
              milestone: milestone.title,
              error: error.message,
            });
          }
        }
      }
    }
    
    res.json({
      success: true,
      plant: result.plant,
      message: result.message,
      // New: Array of all milestones achieved
      milestones: result.milestones,
      // Legacy: First milestone as string
      milestoneReached: result.milestones.length > 0 
        ? `${result.milestones[0].emoji} ${result.milestones[0].title}`
        : undefined,
      plantMatured: result.plantMatured,
      premiumJustUnlocked: result.premiumJustUnlocked,
      canAddNewPlant: result.canAddNewPlant,
      actionsCount: result.plant?.actionsCount,
      growthStage: result.plant?.growthStage,
      leavesCount: result.plant?.leavesCount,
      flowersCount: result.plant?.flowersCount,
    });
  })
);

/**
 * POST /api/garden/add-plant
 * Add a new plant to the garden (when current is mature)
 * This is the new endpoint for expanding the garden
 */
router.post(
  '/add-plant',
  authenticate,
  asyncHandler(async (req, res): Promise<void> => {
    const userId = req.userId!;
    const { plantType } = req.body;
    
    if (!plantType) {
      res.status(400).json({ error: 'Plant type is required' });
      return;
    }
    
    // Validate plant type
    if (!gardenService.PLANT_CONFIGS[plantType as keyof typeof gardenService.PLANT_CONFIGS]) {
      res.status(400).json({ error: 'Invalid plant type' });
      return;
    }
    
    const result = await gardenService.selectSeed(userId, plantType);
    
    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }
    
    const gardenData = await gardenService.getGardenState(userId);
    
    logger.info('Plant added to garden', { userId, plantType, totalPlants: gardenData.plants.length });
    
    res.json({
      success: true,
      newPlant: result.plant,
      message: result.message,
      totalPlants: gardenData.plants.length,
      plants: gardenData.plants,
    });
  })
);

/**
 * POST /api/garden/expand (Legacy - redirects to add-plant)
 * Kept for backward compatibility
 */
router.post(
  '/expand',
  authenticate,
  asyncHandler(async (req, res): Promise<void> => {
    const userId = req.userId!;
    const { plantType } = req.body;
    
    if (!plantType) {
      res.status(400).json({ error: 'Plant type is required' });
      return;
    }
    
    // Validate plant type
    if (!gardenService.PLANT_CONFIGS[plantType as keyof typeof gardenService.PLANT_CONFIGS]) {
      res.status(400).json({ error: 'Invalid plant type' });
      return;
    }
    
    const result = await gardenService.expandGarden(userId, plantType);
    
    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }
    
    logger.info('Garden expanded', { userId, plantType, totalPlants: result.totalPlantsGrown });
    
    res.json({
      success: true,
      newPlant: result.newPlant,
      maturePlant: result.maturePlant,
      message: result.message,
      totalPlantsGrown: result.totalPlantsGrown,
    });
  })
);

/**
 * GET /api/garden/insights
 * Get detailed insights about the garden
 */
router.get(
  '/insights',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const insights = await gardenService.getGardenInsights(userId);
    const gardenData = await gardenService.getGardenState(userId);
    
    // Generate personalized recommendations
    const recommendations: string[] = [];
    
    if (gardenData.plants.length === 0) {
      recommendations.push('Plant your first seed to start your mental wellness journey!');
    } else if (insights.activePlant) {
      const actions = insights.activePlant.actionsCount;
      
      if (actions < 10) {
        recommendations.push('Try a morning intention flow to grow your seedling.');
      } else if (actions < 20) {
        recommendations.push('Your plant is growing! Try a breathing exercise next.');
      } else if (actions < 30) {
        recommendations.push('Almost there! A few more practices until maturity.');
      } else if (insights.canAddNewPlant) {
        recommendations.push('Your plant is mature! Add another plant to grow your garden.');
      }
      
      // Activity-based recommendations
      if (gardenData.activityCounts.breathingPractices < 5) {
        recommendations.push('Breathing exercises are quick wins for your plant!');
      }
      if (gardenData.activityCounts.gratitudeEntries < 3) {
        recommendations.push('Gratitude journaling helps both you and your plant grow.');
      }
    }
    
    // Calculate visual state (for theme consistency)
    let visualState: 'thriving' | 'growing' | 'stable' | 'idle' = 'stable';
    if (gardenData.streak >= 7) visualState = 'thriving';
    else if (gardenData.streak >= 3) visualState = 'growing';
    else if (insights.activePlant && insights.activePlant.actionsCount > 0) visualState = 'growing';
    
    res.json({
      ...insights,
      recommendations,
      visualState,
      
      // State info for UI
      stateInfo: {
        title: visualState === 'thriving' ? 'Your garden is thriving!' :
               visualState === 'growing' ? 'Your garden is growing steadily.' :
               'Your garden awaits you.',
        message: visualState === 'thriving' ? 'Keep nurturing your practice!' :
                 visualState === 'growing' ? 'Every action helps your plant grow.' :
                 'Complete a flow to see growth.',
      },
      
      // For compatibility
      gardenHealth: Math.min(100, 50 + (gardenData.streak * 5) + (insights.progressToMature)),
      weeklyFlows: gardenData.activityCounts.totalActions,
      totalFlows: gardenData.activityCounts.totalActions,
      currentStreak: gardenData.streak,
      plantsGrown: gardenData.plants.length,
    });
  })
);

// ============================================
// COSMETIC INTERACTIONS (kept for engagement)
// ============================================

/**
 * POST /api/garden/water
 * Water the garden (cosmetic engagement - no growth impact)
 */
router.post(
  '/water',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    logger.info('Garden watered', { userId });
    
    res.json({
      success: true,
      message: 'Garden watered! ✨',
    });
  })
);

/**
 * POST /api/garden/prune  
 * Prune the garden (cosmetic engagement - no growth impact)
 */
router.post(
  '/prune',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    logger.info('Garden pruned', { userId });
    
    res.json({
      success: true,
      message: 'Garden pruned! 🌿',
    });
  })
);

/**
 * POST /api/garden/complete-onboarding
 * Mark onboarding as complete
 */
router.post(
  '/complete-onboarding',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    await gardenService.completeOnboarding(userId);
    
    logger.info('Onboarding completed', { userId });
    
    res.json({
      success: true,
      message: 'Onboarding completed!',
    });
  })
);

// ============================================
// PLANT TYPES & INFO
// ============================================

/**
 * GET /api/garden/plant-types
 * Get all available plant types with their configurations
 */
router.get(
  '/plant-types',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const gardenData = await gardenService.getGardenState(userId);
    const premiumUnlocked = gardenService.isPremiumUnlocked(gardenData);
    
    const plantTypes = Object.entries(gardenService.PLANT_CONFIGS).map(([type, config]) => ({
      type,
      ...config,
      isUnlocked: !config.isPremium || premiumUnlocked,
    }));
    
    // Separate free and premium
    const freePlants = plantTypes.filter(p => !p.isPremium);
    const premiumPlants = plantTypes.filter(p => p.isPremium);
    
    res.json({
      freePlants,
      premiumPlants,
      allPlants: plantTypes,
      premiumUnlocked,
    });
  })
);

/**
 * GET /api/garden/milestones
 * Get all milestones and user's achieved milestones
 */
router.get(
  '/milestones',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    const gardenData = await gardenService.getGardenState(userId);
    const achieved = gardenData.achievedMilestones || [];
    
    // Build milestone list with achieved status
    const milestones = Object.entries(MILESTONE_DEFINITIONS).map(([type, def]) => ({
      type,
      ...def,
      achieved: achieved.includes(type as any),
    }));
    
    // Group by category
    const plantMilestones = milestones.filter(m => m.type.startsWith('plant_'));
    const streakMilestones = milestones.filter(m => m.type.startsWith('streak_'));
    const actionMilestones = milestones.filter(m => m.type.startsWith('total_actions_'));
    const gardenMilestones = milestones.filter(m => m.type.startsWith('plants_grown_'));
    const activityMilestones = milestones.filter(m => 
      ['morning_master', 'breathing_champion', 'meeting_prep_pro', 'game_enthusiast', 'premium_unlocked'].includes(m.type)
    );
    
    res.json({
      all: milestones,
      achieved,
      achievedCount: achieved.length,
      totalCount: milestones.length,
      byCategory: {
        plant: plantMilestones,
        streak: streakMilestones,
        actions: actionMilestones,
        garden: gardenMilestones,
        activity: activityMilestones,
      },
    });
  })
);

/**
 * GET /api/garden/growth-info
 * Get information about the growth system (for help/tutorial)
 */
router.get(
  '/growth-info',
  asyncHandler(async (_req, res) => {
    res.json({
      system: 'cumulative-garden',
      description: 'Grow your garden through practice. Each action adds growth to your active plant!',
      stages: [
        { 
          name: 'Seed',
          actions: '0',
          description: 'Your journey begins! Complete your first action to sprout.',
        },
        {
          name: 'Seedling',
          actions: '1-10',
          description: 'Tiny leaves appear. +1 leaf per action.',
        },
        {
          name: 'Growing',
          actions: '11-20',
          description: 'Stem grows taller. First flower bud at 15 actions!',
        },
        {
          name: 'Maturing',
          actions: '21-29',
          description: 'Flowers bloom! Second bud at 25 actions.',
        },
        {
          name: 'Mature',
          actions: '30+',
          description: 'Fully grown! 3 beautiful flowers. Add a new plant to your garden!',
        },
      ],
      milestones: [
        { actions: 15, reward: 'First flower bud appears' },
        { actions: 20, reward: 'First flower blooms' },
        { actions: 25, reward: 'Second flower bud appears' },
        { actions: 30, reward: 'Plant fully mature - premium plants unlocked on first mature!' },
      ],
      streakBonuses: [
        { days: 7, reward: '+2 bonus leaves, 10% stem growth' },
        { days: 14, reward: 'Bonus flower blooms' },
        { days: 30, reward: 'Extra decorative flower' },
      ],
      premiumUnlock: 'Premium plants (Fern, Bonsai, Monstera, Bamboo, Orchid, Ivy) unlock after your first plant matures!',
    });
  })
);

export default router;
