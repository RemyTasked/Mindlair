import db from "@/lib/db";
import { detectContradictions } from "./ai";

export interface PreflightConflict {
  pastPostId: string;
  pastTitle: string;
  pastClaim: string;
  pastPublishedAt: string;
  type: "direct_contradiction" | "implicit_tension";
  explanation: string;
  confidence: number;
}

export interface PreflightResult {
  conflicts: PreflightConflict[];
  clean: boolean;
}

export async function preflightContradictions(opts: {
  userId: string;
  candidateClaim: string;
  excludePostId?: string;
}): Promise<PreflightResult> {
  const { userId, candidateClaim, excludePostId } = opts;

  if (!candidateClaim.trim()) {
    return { conflicts: [], clean: true };
  }

  const pastPosts = await db.post.findMany({
    where: {
      authorId: userId,
      status: "published",
      ...(excludePostId ? { id: { not: excludePostId } } : {}),
    },
    select: {
      id: true,
      title: true,
      headlineClaim: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: "desc" },
    take: 20,
  });

  if (pastPosts.length === 0) {
    return { conflicts: [], clean: true };
  }

  const claimsToCheck = pastPosts.map((p) => ({
    id: p.id,
    text: p.headlineClaim,
  }));

  claimsToCheck.push({
    id: "__candidate__",
    text: candidateClaim,
  });

  const contradictions = await detectContradictions(claimsToCheck);

  const candidateConflicts = contradictions.filter(
    (c) => c.claimAId === "__candidate__" || c.claimBId === "__candidate__"
  );

  const conflicts: PreflightConflict[] = [];

  for (const contradiction of candidateConflicts) {
    const pastId =
      contradiction.claimAId === "__candidate__"
        ? contradiction.claimBId
        : contradiction.claimAId;

    const pastPost = pastPosts.find((p) => p.id === pastId);
    if (!pastPost) continue;

    conflicts.push({
      pastPostId: pastPost.id,
      pastTitle: pastPost.title,
      pastClaim: pastPost.headlineClaim,
      pastPublishedAt: pastPost.publishedAt?.toISOString() || "",
      type: contradiction.type,
      explanation: contradiction.explanation,
      confidence: contradiction.confidence,
    });
  }

  conflicts.sort((a, b) => b.confidence - a.confidence);

  return {
    conflicts,
    clean: conflicts.length === 0,
  };
}
