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
    
    // CRITICAL: Winding down is ONLY available from windingDownTime until morning flow time (next day)
    // Example: windingDown at 21:00 (9 PM), morningFlow at 06:00 (6 AM)
    // Available: 9 PM → Midnight → 6 AM
    // NOT Available: 6 AM → 9 PM
    
    let isAvailable = false;
    
    // Check if current time is in the "daytime" window (between morning flow and winding down)
    // If YES → NOT available
    // If NO → Available (either late night or early morning)
    if (currentTimeInMinutes >= morningFlowTimeInMinutes && currentTimeInMinutes < windingDownTimeInMinutes) {
      // Daytime: Between 6 AM and 9 PM → NOT AVAILABLE
      isAvailable = false;
    } else {
      // Nighttime: After 9 PM OR before 6 AM → AVAILABLE
      isAvailable = true;
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

