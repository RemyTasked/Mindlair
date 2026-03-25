import OpenAI from 'openai';
import db from '@/lib/db';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }
  return openaiClient;
}

const MODEL_VERSION = 'gpt-4o-2024-08-06';

export interface Citation {
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  claimText: string;
  stance?: string;
  date: string;
}

export interface QueryResponse {
  answer: string;
  citations: Citation[];
  relatedConcepts: Array<{ id: string; label: string; direction: string }>;
  queryType: 'engagement' | 'timeline' | 'comparison' | 'general';
}

const QUERY_UNDERSTANDING_PROMPT = `You are analyzing a user's question about their own belief graph and reading history.

Given the user's question, determine:
1. The intent/type of query
2. What concepts/topics are being asked about
3. What time range is relevant (if any)
4. What kind of information would best answer this

Query types:
- "engagement": Questions about what they've read ("what have I read about X?")
- "timeline": Questions about how views evolved ("how has my view on X changed?")
- "comparison": Questions comparing topics ("do I engage more with X or Y?")
- "general": Other questions about the belief graph

Respond in JSON format:
{
  "queryType": "engagement" | "timeline" | "comparison" | "general",
  "concepts": ["concept1", "concept2"],
  "timeRange": "recent" | "all_time" | null,
  "searchTerms": ["term1", "term2"]
}`;

const ANSWER_GENERATION_PROMPT = `You are answering questions about a user's belief graph and reading engagement.

CRITICAL RULES:
1. NEVER summarize or state the user's views/opinions
2. ALWAYS cite specific sources when mentioning what they've read
3. Report FACTS about their engagement (what they read, when, how many times)
4. If asked about their position, say "you reacted with [agree/disagree/complicated] to..."
5. Use exact quotes from claims they've engaged with

Format citations as: [Source: Title (Outlet)]

You will be given context about their beliefs and sources. Answer factually and with citations.`;

export async function queryBeliefGraph(
  userId: string,
  question: string
): Promise<QueryResponse> {
  // Step 1: Understand the query
  const understanding = await understandQuery(question);

  // Step 2: Gather relevant context
  const context = await gatherContext(userId, understanding);

  // Step 3: Generate answer with citations
  const response = await generateAnswer(question, context);

  return response;
}

async function understandQuery(question: string): Promise<{
  queryType: string;
  concepts: string[];
  timeRange: string | null;
  searchTerms: string[];
}> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: MODEL_VERSION,
      messages: [
        { role: 'system', content: QUERY_UNDERSTANDING_PROMPT },
        { role: 'user', content: question },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 300,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Query understanding error:', error);
    return {
      queryType: 'general',
      concepts: [],
      timeRange: null,
      searchTerms: question.toLowerCase().split(' ').filter(w => w.length > 3),
    };
  }
}

interface QueryContext {
  beliefs: Array<{
    conceptId: string;
    label: string;
    direction: string;
    strength: number;
    positionCount: number;
  }>;
  recentSources: Array<{
    id: string;
    url: string;
    title: string;
    outlet: string;
    consumedAt: string;
    claims: Array<{
      text: string;
      userStance?: string;
    }>;
  }>;
  positions: Array<{
    claimText: string;
    stance: string;
    sourceTitle: string;
    sourceUrl: string;
    date: string;
  }>;
  stats: {
    totalSources: number;
    totalPositions: number;
    conceptCount: number;
  };
}

async function gatherContext(
  userId: string,
  understanding: {
    queryType: string;
    concepts: string[];
    timeRange: string | null;
    searchTerms: string[];
  }
): Promise<QueryContext> {
  const dateFilter = understanding.timeRange === 'recent'
    ? { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    : undefined;

  // Get beliefs
  const beliefs = await db.belief.findMany({
    where: { userId },
    include: { concept: true },
    orderBy: { positionCount: 'desc' },
    take: 50,
  });

  // Filter by concepts if specified
  const filteredBeliefs = understanding.concepts.length > 0
    ? beliefs.filter(b => 
        understanding.concepts.some(c => 
          b.concept.label.toLowerCase().includes(c.toLowerCase())
        )
      )
    : beliefs;

  // Get recent sources with claims
  const sources = await db.source.findMany({
    where: {
      userId,
      consumedAt: dateFilter,
    },
    include: {
      claims: {
        include: {
          positions: {
            where: { userId },
            take: 1,
          },
        },
      },
    },
    orderBy: { consumedAt: 'desc' },
    take: 20,
  });

  // Filter sources by search terms
  const filteredSources = understanding.searchTerms.length > 0
    ? sources.filter(s =>
        understanding.searchTerms.some(term =>
          s.title?.toLowerCase().includes(term) ||
          s.claims.some(c => c.text.toLowerCase().includes(term))
        )
      )
    : sources;

  // Get positions for timeline queries
  const positions = await db.position.findMany({
    where: {
      userId,
      createdAt: dateFilter,
    },
    include: {
      claim: {
        include: { source: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  // Get stats
  const [totalSources, totalPositions] = await Promise.all([
    db.source.count({ where: { userId } }),
    db.position.count({ where: { userId } }),
  ]);

  return {
    beliefs: filteredBeliefs.map(b => ({
      conceptId: b.conceptId,
      label: b.concept.label,
      direction: b.direction,
      strength: b.strength,
      positionCount: b.positionCount,
    })),
    recentSources: filteredSources.map(s => ({
      id: s.id,
      url: s.url,
      title: s.title || 'Unknown',
      outlet: s.outlet || 'Unknown',
      consumedAt: s.consumedAt.toISOString(),
      claims: s.claims.map(c => ({
        text: c.text,
        userStance: c.positions[0]?.stance,
      })),
    })),
    positions: positions.map(p => ({
      claimText: p.claim.text,
      stance: p.stance,
      sourceTitle: p.claim.source.title || 'Unknown',
      sourceUrl: p.claim.source.url,
      date: p.createdAt.toISOString(),
    })),
    stats: {
      totalSources,
      totalPositions,
      conceptCount: beliefs.length,
    },
  };
}

async function generateAnswer(
  question: string,
  context: QueryContext
): Promise<QueryResponse> {
  const contextStr = buildContextString(context);

  try {
    const response = await getOpenAI().chat.completions.create({
      model: MODEL_VERSION,
      messages: [
        { role: 'system', content: ANSWER_GENERATION_PROMPT },
        { 
          role: 'user', 
          content: `Context about user's engagement:\n${contextStr}\n\nQuestion: ${question}`
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const answer = response.choices[0].message.content || '';

    // Extract citations from context
    const citations: Citation[] = context.positions
      .filter(p => answer.toLowerCase().includes(p.sourceTitle.toLowerCase().slice(0, 20)))
      .slice(0, 5)
      .map(p => ({
        sourceId: '',
        sourceUrl: p.sourceUrl,
        sourceTitle: p.sourceTitle,
        claimText: p.claimText,
        stance: p.stance,
        date: p.date,
      }));

    // If no citations found in answer, add most relevant ones
    if (citations.length === 0 && context.positions.length > 0) {
      citations.push(...context.positions.slice(0, 3).map(p => ({
        sourceId: '',
        sourceUrl: p.sourceUrl,
        sourceTitle: p.sourceTitle,
        claimText: p.claimText,
        stance: p.stance,
        date: p.date,
      })));
    }

    return {
      answer,
      citations,
      relatedConcepts: context.beliefs.slice(0, 5).map(b => ({
        id: b.conceptId,
        label: b.label,
        direction: b.direction,
      })),
      queryType: 'engagement',
    };
  } catch (error) {
    console.error('Answer generation error:', error);
    return {
      answer: 'I encountered an error while processing your question. Please try again.',
      citations: [],
      relatedConcepts: [],
      queryType: 'general',
    };
  }
}

function buildContextString(context: QueryContext): string {
  const parts: string[] = [];

  parts.push(`Stats: ${context.stats.totalSources} sources consumed, ${context.stats.totalPositions} positions taken, ${context.stats.conceptCount} concepts tracked.`);

  if (context.beliefs.length > 0) {
    parts.push('\nBeliefs:');
    for (const belief of context.beliefs.slice(0, 10)) {
      parts.push(`- ${belief.label}: ${belief.direction} stance (${belief.positionCount} positions)`);
    }
  }

  if (context.recentSources.length > 0) {
    parts.push('\nRecent Sources:');
    for (const source of context.recentSources.slice(0, 5)) {
      parts.push(`- "${source.title}" (${source.outlet}, ${new Date(source.consumedAt).toLocaleDateString()})`);
      for (const claim of source.claims.slice(0, 2)) {
        if (claim.userStance) {
          parts.push(`  • Claim: "${claim.text.slice(0, 100)}..." - User: ${claim.userStance}`);
        }
      }
    }
  }

  if (context.positions.length > 0) {
    parts.push('\nRecent Positions:');
    for (const pos of context.positions.slice(0, 10)) {
      parts.push(`- ${pos.stance.toUpperCase()}: "${pos.claimText.slice(0, 80)}..." [Source: ${pos.sourceTitle}]`);
    }
  }

  return parts.join('\n');
}
