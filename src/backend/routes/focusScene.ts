import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

// Get focus scene data
router.get(
  '/:userId/:meetingId',
  asyncHandler(async (req, res) => {
    const { userId, meetingId } = req.params;

    const meeting = await prisma.meeting.findFirst({
      where: {
        calendarEventId: meetingId,
        userId,
      },
    });

    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    // Get user preferences for sound settings
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    // Update that focus scene was opened
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { focusSceneOpened: true },
    });

    res.json({
      meeting: {
        title: meeting.title,
        startTime: meeting.startTime,
        cueContent: meeting.cueContent,
        soundPreferences: {
          enabled: userPreferences?.enableFocusSound ?? true,
          soundType: userPreferences?.focusSoundType ?? 'calm-ocean',
        },
      },
    });
  })
);

// Complete focus session
const sessionSchema = z.object({
  breathingExerciseCompleted: z.boolean().optional(),
  reflectionNotes: z.string().optional(),
});

router.post(
  '/:userId/:meetingId/complete',
  asyncHandler(async (req, res) => {
    const { userId, meetingId } = req.params;
    const data = sessionSchema.parse(req.body);

    const meeting = await prisma.meeting.findFirst({
      where: {
        calendarEventId: meetingId,
        userId,
      },
    });

    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    // Create or update focus session
    const session = await prisma.focusSession.upsert({
      where: { meetingId: meeting.id },
      create: {
        userId,
        meetingId: meeting.id,
        completedAt: new Date(),
        ...data,
      },
      update: {
        completedAt: new Date(),
        ...data,
      },
    });

    res.json({ session });
  })
);

export default router;

