import db from '@/lib/db';
import { generateClaimEmbedding, cosineSimilarity } from '@/lib/services/ai';

const SIMILARITY_THRESHOLD = 0.85;
const BATCH_SIZE = 100;

interface SimilarityEdge {
  claimAId: string;
  claimBId: string;
  similarity: number;
}

/**
 * Generate and store embeddings for claims that don't have them yet.
 */
export async function generateMissingClaimEmbeddings(): Promise<number> {
  const claimsWithoutEmbedding = await db.claim.findMany({
    where: {
      embeddingJson: null,
    },
    take: BATCH_SIZE,
    select: {
      id: true,
      text: true,
    },
  });

  let generated = 0;

  for (const claim of claimsWithoutEmbedding) {
    try {
      const embedding = await generateClaimEmbedding(claim.text);
      
      if (embedding.length > 0) {
        await db.claim.update({
          where: { id: claim.id },
          data: {
            embeddingJson: embedding,
          },
        });
        generated++;
      }
    } catch (error) {
      console.error(`Failed to generate embedding for claim ${claim.id}:`, error);
    }
  }

  return generated;
}

/**
 * Find similar claims between two users.
 * Only considers claims that both users have positions on.
 */
export async function findCrossUserSimilarClaims(
  userAId: string,
  userBId: string
): Promise<SimilarityEdge[]> {
  // Get claims from user A with embeddings
  const userAClaims = await db.position.findMany({
    where: { userId: userAId },
    include: {
      claim: {
        select: {
          id: true,
          text: true,
          embeddingJson: true,
          source: {
            select: { userId: true },
          },
        },
      },
    },
  });

  // Get claims from user B with embeddings
  const userBClaims = await db.position.findMany({
    where: { userId: userBId },
    include: {
      claim: {
        select: {
          id: true,
          text: true,
          embeddingJson: true,
          source: {
            select: { userId: true },
          },
        },
      },
    },
  });

  const similarPairs: SimilarityEdge[] = [];

  // Filter to claims with embeddings
  const claimsA = userAClaims
    .filter((p) => p.claim.embeddingJson)
    .map((p) => ({
      id: p.claim.id,
      text: p.claim.text,
      embedding: p.claim.embeddingJson as number[],
      ownerId: p.claim.source.userId,
    }));

  const claimsB = userBClaims
    .filter((p) => p.claim.embeddingJson)
    .map((p) => ({
      id: p.claim.id,
      text: p.claim.text,
      embedding: p.claim.embeddingJson as number[],
      ownerId: p.claim.source.userId,
    }));

  // Compare all pairs
  for (const claimA of claimsA) {
    for (const claimB of claimsB) {
      // Skip if same claim or same owner
      if (claimA.id === claimB.id) continue;
      if (claimA.ownerId === claimB.ownerId) continue;

      const similarity = cosineSimilarity(claimA.embedding, claimB.embedding);

      if (similarity >= SIMILARITY_THRESHOLD) {
        // Ensure consistent ordering (smaller ID first)
        const [firstId, secondId] = [claimA.id, claimB.id].sort();
        
        // Check if pair already exists
        const exists = similarPairs.some(
          (p) => p.claimAId === firstId && p.claimBId === secondId
        );
        
        if (!exists) {
          similarPairs.push({
            claimAId: firstId,
            claimBId: secondId,
            similarity,
          });
        }
      }
    }
  }

  return similarPairs;
}

/**
 * Store similarity edges in the database.
 */
export async function storeSimilarityEdges(edges: SimilarityEdge[]): Promise<number> {
  let stored = 0;

  for (const edge of edges) {
    try {
      await db.claimSimilarity.upsert({
        where: {
          claimAId_claimBId: {
            claimAId: edge.claimAId,
            claimBId: edge.claimBId,
          },
        },
        update: {
          similarity: edge.similarity,
          detectedAt: new Date(),
        },
        create: {
          claimAId: edge.claimAId,
          claimBId: edge.claimBId,
          similarity: edge.similarity,
        },
      });
      stored++;
    } catch (error) {
      console.error(`Failed to store similarity edge:`, error);
    }
  }

  return stored;
}

/**
 * Run similarity detection for newly created claims.
 * Compares new claims against existing claims from other users.
 */
export async function detectSimilaritiesForNewClaims(): Promise<{
  claimsProcessed: number;
  edgesCreated: number;
}> {
  // Get claims created in the last 24 hours with embeddings
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const newClaims = await db.claim.findMany({
    where: {
      extractedAt: { gte: oneDayAgo },
      embeddingJson: { not: null },
    },
    include: {
      source: {
        select: { userId: true },
      },
    },
  });

  let edgesCreated = 0;

  for (const newClaim of newClaims) {
    const newClaimUserId = newClaim.source.userId;
    const newEmbedding = newClaim.embeddingJson as number[];

    if (!newEmbedding?.length) continue;

    // Get claims from other users with embeddings (sample for performance)
    const otherClaims = await db.claim.findMany({
      where: {
        source: {
          userId: { not: newClaimUserId },
        },
        embeddingJson: { not: null },
        extractedAt: { lt: newClaim.extractedAt }, // Only older claims
      },
      take: 1000, // Limit for performance
      include: {
        source: {
          select: { userId: true },
        },
      },
    });

    const similarEdges: SimilarityEdge[] = [];

    for (const otherClaim of otherClaims) {
      const otherEmbedding = otherClaim.embeddingJson as number[];
      if (!otherEmbedding?.length) continue;

      const similarity = cosineSimilarity(newEmbedding, otherEmbedding);

      if (similarity >= SIMILARITY_THRESHOLD) {
        const [firstId, secondId] = [newClaim.id, otherClaim.id].sort();
        similarEdges.push({
          claimAId: firstId,
          claimBId: secondId,
          similarity,
        });
      }
    }

    if (similarEdges.length > 0) {
      const stored = await storeSimilarityEdges(similarEdges);
      edgesCreated += stored;
    }
  }

  return {
    claimsProcessed: newClaims.length,
    edgesCreated,
  };
}

/**
 * Get claims that are similar to a given user's claims (for Anchor card).
 */
export async function getInboundSimilarClaims(userId: string): Promise<{
  count: number;
  claims: Array<{
    claimId: string;
    similarCount: number;
  }>;
}> {
  // Get user's claims
  const userClaims = await db.position.findMany({
    where: { userId },
    select: { claimId: true },
  });

  const userClaimIds = [...new Set(userClaims.map((p) => p.claimId))];

  if (userClaimIds.length === 0) {
    return { count: 0, claims: [] };
  }

  // Get similarity edges where user's claims are involved
  const similarities = await db.claimSimilarity.findMany({
    where: {
      OR: [
        { claimAId: { in: userClaimIds } },
        { claimBId: { in: userClaimIds } },
      ],
    },
    include: {
      claimA: {
        include: {
          source: { select: { userId: true } },
        },
      },
      claimB: {
        include: {
          source: { select: { userId: true } },
        },
      },
    },
  });

  // Count inbound links (similar claims from other users)
  const inboundCounts = new Map<string, number>();

  for (const sim of similarities) {
    const userClaimId = userClaimIds.includes(sim.claimAId)
      ? sim.claimAId
      : sim.claimBId;
    const otherClaimOwnerId = userClaimIds.includes(sim.claimAId)
      ? sim.claimB.source.userId
      : sim.claimA.source.userId;

    // Only count if the other claim is owned by a different user
    if (otherClaimOwnerId !== userId) {
      inboundCounts.set(
        userClaimId,
        (inboundCounts.get(userClaimId) || 0) + 1
      );
    }
  }

  const claims = Array.from(inboundCounts.entries())
    .map(([claimId, count]) => ({ claimId, similarCount: count }))
    .sort((a, b) => b.similarCount - a.similarCount);

  const totalCount = claims.reduce((sum, c) => sum + c.similarCount, 0);

  return {
    count: totalCount,
    claims,
  };
}

/**
 * Run nightly similarity detection job.
 */
export async function runSimilarityDetectionJob(): Promise<{
  embeddingsGenerated: number;
  claimsProcessed: number;
  edgesCreated: number;
}> {
  console.log('Starting similarity detection job...');

  // Step 1: Generate missing embeddings
  const embeddingsGenerated = await generateMissingClaimEmbeddings();
  console.log(`Generated ${embeddingsGenerated} claim embeddings`);

  // Step 2: Detect similarities for new claims
  const { claimsProcessed, edgesCreated } = await detectSimilaritiesForNewClaims();
  console.log(`Processed ${claimsProcessed} claims, created ${edgesCreated} similarity edges`);

  return {
    embeddingsGenerated,
    claimsProcessed,
    edgesCreated,
  };
}
