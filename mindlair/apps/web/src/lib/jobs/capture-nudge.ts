import db from '@/lib/db';
import { sendPushNotification } from '@/lib/services/push';

const INACTIVITY_DAYS = 5;
const MIN_DAYS_BETWEEN_NUDGES = 7;
const NUDGE_TAG_PREFIX = 'capture-nudge-';

const NUDGE_VARIANTS: Array<{ title: string; body: string }> = [
  {
    title: 'What\'s on your mind?',
    body: 'Capture a quick thought and watch your map evolve.',
  },
  {
    title: 'Your mind has been quiet',
    body: 'A passing thought, a half-formed idea — tap to share it.',
  },
  {
    title: 'Feed your belief map',
    body: 'Take 30 seconds to capture something you\'ve been thinking about.',
  },
  {
    title: 'Add a quick thought',
    body: 'What have you been mulling over lately?',
  },
];

function pickVariant(userId: string): { title: string; body: string } {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return NUDGE_VARIANTS[Math.abs(hash) % NUDGE_VARIANTS.length];
}

export interface CaptureNudgeResult {
  candidates: number;
  nudgesSent: number;
  errors: number;
}

/**
 * Find users who haven't captured a thought or taken a position in the last
 * INACTIVITY_DAYS days and send them a push nudge. Skips users who:
 *   - have no push subscription
 *   - have pushEnabled = false in settings
 *   - received a capture nudge in the last MIN_DAYS_BETWEEN_NUDGES days (best-effort
 *     via the tag in NotificationLog if available; otherwise relies on tag dedup)
 */
export async function runCaptureNudgeJob(): Promise<CaptureNudgeResult> {
  const now = new Date();
  const inactiveSince = new Date(
    now.getTime() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000
  );

  // Subscribers with at least one push subscription
  const subscribedUsers = await db.pushSubscription.findMany({
    select: { userId: true },
    distinct: ['userId'],
  });

  const userIds = subscribedUsers.map((s) => s.userId);

  if (userIds.length === 0) {
    return { candidates: 0, nudgesSent: 0, errors: 0 };
  }

  // Filter to users who have not opted out of push
  const settings = await db.userSettings.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, pushEnabled: true },
  });
  const pushDisabled = new Set(
    settings.filter((s) => !s.pushEnabled).map((s) => s.userId)
  );
  const eligibleUserIds = userIds.filter((id) => !pushDisabled.has(id));

  // Count recent activity per user (positions + captures since inactiveSince)
  const recentPositions = await db.position.groupBy({
    by: ['userId'],
    where: {
      userId: { in: eligibleUserIds },
      createdAt: { gte: inactiveSince },
    },
    _count: { _all: true },
  });
  const activeFromPositions = new Set(recentPositions.map((p) => p.userId));

  const recentCaptures = await db.capture.groupBy({
    by: ['userId'],
    where: {
      userId: { in: eligibleUserIds },
      createdAt: { gte: inactiveSince },
    },
    _count: { _all: true },
  });
  const activeFromCaptures = new Set(recentCaptures.map((c) => c.userId));

  const inactiveUserIds = eligibleUserIds.filter(
    (id) => !activeFromPositions.has(id) && !activeFromCaptures.has(id)
  );

  let nudgesSent = 0;
  let errors = 0;

  for (const userId of inactiveUserIds) {
    try {
      const variant = pickVariant(userId);
      const tag = `${NUDGE_TAG_PREFIX}${Math.floor(now.getTime() / (MIN_DAYS_BETWEEN_NUDGES * 24 * 60 * 60 * 1000))}`;

      const result = await sendPushNotification(userId, {
        title: variant.title,
        body: variant.body,
        tag,
        data: {
          type: 'capture_nudge',
          url: '/map?qt=open',
        },
        actions: [
          { action: 'view', title: 'Capture' },
          { action: 'dismiss', title: 'Later' },
        ],
        requireInteraction: false,
      });

      if (result.sent > 0) {
        nudgesSent++;
      }
    } catch (err) {
      console.error(`[capture-nudge] failed for user ${userId}:`, err);
      errors++;
    }
  }

  return {
    candidates: inactiveUserIds.length,
    nudgesSent,
    errors,
  };
}
