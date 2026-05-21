import db from "@/lib/db";
import { sendNewPostNotification } from "./push";

export async function notifySubscribersOfNewPost(
  postId: string
): Promise<{ notified: number; skipped: number }> {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      authorId: true,
      visibility: true,
      slug: true,
      author: {
        select: { name: true },
      },
    },
  });

  if (!post) {
    return { notified: 0, skipped: 0 };
  }

  if (post.visibility === "unlisted") {
    return { notified: 0, skipped: 0 };
  }

  const subscriptions = await db.subscription.findMany({
    where: {
      subscribedToId: post.authorId,
    },
    select: {
      subscriberId: true,
    },
  });

  if (subscriptions.length === 0) {
    return { notified: 0, skipped: 0 };
  }

  const subscriberIds = subscriptions.map((s) => s.subscriberId);

  const [userSettings, blockedUsers, blockingUsers] = await Promise.all([
    db.userSettings.findMany({
      where: {
        userId: { in: subscriberIds },
      },
      select: {
        userId: true,
        pushEnabled: true,
        notifyOnNewPost: true,
      },
    }),
    db.block.findMany({
      where: {
        blockerId: post.authorId,
        blockedId: { in: subscriberIds },
      },
      select: { blockedId: true },
    }),
    db.block.findMany({
      where: {
        blockerId: { in: subscriberIds },
        blockedId: post.authorId,
      },
      select: { blockerId: true },
    }),
  ]);

  const settingsMap = new Map(userSettings.map((s) => [s.userId, s]));
  const blockedSet = new Set(blockedUsers.map((b) => b.blockedId));
  const blockingSet = new Set(blockingUsers.map((b) => b.blockerId));

  const postUrl = post.slug ? `/post/slug/${post.slug}` : `/post/${post.id}`;

  let notified = 0;
  let skipped = 0;

  for (const subscriberId of subscriberIds) {
    if (blockedSet.has(subscriberId) || blockingSet.has(subscriberId)) {
      skipped++;
      continue;
    }

    const settings = settingsMap.get(subscriberId);
    if (!settings?.pushEnabled || settings?.notifyOnNewPost === false) {
      skipped++;
      continue;
    }

    try {
      await sendNewPostNotification(subscriberId, {
        authorName: post.author?.name || "Someone you follow",
        title: post.title,
        postUrl,
      });
      notified++;
    } catch (err) {
      console.error(`Failed to notify subscriber ${subscriberId}:`, err);
      skipped++;
    }
  }

  return { notified, skipped };
}
