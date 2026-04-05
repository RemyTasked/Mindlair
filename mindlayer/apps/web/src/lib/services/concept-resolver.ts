import db from '@/lib/db';
import { generateEmbedding } from './ai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Hybrid concept resolver — three layers:
 *
 * 1. Alias map + exact/fuzzy text match  (free, instant)
 * 2. Embedding cosine similarity          (one API call for new embedding)
 * 3. LLM arbitration for ambiguous cases  (one API call, rare)
 *
 * Each layer returns either a definitive match, a "no match",
 * or hands off to the next layer.
 */

// ── Layer 1: Static alias map ──────────────────────────────────
// Maps common variations → a single canonical label.
// These run before any DB or API call.
const ALIAS_MAP: Record<string, string> = {
  'ai': 'artificial intelligence',
  'ml': 'machine learning',
  'llm': 'large language models',
  'llms': 'large language models',
  'gpt': 'large language models',
  'chatgpt': 'large language models',
  'deep learning': 'machine learning',
  'neural networks': 'machine learning',
  'gen ai': 'artificial intelligence',
  'genai': 'artificial intelligence',
  'generative ai': 'artificial intelligence',

  'fed': 'monetary policy',
  'federal reserve': 'monetary policy',
  'interest rates': 'monetary policy',
  'interest rate policy': 'monetary policy',
  'rate hikes': 'monetary policy',
  'rate cuts': 'monetary policy',
  'central banking': 'monetary policy',
  'central banks': 'monetary policy',
  'quantitative easing': 'monetary policy',
  'qe': 'monetary policy',

  'btc': 'cryptocurrency',
  'bitcoin': 'cryptocurrency',
  'ethereum': 'cryptocurrency',
  'eth': 'cryptocurrency',
  'crypto': 'cryptocurrency',
  'web3': 'cryptocurrency',
  'defi': 'cryptocurrency',
  'nft': 'cryptocurrency',
  'nfts': 'cryptocurrency',

  'climate change': 'climate & energy',
  'global warming': 'climate & energy',
  'renewable energy': 'climate & energy',
  'clean energy': 'climate & energy',
  'carbon emissions': 'climate & energy',
  'net zero': 'climate & energy',
  'green energy': 'climate & energy',
  'solar energy': 'climate & energy',
  'wind energy': 'climate & energy',
  'nuclear energy': 'climate & energy',
  'nuclear power': 'climate & energy',

  'foreign policy': 'geopolitics',
  'international relations': 'geopolitics',
  'world politics': 'geopolitics',
  'global politics': 'geopolitics',

  'diet': 'nutrition',
  'diets': 'nutrition',
  'healthy eating': 'nutrition',
  'food science': 'nutrition',

  'sleep': 'sleep science',
  'insomnia': 'sleep science',
  'circadian rhythm': 'sleep science',

  'housing': 'urbanism',
  'urban planning': 'urbanism',
  'zoning': 'urbanism',
  'city planning': 'urbanism',
  'public transit': 'urbanism',
  'public transportation': 'urbanism',

  'journalism': 'media & trust',
  'media literacy': 'media & trust',
  'media bias': 'media & trust',
  'misinformation': 'media & trust',
  'disinformation': 'media & trust',
  'fake news': 'media & trust',

  'logistics': 'supply chains',
  'supply chain': 'supply chains',
  'global trade': 'supply chains',

  'philosophy of mind': 'philosophy',
  'consciousness': 'philosophy',
  'free will': 'philosophy',
  'ethics': 'philosophy',
  'moral philosophy': 'philosophy',

  'stoic philosophy': 'stoicism',
  'marcus aurelius': 'stoicism',
  'seneca': 'stoicism',
  'epictetus': 'stoicism',
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'its', 'it',
]);

// ── Normalize ──────────────────────────────────────────────────
function normalize(label: string): string {
  return label.toLowerCase().trim().replace(/\s+/g, ' ');
}

function tokenize(label: string): string[] {
  return normalize(label)
    .split(/[\s\-_&/,]+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

// ── Layer 1: Alias + fuzzy text match ──────────────────────────
function resolveByAlias(label: string): string | null {
  const norm = normalize(label);
  if (ALIAS_MAP[norm]) return ALIAS_MAP[norm];

  // Check if label contains an alias key as a phrase
  for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
    if (norm.includes(alias) && alias.length >= 3) return canonical;
  }
  return null;
}

function wordOverlapScore(a: string, b: string): number {
  const tokA = new Set(tokenize(a));
  const tokB = new Set(tokenize(b));
  if (tokA.size === 0 || tokB.size === 0) return 0;

  let overlap = 0;
  for (const w of tokA) {
    if (tokB.has(w)) overlap++;
  }
  return (2 * overlap) / (tokA.size + tokB.size);
}

function isSubstringMatch(a: string, b: string): boolean {
  const na = normalize(a), nb = normalize(b);
  if (na.length < 3 || nb.length < 3) return false;
  return na.includes(nb) || nb.includes(na);
}

// ── Layer 2: Embedding cosine similarity ───────────────────────
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

const SIMILARITY_THRESHOLD_HIGH = 0.85;
const SIMILARITY_THRESHOLD_AMBIGUOUS = 0.70;

// ── Layer 3: LLM arbitration ───────────────────────────────────
let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
  return anthropicClient;
}

async function llmArbitrate(
  newLabel: string,
  candidates: { label: string; similarity: number }[]
): Promise<string | null> {
  if (candidates.length === 0) return null;

  const candidateList = candidates
    .map((c, i) => `${i + 1}. "${c.label}" (similarity: ${c.similarity.toFixed(2)})`)
    .join('\n');

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-35-20241022',
      max_tokens: 10,
      temperature: 0,
      system: `You decide whether a new topic label refers to the same concept as an existing one.

If the new label is clearly the same topic (just different wording), return its number.
If it's a genuinely different topic, return 0.

Consider:
- "Federal Reserve policy" and "monetary policy" → SAME
- "machine learning" and "artificial intelligence" → SAME (close enough to cluster)
- "nutrition" and "sleep science" → DIFFERENT (related but distinct domains)
- "React framework" and "web development" → DIFFERENT (specific vs broad)

Respond with ONLY a single number (the match index, or 0 for no match).`,
      messages: [
        {
          role: 'user',
          content: `New label: "${newLabel}"\n\nExisting candidates:\n${candidateList}`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '0';
    const answer = parseInt(text.trim(), 10);
    if (answer > 0 && answer <= candidates.length) {
      return candidates[answer - 1].label;
    }
    return null;
  } catch (error) {
    console.error('[ConceptResolver] LLM arbitration failed:', error);
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────────

export interface ResolvedConcept {
  id: string;
  label: string;
  isNew: boolean;
  matchedBy: 'exact' | 'alias' | 'fuzzy' | 'embedding' | 'llm' | 'new';
}

/**
 * Resolve a concept label to an existing concept or create a new one.
 * Runs through the three layers in order.
 */
export async function resolveConcept(rawLabel: string): Promise<ResolvedConcept> {
  const norm = normalize(rawLabel);

  // ── 1a. Exact match ──
  const exact = await db.concept.findUnique({ where: { label: norm } });
  if (exact) {
    return { id: exact.id, label: exact.label, isNew: false, matchedBy: 'exact' };
  }

  // ── 1b. Static alias map ──
  const aliased = resolveByAlias(norm);
  if (aliased) {
    const aliasMatch = await db.concept.findUnique({ where: { label: normalize(aliased) } });
    if (aliasMatch) {
      // Store this label as a known alias on the concept
      await addAlias(aliasMatch.id, norm);
      return { id: aliasMatch.id, label: aliasMatch.label, isNew: false, matchedBy: 'alias' };
    }
    // Alias target doesn't exist yet — we'll create under the canonical name
    return createConcept(normalize(aliased), norm);
  }

  // ── 1c. Database alias field check ──
  const byStoredAlias = await db.concept.findFirst({
    where: { aliases: { has: norm } },
  });
  if (byStoredAlias) {
    return { id: byStoredAlias.id, label: byStoredAlias.label, isNew: false, matchedBy: 'alias' };
  }

  // ── 1d. Fuzzy text match against existing concepts ──
  const allConcepts = await db.concept.findMany({
    select: { id: true, label: true, embeddingJson: true },
    orderBy: { updatedAt: 'desc' },
    take: 500,
  });

  for (const c of allConcepts) {
    if (isSubstringMatch(norm, c.label) || wordOverlapScore(norm, c.label) >= 0.75) {
      await addAlias(c.id, norm);
      return { id: c.id, label: c.label, isNew: false, matchedBy: 'fuzzy' };
    }
  }

  // ── 2. Embedding similarity ──
  const newEmbedding = await generateEmbedding(norm);

  if (newEmbedding.length > 0) {
    const scored: { id: string; label: string; similarity: number }[] = [];

    for (const c of allConcepts) {
      const stored = c.embeddingJson as number[] | null;
      if (!stored || !Array.isArray(stored) || stored.length === 0) continue;

      const sim = cosineSimilarity(newEmbedding, stored);
      if (sim >= SIMILARITY_THRESHOLD_AMBIGUOUS) {
        scored.push({ id: c.id, label: c.label, similarity: sim });
      }
    }

    scored.sort((a, b) => b.similarity - a.similarity);

    // High-confidence embedding match
    if (scored.length > 0 && scored[0].similarity >= SIMILARITY_THRESHOLD_HIGH) {
      await addAlias(scored[0].id, norm);
      return { id: scored[0].id, label: scored[0].label, isNew: false, matchedBy: 'embedding' };
    }

    // ── 3. Ambiguous zone → LLM arbitration ──
    if (scored.length > 0) {
      const llmMatch = await llmArbitrate(norm, scored.slice(0, 5));
      if (llmMatch) {
        const matched = scored.find(s => s.label === llmMatch);
        if (matched) {
          await addAlias(matched.id, norm);
          return { id: matched.id, label: matched.label, isNew: false, matchedBy: 'llm' };
        }
      }
    }

    // ── No match found → create new concept with embedding ──
    return createConcept(norm, undefined, newEmbedding);
  }

  // Embedding generation failed — create without it
  return createConcept(norm);
}

/**
 * Resolve multiple concept labels in batch (used after claim extraction).
 * Returns canonical concept IDs.
 */
export async function resolveConceptBatch(
  rawLabels: string[]
): Promise<ResolvedConcept[]> {
  const results: ResolvedConcept[] = [];
  const seen = new Map<string, ResolvedConcept>();

  for (const label of rawLabels) {
    const norm = normalize(label);
    if (seen.has(norm)) {
      results.push(seen.get(norm)!);
      continue;
    }

    const resolved = await resolveConcept(label);
    seen.set(norm, resolved);
    results.push(resolved);
  }

  return results;
}

/**
 * Get all existing concept labels (used to seed the extraction prompt).
 */
export async function getCanonicalConceptLabels(): Promise<string[]> {
  const concepts = await db.concept.findMany({
    select: { label: true },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  return concepts.map(c => c.label);
}

/**
 * Find posts with semantically similar headline claims.
 * Used to cluster similar posts together on the map.
 */
export async function findSimilarPosts(
  headlineClaim: string,
  excludePostId?: string
): Promise<{ postId: string; headlineClaim: string; similarity: number; conceptIds: string[] }[]> {
  const norm = normalize(headlineClaim);
  const embedding = await generateEmbedding(norm);
  
  if (embedding.length === 0) {
    // Fallback to text matching if embedding fails
    const posts = await db.post.findMany({
      where: {
        status: 'published',
        ...(excludePostId ? { id: { not: excludePostId } } : {}),
      },
      select: {
        id: true,
        headlineClaim: true,
        source: {
          include: {
            claims: {
              include: {
                claimConcepts: true,
              },
            },
          },
        },
      },
      take: 100,
      orderBy: { publishedAt: 'desc' },
    });

    const results: { postId: string; headlineClaim: string; similarity: number; conceptIds: string[] }[] = [];
    
    for (const post of posts) {
      const overlap = wordOverlapScore(norm, post.headlineClaim);
      if (overlap >= 0.5) {
        const conceptIds = post.source?.claims
          .flatMap(c => c.claimConcepts.map(cc => cc.conceptId)) || [];
        results.push({
          postId: post.id,
          headlineClaim: post.headlineClaim,
          similarity: overlap,
          conceptIds: [...new Set(conceptIds)],
        });
      }
    }
    
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
  }

  // Use embedding similarity for better matching
  const posts = await db.post.findMany({
    where: {
      status: 'published',
      ...(excludePostId ? { id: { not: excludePostId } } : {}),
    },
    select: {
      id: true,
      headlineClaim: true,
      source: {
        include: {
          claims: {
            include: {
              claimConcepts: true,
            },
          },
        },
      },
    },
    take: 200,
    orderBy: { publishedAt: 'desc' },
  });

  const scoredPosts: { postId: string; headlineClaim: string; similarity: number; conceptIds: string[] }[] = [];

  for (const post of posts) {
    const postEmbedding = await generateEmbedding(normalize(post.headlineClaim));
    if (postEmbedding.length === 0) continue;

    const sim = cosineSimilarity(embedding, postEmbedding);
    if (sim >= 0.7) {
      const conceptIds = post.source?.claims
        .flatMap(c => c.claimConcepts.map(cc => cc.conceptId)) || [];
      scoredPosts.push({
        postId: post.id,
        headlineClaim: post.headlineClaim,
        similarity: sim,
        conceptIds: [...new Set(conceptIds)],
      });
    }
  }

  return scoredPosts.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
}

/**
 * Extract key concepts from a headline claim.
 * Used to ensure posts are linked to the right map clusters.
 */
export async function extractConceptsFromHeadline(headlineClaim: string): Promise<string[]> {
  const tokens = tokenize(headlineClaim);
  const concepts: string[] = [];
  
  // Check for known aliases/concepts in the headline
  for (const token of tokens) {
    const aliased = resolveByAlias(token);
    if (aliased) {
      concepts.push(aliased);
    }
  }
  
  // Also check multi-word phrases
  const norm = normalize(headlineClaim);
  for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
    if (norm.includes(alias) && alias.length >= 3) {
      if (!concepts.includes(canonical)) {
        concepts.push(canonical);
      }
    }
  }
  
  // If we found no known concepts, extract noun phrases as potential concepts
  if (concepts.length === 0) {
    // Return significant words as potential new concepts
    const significantTokens = tokens.filter(t => t.length >= 4);
    return significantTokens.slice(0, 3);
  }
  
  return [...new Set(concepts)];
}

// ── Internal helpers ───────────────────────────────────────────

async function createConcept(
  label: string,
  aliasFrom?: string,
  embedding?: number[],
): Promise<ResolvedConcept> {
  const concept = await db.concept.create({
    data: {
      label,
      type: 'topic',
      aliases: aliasFrom ? [aliasFrom] : [],
      embeddingJson: embedding && embedding.length > 0 ? embedding : undefined,
    },
  });

  // Also try to store in pgvector column (fails silently if unavailable)
  if (embedding && embedding.length > 0) {
    try {
      const embeddingStr = `[${embedding.join(',')}]`;
      await db.$executeRawUnsafe(
        `UPDATE concepts SET embedding = $1::vector WHERE id = $2`,
        embeddingStr,
        concept.id,
      );
    } catch {
      // pgvector not available — embeddingJson is the fallback
    }
  }

  return { id: concept.id, label: concept.label, isNew: true, matchedBy: 'new' };
}

async function addAlias(conceptId: string, alias: string): Promise<void> {
  try {
    const concept = await db.concept.findUnique({
      where: { id: conceptId },
      select: { aliases: true },
    });
    if (concept && !concept.aliases.includes(alias)) {
      await db.concept.update({
        where: { id: conceptId },
        data: { aliases: { push: alias } },
      });
    }
  } catch {
    // non-critical — alias storage failure shouldn't break the flow
  }
}
