import express from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { aiService } from '../services/ai/aiService';
import { analyzeMindStatePatterns } from '../services/ai/mindStateAnalyzer';
import { recommendPrepMode, getRecommendationReason } from '../services/prepModeRecommender';
import { prisma } from '../utils/prisma';

const router = express.Router();

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
      include: {
        focusSession: true,
      },
    });

    if (!meeting) {
      throw new AppError('Meeting not found', 404);
    }

    // Check if session is already completed
    if (meeting.focusSession?.completedAt) {
      throw new AppError('This focus session has already been completed', 403);
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

    // Get recommended prep mode based on meeting context
    const meetingTime = new Date(meeting.startTime);
    const meetingEndTime = new Date(meeting.endTime);
    const timeOfDay = meetingTime.getHours() < 12 ? 'morning' : meetingTime.getHours() < 17 ? 'afternoon' : 'evening';
    const dayOfWeek = meetingTime.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Calculate meeting duration in minutes
    const meetingDuration = Math.round((meetingEndTime.getTime() - meetingTime.getTime()) / (1000 * 60));
    
    // Detect back-to-back meetings (check if there's another meeting within 15 minutes before or after)
    const backToBackWindow = 15 * 60 * 1000; // 15 minutes in milliseconds
    const nearbyMeetings = await prisma.meeting.findMany({
      where: {
        userId,
        OR: [
          {
            // Meeting ending within 15 minutes before this one starts
            endTime: {
              gte: new Date(meetingTime.getTime() - backToBackWindow),
              lte: meetingTime,
            },
          },
          {
            // Meeting starting within 15 minutes after this one ends
            startTime: {
              gte: meetingEndTime,
              lte: new Date(meetingEndTime.getTime() + backToBackWindow),
            },
          },
        ],
      },
    });
    const isBackToBack = nearbyMeetings.length > 0;
    
    const recommendedMode = await recommendPrepMode({
      meetingTitle: meeting.title,
      attendeeCount: meeting.attendeeCount || 3, // Default to 3 if not set
      userId,
      timeOfDay,
      dayOfWeek,
      meetingDuration,
      isBackToBack,
      // TODO: Add recurringAttendees detection from calendar data
    });
    
    const recommendationReason = getRecommendationReason(recommendedMode, {
      meetingTitle: meeting.title,
      attendeeCount: meeting.attendeeCount || 3,
      userId,
      timeOfDay,
      dayOfWeek,
      meetingDuration,
      isBackToBack,
    });

    res.json({
      meeting: {
        title: meeting.title,
        startTime: meeting.startTime,
        cueContent: meeting.cueContent,
        recommendedMode, // AI-recommended prep mode
        recommendationReason, // Why this mode was recommended
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
  prepMode: z.enum(['clarity', 'confidence', 'connection', 'composure', 'momentum']).optional(),
});

router.post(
  '/:userId/:meetingId/ai-message',
  asyncHandler(async (req, res) => {
    const { userId, meetingId } = req.params;
    const { mindState, prepMode } = aiMessageSchema.parse(req.body);

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

      // Generate AI message based on mind state AND prep mode
      const mindStateDescriptions = {
        calm: 'The user is feeling calm and centered',
        stressed: 'The user is feeling stressed, tense, or overwhelmed',
        focused: 'The user is feeling focused, alert, and ready',
        unclear: 'The user is feeling foggy, uncertain, or unclear',
      };

      const prepModeDescriptions = {
        clarity: 'User chose CLARITY MODE - needs to identify the one key outcome, top 3 points, and what decision they need from others',
        confidence: 'User chose CONFIDENCE MODE - needs to feel steady, strong, and in control of their nervous system',
        connection: 'User chose CONNECTION MODE - wants to focus on the human relationship, empathy, and understanding the other person',
        composure: 'User chose COMPOSURE MODE - needs to protect their energy, stay grounded, and not feel overwhelmed',
        momentum: 'User chose MOMENTUM MODE - wants to push things forward, unblock progress, and identify clear next steps',
      };

      const prepModeContext = prepMode ? `\n\nPREP MODE: ${prepModeDescriptions[prepMode]}
      
IMPORTANT: Your message should align with their chosen prep mode. For example:
- Clarity: Help them identify what matters most
- Confidence: Ground them in their strength and capability
- Connection: Remind them to see the human first
- Composure: Help them protect their energy and set boundaries
- Momentum: Focus on moving things forward` : '';

      const roleContext = meeting.isOrganizer
        ? 'USER ROLE: Meeting Organizer/Host - They are leading this meeting'
        : 'USER ROLE: Meeting Participant/Attendee - They are joining this meeting';

      const prompt = `You are a supportive AI coach helping someone prepare for a meeting. Generate a brief, personalized message (2-3 sentences max) for someone who just indicated they are feeling "${mindState}".

MEETING CONTEXT:
- Title: "${meeting.title}"
- Type: ${meeting.meetingType || 'general meeting'}
- Time: ${timeOfDay} on ${dayOfWeek}
- Starting in: ${minutesUntil} minutes
- User's tone preference: ${tone}
- ${roleContext}

MIND STATE: ${mindStateDescriptions[mindState]}${contextNotes}${prepModeContext}

IMPORTANT GUIDELINES:
1. Be GROUNDED and PRACTICAL - no generic motivation
2. Acknowledge their current state authentically
3. Reference the specific meeting naturally
4. Match the ${tone} tone
5. TAILOR TO THEIR ROLE:
   - If ORGANIZER: Help them step into leadership mode - setting agenda, facilitating, creating space
   - If PARTICIPANT: Help them prepare to contribute meaningfully - questions to ask, value to add, active presence
6. If they're stressed and this type of meeting/day is typically stressful for them, acknowledge that reality and provide concrete grounding techniques
7. Keep it brief (2-3 sentences max)
8. End with confidence and readiness

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
        // Don't specify model - let each provider use its default
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
  prepMode: z.enum(['clarity', 'confidence', 'connection', 'composure', 'momentum']).optional(),
  prepFlowResponses: z.record(z.string()).optional(), // User's responses to prep flow steps
  intention: z.string().optional(), // User's focus/goal for the meeting
  // Legacy fields (kept for backward compatibility)
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
        // Store prep mode as breathing flow type for now (e.g., "prep-clarity")
        ...(data.prepMode ? { breathingFlowType: `prep-${data.prepMode}` } : {}),
        // Store prep flow responses as reflection notes (JSON stringified)
        ...(data.prepFlowResponses ? { reflectionNotes: JSON.stringify(data.prepFlowResponses) } : {}),
        // Legacy mindState support
        ...(data.mindState && !data.prepMode ? { breathingFlowType: `adaptive-${data.mindState}` } : {}),
        intention: data.intention,
        breathingExerciseCompleted: data.breathingExerciseCompleted,
      } as any,
      update: {
        completedAt: new Date(),
        ...(data.prepMode ? { breathingFlowType: `prep-${data.prepMode}` } : {}),
        ...(data.prepFlowResponses ? { reflectionNotes: JSON.stringify(data.prepFlowResponses) } : {}),
        ...(data.mindState && !data.prepMode ? { breathingFlowType: `adaptive-${data.mindState}` } : {}),
        intention: data.intention,
        breathingExerciseCompleted: data.breathingExerciseCompleted,
      } as any,
    });

    // Update meeting with prep mode for pattern analysis
    if (data.prepMode) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          // Store prep mode in description metadata for future pattern analysis
          // This allows us to recommend modes based on meeting type patterns
        },
      });
    }

    res.json({ session });
  })
);

export default router;

