import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { aiService } from '../services/ai/aiService';
import { analyzeMindStatePatterns } from '../services/ai/mindStateAnalyzer';

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
      // Get mind state patterns for more grounded AI messages
      const mindStatePatterns = await analyzeMindStatePatterns(userId);
      
      // Get time context
      const now = new Date();
      const meetingTime = new Date(meeting.startTime);
      const dayOfWeek = meetingTime.toLocaleDateString('en-US', { weekday: 'long' });
      const timeOfDay = meetingTime.getHours() < 12 ? 'morning' : meetingTime.getHours() < 17 ? 'afternoon' : 'evening';
      const minutesUntil = Math.round((meetingTime.getTime() - now.getTime()) / (1000 * 60));

      // Build context for AI
      let contextNotes = '';
      if (mindStatePatterns.stressFrequency > 50) {
        contextNotes += `\nNote: User has high stress frequency (${Math.round(mindStatePatterns.stressFrequency)}%) before meetings.`;
      }
      if (mindStatePatterns.stressfulDaysOfWeek.includes(dayOfWeek)) {
        contextNotes += `\n${dayOfWeek}s are typically stressful for this user.`;
      }
      if (meeting.meetingType && mindStatePatterns.stressfulMeetingTypes.some(mt => mt.type === meeting.meetingType)) {
        const stressRate = mindStatePatterns.stressfulMeetingTypes.find(mt => mt.type === meeting.meetingType)?.stressRate;
        contextNotes += `\n${meeting.meetingType} meetings are typically stressful (${Math.round(stressRate || 0)}% stress rate).`;
      }

      // Generate AI message based on mind state
      const mindStateDescriptions = {
        calm: 'The user is feeling calm and centered',
        stressed: 'The user is feeling stressed, tense, or overwhelmed',
        focused: 'The user is feeling focused, alert, and ready',
        unclear: 'The user is feeling foggy, uncertain, or unclear',
      };

      const prompt = `You are a supportive AI coach helping someone prepare for a meeting. Generate a brief, personalized message (2-3 sentences max) for someone who just indicated they are feeling "${mindState}".

MEETING CONTEXT:
- Title: "${meeting.title}"
- Type: ${meeting.meetingType || 'general meeting'}
- Time: ${timeOfDay} on ${dayOfWeek}
- Starting in: ${minutesUntil} minutes
- User's tone preference: ${tone}

MIND STATE: ${mindStateDescriptions[mindState]}${contextNotes}

IMPORTANT GUIDELINES:
1. Be GROUNDED and PRACTICAL - no generic motivation
2. Acknowledge their current state authentically
3. Reference the specific meeting naturally
4. Match the ${tone} tone
5. If they're stressed and this type of meeting/day is typically stressful for them, acknowledge that reality and provide concrete grounding techniques
6. Keep it brief (2-3 sentences max)
7. End with confidence and readiness

Generate the message now:`;

      const response = await aiService.generateCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are a supportive, grounded AI coach who helps people prepare for meetings with brief, personalized messages. Be authentic and practical, not generic.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        maxTokens: 150,
        model: 'gpt-4',
      });

      const message = response.content.trim();

      logger.info('Generated AI message for mind state', {
        userId,
        meetingId,
        mindState,
        tone,
        provider: response.provider,
        model: response.model,
        messageLength: message.length,
      });

      res.json({ message });
    } catch (error: any) {
      logger.error('All AI providers failed, falling back to template messages', {
        userId,
        meetingId,
        mindState,
        error: error.message,
        fallbackChain: 'OpenAI → Gemini → Templates',
      });
      
      // Last resort: Fallback to template messages if all AI providers fail
      // This ensures user always gets a message even if OpenAI AND Gemini are down
      const fallbackMessages = {
        calm: `You're already centered. Let's maintain that peaceful energy as you step into ${meeting.title}.`,
        stressed: `I see the pressure building. Before ${meeting.title}, let's take a moment to ground yourself and release that tension.`,
        focused: `Great focus! Let's channel that energy and sharpen your presence for ${meeting.title}.`,
        unclear: `Feeling foggy is okay. Let's bring some clarity and grounding to ${meeting.title} together.`,
      };
      
      res.json({
        message: fallbackMessages[mindState] || `Take a deep breath. You're prepared for this meeting.`,
        fallback: true, // Indicate this was a fallback message
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

