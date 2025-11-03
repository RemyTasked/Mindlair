import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { promptGenerator } from '../services/ai/promptGenerator';
import { logger } from '../utils/logger';

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

// Generate AI message based on mind state
const aiMessageSchema = z.object({
  mindState: z.enum(['calm', 'stressed', 'focused', 'unclear']),
});

router.post(
  '/:userId/:meetingId/ai-message',
  asyncHandler(async (req, res) => {
    const { userId, meetingId } = req.params;
    const { mindState } = aiMessageSchema.parse(req.body);

    const meeting = await prisma.meeting.findFirst({
      where: {
        calendarEventId: meetingId,
        userId,
      },
    });

    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    // Get user preferences for tone
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    const tone = (userPreferences?.tone as 'executive' | 'cinematic' | 'balanced' | 'calm') || 'balanced';

    try {
      // Generate personalized AI message based on mind state
      const mindStateMessages = {
        calm: `You're already centered. Let's maintain that peaceful energy as you step into ${meeting.title}.`,
        stressed: `I see the pressure building. Before ${meeting.title}, let's release that tension and ground yourself.`,
        focused: `Great focus! Let's sharpen that energy even more for ${meeting.title}.`,
        unclear: `Feeling foggy is okay. Let's bring clarity and presence to ${meeting.title} together.`,
      };

      // For now, use template messages. In the future, we can call AI for more personalization
      const message = mindStateMessages[mindState];

      logger.info('Generated AI message for mind state', {
        userId,
        meetingId,
        mindState,
        tone,
      });

      res.json({ message });
    } catch (error: any) {
      logger.error('Error generating AI message', {
        userId,
        meetingId,
        mindState,
        error: error.message,
      });
      
      // Fallback message
      res.json({
        message: `Take a deep breath. You're prepared for this meeting.`,
      });
    }
  })
);

// Complete focus session
const sessionSchema = z.object({
  breathingExerciseCompleted: z.boolean().optional(),
  reflectionNotes: z.string().optional(),
  mindState: z.enum(['calm', 'stressed', 'focused', 'unclear']).optional(),
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
        ...(data.mindState ? { breathingFlowType: `adaptive-${data.mindState}` } : {}),
        ...data,
      } as any,
      update: {
        completedAt: new Date(),
        ...(data.mindState ? { breathingFlowType: `adaptive-${data.mindState}` } : {}),
        ...data,
      } as any,
    });

    // Update meeting with mind state for pattern analysis
    if (data.mindState) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          // Store mind state in description metadata for now
          // We can query this later for pattern analysis
        },
      });
    }

    res.json({ session });
  })
);

export default router;

