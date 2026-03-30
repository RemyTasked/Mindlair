import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }
  return anthropicClient;
}

export const MODEL_VERSION = 'claude-sonnet-4-20250514';
const FAST_MODEL = 'claude-haiku-35-20241022';
const EMBEDDING_MODEL = 'voyage-3-lite';

async function claudeJSON<T>(opts: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const response = await getAnthropic().messages.create({
    model: opts.model || MODEL_VERSION,
    max_tokens: opts.maxTokens || 1024,
    temperature: opts.temperature ?? 0.3,
    system: opts.system + '\n\nRespond ONLY with valid JSON. No markdown fences, no commentary.',
    messages: [{ role: 'user', content: opts.user }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text);
}

export interface ExtractedClaim {
  text: string;
  type: 'factual' | 'opinion' | 'prediction' | 'policy';
  confidence: number;
  concepts: string[];
  summary?: string;
}

export interface ContentAnalysis {
  claims: ExtractedClaim[];
  primaryTopic: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
}

function buildExtractionPrompt(existingConcepts: string[]): string {
  const conceptGuidance = existingConcepts.length > 0
    ? `\n\nIMPORTANT — The user already has these concept clusters in their map:\n${existingConcepts.map(c => `  - ${c}`).join('\n')}\n\nWhen listing concepts for a claim, REUSE labels from this list whenever the topic matches or is closely related. Only create a new concept label if the topic genuinely doesn't fit any existing cluster. Use broad, stable labels (e.g. "monetary policy" not "Fed rate hike September 2024").`
    : '';

  return `You are an expert at analyzing content and extracting core claims.

Given the content below, extract the 1-3 most important claims being made. For each claim:
1. State the claim as a clear, standalone statement
2. Classify the type: factual (verifiable), opinion (subjective view), prediction (future outcome), policy (should/shouldn't)
3. Rate your confidence 0-1 that this is the core claim
4. List 2-5 concepts/topics this claim relates to${conceptGuidance}

Focus on claims that:
- Represent the author's main argument or thesis
- Would prompt someone to agree, disagree, or reflect
- Are specific enough to have a clear stance

Avoid:
- Generic statements everyone agrees with
- Pure factual reporting without perspective
- Clickbait or sensationalized claims

Respond in JSON format:
{
  "claims": [
    {
      "text": "The claim as a clear statement",
      "type": "opinion",
      "confidence": 0.85,
      "concepts": ["concept1", "concept2"]
    }
  ],
  "primaryTopic": "main topic",
  "sentiment": "positive|negative|neutral|mixed"
}`;
}

export async function extractClaims(
  content: {
    title: string;
    text?: string;
    url: string;
  },
  existingConcepts: string[] = [],
): Promise<ContentAnalysis> {
  const contentText = content.text 
    ? `Title: ${content.title}\n\nContent:\n${content.text.slice(0, 8000)}`
    : `Title: ${content.title}\nURL: ${content.url}`;

  const systemPrompt = buildExtractionPrompt(existingConcepts);

  try {
    const result = await claudeJSON<ContentAnalysis>({
      system: systemPrompt,
      user: contentText,
      temperature: 0.3,
      maxTokens: 1000,
    });
    
    return {
      claims: result.claims || [],
      primaryTopic: result.primaryTopic || 'general',
      sentiment: result.sentiment || 'neutral',
    };
  } catch (error) {
    console.error('Claude extraction error:', error);
    
    return {
      claims: [{
        text: `[Pending review] ${content.title}`,
        type: 'opinion',
        confidence: 0,
        concepts: [],
      }],
      primaryTopic: 'unknown',
      sentiment: 'neutral',
    };
  }
}

/**
 * Generate an embedding via the Voyage AI REST API.
 * Falls back gracefully to an empty array on failure.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    console.warn('VOYAGE_API_KEY not set — embedding skipped');
    return [];
  }

  try {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: [text],
      }),
    });

    if (!response.ok) {
      console.error('Voyage embedding error:', response.status, await response.text());
      return [];
    }

    const data = await response.json();
    return data.data?.[0]?.embedding ?? [];
  } catch (error) {
    console.error('Embedding error:', error);
    return [];
  }
}

export async function findSimilarConcepts(
  embedding: number[],
  existingConcepts: { id: string; label: string; embedding: number[] }[],
  threshold = 0.8
): Promise<{ id: string; label: string; similarity: number }[]> {
  const similar: { id: string; label: string; similarity: number }[] = [];
  
  for (const concept of existingConcepts) {
    if (!concept.embedding?.length) continue;
    
    const similarity = cosineSimilarity(embedding, concept.embedding);
    if (similarity >= threshold) {
      similar.push({ id: concept.id, label: concept.label, similarity });
    }
  }
  
  return similar.sort((a, b) => b.similarity - a.similarity);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface ContradictionResult {
  claimAId: string;
  claimBId: string;
  type: 'direct_contradiction' | 'implicit_tension';
  explanation: string;
  confidence: number;
}

const CONTRADICTION_DETECTION_PROMPT = `You are an expert at detecting logical contradictions between claims.

Given two claims that a user has affirmed (expressed agreement with), determine if they logically contradict each other.

Types of contradictions:
1. Direct contradiction: The claims make mutually exclusive assertions that cannot both be true
2. Implicit tension: The claims suggest different worldviews but aren't strictly contradictory

Consider:
- Context and nuance - claims may seem contradictory at first but actually address different aspects
- Time sensitivity - beliefs can evolve, so consider if both could be held at different times
- Scope differences - claims about different domains may not truly conflict

Respond in JSON format:
{
  "hasContradiction": true/false,
  "type": "direct_contradiction" or "implicit_tension" or null,
  "explanation": "Brief explanation of why these claims conflict (or why they don't)",
  "confidence": 0.0-1.0
}`;

export async function detectContradictions(
  claims: Array<{ id: string; text: string }>
): Promise<ContradictionResult[]> {
  if (claims.length < 2) return [];
  
  const contradictions: ContradictionResult[] = [];
  
  const pairsToCheck = Math.min(claims.length * (claims.length - 1) / 2, 10);
  let checkedPairs = 0;
  
  for (let i = 0; i < claims.length && checkedPairs < pairsToCheck; i++) {
    for (let j = i + 1; j < claims.length && checkedPairs < pairsToCheck; j++) {
      const claimA = claims[i];
      const claimB = claims[j];
      
      try {
        const result = await claudeJSON<{
          hasContradiction: boolean;
          type: 'direct_contradiction' | 'implicit_tension' | null;
          explanation: string;
          confidence: number;
        }>({
          system: CONTRADICTION_DETECTION_PROMPT,
          user: `Claim 1 (user agreed): "${claimA.text}"\n\nClaim 2 (user agreed): "${claimB.text}"`,
          temperature: 0.2,
          maxTokens: 500,
        });
        
        if (result.hasContradiction && result.type && result.confidence >= 0.6) {
          contradictions.push({
            claimAId: claimA.id,
            claimBId: claimB.id,
            type: result.type,
            explanation: result.explanation || 'These claims appear to conflict.',
            confidence: result.confidence,
          });
        }
        
        checkedPairs++;
      } catch (error) {
        console.error('Contradiction detection error:', error);
      }
    }
  }
  
  return contradictions;
}

export interface BlindSpotResult {
  conceptId: string;
  label: string;
  relatedTo: string[];
  reason: string;
}

export async function identifyBlindSpots(
  userConcepts: Array<{ id: string; label: string }>,
  allConcepts: Array<{ id: string; label: string; embedding?: number[] }>
): Promise<BlindSpotResult[]> {
  if (userConcepts.length === 0 || allConcepts.length === 0) return [];
  
  const userConceptIds = new Set(userConcepts.map(c => c.id));
  const userLabels = userConcepts.map(c => c.label);
  
  const unengagedConcepts = allConcepts.filter(c => !userConceptIds.has(c.id));
  
  if (unengagedConcepts.length === 0) return [];
  
  try {
    const result = await claudeJSON<{
      blindSpots: Array<{ label: string; relatedTo: string[]; reason: string }>;
    }>({
      system: `You are identifying "blind spots" - topics adjacent to a user's interests that they haven't explored yet.

Given topics the user HAS engaged with and topics they HAVEN'T, identify which unengaged topics would be most valuable for them to explore based on their interests.

Respond in JSON format:
{
  "blindSpots": [
    {
      "label": "topic name",
      "relatedTo": ["user topic 1", "user topic 2"],
      "reason": "Why this is a valuable blind spot to explore"
    }
  ]
}

Return 3-5 most relevant blind spots.`,
      user: `User's engaged topics: ${userLabels.join(', ')}\n\nUnengaged topics to consider: ${unengagedConcepts.slice(0, 50).map(c => c.label).join(', ')}`,
      temperature: 0.4,
      maxTokens: 800,
    });
    
    return (result.blindSpots || []).map((bs) => {
      const matchedConcept = unengagedConcepts.find(
        c => c.label.toLowerCase() === bs.label.toLowerCase()
      );
      return {
        conceptId: matchedConcept?.id || '',
        label: bs.label,
        relatedTo: bs.relatedTo || [],
        reason: bs.reason || '',
      };
    }).filter((bs: BlindSpotResult) => bs.conceptId);
  } catch (error) {
    console.error('Blind spot identification error:', error);
    return [];
  }
}
