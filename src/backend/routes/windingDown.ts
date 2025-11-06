import express, { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../middleware/errorHandler';
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

    // Get user's timezone and current hour
    const userTimezone = user.timezone || 'America/New_York';
    const currentHour = moment().tz(userTimezone).hour();
    const currentMinute = moment().tz(userTimezone).minute();
    
    // Parse winding down time (format: "HH:mm")
    const windingDownTime = (user as any).preferences?.windingDownTime || '21:00';
    const [windingDownHour, windingDownMinute] = windingDownTime.split(':').map(Number);
    
    // Check if it's time for winding down (available from windingDownTime until 2 AM)
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const windingDownTimeInMinutes = windingDownHour * 60 + windingDownMinute;
    
    // Available from winding down time until 2 AM (next day)
    const isAvailable = currentTimeInMinutes >= windingDownTimeInMinutes || currentHour < 2;
    
    if (!isAvailable) {
      logger.info('Winding down not available yet', {
        userId,
        currentHour,
        windingDownHour,
        hoursUntilWindingDown: windingDownHour - currentHour,
      });
      return res.json({ 
        available: false,
        reason: `Winding down is available starting at ${windingDownTime}`,
        locked: true,
        unlockTime: windingDownTime,
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

export default router;

