import Anthropic from '@anthropic-ai/sdk';
import db from '@/lib/db';

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }
  return anthropicClient;
}

const FAST_MODEL = 'claude-haiku-35-20241022';

interface ScreeningResult {
  passed: boolean;
  reason?: string;
  category?: string;
  confidence: number;
}

const CONTENT_SCREENING_PROMPT = `You are a content moderation assistant. Analyze the following post for policy violations.

Check for these violation categories:
1. HATE_SPEECH: Attacks on individuals/groups based on protected characteristics
2. HARASSMENT: Targeted personal attacks, threats, or incitement to harm
3. MISINFORMATION: Demonstrably false claims presented as fact (especially health/safety misinformation)
4. SPAM: Commercial promotion, off-topic content, or obvious low-quality content
5. VIOLENCE: Explicit glorification or incitement of violence

Guidelines:
- Allow controversial opinions and political views
- Allow criticism of ideas, institutions, and public figures
- Allow satire, parody, and strong rhetoric
- Allow steelmanning of positions the author disagrees with
- Flag clear violations, not edge cases
- When in doubt, allow the content

Respond in JSON format:
{
  "passed": true/false,
  "category": "NONE" or violation category,
  "reason": "Brief explanation (required if not passed)",
  "confidence": 0.0-1.0
}`;

export async function screenPostContent(
  headlineClaim: string,
  body: string
): Promise<ScreeningResult> {
  try {
    const response = await getAnthropic().messages.create({
      model: FAST_MODEL,
      max_tokens: 300,
      temperature: 0.1,
      system: CONTENT_SCREENING_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Headline Claim: ${headlineClaim}\n\nBody:\n${body.slice(0, 4000)}`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const result = JSON.parse(text);

    return {
      passed: result.passed !== false && result.category === 'NONE',
      reason: result.reason,
      category: result.category,
      confidence: result.confidence || 0.5,
    };
  } catch (error) {
    console.error('Content screening error:', error);
    // On error, allow content but flag for review
    return {
      passed: true,
      reason: 'Screening service temporarily unavailable',
      category: 'REVIEW_NEEDED',
      confidence: 0,
    };
  }
}

interface CoordinatedBehaviorResult {
  detected: boolean;
  patterns: string[];
  confidence: number;
}

export async function detectCoordinatedBehavior(postId: string): Promise<CoordinatedBehaviorResult> {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      reactions: {
        include: {
          user: {
            select: { id: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!post || post.reactions.length < 10) {
    return { detected: false, patterns: [], confidence: 0 };
  }

  const patterns: string[] = [];
  let confidence = 0;

  // Pattern 1: Multiple new accounts reacting quickly
  const newAccounts = post.reactions.filter(r => {
    const accountAge = Date.now() - new Date(r.user.createdAt).getTime();
    return accountAge < 7 * 24 * 60 * 60 * 1000; // 7 days
  });

  if (newAccounts.length > post.reactions.length * 0.5) {
    patterns.push('HIGH_NEW_ACCOUNT_RATIO');
    confidence += 0.3;
  }

  // Pattern 2: Rapid identical reactions
  const reactionsByTime = post.reactions.map((r, i, arr) => ({
    ...r,
    timeSincePrev: i > 0 ? new Date(r.createdAt).getTime() - new Date(arr[i - 1].createdAt).getTime() : null,
  }));

  const rapidReactions = reactionsByTime.filter(r => r.timeSincePrev !== null && r.timeSincePrev < 5000);
  if (rapidReactions.length > 5) {
    patterns.push('RAPID_REACTION_BURST');
    confidence += 0.3;
  }

  // Pattern 3: Identical stance ratio from new accounts
  const newAccountStances = newAccounts.reduce(
    (acc, r) => {
      acc[r.stance] = (acc[r.stance] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const dominantStanceCount = Math.max(...Object.values(newAccountStances));
  if (newAccounts.length > 5 && dominantStanceCount / newAccounts.length > 0.9) {
    patterns.push('COORDINATED_STANCE');
    confidence += 0.3;
  }

  return {
    detected: confidence >= 0.5,
    patterns,
    confidence: Math.min(confidence, 1),
  };
}

export async function flagForReview(
  postId: string,
  reason: string,
  category: string
): Promise<void> {
  await db.post.update({
    where: { id: postId },
    data: {
      moderationStatus: 'flagged',
    },
  });

  await db.analyticsEvent.create({
    data: {
      userId: null,
      type: 'post_flagged_for_review',
      surface: 'system',
      payload: {
        postId,
        reason,
        category,
        flaggedAt: new Date().toISOString(),
      },
    },
  });
}

export async function checkViralVelocity(postId: string): Promise<{
  isViral: boolean;
  reactionRate: number;
  requiresReview: boolean;
}> {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      publishedAt: true,
      authorId: true,
      _count: { select: { reactions: true } },
    },
  });

  if (!post?.publishedAt) {
    return { isViral: false, reactionRate: 0, requiresReview: false };
  }

  // Get author's average engagement
  const authorPosts = await db.post.findMany({
    where: {
      authorId: post.authorId,
      status: 'published',
      id: { not: postId },
    },
    select: {
      _count: { select: { reactions: true } },
    },
    take: 10,
  });

  const avgReactions = authorPosts.length > 0
    ? authorPosts.reduce((sum, p) => sum + p._count.reactions, 0) / authorPosts.length
    : 5; // Default baseline

  const hoursLive = (Date.now() - post.publishedAt.getTime()) / (1000 * 60 * 60);
  const reactionRate = post._count.reactions / Math.max(hoursLive, 1);

  // Consider viral if 5x above author's average and more than 20 reactions
  const isViral = post._count.reactions > avgReactions * 5 && post._count.reactions > 20;

  return {
    isViral,
    reactionRate,
    requiresReview: isViral && post._count.reactions > 50,
  };
}

export async function checkSourceCredibility(urls: string[]): Promise<Map<string, {
  domain: string;
  credibilityScore: number;
  warnings: string[];
}>> {
  const results = new Map();

  for (const url of urls) {
    try {
      const domain = new URL(url).hostname.replace('www.', '');

      // Basic credibility check (in production, integrate with external credibility APIs)
      const knownLowCredibility: string[] = [
        // Placeholder - in production, use a real database/API
      ];

      const isLowCredibility = knownLowCredibility.some((d: string) => domain.includes(d));

      results.set(url, {
        domain,
        credibilityScore: isLowCredibility ? 0.3 : 0.7,
        warnings: isLowCredibility ? ['Source has known credibility concerns'] : [],
      });
    } catch {
      results.set(url, {
        domain: 'unknown',
        credibilityScore: 0.5,
        warnings: ['Could not verify source'],
      });
    }
  }

  return results;
}
