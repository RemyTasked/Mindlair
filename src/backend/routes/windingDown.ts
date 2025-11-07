import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import moment from 'moment-timezone';

const router = express.Router();

/**
 * Check if winding down session is available for a user
 */
router.get(
  '/available/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if winding down is enabled
    if (!(user as any).preferences?.enableWindingDown) {
      return res.json({ available: false, reason: 'Winding down is disabled' });
    }

    // Get user's timezone and current time
    const userTimezone = user.timezone || 'America/New_York';
    const currentHour = moment().tz(userTimezone).hour();
    const currentMinute = moment().tz(userTimezone).minute();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Parse winding down time (format: "HH:mm")
    const windingDownTime = (user as any).preferences?.windingDownTime || '21:00';
    const [windingDownHour, windingDownMinute] = windingDownTime.split(':').map(Number);
    const windingDownTimeInMinutes = windingDownHour * 60 + windingDownMinute;
    
    // Parse morning flow time (format: "HH:mm")
    const morningFlowTime = (user as any).preferences?.morningFlowTime || '06:00';
    const [morningFlowHour, morningFlowMinute] = morningFlowTime.split(':').map(Number);
    const morningFlowTimeInMinutes = morningFlowHour * 60 + morningFlowMinute;
    
    // CRITICAL: Winding down is ONLY available from windingDownTime until morning flow time
    // Once morning flow time hits, winding down MUST disappear
    let isAvailable = false;
    
    // Check if we're in the overnight window (after winding down time but before midnight)
    // OR in the early morning window (after midnight but before morning flow)
    if (currentTimeInMinutes >= windingDownTimeInMinutes) {
      // After winding down time - available until midnight
      isAvailable = true;
    } else if (currentTimeInMinutes < morningFlowTimeInMinutes) {
      // Before morning flow time (early morning hours) - still available
      isAvailable = true;
    } else {
      // Between morning flow time and winding down time - NOT available
      isAvailable = false;
    }
    
    // CRITICAL: If morning flow time has passed, winding down is NO LONGER AVAILABLE
    if (currentTimeInMinutes >= morningFlowTimeInMinutes && currentTimeInMinutes < windingDownTimeInMinutes) {
      isAvailable = false;
    }
    
    if (!isAvailable) {
      logger.info('Winding down not available yet', {
        userId,
        currentHour,
        windingDownHour,
        morningFlowHour,
      });
      return res.json({ 
        available: false,
        reason: `Winding down is available starting at ${windingDownTime}`,
        locked: true,
        unlockTime: windingDownTime,
      });
    }

    // Check if user has already completed winding down today
    const todayStart = moment().tz(userTimezone).startOf('day').toDate();
    const todayEnd = moment().tz(userTimezone).endOf('day').toDate();
    
    const completedSession = await prisma.windingDownSession.findFirst({
      where: {
        userId,
        completedAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (completedSession) {
      logger.info('Winding down already completed today', { userId });
      return res.json({
        available: false,
        reason: 'You have already completed your winding down session today',
        completed: true,
      });
    }

    return res.json({
      available: true,
      windingDownUrl: `${process.env.FRONTEND_URL || 'https://www.meetcuteai.com'}/winding-down/${userId}`,
    });
  })
);

/**
 * Get winding down session data
 */
router.get(
  '/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Return winding down session data
    return res.json({
      userId,
      tone: (user as any).preferences?.tone || 'balanced',
      enableFocusSound: (user as any).preferences?.enableFocusSound !== false,
      focusSoundType: (user as any).preferences?.focusSoundType || 'calm-ocean',
    });
  })
);

/**
 * Mark winding down session as complete
 */
router.post(
  '/complete/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { duration } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Create completed session record
    const session = await prisma.windingDownSession.create({
      data: {
        userId,
        completedAt: new Date(),
        duration: duration || null,
      },
    });

    logger.info('Winding down session completed', {
      userId,
      sessionId: session.id,
      duration,
    });

    return res.json({
      success: true,
      sessionId: session.id,
      message: 'Winding down session completed successfully',
    });
  })
);

export default router;

