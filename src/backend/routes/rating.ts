import express from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

const router = express.Router();

// Get meeting data for rating
router.get(
  '/:userId/:meetingId',
  asyncHandler(async (req, res) => {
    const { userId, meetingId } = req.params;

    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId,
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        meetingRating: true,
        meetingFeedback: true,
        ratedAt: true,
      },
    });

    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    res.json({ meeting });
  })
);

// Submit meeting rating
const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
  feedback: z.string().optional(),
});

router.post(
  '/:userId/:meetingId',
  asyncHandler(async (req, res) => {
    const { userId, meetingId } = req.params;
    const data = ratingSchema.parse(req.body);

    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        userId,
      },
    });

    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    // Update meeting with rating
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        meetingRating: data.rating,
        meetingFeedback: data.feedback || null,
        ratedAt: new Date(),
      },
    });

    logger.info('Meeting rated', {
      userId,
      meetingId: meeting.id,
      rating: data.rating,
    });

    res.json({ 
      success: true,
      meeting: {
        id: updatedMeeting.id,
        title: updatedMeeting.title,
        rating: updatedMeeting.meetingRating,
      }
    });
  })
);

export default router;

