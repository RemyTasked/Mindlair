import db from '@/lib/db';
import {
  FINGERPRINT_MIN_COHORT_N,
  type ComparisonRow,
  type ConsumptionRow,
  type ContentTypeBucket,
  type FingerprintPayload,
  type ShiftRow,
  type TopTopicRow,
} from '@/lib/fingerprint-types';

export type {
  ComparisonRow,
  ConsumptionRow,
  ContentTypeBucket,
  FingerprintPayload,
  ShiftRow,
  TopTopicRow,
} from '@/lib/fingerprint-types';

export { FINGERPRINT_MIN_COHORT_N } from '@/lib/fingerprint-types';

const TOP_TOPIC_LIMIT = 6;
const COMPARISON_LIMIT = 5;
const SHIFT_LIMIT = 5;
const OPEN_QUESTION_LIMIT = 4;

function mapContentType(raw: string): ContentTypeBucket {
  if (raw === 'podcast') return 'podcast';
  if (raw === 'video') return 'video';
  if (raw === 'thread') return 'thread';
  if (raw === 'article') return 'article';
  return 'other';
}

function bucketLabel(bucket: ContentTypeBucket): string {
  switch (bucket) {
    case 'podcast':
      return 'Podcasts';
    case 'video':
      return 'Video';
    case 'thread':
      return 'Threads';
    case 'article':
      return 'Articles';
    default:
      return 'Other';
  }
}

function iconKeyForBucket(bucket: ContentTypeBucket): 'article' | 'podcast' | 'video' | 'thread' | null {
  if (bucket === 'other') return null;
  return bucket;
}

/** Latest non-skip stance per user for a claim (by createdAt desc). */
function latestStanceByUser(
  positions: { userId: string; stance: string; createdAt: Date }[]
): Map<string, string> {
  const sorted = [...positions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const map = new Map<string, string>();
  for (const p of sorted) {
    if (p.stance === 'skip') continue;
    if (!map.has(p.userId)) map.set(p.userId, p.stance);
  }
  return map;
}

function summarizeUserStance(stance: string): string {
  switch (stance) {
    case 'agree':
      return 'Agrees with claim';
    case 'disagree':
      return 'Disagrees with claim';
    case 'complicated':
      return 'Mixed / complicated';
    default:
      return stance;
  }
}

function summarizeBeliefDirection(direction: string): string {
  switch (direction) {
    case 'positive':
      return 'Leans affirmative on topic';
    case 'negative':
      return 'Leans skeptical / contrary';
    case 'mixed':
      return 'Ambivalent on topic';
    default:
      return direction;
  }
}

async function cohortForClaim(claimId: string): Promise<{
  pctAgree: number;
  sampleSize: number;
  insufficientData: boolean;
}> {
  const positions = await db.position.findMany({
    where: { claimId, stance: { not: 'skip' } },
    select: { userId: true, stance: true, createdAt: true },
  });
  const latest = latestStanceByUser(positions);
  let agree = 0;
  let disagree = 0;
  let complicated = 0;
  for (const s of latest.values()) {
    if (s === 'agree') agree++;
    else if (s === 'disagree') disagree++;
    else if (s === 'complicated') complicated++;
  }
  const denom = agree + disagree + complicated;
  const insufficient = denom < FINGERPRINT_MIN_COHORT_N;
  const pctAgree = denom === 0 ? 0 : Math.round((agree / denom) * 1000) / 10;
  return { pctAgree, sampleSize: denom, insufficientData: insufficient };
}

async function cohortForConceptBeliefs(conceptId: string): Promise<{
  pctPositive: number;
  sampleSize: number;
  insufficientData: boolean;
}> {
  const beliefs = await db.belief.findMany({
    where: { conceptId },
    select: { direction: true },
  });
  const n = beliefs.length;
  if (n < FINGERPRINT_MIN_COHORT_N) {
    return { pctPositive: 0, sampleSize: n, insufficientData: true };
  }
  const positive = beliefs.filter(b => b.direction === 'positive').length;
  const pctPositive = Math.round((positive / n) * 1000) / 10;
  return { pctPositive, sampleSize: n, insufficientData: false };
}

export async function getFingerprint(userId: string): Promise<FingerprintPayload> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, createdAt: true },
  });

  const emailLocal = user?.email?.split('@')[0] ?? 'you';

  const [
    sourcesByType,
    totalSources,
    totalBeliefs,
    positionRows,
    beliefs,
    shiftEventCount,
    shiftPositions,
  ] = await Promise.all([
    db.source.groupBy({
      by: ['contentType'],
      where: { userId },
      _count: { id: true },
    }),
    db.source.count({ where: { userId } }),
    db.belief.count({ where: { userId } }),
    db.position.findMany({
      where: { userId, stance: { not: 'skip' } },
      select: { claimId: true },
    }),
    db.belief.findMany({
      where: { userId },
      orderBy: { positionCount: 'desc' },
      take: TOP_TOPIC_LIMIT,
      include: { concept: true },
    }),
    db.position.count({ where: { userId, supersedesId: { not: null } } }),
    db.position.findMany({
      where: { userId, supersedesId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: {
        claim: {
          include: {
            claimConcepts: { include: { concept: true } },
          },
        },
        supersedes: { select: { stance: true } },
      },
    }),
  ]);

  const reactionClaimIds = new Set(positionRows.map(p => p.claimId));
  const reactions = reactionClaimIds.size;

  const consumptionMap = new Map<ContentTypeBucket, number>();
  for (const row of sourcesByType) {
    const b = mapContentType(row.contentType);
    consumptionMap.set(b, (consumptionMap.get(b) ?? 0) + row._count.id);
  }

  const consumption: ConsumptionRow[] = [];
  const order: ContentTypeBucket[] = ['podcast', 'article', 'video', 'thread'];
  for (const bucket of order) {
    const count = consumptionMap.get(bucket) ?? 0;
    if (count === 0) continue;
    const ik = iconKeyForBucket(bucket);
    consumption.push({
      contentType: bucket,
      label: bucketLabel(bucket),
      iconKey: ik ?? 'article',
      count,
    });
  }
  const otherCount = consumptionMap.get('other') ?? 0;
  if (otherCount > 0) {
    consumption.push({
      contentType: 'other',
      label: 'Other',
      iconKey: 'article',
      count: otherCount,
    });
  }

  const conceptIdsForTopics = beliefs.map(b => b.conceptId);
  const contentTypesByConcept = new Map<string, Set<string>>();

  if (conceptIdsForTopics.length > 0) {
    const claimLinks = await db.claimConcept.findMany({
      where: { conceptId: { in: conceptIdsForTopics } },
      select: {
        conceptId: true,
        claim: {
          select: {
            source: { select: { contentType: true } },
          },
        },
      },
    });
    for (const cl of claimLinks) {
      const ct = cl.claim.source.contentType;
      if (!contentTypesByConcept.has(cl.conceptId)) {
        contentTypesByConcept.set(cl.conceptId, new Set());
      }
      contentTypesByConcept.get(cl.conceptId)!.add(ct);
    }
  }

  const topTopics: TopTopicRow[] = beliefs.map(b => {
    const types = contentTypesByConcept.get(b.conceptId) ?? new Set();
    const icons: Array<'podcast' | 'article' | 'video' | 'thread'> = [];
    for (const t of ['podcast', 'article', 'video', 'thread'] as const) {
      if (types.has(t)) icons.push(t);
    }
    return {
      conceptId: b.conceptId,
      label: b.concept.label,
      count: b.positionCount,
      contentTypeIcons: icons,
    };
  });

  const shiftSeen = new Set<string>();
  const shifts: ShiftRow[] = [];
  for (const p of shiftPositions) {
    const concept = p.claim.claimConcepts[0]?.concept;
    if (!concept) continue;
    if (shiftSeen.has(concept.id)) continue;
    shiftSeen.add(concept.id);
    const prev = p.supersedes?.stance;
    const cur = p.stance;
    if (prev && cur && prev !== cur) {
      shifts.push({
        topic: concept.label,
        detail: `Stance updated from ${prev} to ${cur} — your view on this topic evolved`,
      });
    } else {
      shifts.push({
        topic: concept.label,
        detail: 'Position refined over time as you engaged with new sources',
      });
    }
    if (shifts.length >= SHIFT_LIMIT) break;
  }

  const openBeliefs = await db.belief.findMany({
    where: { userId, direction: 'mixed' },
    orderBy: { positionCount: 'desc' },
    take: OPEN_QUESTION_LIMIT,
    include: { concept: true },
  });
  const openQuestions = openBeliefs.map(
    b => `How do you resolve tension around “${b.concept.label}” given mixed signals from your reading?`
  );

  const comparisons: ComparisonRow[] = [];
  const beliefForCompare = await db.belief.findMany({
    where: { userId },
    orderBy: { positionCount: 'desc' },
    take: COMPARISON_LIMIT,
    include: { concept: true },
  });

  for (const b of beliefForCompare) {
    const rep = await db.position.findFirst({
      where: {
        userId,
        stance: { not: 'skip' },
        claim: { claimConcepts: { some: { conceptId: b.conceptId } } },
      },
      orderBy: { createdAt: 'desc' },
      select: { claimId: true, stance: true },
    });

    if (rep) {
      const cohort = await cohortForClaim(rep.claimId);
      const sk = rep.stance as 'agree' | 'disagree' | 'complicated';
      comparisons.push({
        topicLabel: b.concept.label,
        claimId: rep.claimId,
        conceptId: b.conceptId,
        userStanceSummary: summarizeUserStance(rep.stance),
        stanceKey: sk === 'agree' || sk === 'disagree' || sk === 'complicated' ? sk : 'complicated',
        pctMindlairAgree: cohort.insufficientData ? null : cohort.pctAgree,
        sampleSize: cohort.sampleSize,
        insufficientData: cohort.insufficientData,
        source: 'claim',
      });
      continue;
    }

    const beliefCohort = await cohortForConceptBeliefs(b.conceptId);
    const dk = b.direction as 'positive' | 'negative' | 'mixed';
    comparisons.push({
      topicLabel: b.concept.label,
      claimId: null,
      conceptId: b.conceptId,
      userStanceSummary: summarizeBeliefDirection(b.direction),
      stanceKey: dk === 'positive' || dk === 'negative' || dk === 'mixed' ? dk : 'mixed',
      pctMindlairAgree: beliefCohort.insufficientData
        ? null
        : beliefCohort.pctPositive,
      sampleSize: beliefCohort.sampleSize,
      insufficientData: beliefCohort.insufficientData,
      source: 'belief',
    });
  }

  return {
    user: {
      displayName: user?.name ?? null,
      handleHint: emailLocal,
      memberSince: user?.createdAt.toISOString() ?? new Date().toISOString(),
    },
    headerStats: {
      sources: totalSources,
      reactions,
      topics: totalBeliefs,
      shifts: shiftEventCount,
    },
    consumption,
    topTopics,
    shifts,
    openQuestions,
    comparisons,
  };
}
