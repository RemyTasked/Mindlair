import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { PromptGenerator } from '../services/ai/promptGenerator';

const router = express.Router();
const prisma = new PrismaClient();
const promptGenerator = new PromptGenerator();

type Meeting = {
  id: string;
  userId: string;
  calendarEventId: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location: string | null;
  meetingLink: string | null;
  meetingType: string | null;
  isBackToBack: boolean;
  cueScheduledFor: Date | null;
  cueSentAt: Date | null;
  cueDelivered: boolean;
  cueContent: string | null;
  focusSceneUrl: string | null;
  focusSceneOpened: boolean;
  postMeetingEmailSent: boolean;
  postMeetingEmailSentAt: Date | null;
  meetingRating: number | null;
  meetingFeedback: string | null;
  ratedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// Get Presley Flow session data
router.get(
  '/:userId/:date',
  asyncHandler(async (req, res) => {
    const { userId, date } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userPreferences: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Parse date (format: YYYY-MM-DD)
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch tomorrow's meetings
    const meetings = await prisma.meeting.findMany({
      where: {
        userId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { startTime: 'asc' },
    });

    if (meetings.length === 0) {
      return res.json({ flow: null });
    }

    // Get historical insights
    const historicalMeetings = await prisma.meeting.findMany({
      where: {
        userId,
        meetingRating: { not: null },
      },
      orderBy: { ratedAt: 'desc' },
      take: 10,
    });

    const historicalInsights = historicalMeetings
      .filter((m: Meeting) => m.meetingRating !== null)
      .map((m: Meeting) => ({
        rating: m.meetingRating!,
        feedback: m.meetingFeedback || '',
      }));

    // Generate Presley Flow content with AI
    const flowContent = await promptGenerator.generatePresleyFlowSession(
      meetings.map((m: Meeting) => ({
        title: m.title,
        startTime: m.startTime,
        endTime: m.endTime,
        attendees: m.attendees,
        description: m.description || undefined,
        meetingType: m.meetingType || undefined,
      })),
      user.userPreferences?.tone as any,
      historicalInsights.length > 0 ? historicalInsights : undefined
    );

    return res.json({
      flow: {
        ...flowContent,
        date: targetDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
      },
    });
  })
);

// Mark Presley Flow as completed
router.post(
  '/:userId/:date/complete',
  asyncHandler(async (_req, res) => {
    // Store completion record (you might want to create a new model for this)
    // For now, we'll just acknowledge completion
    // In a full implementation, create a PresleyFlowSession model to track:
    // - userId, date from params
    // - journalNote, completedAt from body

    return res.json({ message: 'Presley Flow completed successfully' });
  })
);

export default router;

