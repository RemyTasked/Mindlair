import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { createCommentSchema } from '@/lib/validations';
import { screenComment } from '@/lib/services/ai';
import { updateBeliefGraphFromComment } from '@/lib/services/belief-graph';

interface RouteParams {
  params: Promise<{ id: string }>;
}

type CommentStance = 'agree' | 'disagree' | 'complicated';

interface CommentWithReactions {
  id: string;
  authorId: string;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  stance: string;
  body: string;
  isHiddenByAuthor: boolean;
  createdAt: Date;
  reactions: Array<{
    userId: string;
    stance: string;
  }>;
}

function computeQualityScore(comment: CommentWithReactions): number {
  const agrees = comment.reactions.filter(r => r.stance === 'agree').length;
  const disagrees = comment.reactions.filter(r => r.stance === 'disagree').length;
  const complicated = comment.reactions.filter(r => r.stance === 'complicated').length;
  return (agrees - disagrees) + (complicated * 0.5);
}

function sortCommentsByQuality(comments: CommentWithReactions[]): CommentWithReactions[] {
  const byStance: Record<CommentStance, CommentWithReactions[]> = {
    agree: [],
    disagree: [],
    complicated: [],
  };

  for (const comment of comments) {
    const stance = comment.stance as CommentStance;
    if (byStance[stance]) {
      byStance[stance].push(comment);
    }
  }

  for (const stance of Object.keys(byStance) as CommentStance[]) {
    byStance[stance].sort((a, b) => computeQualityScore(b) - computeQualityScore(a));
  }

  const result: CommentWithReactions[] = [];
  const maxLength = Math.max(
    byStance.agree.length,
    byStance.disagree.length,
    byStance.complicated.length
  );

  for (let i = 0; i < maxLength; i++) {
    if (byStance.disagree[i]) result.push(byStance.disagree[i]);
    if (byStance.complicated[i]) result.push(byStance.complicated[i]);
    if (byStance.agree[i]) result.push(byStance.agree[i]);
  }

  return result;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const post = await db.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        status: true,
        commentsEnabled: true,
      },
    });

    if (!post || post.status !== 'published') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Published post not found' },
        { status: 404 }
      );
    }

    const userReaction = await db.postReaction.findUnique({
      where: {
        postId_userId: { postId, userId: user.id },
      },
    });

    const commentCount = await db.comment.count({
      where: {
        postId,
        aiScreeningPassed: true,
        moderationStatus: { not: 'removed' },
      },
    });

    if (!userReaction || userReaction.stance === 'skip') {
      return NextResponse.json({
        gated: true,
        commentCount,
        commentsEnabled: post.commentsEnabled,
        comments: [],
      });
    }

    const rawComments = await db.comment.findMany({
      where: {
        postId,
        aiScreeningPassed: true,
        moderationStatus: { not: 'removed' },
        OR: [
          { isHiddenByAuthor: false },
          { authorId: user.id },
        ],
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        reactions: {
          select: {
            userId: true,
            stance: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const comments = sortCommentsByQuality(rawComments);

    const formattedComments = comments.map(comment => {
      const reactionCounts = {
        agree: comment.reactions.filter(r => r.stance === 'agree').length,
        disagree: comment.reactions.filter(r => r.stance === 'disagree').length,
        complicated: comment.reactions.filter(r => r.stance === 'complicated').length,
      };
      const userCommentReaction = comment.reactions.find(r => r.userId === user.id);

      return {
        id: comment.id,
        author: {
          id: comment.author.id,
          name: comment.author.name,
          avatarUrl: comment.author.avatarUrl,
        },
        stance: comment.stance,
        body: comment.body,
        isHiddenByAuthor: comment.isHiddenByAuthor,
        isOwnComment: comment.authorId === user.id,
        canHide: post.authorId === user.id && comment.authorId !== user.id,
        createdAt: comment.createdAt.toISOString(),
        reactionCounts,
        userReaction: userCommentReaction?.stance || null,
      };
    });

    return NextResponse.json({
      gated: false,
      commentCount,
      commentsEnabled: post.commentsEnabled,
      comments: formattedComments,
      isPostAuthor: post.authorId === user.id,
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to get comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createCommentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { stance, body: commentBody } = validation.data;
    const annotationId = typeof body.annotationId === 'string' ? body.annotationId : null;

    const post = await db.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        status: true,
        commentsEnabled: true,
      },
    });

    if (!post || post.status !== 'published') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Published post not found' },
        { status: 404 }
      );
    }

    if (!post.commentsEnabled) {
      return NextResponse.json(
        { code: 'COMMENTS_DISABLED', message: 'Comments are disabled on this post' },
        { status: 403 }
      );
    }

    const blocked = await db.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: post.authorId,
          blockedId: user.id,
        },
      },
    });

    if (blocked) {
      return NextResponse.json(
        { code: 'BLOCKED', message: 'You cannot comment on this post' },
        { status: 403 }
      );
    }

    const userReaction = await db.postReaction.findUnique({
      where: {
        postId_userId: { postId, userId: user.id },
      },
    });

    if (!userReaction || userReaction.stance === 'skip') {
      return NextResponse.json(
        { code: 'REACTION_REQUIRED', message: 'You must react to the post before commenting' },
        { status: 403 }
      );
    }

    if (annotationId) {
      const annotation = await db.annotation.findUnique({
        where: { id: annotationId },
        select: { postId: true },
      });
      if (!annotation || annotation.postId !== postId) {
        return NextResponse.json(
          { code: 'INVALID_ANNOTATION', message: 'Annotation not found or does not belong to this post' },
          { status: 400 }
        );
      }
    }

    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const accountAgeDays = accountAge / (24 * 60 * 60 * 1000);

    if (accountAgeDays < 7) {
      return NextResponse.json(
        { code: 'ACCOUNT_TOO_NEW', message: 'Your account must be at least 7 days old to comment' },
        { status: 403 }
      );
    }

    if (accountAgeDays < 30) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayComments = await db.comment.count({
        where: {
          authorId: user.id,
          createdAt: { gte: todayStart },
        },
      });

      if (todayComments >= 3) {
        return NextResponse.json(
          { code: 'RATE_LIMITED', message: 'Accounts under 30 days are limited to 3 comments per day' },
          { status: 429 }
        );
      }
    }

    const screening = await screenComment(commentBody);

    const comment = await db.comment.create({
      data: {
        postId,
        authorId: user.id,
        stance,
        body: commentBody,
        aiScreeningPassed: screening.passes,
        moderationStatus: screening.passes ? 'approved' : 'flagged',
        ...(annotationId ? { annotationId } : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (screening.passes) {
      await updateBeliefGraphFromComment(
        user.id,
        postId,
        commentBody,
        stance as 'agree' | 'disagree' | 'complicated'
      );
    }

    await db.analyticsEvent.create({
      data: {
        userId: user.id,
        type: 'comment_created',
        surface: 'web',
        payload: {
          postId,
          commentId: comment.id,
          stance,
          wordCount: commentBody.split(/\s+/).length,
          passed: screening.passes,
          ...(annotationId ? { annotationId } : {}),
        },
      },
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        author: {
          id: comment.author.id,
          name: comment.author.name,
          avatarUrl: comment.author.avatarUrl,
        },
        stance: comment.stance,
        body: comment.body,
        isHiddenByAuthor: false,
        isOwnComment: true,
        canHide: false,
        createdAt: comment.createdAt.toISOString(),
        reactionCounts: { agree: 0, disagree: 0, complicated: 0 },
        userReaction: null,
        pending: !screening.passes,
        annotationId: annotationId || null,
      },
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
