import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import * as emotionGardenService from './emotionGardenService';

const prisma = new PrismaClient();

export interface GameQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
  difficulty: number;
  sceneMatch?: string;
  microTeach: string;
}

export interface GamePair {
  id: string;
  cardA: string;
  cardB: string;
  domain: string;
  difficulty: number;
  microTeach: string;
}

/**
 * Get today's game type (rotates daily)
 */
export function getDailyGameType(): 'scene-sense' | 'mind-match' {
  // Use day of year to rotate games daily
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  // Alternate: even days = scene-sense, odd days = mind-match
  return dayOfYear % 2 === 0 ? 'scene-sense' : 'mind-match';
}

/**
 * Get questions for Scene Sense game
 */
export async function getSceneSenseQuestions(
  userId: string,
  count: number = 5,
  sceneMatch?: string
): Promise<GameQuestion[]> {
  try {
    // Get user's unlocked difficulty levels
    const progress = await prisma.userGameProgress.findUnique({
      where: { userId },
    });

    const maxDifficulty = progress?.level5Unlocked ? 5 :
                          progress?.level4Unlocked ? 4 :
                          progress?.level3Unlocked ? 3 :
                          progress?.level2Unlocked ? 2 : 1;

    // Build query conditions
    const where: any = {
      difficulty: { lte: maxDifficulty },
    };

    if (sceneMatch) {
      where.sceneMatch = sceneMatch;
    }

    // Get questions with spaced repetition logic
    // Prioritize questions user hasn't seen recently
    const recentQuestionIds = await prisma.gameSession.findMany({
      where: {
        userId,
        gameType: 'scene-sense',
        startedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      select: { questionId: true },
      distinct: ['questionId'],
    });

    const recentIds = recentQuestionIds
      .map(s => s.questionId)
      .filter(Boolean) as string[];

    if (recentIds.length > 0) {
      where.NOT = { id: { in: recentIds } };
    }

    // Get questions
    const questions = await prisma.gameQuestion.findMany({
      where,
      take: count * 2, // Get more than needed for variety
      orderBy: [
        { difficulty: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // If no questions found, check if database needs seeding
    if (questions.length === 0) {
      try {
        const totalQuestions = await prisma.gameQuestion.count();
        if (totalQuestions === 0) {
          logger.warn('No game questions found in database. Database may need seeding.');
          throw new Error('No game questions available. Please seed the database.');
        }
      } catch (dbError: any) {
        // If table doesn't exist, provide helpful error
        if (dbError.message?.includes('does not exist') || dbError.code === '42P01') {
          logger.error('Game questions table does not exist. Migrations may not have completed.');
          throw new Error('Game database not initialized. Please run migrations first.');
        }
        throw dbError;
      }
    }

    // Shuffle and return requested count
    const shuffled = questions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(q => ({
      id: q.id,
      question: q.question,
      options: q.options as string[],
      correctIndex: q.correctIndex,
      category: q.category,
      difficulty: q.difficulty,
      sceneMatch: q.sceneMatch || undefined,
      microTeach: q.microTeach,
    }));
  } catch (error) {
    logger.error('Error getting Scene Sense questions:', error);
    throw error;
  }
}

/**
 * Get pairs for Mind Match game
 */
export async function getMindMatchPairs(
  userId: string,
  _sceneMatch?: string
): Promise<GamePair[]> {
  try {
    // Get user's unlocked difficulty levels
    const progress = await prisma.userGameProgress.findUnique({
      where: { userId },
    });

    const maxDifficulty = progress?.level5Unlocked ? 5 :
                          progress?.level4Unlocked ? 4 :
                          progress?.level3Unlocked ? 3 :
                          progress?.level2Unlocked ? 2 : 1;

    // Build query conditions
    const where: any = {
      difficulty: { lte: maxDifficulty },
    };

    // Get 3 pairs (6 cards total)
    const pairs = await prisma.gamePair.findMany({
      where,
      take: 10, // Get more for variety
      orderBy: [
        { difficulty: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // If no pairs found, check if database needs seeding
    if (pairs.length === 0) {
      try {
        const totalPairs = await prisma.gamePair.count();
        if (totalPairs === 0) {
          logger.warn('No game pairs found in database. Database may need seeding.');
          throw new Error('No game pairs available. Please seed the database.');
        }
      } catch (dbError: any) {
        // If table doesn't exist, provide helpful error
        if (dbError.message?.includes('does not exist') || dbError.code === '42P01') {
          logger.error('Game pairs table does not exist. Migrations may not have completed.');
          throw new Error('Game database not initialized. Please run migrations first.');
        }
        throw dbError;
      }
    }

    // Shuffle and return 3 pairs
    const shuffled = pairs.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map(p => ({
      id: p.id,
      cardA: p.cardA,
      cardB: p.cardB,
      domain: p.domain,
      difficulty: p.difficulty,
      microTeach: p.microTeach,
    }));
  } catch (error) {
    logger.error('Error getting Mind Match pairs:', error);
    throw error;
  }
}

/**
 * Record game session and award credits
 */
export async function recordGameSession(
  userId: string,
  gameType: 'scene-sense' | 'mind-match',
  data: {
    questionId?: string;
    userAnswer?: number;
    isCorrect?: boolean;
    pairId?: string;
    matchedPairs?: number;
    totalPairs?: number;
    perfectScore?: boolean;
  }
): Promise<{ credits: number; streak: number; badge?: string }> {
  try {
    // Calculate credits
    let creditsEarned = 0;
    
    if (gameType === 'scene-sense') {
      if (data.isCorrect) {
        creditsEarned = 1;
      }
      if (data.perfectScore) {
        creditsEarned += 2; // Bonus for perfect score
      }
    } else if (gameType === 'mind-match') {
      // +1 credit per matched pair
      creditsEarned = data.matchedPairs || 0;
      if (data.perfectScore) {
        creditsEarned += 3; // Bonus for winning game
      }
    }

    // Get or create user progress
    let progress = await prisma.userGameProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      progress = await prisma.userGameProgress.create({
        data: {
          userId,
          totalCredits: creditsEarned,
          currentStreak: 1,
          longestStreak: 1,
          lastPlayedAt: new Date(),
        },
      });
    } else {
      // Update streak
      const lastPlayed = progress.lastPlayedAt;
      const now = new Date();
      const daysSinceLastPlay = lastPlayed
        ? Math.floor((now.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      let newStreak = progress.currentStreak;
      if (daysSinceLastPlay === 0) {
        // Same day, maintain streak
        newStreak = progress.currentStreak;
      } else if (daysSinceLastPlay === 1) {
        // Consecutive day, increment streak
        newStreak = progress.currentStreak + 1;
      } else {
        // Streak broken, reset to 1
        newStreak = 1;
      }

      const longestStreak = Math.max(newStreak, progress.longestStreak);

      progress = await prisma.userGameProgress.update({
        where: { userId },
        data: {
          totalCredits: progress.totalCredits + creditsEarned,
          currentStreak: newStreak,
          longestStreak,
          lastPlayedAt: now,
        },
      });
    }

    // Create game session record
    await prisma.gameSession.create({
      data: {
        userId,
        gameType,
        questionId: data.questionId,
        userAnswer: data.userAnswer,
        isCorrect: data.isCorrect,
        pairId: data.pairId,
        matchedPairs: data.matchedPairs,
        totalPairs: data.totalPairs,
        perfectScore: data.perfectScore || false,
        score: creditsEarned,
        completedAt: new Date(),
      },
    });

    // Check for badge unlocks (simplified - can be expanded)
    let badgeUnlocked: string | undefined;
    if (progress.currentStreak === 7) {
      badgeUnlocked = '7-Day Streak';
    } else if (progress.currentStreak === 30) {
      badgeUnlocked = '30-Day Streak';
    }

    // Update Emotion Garden - games provide positive engagement
    try {
      const emotion = data.perfectScore ? 'joy' : 'gratitude'; // Perfect scores = joy, completion = gratitude
      const intensity = data.perfectScore ? 8 : 6;
      
      await emotionGardenService.updateGardenState(
        userId,
        emotion,
        intensity,
        'game'
      );
    } catch (error) {
      // Don't fail the request if garden update fails
      logger.error('Error updating Emotion Garden after game session:', error);
    }

    return {
      credits: creditsEarned,
      streak: progress.currentStreak,
      badge: badgeUnlocked,
    };
  } catch (error) {
    logger.error('Error recording game session:', error);
    throw error;
  }
}

/**
 * Get user's game progress
 */
export async function getUserGameProgress(userId: string) {
  const progress = await prisma.userGameProgress.findUnique({
    where: { userId },
  });

  if (!progress) {
    // Create default progress
    return await prisma.userGameProgress.create({
      data: { userId },
    });
  }

  return progress;
}

