import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { extractClaims } from '@/lib/services/ai';
import { linkClaimToConcepts, updateBeliefGraph } from '@/lib/services/belief-graph';
import { screenPostContent } from '@/lib/services/moderation';
import { buildExtractionTextForPublish } from '@/lib/posts/referenced-post';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const post = await db.post.findUnique({
      where: { id },
      include: {
        referencedPost: {
          select: { headlineClaim: true, topicTags: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.authorId !== user.id) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'You can only publish your own posts' },
        { status: 403 }
      );
    }

    if (post.status !== 'draft') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Only draft posts can be published' },
        { status: 400 }
      );
    }

    // 1. AI Pre-screening
    const screeningResult = await screenPostContent(post.headlineClaim, post.body);
    if (!screeningResult.passed) {
      await db.post.update({
        where: { id },
        data: {
          aiScreeningPassed: false,
          moderationStatus: 'flagged',
        },
      });

      await db.analyticsEvent.create({
        data: {
          userId: user.id,
          type: 'post_screening_failed',
          surface: 'web',
          payload: {
            postId: id,
            reason: screeningResult.reason,
            category: screeningResult.category,
          },
        },
      });

      return NextResponse.json(
        {
          code: 'SCREENING_FAILED',
          message: screeningResult.reason || 'Post did not pass content screening',
          category: screeningResult.category,
        },
        { status: 400 }
      );
    }

    // 2. Create Source record (links to claim extraction pipeline)
    const source = await db.source.create({
      data: {
        userId: user.id,
        url: `/post/${id}`,
        title: post.headlineClaim,
        author: user.name || user.email,
        contentType: 'article',
        surface: 'mindlair_publish',
        consumedAt: new Date(),
      },
    });

    // 3. Get existing concepts for better claim extraction
    const existingConcepts = await db.concept.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
    const conceptLabels = existingConcepts.map(c => c.label);

    // 4. Extract claims from the post content (include referenced post context for clustering)
    const extractionText = buildExtractionTextForPublish(
      post.body,
      post.referencedPost,
    );
    const analysis = await extractClaims(
      {
        title: post.headlineClaim,
        text: extractionText,
        url: `/post/${id}`,
      },
      conceptLabels
    );

    // 5. Store claims and link to concepts
    const createdClaimIds: string[] = [];
    const allConceptIds: string[] = [];

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

      if (extractedClaim.concepts.length > 0) {
        const conceptIds = await linkClaimToConcepts(claim.id, extractedClaim.concepts);
        allConceptIds.push(...conceptIds);
      }
    }

    // 6. Update author's belief graph with highest confidence
    // Publishing = strongest belief signal (stance based on authorStance)
    const authorStanceToReactionStance = {
      arguing: 'agree',
      exploring: 'complicated',
      steelmanning: 'disagree',
    };
    const reactionStance = authorStanceToReactionStance[post.authorStance] || 'complicated';

    for (const claimId of createdClaimIds) {
      // Create position with highest confidence
      await db.position.create({
        data: {
          userId: user.id,
          claimId,
          stance: reactionStance,
          context: 'publish',
        },
      });

      // Update belief graph
      const uniqueConceptIds = [...new Set(allConceptIds)];
      await updateBeliefGraph(user.id, claimId, reactionStance as 'agree' | 'disagree' | 'complicated', uniqueConceptIds);
    }

    // 7. AI-suggest topic tags
    const suggestedTags = analysis.claims
      .flatMap(c => c.concepts)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5);

    // 8. Publish the post
    const publishedPost = await db.post.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        sourceId: source.id,
        aiScreeningPassed: true,
        moderationStatus: 'approved',
        topicTags: suggestedTags,
      },
    });

    await db.analyticsEvent.create({
      data: {
        userId: user.id,
        type: 'post_published',
        surface: 'web',
        payload: {
          postId: id,
          sourceId: source.id,
          claimCount: createdClaimIds.length,
          topicTags: suggestedTags,
        },
      },
    });

    return NextResponse.json({
      success: true,
      post: {
        id: publishedPost.id,
        headlineClaim: publishedPost.headlineClaim,
        status: publishedPost.status,
        publishedAt: publishedPost.publishedAt?.toISOString(),
        topicTags: publishedPost.topicTags,
      },
      claimsExtracted: createdClaimIds.length,
    });
  } catch (error) {
    console.error('Publish post error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to publish post' },
      { status: 500 }
    );
  }
}
