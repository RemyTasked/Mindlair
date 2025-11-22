import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export interface ThoughtCard {
  id: string;
  text: string;
  category?: 'keep' | 'park' | 'release';
}

export interface ThoughtTidyResult {
  kept: ThoughtCard[];
  parked: ThoughtCard[];
  released: ThoughtCard[];
  actionItems?: Array<{ text: string; completed: boolean }>;
}

/**
 * Generate thought cards for Thought Tidy session
 */
export function generateThoughtCards(): ThoughtCard[] {
  const prompts = [
    "That moment you felt ignored",
    "The thing you didn't finish",
    "A small win you're overlooking",
    "Something you're worried about tomorrow",
    "A conversation that's replaying in your mind",
    "Something you wish you'd said differently",
    "A task that feels bigger than it is",
    "A moment of clarity from today",
    "Something you're grateful for but haven't acknowledged",
    "A boundary you wish you'd set",
    "A decision you're second-guessing",
    "A compliment you received but dismissed",
  ];

  // Shuffle and return 6-8 random cards
  const shuffled = prompts.sort(() => Math.random() - 0.5);
  const count = 6 + Math.floor(Math.random() * 3); // 6-8 cards
  const selected = shuffled.slice(0, count);

  return selected.map((text, index) => ({
    id: `thought-${Date.now()}-${index}`,
    text,
  }));
}

/**
 * Record Thought Tidy session
 */
export async function recordThoughtTidySession(
  userId: string,
  result: ThoughtTidyResult
): Promise<{ credits: number; badge?: string }> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const keptCount = result.kept.length;
    const parkedCount = result.parked.length;
    const releasedCount = result.released.length;

    // Award 2 credits for completion
    const creditsEarned = 2;

    // Check for badge unlocks
    let badgeUnlocked: string | undefined;

    // Check for "Scene Wrap Artist" badge (7 days of nightly tidy)
    const recentSessions = await prisma.thoughtTidySession.findMany({
      where: {
        userId,
        completedAt: {
          not: null,
        },
        date: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      distinct: ['date'],
    });

    if (recentSessions.length >= 7) {
      badgeUnlocked = 'Scene Wrap Artist';
    }

    // Create or update session
    await prisma.thoughtTidySession.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        completedAt: new Date(),
        creditsEarned,
        thoughts: JSON.parse(JSON.stringify({
          kept: result.kept,
          parked: result.parked,
          released: result.released,
        })),
        keptCount,
        parkedCount,
        releasedCount,
        actionItems: result.actionItems ? JSON.parse(JSON.stringify(result.actionItems)) : null,
      },
      create: {
        userId,
        date: today,
        completedAt: new Date(),
        creditsEarned,
        thoughts: JSON.parse(JSON.stringify({
          kept: result.kept,
          parked: result.parked,
          released: result.released,
        })),
        keptCount,
        parkedCount,
        releasedCount,
        actionItems: result.actionItems ? JSON.parse(JSON.stringify(result.actionItems)) : null,
      },
    });

    // Update user game progress credits
    const progress = await prisma.userGameProgress.findUnique({
      where: { userId },
    });

    if (progress) {
      await prisma.userGameProgress.update({
        where: { userId },
        data: {
          totalCredits: progress.totalCredits + creditsEarned,
        },
      });
    } else {
      await prisma.userGameProgress.create({
        data: {
          userId,
          totalCredits: creditsEarned,
        },
      });
    }

    return {
      credits: creditsEarned,
      badge: badgeUnlocked,
    };
  } catch (error) {
    logger.error('Error recording Thought Tidy session:', error);
    throw error;
  }
}

/**
 * Get Thought Tidy session for today
 */
export async function getTodayThoughtTidySession(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await prisma.thoughtTidySession.findUnique({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
  });
}

