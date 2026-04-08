import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { moderateCommentSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const validation = moderateCommentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { action } = validation.data;

    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: {
            id: true,
            authorId: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Comment not found' },
        { status: 404 }
      );
    }

    if (comment.post.authorId !== user.id) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Only the post author can moderate comments' },
        { status: 403 }
      );
    }

    if (comment.authorId === user.id) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'You cannot hide your own comments' },
        { status: 403 }
      );
    }

    const isHiddenByAuthor = action === 'hide';

    await db.comment.update({
      where: { id: commentId },
      data: { isHiddenByAuthor },
    });

    await db.analyticsEvent.create({
      data: {
        userId: user.id,
        type: 'comment_moderated',
        surface: 'web',
        payload: {
          commentId,
          postId: comment.postId,
          action,
        },
      },
    });

    return NextResponse.json({
      success: true,
      isHiddenByAuthor,
    });
  } catch (error) {
    console.error('Moderate comment error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to moderate comment' },
      { status: 500 }
    );
  }
}
