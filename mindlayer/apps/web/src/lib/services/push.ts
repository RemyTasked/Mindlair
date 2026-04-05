import webpush from 'web-push';
import db from '@/lib/db';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@mindlayer.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
  requireInteraction?: boolean;
}

export type NotificationType = 
  | 'nudge'
  | 'daily_digest'
  | 'tension_alert'
  | 'position_shift'
  | 'new_concept';

export async function sendPushNotification(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  let sent = 0;
  let failed = 0;

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-72x72.png',
    tag: payload.tag || 'mindlayer-notification',
    data: payload.data || {},
    actions: payload.actions || [],
    requireInteraction: payload.requireInteraction || false,
  });

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        notificationPayload
      );
      sent++;
    } catch (error: unknown) {
      const pushError = error as { statusCode?: number };
      console.error(`Failed to send push to ${subscription.endpoint}:`, error);
      
      if (pushError.statusCode === 410 || pushError.statusCode === 404) {
        await db.pushSubscription.delete({
          where: { id: subscription.id },
        });
      }
      failed++;
    }
  }

  return { sent, failed };
}

export async function sendNudgeNotification(
  userId: string,
  nudge: {
    concept: string;
    sourceTitle: string;
    framing: string;
    url: string;
  }
): Promise<void> {
  await sendPushNotification(userId, {
    title: `New perspective on ${nudge.concept}`,
    body: nudge.framing,
    tag: 'nudge',
    data: {
      type: 'nudge',
      url: nudge.url,
      sourceTitle: nudge.sourceTitle,
    },
    actions: [
      { action: 'view', title: 'Read More' },
      { action: 'dismiss', title: 'Not Now' },
    ],
  });
}

export async function sendDailyDigestNotification(
  userId: string,
  digest: {
    id: string;
    itemCount: number;
    summary: string;
  }
): Promise<void> {
  await sendPushNotification(userId, {
    title: 'Your Daily Mindlair Digest',
    body: digest.summary,
    tag: 'daily-digest',
    data: {
      type: 'daily_digest',
      url: `/digest/${digest.id}`,
      itemCount: digest.itemCount,
    },
    actions: [
      { action: 'view', title: 'View Digest' },
      { action: 'dismiss', title: 'Later' },
    ],
    requireInteraction: true,
  });
}

export async function sendTensionAlertNotification(
  userId: string,
  tension: {
    conceptA: string;
    conceptB: string;
    explanation: string;
  }
): Promise<void> {
  await sendPushNotification(userId, {
    title: 'Tension Detected',
    body: `Your positions on "${tension.conceptA}" and "${tension.conceptB}" may conflict`,
    tag: 'tension-alert',
    data: {
      type: 'tension_alert',
      url: '/map?highlight=tensions',
      conceptA: tension.conceptA,
      conceptB: tension.conceptB,
    },
    actions: [
      { action: 'view', title: 'Explore' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
}

export async function sendPositionShiftNotification(
  userId: string,
  shift: {
    concept: string;
    oldDirection: string;
    newDirection: string;
    triggerSource?: string;
  }
): Promise<void> {
  const directionEmoji: Record<string, string> = {
    positive: '📈',
    negative: '📉',
    mixed: '↔️',
  };

  await sendPushNotification(userId, {
    title: 'Position Evolution',
    body: `Your stance on "${shift.concept}" has shifted ${directionEmoji[shift.newDirection] || ''}`,
    tag: 'position-shift',
    data: {
      type: 'position_shift',
      url: `/timeline?concept=${encodeURIComponent(shift.concept)}`,
      concept: shift.concept,
    },
  });
}

export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}
