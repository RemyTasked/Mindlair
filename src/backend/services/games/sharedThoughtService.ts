import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

/**
 * Shared Thought Library Service
 * 
 * Manages a collaborative pool of thoughts that grows as users contribute.
 * Thoughts are anonymized and categorized for use in games.
 */

export interface ThoughtPoolItem {
  id: string;
  text: string;
  category: string;
  source: 'system' | 'user' | 'personal';
  suggestedBucket?: string | null;
  distortionType?: string | null;
  exampleReframe?: string | null;
}

// Default system thoughts with metadata
const SYSTEM_THOUGHTS: Omit<ThoughtPoolItem, 'id'>[] = [
  // Negative/worry thoughts with suggested "letGo" bucket
  { text: "I always mess up presentations", category: "work", source: "system", suggestedBucket: "letGo", distortionType: "overgeneralization" },
  { text: "Everyone thinks I'm incompetent", category: "work", source: "system", suggestedBucket: "letGo", distortionType: "mind-reading" },
  { text: "I'm never going to succeed", category: "negative", source: "system", suggestedBucket: "letGo", distortionType: "fortune-telling" },
  { text: "I'm such an idiot", category: "negative", source: "system", suggestedBucket: "letGo", distortionType: "labeling" },
  { text: "What if everything goes wrong?", category: "worry", source: "system", suggestedBucket: "letGo", distortionType: "catastrophizing" },
  { text: "They probably hate me", category: "relationship", source: "system", suggestedBucket: "letGo", distortionType: "mind-reading" },
  { text: "I should always be productive", category: "work", source: "system", suggestedBucket: "letGo", distortionType: "should-statements" },
  { text: "If I can't do it perfectly, why bother?", category: "negative", source: "system", suggestedBucket: "letGo", distortionType: "all-or-nothing" },
  { text: "I feel overwhelmed so it must be impossible", category: "work", source: "system", suggestedBucket: "letGo", distortionType: "emotional-reasoning" },
  { text: "Nothing ever works out for me", category: "negative", source: "system", suggestedBucket: "letGo", distortionType: "overgeneralization" },
  
  // Neutral/task thoughts - suitable for "park"
  { text: "I need to finish that report", category: "work", source: "system", suggestedBucket: "park" },
  { text: "I should schedule that appointment", category: "health", source: "system", suggestedBucket: "park" },
  { text: "Need to reply to that email", category: "work", source: "system", suggestedBucket: "park" },
  { text: "The house needs cleaning", category: "general", source: "system", suggestedBucket: "park" },
  { text: "I forgot to call them back", category: "relationship", source: "system", suggestedBucket: "park" },
  { text: "Should I change jobs?", category: "work", source: "system", suggestedBucket: "park" },
  { text: "I need to exercise more", category: "health", source: "system", suggestedBucket: "park" },
  { text: "What should I cook for dinner?", category: "general", source: "system", suggestedBucket: null },
  
  // Positive thoughts - suitable for "keep"
  { text: "I handled that well today", category: "positive", source: "system", suggestedBucket: "keep" },
  { text: "I'm grateful for my friends", category: "gratitude", source: "system", suggestedBucket: "keep" },
  { text: "I'm making progress", category: "positive", source: "system", suggestedBucket: "keep" },
  { text: "That was a good conversation", category: "positive", source: "system", suggestedBucket: "keep" },
  { text: "I deserve some rest", category: "positive", source: "system", suggestedBucket: "keep" },
  { text: "Small steps still count", category: "positive", source: "system", suggestedBucket: "keep" },
  { text: "I showed up for myself today", category: "positive", source: "system", suggestedBucket: "keep" },
  { text: "I'm learning and growing", category: "positive", source: "system", suggestedBucket: "keep" },
];

/**
 * Initialize system thoughts if they don't exist
 */
export async function seedSystemThoughts(): Promise<void> {
  try {
    const existingCount = await prisma.sharedThought.count({
      where: { source: 'system' },
    });

    if (existingCount === 0) {
      logger.info('Seeding system thoughts...');
      
      await prisma.sharedThought.createMany({
        data: SYSTEM_THOUGHTS.map(t => ({
          text: t.text,
          category: t.category,
          source: 'system',
          suggestedBucket: t.suggestedBucket,
          distortionType: t.distortionType || null,
          exampleReframe: t.exampleReframe || null,
        })),
      });
      
      logger.info(`Seeded ${SYSTEM_THOUGHTS.length} system thoughts`);
    }
  } catch (error) {
    logger.error('Error seeding system thoughts:', error);
  }
}

/**
 * Get a mixed pool of thoughts for games
 */
export async function getThoughtPool(
  userId: string,
  options: {
    count?: number;
    includePersonal?: boolean;
    category?: string;
    forGame?: 'popper' | 'sorter' | 'reframer';
  } = {}
): Promise<ThoughtPoolItem[]> {
  const { count = 15, includePersonal = true, category, forGame } = options;
  const thoughts: ThoughtPoolItem[] = [];

  try {
    // 1. Get user's personal thoughts (from past sessions) - anonymized for their own use
    if (includePersonal) {
      const sessions = await prisma.thoughtTidySession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      for (const session of sessions) {
        const sessionThoughts = session.thoughts as any;
        if (sessionThoughts?.kept) {
          for (const t of sessionThoughts.kept.slice(0, 2)) {
            const text = typeof t === 'string' ? t : t.text;
            if (text && text.length > 5) {
              thoughts.push({
                id: `personal-${session.id}-kept`,
                text,
                category: 'personal',
                source: 'personal',
                suggestedBucket: 'keep',
              });
            }
          }
        }
      }
    }

    // 2. Get community thoughts from shared pool
    const whereClause: any = {};
    if (category) {
      whereClause.category = category;
    }
    if (forGame === 'reframer') {
      whereClause.distortionType = { not: null };
    }

    const communityThoughts = await prisma.sharedThought.findMany({
      where: whereClause,
      orderBy: [
        { useCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: count,
    });

    for (const t of communityThoughts) {
      thoughts.push({
        id: t.id,
        text: t.text,
        category: t.category,
        source: t.source as 'system' | 'user',
        suggestedBucket: t.suggestedBucket,
        distortionType: t.distortionType,
        exampleReframe: t.exampleReframe,
      });
    }

    // 3. If not enough thoughts, add from system defaults
    if (thoughts.length < count) {
      const remaining = count - thoughts.length;
      const shuffled = [...SYSTEM_THOUGHTS].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < Math.min(remaining, shuffled.length); i++) {
        const t = shuffled[i];
        thoughts.push({
          id: `system-${i}`,
          text: t.text,
          category: t.category,
          source: 'system',
          suggestedBucket: t.suggestedBucket,
          distortionType: t.distortionType,
          exampleReframe: t.exampleReframe,
        });
      }
    }

    // Shuffle and return
    return thoughts.sort(() => Math.random() - 0.5).slice(0, count);
  } catch (error) {
    logger.error('Error getting thought pool:', error);
    // Return system thoughts as fallback
    return SYSTEM_THOUGHTS.slice(0, count).map((t, i) => ({
      id: `fallback-${i}`,
      text: t.text,
      category: t.category,
      source: 'system' as const,
      suggestedBucket: t.suggestedBucket,
      distortionType: t.distortionType,
      exampleReframe: t.exampleReframe,
    }));
  }
}

/**
 * Add a user's thought to the shared pool (anonymized)
 */
export async function shareThought(
  text: string,
  options: {
    category?: string;
    suggestedBucket?: string;
    distortionType?: string;
    exampleReframe?: string;
  } = {}
): Promise<void> {
  try {
    // Sanitize: remove anything that looks like PII
    const sanitized = text
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[name]') // Names
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]') // Phone numbers
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]') // Emails
      .trim();

    // Only add if it's meaningful (not too short, not too long)
    if (sanitized.length < 10 || sanitized.length > 200) {
      return;
    }

    // Check for duplicates
    const existing = await prisma.sharedThought.findFirst({
      where: { text: { equals: sanitized, mode: 'insensitive' } },
    });

    if (existing) {
      // Increment use count instead of creating duplicate
      await prisma.sharedThought.update({
        where: { id: existing.id },
        data: { useCount: existing.useCount + 1 },
      });
      return;
    }

    // Create new shared thought
    await prisma.sharedThought.create({
      data: {
        text: sanitized,
        category: options.category || 'general',
        source: 'user',
        suggestedBucket: options.suggestedBucket,
        distortionType: options.distortionType,
        exampleReframe: options.exampleReframe,
      },
    });

    logger.info('New thought added to shared pool', { textLength: sanitized.length });
  } catch (error) {
    logger.error('Error sharing thought:', error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Get thoughts specifically for the Thought Popper game (negative thoughts)
 */
export async function getPopperThoughts(userId: string, count: number = 20): Promise<string[]> {
  const pool = await getThoughtPool(userId, {
    count,
    forGame: 'popper',
  });

  // For popper, return thoughts that are negative or worry-related
  const negativeThoughts = pool
    .filter(t => 
      t.category === 'negative' || 
      t.category === 'worry' || 
      t.suggestedBucket === 'letGo'
    )
    .map(t => t.text);

  // Add some short-form negative words for variety
  const negativeWords = [
    "Anxiety", "Doubt", "Fear", "Worry", "Panic", "Stress",
    "Burnout", "Overwhelm", "Pressure", "Guilt", "Shame",
    "Noise", "Chaos", "Clutter", "Confusion", "Tension",
    "Failure", "Inadequate", "Imposter", "Rejection", "Judgment"
  ];

  return [...negativeThoughts, ...negativeWords]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

/**
 * Get thoughts for Thought Sorter with bucket metadata
 */
export async function getSorterThoughts(userId: string, count: number = 12): Promise<ThoughtPoolItem[]> {
  return getThoughtPool(userId, {
    count,
    includePersonal: true,
    forGame: 'sorter',
  });
}

/**
 * Get distorted thoughts for Thought Reframing Lab
 */
export async function getReframerThoughts(userId: string, count: number = 8): Promise<ThoughtPoolItem[]> {
  return getThoughtPool(userId, {
    count,
    forGame: 'reframer',
  });
}

