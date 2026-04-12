import db from '@/lib/db';
import { extractClaims } from './ai';
import { linkClaimToConcepts, updateBeliefGraph } from './belief-graph';
import { screenPostContent } from './moderation';
import { findSimilarPosts, extractConceptsFromHeadline, resolveConceptBatch } from './concept-resolver';
import { buildExtractionTextForPublish } from '@/lib/posts/referenced-post';

interface PublishResult {
  success: boolean;
  error?: string;
  errorCategory?: string;
  sourceId?: string;
  claimIds?: string[];
  topicTags?: string[];
}

export async function publishPost(postId: string, userId: string): Promise<PublishResult> {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      referencedPost: {
        select: { headlineClaim: true, topicTags: true },
      },
    },
  });

  if (!post) {
    return { success: false, error: 'Post not found' };
  }

  if (post.authorId !== userId) {
    return { success: false, error: 'You can only publish your own posts' };
  }

  if (post.status !== 'draft') {
    return { success: false, error: 'Only draft posts can be published' };
  }

  // 1. AI pre-screening
  const screeningResult = await screenPostContent(post.headlineClaim, post.body);
  if (!screeningResult.passed) {
    await db.post.update({
      where: { id: postId },
      data: {
        aiScreeningPassed: false,
        moderationStatus: 'flagged',
      },
    });

    return {
      success: false,
      error: screeningResult.reason || 'Post did not pass content screening',
      errorCategory: screeningResult.category,
    };
  }

  // 2. Get user info for author field
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  // 3. Create Source record (links to claim extraction pipeline)
  const source = await db.source.create({
    data: {
      userId,
      url: `/post/${postId}`,
      title: post.headlineClaim,
      author: user?.name || user?.email || 'Anonymous',
      contentType: 'article',
      surface: 'mindlair_publish',
      consumedAt: new Date(),
    },
  });

  // 4. Get existing concepts for better claim extraction
  const existingConcepts = await db.concept.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
  });
  const conceptLabels = existingConcepts.map(c => c.label);

  // 5. Extract claims from the post content
  const extractionText = buildExtractionTextForPublish(post.body, post.referencedPost);
  const analysis = await extractClaims(
    {
      title: post.headlineClaim,
      text: extractionText,
      url: `/post/${postId}`,
    },
    conceptLabels
  );

  // 6. Extract concepts from headline to ensure proper clustering
  const headlineConcepts = await extractConceptsFromHeadline(post.headlineClaim);
  
  // 7. Find similar posts to cluster with
  const similarPosts = await findSimilarPosts(post.headlineClaim, postId);
  const sharedConceptIds = similarPosts.flatMap(p => p.conceptIds);
  
  // 8. Store claims and link to concepts
  const createdClaimIds: string[] = [];
  const allConceptIds: string[] = [...sharedConceptIds];

  for (const extractedClaim of analysis.claims) {
    const claim = await db.claim.create({
      data: {
        sourceId: source.id,
        text: extractedClaim.text,
        claimType: extractedClaim.type,
        confidenceScore: extractedClaim.confidence,
        modelVersion: 'claude-sonnet-4',
      },
    });

    createdClaimIds.push(claim.id);

    // Combine extracted concepts with headline concepts for better clustering
    const combinedConcepts = [...new Set([...extractedClaim.concepts, ...headlineConcepts])];
    
    if (combinedConcepts.length > 0) {
      const conceptIds = await linkClaimToConcepts(claim.id, combinedConcepts);
      allConceptIds.push(...conceptIds);
    }
  }
  
  // 9. Resolve headline concepts and link them explicitly
  if (headlineConcepts.length > 0) {
    const resolvedHeadlineConcepts = await resolveConceptBatch(headlineConcepts);
    for (const resolved of resolvedHeadlineConcepts) {
      if (!allConceptIds.includes(resolved.id)) {
        allConceptIds.push(resolved.id);
      }
    }
  }

  // 10. Update author's belief graph with highest confidence
  // Publishing = strongest belief signal (stance based on authorStance)
  const authorStanceToReactionStance: Record<string, string> = {
    arguing: 'agree',
    exploring: 'complicated',
    steelmanning: 'disagree',
  };
  const reactionStance = authorStanceToReactionStance[post.authorStance] || 'complicated';

  const uniqueConceptIds = [...new Set(allConceptIds)];
  
  for (const claimId of createdClaimIds) {
    // Create position with highest confidence
    await db.position.create({
      data: {
        userId,
        claimId,
        stance: reactionStance,
        context: 'publish',
      },
    });

    // Update belief graph
    await updateBeliefGraph(userId, claimId, reactionStance as 'agree' | 'disagree' | 'complicated', uniqueConceptIds);
  }

  // 11. AI-suggest topic tags (combine extracted + headline concepts)
  const suggestedTags = [...new Set([
    ...analysis.claims.flatMap(c => c.concepts),
    ...headlineConcepts,
  ])].slice(0, 5);

  // 12. Publish the post
  await db.post.update({
    where: { id: postId },
    data: {
      status: 'published',
      publishedAt: new Date(),
      sourceId: source.id,
      aiScreeningPassed: true,
      moderationStatus: 'approved',
      topicTags: suggestedTags,
    },
  });

  return {
    success: true,
    sourceId: source.id,
    claimIds: createdClaimIds,
    topicTags: suggestedTags,
  };
}

export async function updateBeliefGraphFromPublish(
  userId: string,
  postId: string,
  stance: 'agree' | 'disagree' | 'complicated'
): Promise<void> {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
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
  });

  if (!post?.source?.claims) return;

  for (const claim of post.source.claims) {
    const conceptIds = claim.claimConcepts.map(cc => cc.conceptId);
    await updateBeliefGraph(userId, claim.id, stance, conceptIds);
  }
}

export async function suggestTopicTags(headlineClaim: string, body: string): Promise<string[]> {
  const analysis = await extractClaims(
    { title: headlineClaim, text: body, url: '' },
    []
  );

  return analysis.claims
    .flatMap(c => c.concepts)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 5);
}
