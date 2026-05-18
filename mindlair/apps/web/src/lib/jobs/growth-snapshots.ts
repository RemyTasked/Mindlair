import db from '@/lib/db';

/**
 * Capture daily subscriber count snapshots for all users.
 * Used for The Early Reader card detection.
 */
export async function captureGrowthSnapshots(): Promise<number> {
  console.log('Capturing growth snapshots...');

  // Get all users with at least one subscriber
  const usersWithSubscribers = await db.user.findMany({
    where: {
      subscribers: { some: {} },
    },
    select: {
      id: true,
      _count: {
        select: { subscribers: true },
      },
    },
  });

  let captured = 0;

  for (const user of usersWithSubscribers) {
    try {
      // Check if we already have a snapshot for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingSnapshot = await db.userGrowthSnapshot.findFirst({
        where: {
          userId: user.id,
          snapshotAt: { gte: today },
        },
      });

      if (!existingSnapshot) {
        await db.userGrowthSnapshot.create({
          data: {
            userId: user.id,
            subscriberCount: user._count.subscribers,
          },
        });
        captured++;
      }
    } catch (error) {
      console.error(`Failed to capture snapshot for user ${user.id}:`, error);
    }
  }

  console.log(`Captured ${captured} growth snapshots`);
  return captured;
}

/**
 * Clean up old growth snapshots (keep last 365 days).
 */
export async function cleanupOldSnapshots(): Promise<number> {
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const result = await db.userGrowthSnapshot.deleteMany({
    where: {
      snapshotAt: { lt: oneYearAgo },
    },
  });

  console.log(`Cleaned up ${result.count} old snapshots`);
  return result.count;
}

/**
 * Get subscriber count at a specific date for a user.
 */
export async function getSubscriberCountAtDate(
  userId: string,
  date: Date
): Promise<number> {
  // Find the closest snapshot on or before the date
  const snapshot = await db.userGrowthSnapshot.findFirst({
    where: {
      userId,
      snapshotAt: { lte: date },
    },
    orderBy: { snapshotAt: 'desc' },
    select: { subscriberCount: true },
  });

  if (snapshot) {
    return snapshot.subscriberCount;
  }

  // If no snapshot exists, return 0
  return 0;
}

/**
 * Check if a subscription qualifies for Early Reader.
 * Subscribed when target had < 10 subscribers, target now has > 100.
 */
export async function checkEarlyReaderQualification(
  subscriberId: string,
  subscribedToId: string
): Promise<{
  qualifies: boolean;
  subscriberCountAtTime: number;
  currentCount: number;
}> {
  // Get subscription date
  const subscription = await db.subscription.findUnique({
    where: {
      subscriberId_subscribedToId: {
        subscriberId,
        subscribedToId,
      },
    },
    select: { createdAt: true },
  });

  if (!subscription) {
    return { qualifies: false, subscriberCountAtTime: 0, currentCount: 0 };
  }

  // Get subscriber count at time of subscription
  const subscriberCountAtTime = await getSubscriberCountAtDate(
    subscribedToId,
    subscription.createdAt
  );

  // Get current subscriber count
  const currentCount = await db.subscription.count({
    where: { subscribedToId },
  });

  const qualifies = subscriberCountAtTime < 10 && currentCount > 100;

  return {
    qualifies,
    subscriberCountAtTime,
    currentCount,
  };
}
