import db from '@/lib/db';
import { detectContradictions, identifyBlindSpots } from './ai';
import { extractConceptsFromHeadline, resolveConcept, resolveConceptBatch } from './concept-resolver';

type Stance = 'agree' | 'disagree' | 'complicated' | 'skip';
type BeliefDirection = 'positive' | 'negative' | 'mixed';

export async function updateBeliefGraph(
  userId: string,
  claimId: string,
  stance: Stance,
  conceptIds: string[]
): Promise<void> {
  if (stance === 'skip' || conceptIds.length === 0) {
    return;
  }

  const direction = stanceToDirection(stance);

  for (const conceptId of conceptIds) {
    await updateBelief(userId, conceptId, direction);
  }

  await checkForTensions(userId, conceptIds);
  await checkForEchoChamber(userId, conceptIds);
  
  // Check for semantic contradictions with recent claims (if user agreed)
  if (stance === 'agree') {
    await checkForSemanticContradictions(userId, claimId);
  }
}

/**
 * Updates the belief graph from a comment on a post.
 * Extracts concepts from comment text and creates positions with context 'comment'.
 */
export async function updateBeliefGraphFromComment(
  userId: string,
  postId: string,
  commentBody: string,
  stance: 'agree' | 'disagree' | 'complicated'
): Promise<void> {
  const claims = await ensureMappingClaimsForPost(postId);
  
  if (claims.length === 0) {
    return;
  }
  
  const commentConcepts = extractConceptsFromHeadline(commentBody);
  
  for (const claim of claims) {
    const existingConceptIds = claim.claimConcepts.map(cc => cc.conceptId);
    
    let additionalConceptIds: string[] = [];
    if (commentConcepts.length > 0) {
      additionalConceptIds = await linkClaimToConcepts(claim.id, commentConcepts);
    }
    
    const allConceptIds = [...new Set([...existingConceptIds, ...additionalConceptIds])];
    
    const existingPosition = await db.position.findFirst({
      where: {
        userId,
        claimId: claim.id,
        context: 'comment',
      },
      orderBy: { createdAt: 'desc' },
    });
    
    await db.position.create({
      data: {
        userId,
        claimId: claim.id,
        stance,
        note: commentBody.slice(0, 500),
        context: 'comment',
        supersedesId: existingPosition?.id,
      },
    });
    
    await updateBeliefGraph(userId, claim.id, stance, allConceptIds);
  }
}

async function updateBelief(
  userId: string,
  conceptId: string,
  direction: BeliefDirection
): Promise<void> {
  const existing = await db.belief.findUnique({
    where: {
      userId_conceptId: { userId, conceptId },
    },
  });

  if (!existing) {
    await db.belief.create({
      data: {
        userId,
        conceptId,
        direction,
        strength: 0.5,
        stability: 0.3,
        positionCount: 1,
        sameDirectionStreak: 1,
      },
    });
    return;
  }

  const isSameDirection = existing.direction === direction;
  const newStreak = isSameDirection 
    ? existing.sameDirectionStreak + 1 
    : 1;

  const newStrength = calculateNewStrength(
    existing.strength,
    existing.positionCount,
    direction === existing.direction
  );

  const newStability = calculateStability(
    existing.stability,
    existing.positionCount,
    isSameDirection
  );

  const newDirection = calculateNewDirection(
    existing.direction as BeliefDirection,
    direction,
    existing.positionCount
  );

  await db.belief.update({
    where: { id: existing.id },
    data: {
      direction: newDirection,
      strength: newStrength,
      stability: newStability,
      positionCount: existing.positionCount + 1,
      sameDirectionStreak: newStreak,
      echoFlagged: newStreak >= 5 && existing.direction !== 'mixed',
      lastCounterpointAt: !isSameDirection ? new Date() : existing.lastCounterpointAt,
    },
  });
}

function stanceToDirection(stance: Stance): BeliefDirection {
  switch (stance) {
    case 'agree': return 'positive';
    case 'disagree': return 'negative';
    case 'complicated': return 'mixed';
    default: return 'mixed';
  }
}

function calculateNewStrength(
  currentStrength: number,
  positionCount: number,
  sameDirection: boolean
): number {
  const decayFactor = 1 / (positionCount + 1);
  
  if (sameDirection) {
    return Math.min(1, currentStrength + 0.1 * decayFactor);
  } else {
    return Math.max(0.1, currentStrength * 0.9);
  }
}

function calculateStability(
  currentStability: number,
  positionCount: number,
  sameDirection: boolean
): number {
  if (sameDirection) {
    return Math.min(1, currentStability + 0.05);
  } else {
    return Math.max(0.1, currentStability * 0.7);
  }
}

function calculateNewDirection(
  current: BeliefDirection,
  incoming: BeliefDirection,
  positionCount: number
): BeliefDirection {
  if (current === incoming) return current;
  
  if (positionCount < 3) return incoming;
  
  return 'mixed';
}

async function checkForTensions(
  userId: string,
  conceptIds: string[]
): Promise<void> {
  if (conceptIds.length < 2) return;

  const beliefs = await db.belief.findMany({
    where: {
      userId,
      conceptId: { in: conceptIds },
    },
  });

  for (let i = 0; i < beliefs.length; i++) {
    for (let j = i + 1; j < beliefs.length; j++) {
      const beliefA = beliefs[i];
      const beliefB = beliefs[j];

      if (beliefA.direction === 'positive' && beliefB.direction === 'negative' ||
          beliefA.direction === 'negative' && beliefB.direction === 'positive') {
        
        const existingTension = await db.tension.findUnique({
          where: {
            conceptAId_conceptBId: {
              conceptAId: beliefA.conceptId,
              conceptBId: beliefB.conceptId,
            },
          },
        });

        if (existingTension) {
          await db.tension.update({
            where: { id: existingTension.id },
            data: { surfacedCount: existingTension.surfacedCount + 1 },
          });
        } else {
          await db.tension.create({
            data: {
              conceptAId: beliefA.conceptId,
              conceptBId: beliefB.conceptId,
              tensionType: 'implicit_tension',
            },
          });
        }
      }
    }
  }
}

async function checkForEchoChamber(
  userId: string,
  conceptIds: string[]
): Promise<void> {
  const echoFlaggedBeliefs = await db.belief.findMany({
    where: {
      userId,
      conceptId: { in: conceptIds },
      echoFlagged: true,
    },
    include: {
      concept: true,
    },
  });

  for (const belief of echoFlaggedBeliefs) {
    const existingNudge = await db.nudge.findFirst({
      where: {
        userId,
        conceptId: belief.conceptId,
        type: 'echo_chamber',
        status: 'pending',
      },
    });

    if (!existingNudge) {
      const oppositeDirection = belief.direction === 'positive' ? 'disagree' : 'agree';
      
      await db.nudge.create({
        data: {
          userId,
          conceptId: belief.conceptId,
          type: 'echo_chamber',
          sourceUrl: '',
          sourceTitle: `Explore different perspectives on ${belief.concept.label}`,
          framing: `You've ${oppositeDirection === 'disagree' ? 'agreed with' : 'disagreed with'} ${belief.sameDirectionStreak} claims about ${belief.concept.label} in a row. Want to see what the other side thinks?`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
}

async function checkForSemanticContradictions(
  userId: string,
  currentClaimId: string
): Promise<void> {
  // Get the current claim
  const currentClaim = await db.claim.findUnique({
    where: { id: currentClaimId },
    include: {
      claimConcepts: true,
    },
  });
  
  if (!currentClaim) return;
  
  // Get recent claims the user agreed with (last 30 days)
  const recentPositions = await db.position.findMany({
    where: {
      userId,
      stance: 'agree',
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      claimId: { not: currentClaimId },
    },
    include: {
      claim: {
        include: {
          claimConcepts: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  
  if (recentPositions.length === 0) return;
  
  // Build claims array for contradiction detection
  const claimsToCheck = [
    { id: currentClaim.id, text: currentClaim.text },
    ...recentPositions.map(p => ({
      id: p.claim.id,
      text: p.claim.text,
    })),
  ];
  
  // Detect contradictions using LLM
  const contradictions = await detectContradictions(claimsToCheck);
  
  // Store detected contradictions as tensions
  for (const contradiction of contradictions) {
    // Get concepts for both claims
    const claimAId = contradiction.claimAId;
    const claimBId = contradiction.claimBId;
    
    const claimA = claimAId === currentClaimId 
      ? currentClaim 
      : recentPositions.find(p => p.claim.id === claimAId)?.claim;
    const claimB = claimBId === currentClaimId 
      ? currentClaim 
      : recentPositions.find(p => p.claim.id === claimBId)?.claim;
    
    if (!claimA || !claimB) continue;
    
    // Get concept IDs from both claims
    const conceptAIds = claimA.claimConcepts.map(cc => cc.conceptId);
    const conceptBIds = claimB.claimConcepts.map(cc => cc.conceptId);
    
    // Create tensions between related concepts
    for (const conceptAId of conceptAIds) {
      for (const conceptBId of conceptBIds) {
        if (conceptAId === conceptBId) continue;
        
        // Check if tension already exists
        const existingTension = await db.tension.findFirst({
          where: {
            OR: [
              { conceptAId, conceptBId },
              { conceptAId: conceptBId, conceptBId: conceptAId },
            ],
          },
        });
        
        if (existingTension) {
          // Update existing tension with semantic detection info
          await db.tension.update({
            where: { id: existingTension.id },
            data: {
              tensionType: contradiction.type,
              surfacedCount: existingTension.surfacedCount + 1,
              metadata: {
                ...((existingTension.metadata as object) || {}),
                lastDetection: {
                  explanation: contradiction.explanation,
                  confidence: contradiction.confidence,
                  claimAText: claimA.text,
                  claimBText: claimB.text,
                  detectedAt: new Date().toISOString(),
                },
              },
            },
          });
        } else {
          // Create new tension
          await db.tension.create({
            data: {
              conceptAId,
              conceptBId,
              tensionType: contradiction.type,
              metadata: {
                explanation: contradiction.explanation,
                confidence: contradiction.confidence,
                claimAText: claimA.text,
                claimBText: claimB.text,
                detectedAt: new Date().toISOString(),
              },
            },
          });
        }
      }
    }
  }
}

export async function getOrCreateConcept(label: string): Promise<string> {
  const resolved = await resolveConcept(label);
  return resolved.id;
}

export async function linkClaimToConcepts(
  claimId: string,
  conceptLabels: string[]
): Promise<string[]> {
  const resolved = await resolveConceptBatch(conceptLabels);
  const conceptIds: string[] = [];

  for (const r of resolved) {
    conceptIds.push(r.id);

    await db.claimConcept.upsert({
      where: {
        claimId_conceptId: { claimId, conceptId: r.id },
      },
      create: {
        claimId,
        conceptId: r.id,
        relevance: 1.0,
      },
      update: {},
    });
  }

  return conceptIds;
}

async function buildConceptLabelsForPost(
  headlineClaim: string,
  topicTags: string[],
): Promise<string[]> {
  const fromHeadline = await extractConceptsFromHeadline(headlineClaim);
  const merged = [...new Set([...fromHeadline, ...topicTags.filter(Boolean)])];
  if (merged.length === 0) {
    const t = headlineClaim.trim();
    return [t.slice(0, 72) || 'topic'];
  }
  return merged;
}

/**
 * Ensures the post has at least one Claim with ClaimConcepts so feed reactions
 * can create positions and update the belief graph (editorial/seed posts often
 * had Source but no extracted claims).
 */
export async function ensureMappingClaimsForPost(
  postId: string,
): Promise<Array<{ id: string; claimConcepts: { conceptId: string }[] }>> {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      source: {
        include: {
          claims: { include: { claimConcepts: true } },
        },
      },
    },
  });
  if (!post) return [];

  let sourceId: string;
  if (post.source) {
    sourceId = post.source.id;
  } else {
    const created = await db.source.create({
      data: {
        userId: post.authorId,
        url: `/post/${postId}`,
        title: post.headlineClaim.slice(0, 480),
        contentType: 'article',
        surface: 'discover_reaction',
        consumedAt: new Date(),
      },
    });
    await db.post.update({
      where: { id: postId },
      data: { sourceId: created.id },
    });
    sourceId = created.id;
  }

  let claims = await db.claim.findMany({
    where: { sourceId },
    include: { claimConcepts: true },
  });

  if (claims.length === 0) {
    const claim = await db.claim.create({
      data: {
        sourceId,
        text: post.headlineClaim.slice(0, 2000),
        claimType: 'opinion',
        confidenceScore: 0.55,
        modelVersion: 'headline-fallback',
      },
    });
    const labels = await buildConceptLabelsForPost(post.headlineClaim, post.topicTags);
    await linkClaimToConcepts(claim.id, labels);
    claims = await db.claim.findMany({
      where: { sourceId },
      include: { claimConcepts: true },
    });
  } else {
    for (const c of claims) {
      if (c.claimConcepts.length === 0) {
        const labels = await buildConceptLabelsForPost(post.headlineClaim, post.topicTags);
        await linkClaimToConcepts(c.id, labels);
      }
    }
    claims = await db.claim.findMany({
      where: { sourceId },
      include: { claimConcepts: true },
    });
  }

  return claims.filter(c => c.claimConcepts.length > 0);
}

export interface UserCategory {
  name: string;
  conceptCount: number;
  positionCount: number;
  color: string;
}

const DEFAULT_CATEGORIES = [
  'technology', 'psychology', 'economics', 'health',
  'philosophy', 'culture', 'productivity', 'sports'
];

const FALLBACK_KEYWORDS: Record<string, string[]> = {
  technology: [
    'ai', 'artificial intelligence', 'machine learning', 'ml', 'software', 'hardware',
    'computer', 'programming', 'code', 'tech', 'digital', 'internet', 'web', 'app',
    'data', 'algorithm', 'crypto', 'blockchain', 'robot', 'automation', 'cyber',
    'cloud', 'network', 'mobile', 'device', 'startup', 'silicon', 'gpu', 'cpu',
  ],
  psychology: [
    'psychology', 'mental', 'brain', 'mind', 'cognitive', 'behavior', 'emotion',
    'therapy', 'anxiety', 'depression', 'consciousness', 'memory', 'learning',
    'motivation', 'personality', 'trauma', 'stress', 'mindfulness', 'meditation',
    'neuroscience', 'perception', 'decision', 'bias', 'habit', 'addiction',
  ],
  economics: [
    'economics', 'economy', 'money', 'finance', 'market', 'stock', 'trade',
    'investment', 'bank', 'inflation', 'gdp', 'tax', 'debt', 'capital', 'wealth',
    'poverty', 'income', 'wage', 'price', 'supply', 'demand', 'monetary', 'fiscal',
    'budget', 'business', 'commerce', 'profit', 'cost', 'asset', 'currency',
  ],
  health: [
    'health', 'medical', 'medicine', 'doctor', 'hospital', 'disease', 'illness',
    'nutrition', 'diet', 'exercise', 'fitness', 'sleep', 'wellness', 'vaccine',
    'drug', 'treatment', 'therapy', 'patient', 'symptom', 'cancer', 'heart',
    'immune', 'virus', 'bacteria', 'genetic', 'dna', 'body', 'physical',
  ],
  philosophy: [
    'philosophy', 'ethics', 'moral', 'truth', 'logic', 'reason', 'existence',
    'meaning', 'value', 'virtue', 'justice', 'freedom', 'consciousness', 'soul',
    'metaphysics', 'epistemology', 'ontology', 'aesthetic', 'stoic', 'nihil',
    'existential', 'rational', 'wisdom', 'belief', 'knowledge', 'reality',
  ],
  culture: [
    'culture', 'art', 'music', 'film', 'movie', 'book', 'literature', 'media',
    'social', 'society', 'tradition', 'religion', 'faith', 'spiritual', 'language',
    'history', 'heritage', 'identity', 'community', 'family', 'relationship',
    'fashion', 'food', 'travel', 'entertainment', 'celebrity', 'trend', 'meme',
  ],
  productivity: [
    'productivity', 'work', 'career', 'job', 'efficiency', 'management', 'goal',
    'habit', 'routine', 'schedule', 'planning', 'organization', 'focus', 'time',
    'task', 'project', 'deadline', 'meeting', 'team', 'leadership', 'skill',
    'learning', 'growth', 'success', 'achievement', 'performance', 'output',
  ],
  sports: [
    'sports', 'sport', 'athlete', 'game', 'team', 'player', 'coach', 'training',
    'competition', 'championship', 'league', 'score', 'win', 'football', 'soccer',
    'basketball', 'baseball', 'tennis', 'golf', 'running', 'swimming', 'cycling',
    'olympic', 'fitness', 'workout', 'gym', 'match', 'tournament', 'season',
  ],
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function categoryColor(name: string): string {
  const hash = hashString(name.toLowerCase());
  const hue = hash % 360;
  const sat = 55 + (hash % 25);
  const light = 50 + (hash % 15);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

function labelMatchesKeywords(label: string, categoryName: string): boolean {
  const keywords = FALLBACK_KEYWORDS[categoryName];
  if (!keywords) return false;
  
  const lowerLabel = label.toLowerCase();
  for (const keyword of keywords) {
    if (lowerLabel.includes(keyword)) {
      return true;
    }
  }
  return false;
}

export async function getUserCategories(userId: string): Promise<UserCategory[]> {
  const posts = await db.post.findMany({
    where: { authorId: userId, status: 'published' },
    select: { topicTags: true }
  });
  
  const tagCounts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.topicTags) {
      const normalizedTag = tag.toLowerCase().trim();
      if (normalizedTag) {
        tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
      }
    }
  }
  
  const beliefs = await db.belief.findMany({
    where: { userId },
    include: { concept: true },
  });
  
  const conceptsByCategory = new Map<string, { concepts: Set<string>; positions: number }>();
  
  for (const belief of beliefs) {
    const conceptLabel = belief.concept.label.toLowerCase();
    
    let assignedCategory: string | null = null;
    
    for (const [tag] of tagCounts) {
      if (conceptLabel.includes(tag) || tag.includes(conceptLabel)) {
        assignedCategory = tag;
        break;
      }
    }
    
    if (!assignedCategory) {
      for (const [tag] of tagCounts) {
        const tagWords = tag.split(/\s+/);
        const labelWords = conceptLabel.split(/\s+/);
        const hasOverlap = tagWords.some(tw => 
          labelWords.some(lw => tw.length > 2 && lw.length > 2 && 
            (tw.includes(lw) || lw.includes(tw)))
        );
        if (hasOverlap) {
          assignedCategory = tag;
          break;
        }
      }
    }
    
    if (!assignedCategory) {
      for (const defaultCat of DEFAULT_CATEGORIES) {
        if (labelMatchesKeywords(conceptLabel, defaultCat)) {
          assignedCategory = defaultCat;
          break;
        }
      }
    }
    
    if (!assignedCategory) {
      assignedCategory = 'general';
    }
    
    const existing = conceptsByCategory.get(assignedCategory) || { concepts: new Set(), positions: 0 };
    existing.concepts.add(belief.conceptId);
    existing.positions += belief.positionCount;
    conceptsByCategory.set(assignedCategory, existing);
  }
  
  for (const [tag, count] of tagCounts) {
    if (!conceptsByCategory.has(tag) && count >= 2) {
      conceptsByCategory.set(tag, { concepts: new Set(), positions: count });
    }
  }
  
  const categories: UserCategory[] = [];
  for (const [name, data] of conceptsByCategory) {
    categories.push({
      name,
      conceptCount: data.concepts.size,
      positionCount: data.positions,
      color: categoryColor(name),
    });
  }
  
  categories.sort((a, b) => b.positionCount - a.positionCount);
  
  const topCategories = categories.slice(0, 11);
  
  const hasGeneral = topCategories.some(c => c.name === 'general');
  if (!hasGeneral) {
    const restPositions = categories.slice(11).reduce((sum, c) => sum + c.positionCount, 0);
    const restConcepts = categories.slice(11).reduce((sum, c) => sum + c.conceptCount, 0);
    if (restPositions > 0 || restConcepts > 0) {
      topCategories.push({
        name: 'general',
        conceptCount: restConcepts,
        positionCount: restPositions,
        color: categoryColor('general'),
      });
    }
  }
  
  if (topCategories.length === 0) {
    return DEFAULT_CATEGORIES.map(name => ({
      name,
      conceptCount: 0,
      positionCount: 0,
      color: categoryColor(name),
    }));
  }
  
  return topCategories;
}

export function assignConceptToCategory(
  conceptLabel: string,
  userCategories: UserCategory[]
): string {
  const lowerLabel = conceptLabel.toLowerCase();
  
  for (const cat of userCategories) {
    if (cat.name === 'general') continue;
    if (lowerLabel === cat.name || lowerLabel.includes(cat.name) || cat.name.includes(lowerLabel)) {
      return cat.name;
    }
  }
  
  for (const cat of userCategories) {
    if (cat.name === 'general') continue;
    const catWords = cat.name.split(/\s+/);
    const labelWords = lowerLabel.split(/\s+/);
    const hasOverlap = catWords.some(cw => 
      labelWords.some(lw => cw.length > 2 && lw.length > 2 && 
        (cw.includes(lw) || lw.includes(cw)))
    );
    if (hasOverlap) {
      return cat.name;
    }
  }
  
  for (const cat of userCategories) {
    if (cat.name === 'general') continue;
    const keywords = FALLBACK_KEYWORDS[cat.name];
    if (keywords) {
      for (const keyword of keywords) {
        if (lowerLabel.includes(keyword)) {
          return cat.name;
        }
      }
    }
  }
  
  return 'general';
}

export interface MapNode {
  id: string;
  label: string;
  type: 'concept';
  direction: string;
  strength: number;
  stability: number;
  echoFlagged: boolean;
  positionCount: number;
  category: string;
}

export interface MapEdge {
  source: string;
  target: string;
  type: 'tension' | 'related';
  weight: number;
}

/** Edges that define spatial layout clusters (connected components on the map). */
export function layoutClusteringEdges(edges: MapEdge[]): MapEdge[] {
  return edges.filter(e => e.type === 'tension' || e.type === 'related');
}

export interface MergedMapNode extends MapNode {
  mergedFrom: string[];
  totalPositionCount: number;
}

export interface MergeResult {
  nodes: MergedMapNode[];
  edges: MapEdge[];
  mergedInto: Record<string, string>;
}

/**
 * Merges small concepts (low engagement) into their most connected neighbor.
 * Concepts with positionCount < minPositions get merged:
 * 1. Into their most connected neighbor (by edge weight)
 * 2. If no neighbor, into nearest same-category node
 */
export function mergeSmallConcepts(
  nodes: MapNode[],
  edges: MapEdge[],
  minPositions = 3
): MergeResult {
  const mergedInto: Record<string, string> = {};
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  const adjacency = new Map<string, Map<string, number>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Map());
  }
  for (const edge of edges) {
    const srcAdj = adjacency.get(edge.source);
    const tgtAdj = adjacency.get(edge.target);
    if (srcAdj) {
      srcAdj.set(edge.target, (srcAdj.get(edge.target) || 0) + edge.weight);
    }
    if (tgtAdj) {
      tgtAdj.set(edge.source, (tgtAdj.get(edge.source) || 0) + edge.weight);
    }
  }
  
  const smallNodes = nodes
    .filter(n => n.positionCount < minPositions)
    .sort((a, b) => a.positionCount - b.positionCount);
  
  const largeNodes = nodes.filter(n => n.positionCount >= minPositions);
  const absorbedIds = new Set<string>();
  
  for (const smallNode of smallNodes) {
    if (absorbedIds.has(smallNode.id)) continue;
    
    const neighbors = adjacency.get(smallNode.id) || new Map<string, number>();
    let bestTarget: string | null = null;
    let bestWeight = 0;
    
    for (const [neighborId, weight] of neighbors) {
      if (absorbedIds.has(neighborId)) continue;
      const neighbor = nodeMap.get(neighborId);
      if (!neighbor) continue;
      
      if (neighbor.positionCount >= minPositions && weight > bestWeight) {
        bestWeight = weight;
        bestTarget = neighborId;
      }
    }
    
    if (!bestTarget) {
      const sameCategory = largeNodes.filter(
        n => n.category === smallNode.category && !absorbedIds.has(n.id)
      );
      if (sameCategory.length > 0) {
        sameCategory.sort((a, b) => b.positionCount - a.positionCount);
        bestTarget = sameCategory[0].id;
      }
    }
    
    if (!bestTarget && largeNodes.length > 0) {
      const available = largeNodes.filter(n => !absorbedIds.has(n.id));
      if (available.length > 0) {
        available.sort((a, b) => b.positionCount - a.positionCount);
        bestTarget = available[0].id;
      }
    }
    
    if (bestTarget) {
      mergedInto[smallNode.id] = bestTarget;
      absorbedIds.add(smallNode.id);
    }
  }
  
  const mergedNodes: MergedMapNode[] = [];
  for (const node of nodes) {
    if (absorbedIds.has(node.id)) continue;
    
    const absorbed = Object.entries(mergedInto)
      .filter(([, target]) => target === node.id)
      .map(([source]) => source);
    
    const absorbedNodes = absorbed.map(id => nodeMap.get(id)!).filter(Boolean);
    const totalPositionCount = node.positionCount + 
      absorbedNodes.reduce((sum, n) => sum + n.positionCount, 0);
    
    mergedNodes.push({
      ...node,
      mergedFrom: absorbed,
      totalPositionCount,
    });
  }
  
  if (mergedNodes.length === 0 && smallNodes.length > 0) {
    const biggest = smallNodes.reduce((a, b) => 
      a.positionCount >= b.positionCount ? a : b
    );
    
    for (const node of smallNodes) {
      if (node.id !== biggest.id) {
        mergedInto[node.id] = biggest.id;
        absorbedIds.add(node.id);
      }
    }
    
    const absorbed = Object.entries(mergedInto)
      .filter(([, target]) => target === biggest.id)
      .map(([source]) => source);
    
    const absorbedNodes = absorbed.map(id => nodeMap.get(id)!).filter(Boolean);
    const totalPositionCount = biggest.positionCount +
      absorbedNodes.reduce((sum, n) => sum + n.positionCount, 0);
    
    mergedNodes.push({
      ...biggest,
      mergedFrom: absorbed,
      totalPositionCount,
    });
  }
  
  const remainingNodeIds = new Set(mergedNodes.map(n => n.id));
  const mergedEdges = edges.filter(
    e => remainingNodeIds.has(e.source) && remainingNodeIds.has(e.target)
  );
  
  return { nodes: mergedNodes, edges: mergedEdges, mergedInto };
}

export async function getBeliefMap(userId: string): Promise<{
  nodes: MapNode[];
  edges: MapEdge[];
  categories: UserCategory[];
}> {
  const userCategories = await getUserCategories(userId);
  
  const beliefs = await db.belief.findMany({
    where: { userId },
    include: { concept: true },
  });

  const tensions = await db.tension.findMany({
    where: {
      OR: [
        { conceptAId: { in: beliefs.map(b => b.conceptId) } },
        { conceptBId: { in: beliefs.map(b => b.conceptId) } },
      ],
    },
  });

  const nodes: MapNode[] = beliefs.map(belief => ({
    id: belief.conceptId,
    label: belief.concept.label,
    type: 'concept',
    direction: belief.direction,
    strength: belief.strength,
    stability: belief.stability,
    echoFlagged: belief.echoFlagged,
    positionCount: belief.positionCount,
    category: assignConceptToCategory(belief.concept.label, userCategories),
  }));

  const tensionEdges: MapEdge[] = tensions.map(tension => ({
    source: tension.conceptAId,
    target: tension.conceptBId,
    type: 'tension' as const,
    weight: tension.surfacedCount,
  }));

  const conceptIdSet = new Set(nodes.map(n => n.id));
  const relatedEdges = await getCooccurrenceRelatedEdges(userId, conceptIdSet, tensionEdges);

  return { nodes, edges: [...tensionEdges, ...relatedEdges], categories: userCategories };
}

/** Concepts that co-occur on the same claim (from user's positions), min 2 shared claims; skips tension pairs. */
async function getCooccurrenceRelatedEdges(
  userId: string,
  conceptIds: Set<string>,
  tensionEdges: MapEdge[],
): Promise<MapEdge[]> {
  const tensionPairs = new Set<string>();
  for (const e of tensionEdges) {
    const a = e.source < e.target ? e.source : e.target;
    const b = e.source < e.target ? e.target : e.source;
    tensionPairs.add(`${a}\0${b}`);
  }

  const positions = await db.position.findMany({
    where: { userId, stance: { not: 'skip' } },
    select: { claimId: true },
  });
  const claimIdSet = new Set(positions.map(p => p.claimId));
  const claimIds = [...claimIdSet];
  if (claimIds.length === 0) return [];

  const ccs = await db.claimConcept.findMany({
    where: { claimId: { in: claimIds } },
    select: { claimId: true, conceptId: true },
  });

  const byClaim = new Map<string, string[]>();
  for (const row of ccs) {
    if (!conceptIds.has(row.conceptId)) continue;
    const arr = byClaim.get(row.claimId) ?? [];
    arr.push(row.conceptId);
    byClaim.set(row.claimId, arr);
  }

  const pairCounts = new Map<string, { a: string; b: string; n: number }>();
  for (const ids of byClaim.values()) {
    const uniq = [...new Set(ids)];
    for (let i = 0; i < uniq.length; i++) {
      for (let j = i + 1; j < uniq.length; j++) {
        const x = uniq[i];
        const y = uniq[j];
        const lo = x < y ? x : y;
        const hi = x < y ? y : x;
        const key = `${lo}\0${hi}`;
        if (tensionPairs.has(key)) continue;
        const cur = pairCounts.get(key);
        if (cur) cur.n += 1;
        else pairCounts.set(key, { a: lo, b: hi, n: 1 });
      }
    }
  }

  const out: MapEdge[] = [];
  for (const { a, b, n } of pairCounts.values()) {
    if (n < 2) continue;
    out.push({
      source: a,
      target: b,
      type: 'related',
      weight: Math.min(n, 10),
    });
  }
  return out;
}

/** Connected component of the map graph (see `clusterMapNodes`). */
export interface MapCluster {
  id: string;
  label: string;
  nodeIds: string[];
  dominantDirection: string;
}

function modeDirection(arr: string[]): string | undefined {
  const counts = new Map<string, number>();
  let maxCount = 0;
  let maxValue: string | undefined;
  for (const val of arr) {
    const count = (counts.get(val) || 0) + 1;
    counts.set(val, count);
    if (count > maxCount) {
      maxCount = count;
      maxValue = val;
    }
  }
  return maxValue;
}

/**
 * Connected components for map layout: uses tension and related edges only
 * (`layoutClusteringEdges`), so new edge types do not affect grouping by default.
 */
export function clusterMapNodes(nodes: MapNode[], edges: MapEdge[]): MapCluster[] {
  if (nodes.length === 0) return [];

  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of layoutClusteringEdges(edges)) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const visited = new Set<string>();
  const clusters: MapCluster[] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const clusterIds: string[] = [];
    const queue = [node.id];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);
      clusterIds.push(current);

      const neighbors = adjacency.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    if (clusterIds.length > 0) {
      const clusterNodesList = nodes.filter(n => clusterIds.includes(n.id));
      const directions = clusterNodesList.map(n => n.direction);
      const dominantDirection = modeDirection(directions) || 'mixed';
      const primaryLabel =
        clusterNodesList.sort((a, b) => b.label.length - a.label.length)[0]?.label || 'Cluster';

      clusters.push({
        id: `cluster-${clusters.length}`,
        label: primaryLabel,
        nodeIds: clusterIds,
        dominantDirection,
      });
    }
  }

  return clusters;
}

const MIN_DISCOVERY_CLAIMS_FOR_PERSONAL_MAP = 5;
const MIN_SOURCE_RICH_CLUSTERS = 2;

/** Opinions from digest, Discover feed reactions, comments, and realtime capture. */
const DISCOVERY_POSITION_CONTEXTS = ['digest', 'post_reaction', 'comment', 'realtime'] as const;

export interface MapReadiness {
  discoveryClaimCount: number;
  sourceRichClusterCount: number;
  usePersonalMap: boolean;
}

/**
 * Switch off demo map once the user has enough discover-style opinions
 * (digest + feed reactions) or extracted claims across multiple tension clusters.
 */
export async function getMapReadiness(
  userId: string,
  graph: { nodes: MapNode[]; edges: MapEdge[] }
): Promise<MapReadiness> {
  const [discoveryGroups, conceptRows] = await Promise.all([
    db.position.groupBy({
      by: ['claimId'],
      where: {
        userId,
        stance: { not: 'skip' },
        context: { in: [...DISCOVERY_POSITION_CONTEXTS] },
      },
    }),
    db.claimConcept.findMany({
      where: { claim: { source: { userId } } },
      select: { conceptId: true },
      distinct: ['conceptId'],
    }),
  ]);

  const discoveryClaimCount = discoveryGroups.length;

  const conceptsWithExtractedClaims = new Set(conceptRows.map(r => r.conceptId));
  const clusters = clusterMapNodes(graph.nodes, graph.edges);

  let sourceRichClusterCount = 0;
  for (const c of clusters) {
    if (c.nodeIds.some(id => conceptsWithExtractedClaims.has(id))) {
      sourceRichClusterCount++;
    }
  }

  // No beliefs yet, but multiple concepts already tagged from the user's sources (e.g. imports).
  if (
    sourceRichClusterCount < MIN_SOURCE_RICH_CLUSTERS &&
    graph.nodes.length === 0 &&
    conceptsWithExtractedClaims.size >= MIN_SOURCE_RICH_CLUSTERS
  ) {
    sourceRichClusterCount = conceptsWithExtractedClaims.size;
  }

  const usePersonalMap =
    discoveryClaimCount >= MIN_DISCOVERY_CLAIMS_FOR_PERSONAL_MAP ||
    sourceRichClusterCount >= MIN_SOURCE_RICH_CLUSTERS;

  return {
    discoveryClaimCount,
    sourceRichClusterCount,
    usePersonalMap,
  };
}

export interface TimelineEntry {
  date: string;
  conceptId: string;
  label: string;
  direction: string;
  strength: number;
  claimText?: string;
  stance?: string;
}

export interface BlindSpot {
  conceptId: string;
  label: string;
  relatedTo: string[];
  reason: string;
}

export async function findBlindSpots(userId: string): Promise<BlindSpot[]> {
  // Get user's engaged concepts
  const userBeliefs = await db.belief.findMany({
    where: { userId },
    include: { concept: true },
  });
  
  if (userBeliefs.length === 0) return [];
  
  const userConcepts = userBeliefs.map(b => ({
    id: b.conceptId,
    label: b.concept.label,
  }));
  
  const userConceptIds = new Set(userConcepts.map(c => c.id));
  
  // Get all concepts (limit to avoid memory issues)
  const allConcepts = await db.concept.findMany({
    take: 500,
    orderBy: { createdAt: 'desc' },
  });
  
  // Filter to concepts user hasn't engaged with
  const unengagedConcepts = allConcepts
    .filter(c => !userConceptIds.has(c.id))
    .map(c => ({ id: c.id, label: c.label }));
  
  if (unengagedConcepts.length === 0) return [];
  
  // Use AI to identify blind spots
  const blindSpots = await identifyBlindSpots(userConcepts, unengagedConcepts);
  
  return blindSpots;
}

export async function createBlindSpotNudges(userId: string): Promise<number> {
  const blindSpots = await findBlindSpots(userId);
  let created = 0;
  
  for (const blindSpot of blindSpots.slice(0, 3)) {
    // Check if nudge already exists
    const existingNudge = await db.nudge.findFirst({
      where: {
        userId,
        conceptId: blindSpot.conceptId,
        type: 'blind_spot',
        status: 'pending',
      },
    });
    
    if (!existingNudge && blindSpot.conceptId) {
      await db.nudge.create({
        data: {
          userId,
          conceptId: blindSpot.conceptId,
          type: 'blind_spot',
          sourceUrl: '',
          sourceTitle: `Explore: ${blindSpot.label}`,
          framing: `${blindSpot.reason} Related to your interests in: ${blindSpot.relatedTo.join(', ')}`,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });
      created++;
    }
  }
  
  return created;
}

export async function getBeliefTimeline(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<TimelineEntry[]> {
  const positions = await db.position.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        lte: endDate || new Date(),
      },
    },
    include: {
      claim: {
        include: {
          claimConcepts: {
            include: { concept: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const timeline: TimelineEntry[] = [];

  for (const position of positions) {
    for (const cc of position.claim.claimConcepts) {
      timeline.push({
        date: position.createdAt.toISOString(),
        conceptId: cc.conceptId,
        label: cc.concept.label,
        direction: stanceToDirection(position.stance as Stance),
        strength: cc.relevance,
        claimText: position.claim.text,
        stance: position.stance,
      });
    }
  }

  return timeline;
}
