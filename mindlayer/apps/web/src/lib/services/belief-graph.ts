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

export interface MapNode {
  id: string;
  label: string;
  type: 'concept';
  direction: string;
  strength: number;
  stability: number;
  echoFlagged: boolean;
  positionCount: number;
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

export async function getBeliefMap(userId: string): Promise<{
  nodes: MapNode[];
  edges: MapEdge[];
}> {
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
  }));

  const tensionEdges: MapEdge[] = tensions.map(tension => ({
    source: tension.conceptAId,
    target: tension.conceptBId,
    type: 'tension' as const,
    weight: tension.surfacedCount,
  }));

  const conceptIdSet = new Set(nodes.map(n => n.id));
  const relatedEdges = await getCooccurrenceRelatedEdges(userId, conceptIdSet, tensionEdges);

  return { nodes, edges: [...tensionEdges, ...relatedEdges] };
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

/** Opinions from digest, Discover feed reactions, and realtime capture. */
const DISCOVERY_POSITION_CONTEXTS = ['digest', 'post_reaction', 'realtime'] as const;

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
