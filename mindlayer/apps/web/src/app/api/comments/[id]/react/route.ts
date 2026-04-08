import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { commentReactionSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: commentId } = await params;
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = commentReactionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { stance } = validation.data;

    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: {
            id: true,
            authorId: true,
            status: true,
          },
        },
      },
    });

    if (!comment || comment.post.status !== 'published') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Comment not found' },
        { status: 404 }
      );
    }

    if (!comment.aiScreeningPassed || comment.moderationStatus === 'removed') {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Comment not found' },
        { status: 404 }
      );
    }

    const userPostReaction = await db.postReaction.findUnique({
      where: {
        postId_userId: { postId: comment.postId, userId: user.id },
      },
    });

    if (!userPostReaction || userPostReaction.stance === 'skip') {
      return NextResponse.json(
        { code: 'REACTION_REQUIRED', message: 'You must react to the post to interact with comments' },
        { status: 403 }
      );
    }

    const existingReaction = await db.commentReaction.findUnique({
      where: {
        commentId_userId: { commentId, userId: user.id },
      },
    });

    if (existingReaction) {
      if (existingReaction.stance === stance) {
        await db.commentReaction.delete({
          where: { id: existingReaction.id },
        });
      } else {
        await db.commentReaction.update({
          where: { id: existingReaction.id },
          data: { stance },
        });
      }
    } else {
      await db.commentReaction.create({
        data: {
          commentId,
          userId: user.id,
          stance,
        },
      });
    }

    const reactions = await db.commentReaction.findMany({
      where: { commentId },
      select: { stance: true },
    });

    const reactionCounts = {
      agree: reactions.filter(r => r.stance === 'agree').length,
      disagree: reactions.filter(r => r.stance === 'disagree').length,
      complicated: reactions.filter(r => r.stance === 'complicated').length,
    };

    const newUserReaction = await db.commentReaction.findUnique({
      where: {
        commentId_userId: { commentId, userId: user.id },
      },
    });

    return NextResponse.json({
      success: true,
      reactionCounts,
      userReaction: newUserReaction?.stance || null,
    });
  } catch (error) {
    console.error('Comment reaction error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to react to comment' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: commentId } = await params;
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const reaction = await db.commentReaction.findUnique({
      where: {
        commentId_userId: { commentId, userId: user.id },
      },
    });

    if (!reaction) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Reaction not found' },
        { status: 404 }
      );
    }

    await db.commentReaction.delete({
      where: { id: reaction.id },
    });

    const reactions = await db.commentReaction.findMany({
      where: { commentId },
      select: { stance: true },
    });

    const reactionCounts = {
      agree: reactions.filter(r => r.stance === 'agree').length,
      disagree: reactions.filter(r => r.stance === 'disagree').length,
      complicated: reactions.filter(r => r.stance === 'complicated').length,
    };

    return NextResponse.json({
      success: true,
      reactionCounts,
      userReaction: null,
    });
  } catch (error) {
    console.error('Delete comment reaction error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}
