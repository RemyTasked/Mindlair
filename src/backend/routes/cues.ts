import express from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const cueSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  tone: z.enum(['calm', 'direct']).optional(),
  toastEnabled: z.boolean().optional(),
  slackEnabled: z.boolean().optional(),
  quietHours: z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  })).optional(),
  cueFrequency: z.enum(['minimal', 'balanced', 'frequent']).optional(),
  perMeetingOverrides: z.record(z.boolean()).optional(),
  lowEnergyStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  lowEnergyEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

const evaluateCuesSchema = z.object({
  meetingId: z.string(),
  userId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  title: z.string(),
  attendeeCount: z.number(),
  isBackToBack: z.boolean(),
  previousMeetingEnd: z.string().datetime().optional(),
  nextMeetingStart: z.string().datetime().optional(),
  timeOfDayBucket: z.enum(['peak', 'low-energy', 'wind-down', 'other']),
  userMood: z.number().int().min(-1).max(1).optional(),
});

const dispatchCueSchema = z.object({
  cueId: z.string(),
  userId: z.string(),
  meetingId: z.string(),
  text: z.string(),
  channel: z.enum(['toast', 'slack']),
  actions: z.array(z.object({
    label: z.string(),
    action: z.string(),
  })),
});

const telemetrySchema = z.object({
  cueId: z.string(),
  meetingId: z.string().optional(),
  userId: z.string(),
  action: z.enum(['clicked', 'dismissed', 'ignored']),
  actionType: z.string().optional(),
  timestamp: z.string().datetime(),
});

const moodSchema = z.object({
  meetingId: z.string(),
  userId: z.string(),
  value: z.number().int().min(-1).max(1),
  timestamp: z.string().datetime(),
});

// Get user's cue settings
router.get(
  '/settings',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;

    let settings = await prisma.cueSettings.findUnique({
      where: { userId },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.cueSettings.create({
        data: { userId },
      });
    }

    res.json(settings);
  })
);

// Update cue settings
router.put(
  '/settings',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    
    console.log('📝 Cue settings save request:', {
      userId,
      body: req.body,
    });

    try {
      const data = cueSettingsSchema.parse(req.body);

      const settings = await prisma.cueSettings.upsert({
        where: { userId },
        create: {
          userId,
          ...data,
        },
        update: data,
      });

      logger.info('✅ Cue settings updated', { userId, settings });
      res.json(settings);
    } catch (error: any) {
      console.error('❌ Failed to save cue settings:', {
        userId,
        errorName: error.name,
        errorCode: error.code,
        errorMessage: error.message,
        errorMeta: error.meta,
        stack: error.stack,
      });

      if (error.name === 'ZodError') {
        logger.error('Cue settings validation error', { userId, error: error.message });
        throw new AppError(`Invalid cue settings: ${error.message}`, 400);
      }

      throw new AppError(
        `Failed to save cue settings: ${error.message || 'Unknown error'}`,
        500
      );
    }
  })
);

// Evaluate cues for a meeting (internal scheduler use)
router.post(
  '/evaluate',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = evaluateCuesSchema.parse(req.body);

    // Get user's cue settings
    const settings = await prisma.cueSettings.findUnique({
      where: { userId: data.userId },
    });

    if (!settings || !settings.enabled) {
      return res.json({ cues: [] });
    }

    // Check per-meeting override
    const overrides = settings.perMeetingOverrides as Record<string, boolean>;
    if (overrides[data.meetingId] === false) {
      return res.json({ cues: [] });
    }

    // Check quiet hours
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const quietHours = settings.quietHours as Array<{ start: string; end: string }>;
    const isQuietTime = quietHours.some(({ start, end }) => {
      return currentTime >= start && currentTime <= end;
    });

    if (isQuietTime) {
      return res.json({ cues: [] });
    }

    // Generate cues based on frequency and context
    const cues = generateCues(data, settings);

    logger.info('Cues evaluated', {
      userId: data.userId,
      meetingId: data.meetingId,
      cueCount: cues.length,
    });

    return res.json({ cues });
  })
);

// Dispatch a cue (internal use)
router.post(
  '/dispatch',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = dispatchCueSchema.parse(req.body);

    // TODO: Implement actual dispatch logic (WebSocket, Slack API)
    logger.info('Cue dispatched', {
      cueId: data.cueId,
      userId: data.userId,
      meetingId: data.meetingId,
      channel: data.channel,
    });

    res.json({ status: 'queued' });
  })
);

// Record telemetry
router.post(
  '/telemetry',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = telemetrySchema.parse(req.body);

    await prisma.cueTelemetry.create({
      data: {
        cueId: data.cueId,
        meetingId: data.meetingId,
        userId: data.userId,
        action: data.action,
        actionType: data.actionType,
        timestamp: new Date(data.timestamp),
      },
    });

    logger.info('Cue telemetry recorded', {
      cueId: data.cueId,
      action: data.action,
    });

    res.json({ status: 'recorded' });
  })
);

// Set pre-meeting mood
router.post(
  '/mood',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = moodSchema.parse(req.body);

    await prisma.meetingMood.upsert({
      where: {
        meetingId_userId: {
          meetingId: data.meetingId,
          userId: data.userId,
        },
      },
      create: {
        meetingId: data.meetingId,
        userId: data.userId,
        value: data.value,
        timestamp: new Date(data.timestamp),
      },
      update: {
        value: data.value,
        timestamp: new Date(data.timestamp),
      },
    });

    logger.info('Meeting mood saved', {
      meetingId: data.meetingId,
      userId: data.userId,
      value: data.value,
    });

    res.json({ status: 'saved' });
  })
);

// Helper: Generate cues based on context
function generateCues(
  data: z.infer<typeof evaluateCuesSchema>,
  settings: any
): Array<{
  cueId: string;
  triggerAt: string;
  text: string;
  channel: 'toast' | 'slack';
  actions: Array<{ label: string; action: string }>;
}> {
  const cues: Array<any> = [];
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);
  const duration = (endTime.getTime() - startTime.getTime()) / 1000 / 60; // minutes
  const frequency = settings.cueFrequency as 'minimal' | 'balanced' | 'frequent';
  const tone = settings.tone as 'calm' | 'direct';
  const channel = settings.toastEnabled ? 'toast' : settings.slackEnabled ? 'slack' : 'toast';

  // Pre-meeting nudges handled via core "You're on in 5" flow (scheduler).

  // In-meeting cues
  if (frequency === 'balanced' || frequency === 'frequent') {
    // T+12 min cue
    const t12Time = new Date(startTime.getTime() + 12 * 60 * 1000);
    if (duration > 15) {
      cues.push({
        cueId: `mid-${data.meetingId}-breath`,
        triggerAt: t12Time.toISOString(),
        text: tone === 'calm'
          ? "Breath check. Slow your next sentence."
          : "Breath check.",
        channel,
        actions: [
          { label: 'Breathe 20s', action: 'breathe' },
          { label: 'Hide', action: 'hide' },
        ],
      });
    }

    // Halfway cue for long meetings
    if (frequency === 'frequent' && duration > 30) {
      const halfwayTime = new Date(startTime.getTime() + (duration / 2) * 60 * 1000);
      cues.push({
        cueId: `mid-${data.meetingId}-halfway`,
        triggerAt: halfwayTime.toISOString(),
        text: tone === 'calm'
          ? "Halfway. Pause for questions?"
          : "Halfway mark. Check in.",
        channel,
        actions: [
          { label: 'Focus Note', action: 'focus-note' },
          { label: 'Hide', action: 'hide' },
        ],
      });
    }
  }

  // 5 min remaining cue (all frequencies)
  const fiveMinLeftTime = new Date(endTime.getTime() - 5 * 60 * 1000);
  if (duration > 10) {
    cues.push({
      cueId: `end-${data.meetingId}-5min`,
      triggerAt: fiveMinLeftTime.toISOString(),
      text: tone === 'calm'
        ? "Land one clear outcome → who does what, by when?"
        : "5 min left. Define next steps.",
      channel,
      actions: [
        { label: 'Focus Note', action: 'focus-note' },
        { label: 'Hide', action: 'hide' },
      ],
    });
  }

  // Post-meeting cues
  if (data.nextMeetingStart) {
    const nextStart = new Date(data.nextMeetingStart);
    const gap = (nextStart.getTime() - endTime.getTime()) / 1000 / 60; // minutes
    
    if (gap < 10) {
      cues.push({
        cueId: `post-${data.meetingId}-back-to-back`,
        triggerAt: endTime.toISOString(),
        text: tone === 'calm'
          ? `Next call in ${Math.round(gap)} min. Breathe first.`
          : `${Math.round(gap)} min until next call.`,
        channel,
        actions: [
          { label: 'Breathe 20s', action: 'breathe' },
          { label: 'Snooze 5m', action: 'snooze' },
        ],
      });
    }
  } else if (duration > 45) {
    cues.push({
      cueId: `post-${data.meetingId}-stretch`,
      triggerAt: endTime.toISOString(),
      text: tone === 'calm'
        ? "Stretch + hydrate before the next one."
        : "Long call done. Stretch.",
      channel,
      actions: [
        { label: 'Hide', action: 'hide' },
      ],
    });
  }

  return cues;
}

export default router;

