import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import * as emotionGardenService from './emotionGardenService';

export interface ThoughtCard {
  id: string;
  text: string;
  category?: 'keep' | 'park' | 'release';
}

export interface ThoughtTidyResult {
  kept: string[] | ThoughtCard[];
  parked: string[] | ThoughtCard[];
  released: string[] | ThoughtCard[];
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
    // Create date at midnight in UTC to match database Date type
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const keptCount = result.kept?.length || 0;
    const parkedCount = result.parked?.length || 0;
    const releasedCount = result.released?.length || 0;

    // Validate that we have at least some thoughts
    if (keptCount + parkedCount + releasedCount === 0) {
      throw new Error('No thoughts to record. Please sort at least one thought before completing.');
    }

    // Award 2 credits for completion
    const creditsEarned = 2;

    // Check for badge unlocks
    let badgeUnlocked: string | undefined;

    // Check for "Scene Wrap Artist" badge (7 days of nightly tidy)
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setUTCHours(0, 0, 0, 0);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentSessions = await prisma.thoughtTidySession.findMany({
        where: {
          userId,
          completedAt: {
            not: null,
          },
          date: {
            gte: sevenDaysAgo,
          },
        },
        distinct: ['date'],
      });

      if (recentSessions.length >= 7) {
        badgeUnlocked = 'Scene Wrap Artist';
      }
    } catch (badgeError) {
      // Don't fail the request if badge check fails
      logger.warn('Error checking for badge unlock:', badgeError);
    }

    // Prepare thoughts data - Prisma handles JSON automatically, no need for double stringify
    const thoughtsData = {
      kept: result.kept || [],
      parked: result.parked || [],
      released: result.released || [],
    };

    // Create or update session
    try {
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
          thoughts: thoughtsData as any,
          keptCount,
          parkedCount,
          releasedCount,
          actionItems: result.actionItems ? (result.actionItems as any) : null,
        },
        create: {
          userId,
          date: today,
          completedAt: new Date(),
          creditsEarned,
          thoughts: thoughtsData as any,
          keptCount,
          parkedCount,
          releasedCount,
          actionItems: result.actionItems ? (result.actionItems as any) : null,
        },
      });
    } catch (upsertError: any) {
      logger.error('Error upserting Thought Tidy session:', {
        error: upsertError.message,
        code: upsertError.code,
        userId,
        date: today,
      });
      throw new Error(`Failed to save Thought Tidy session: ${upsertError.message}`);
    }

    // Update user game progress credits
    try {
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
            currentStreak: 1,
            longestStreak: 1,
            lastPlayedAt: new Date(),
          },
        });
      }
    } catch (progressError) {
      // Don't fail the request if progress update fails
      logger.error('Error updating user game progress:', progressError);
    }

    // Update Emotion Garden - Thought Tidy provides calm and relief
    try {
      const totalThoughts = keptCount + parkedCount + releasedCount;
      if (totalThoughts > 0) {
        // More "released" thoughts = more relief
        const releaseRatio = releasedCount / totalThoughts;
        const emotion = releaseRatio > 0.5 ? 'calm' : 'gratitude'; // High release = calm, balanced = gratitude
        const intensity = Math.min(10, 5 + Math.floor(releaseRatio * 5)); // 5-10 based on release ratio
        
        await emotionGardenService.updateGardenState(
          userId,
          emotion,
          intensity,
          'thought-tidy'
        );
      }
    } catch (error) {
      // Don't fail the request if garden update fails
      logger.error('Error updating Emotion Garden after Thought Tidy session:', error);
    }

    return {
      credits: creditsEarned,
      badge: badgeUnlocked,
    };
  } catch (error: any) {
    logger.error('Error recording Thought Tidy session:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      userId,
    });
    // Re-throw with a more user-friendly message
    if (error.message?.includes('Failed to save')) {
      throw error;
    }
    throw new Error(`Failed to record Thought Tidy session: ${error.message || 'Unknown error'}`);
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

