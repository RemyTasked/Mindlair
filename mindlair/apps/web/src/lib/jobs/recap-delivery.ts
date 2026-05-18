import db from '@/lib/db';
import { sendPushNotification } from '@/lib/services/push';
import { runWeeklyRecapGeneration, getUserRecap } from './weekly-recap';

interface DeliveryResult {
  userId: string;
  recapId: string;
  pushSent: boolean;
  emailSent: boolean;
}

/**
 * Format a recap message for notification.
 */
function formatRecapNotification(recap: Awaited<ReturnType<typeof getUserRecap>>): {
  title: string;
  body: string;
} {
  const stats = recap.recap?.stats;
  const cardCount = recap.awards.length;

  if (!stats) {
    return {
      title: 'Your Weekly Recap',
      body: 'Check out what you explored this week.',
    };
  }

  const highlights: string[] = [];

  if (stats.positionsTaken > 0) {
    highlights.push(`${stats.positionsTaken} positions taken`);
  }
  if (stats.postsPublished > 0) {
    highlights.push(`${stats.postsPublished} posts published`);
  }
  if (cardCount > 0) {
    highlights.push(`${cardCount} new card${cardCount > 1 ? 's' : ''} earned`);
  }
  if (stats.streakDays >= 7) {
    highlights.push(`${stats.streakDays} day streak`);
  }

  const body = highlights.length > 0
    ? highlights.slice(0, 2).join(' • ')
    : 'See your week in review.';

  return {
    title: 'Your Weekly Recap is Ready',
    body,
  };
}

/**
 * Send push notification for a recap.
 */
async function sendRecapPush(userId: string, recapId: string): Promise<boolean> {
  try {
    const recap = await getUserRecap(userId);
    const notification = formatRecapNotification(recap);

    const result = await sendPushNotification(userId, {
      title: notification.title,
      body: notification.body,
      tag: `recap-${recapId}`,
      data: {
        type: 'weekly_recap',
        recapId,
        url: '/recap',
      },
      actions: [
        { action: 'view', title: 'View Recap' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      requireInteraction: false,
    });

    return result.sent > 0;
  } catch (error) {
    console.error(`Failed to send recap push for user ${userId}:`, error);
    return false;
  }
}

/**
 * Send email notification for a recap (placeholder - would integrate with email service).
 */
async function sendRecapEmail(userId: string, recapId: string): Promise<boolean> {
  try {
    // Get user settings
    const settings = await db.userSettings.findUnique({
      where: { userId },
      select: { emailEnabled: true },
    });

    if (!settings?.emailEnabled) {
      return false;
    }

    // Get user email
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user?.email) {
      return false;
    }

    // TODO: Integrate with email service (SendGrid, Postmark, etc.)
    // For now, log the intent
    console.log(`Would send recap email to ${user.email} for recap ${recapId}`);

    return true;
  } catch (error) {
    console.error(`Failed to send recap email for user ${userId}:`, error);
    return false;
  }
}

/**
 * Deliver recap to a user via push and email.
 */
export async function deliverRecap(userId: string, recapId: string): Promise<DeliveryResult> {
  const [pushSent, emailSent] = await Promise.all([
    sendRecapPush(userId, recapId),
    sendRecapEmail(userId, recapId),
  ]);

  // Mark recap as delivered
  if (pushSent || emailSent) {
    await db.weeklyRecap.update({
      where: { id: recapId },
      data: { deliveredAt: new Date() },
    });
  }

  return {
    userId,
    recapId,
    pushSent,
    emailSent,
  };
}

/**
 * Run the full weekly recap job: generation + delivery.
 */
export async function runWeeklyRecapJob(): Promise<{
  generation: {
    usersProcessed: number;
    recapsCreated: number;
    errors: number;
  };
  delivery: {
    delivered: number;
    pushSent: number;
    emailSent: number;
  };
}> {
  console.log('Starting weekly recap job...');

  // Step 1: Generate recaps
  const generation = await runWeeklyRecapGeneration();

  // Step 2: Get undelivered recaps
  const undeliveredRecaps = await db.weeklyRecap.findMany({
    where: {
      deliveredAt: null,
      createdAt: {
        // Only deliver recaps created in the last 2 days (avoid backlog)
        gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  console.log(`Found ${undeliveredRecaps.length} recaps to deliver`);

  // Step 3: Deliver recaps
  let delivered = 0;
  let pushSent = 0;
  let emailSent = 0;

  for (const recap of undeliveredRecaps) {
    try {
      const result = await deliverRecap(recap.userId, recap.id);
      if (result.pushSent || result.emailSent) {
        delivered++;
      }
      if (result.pushSent) pushSent++;
      if (result.emailSent) emailSent++;
    } catch (error) {
      console.error(`Error delivering recap ${recap.id}:`, error);
    }
  }

  console.log(
    `Weekly recap job complete: ${delivered} delivered, ${pushSent} push, ${emailSent} email`
  );

  return {
    generation,
    delivery: {
      delivered,
      pushSent,
      emailSent,
    },
  };
}

/**
 * API handler for cron job.
 */
export async function handleWeeklyRecapJob(): Promise<{
  success: boolean;
  stats: {
    recapsCreated: number;
    delivered: number;
  };
}> {
  try {
    const result = await runWeeklyRecapJob();
    return {
      success: true,
      stats: {
        recapsCreated: result.generation.recapsCreated,
        delivered: result.delivery.delivered,
      },
    };
  } catch (error) {
    console.error('Weekly recap job failed:', error);
    return {
      success: false,
      stats: {
        recapsCreated: 0,
        delivered: 0,
      },
    };
  }
}
