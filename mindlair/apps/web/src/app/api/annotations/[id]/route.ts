import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(request);

    const annotation = await db.annotation.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        post: {
          select: { id: true, status: true, authorId: true, headlineClaim: true },
        },
        comments: {
          where: {
            OR: [
              { isHiddenByAuthor: false },
              ...(session?.userId ? [{ authorId: session.userId }] : []),
            ],
          },
          include: {
            author: {
              select: { id: true, name: true, avatarUrl: true },
            },
            reactions: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { referencingPosts: true },
        },
      },
    });

    if (!annotation) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Annotation not found' },
        { status: 404 }
      );
    }

    if (annotation.post.status !== 'published' && annotation.post.authorId !== session?.userId) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Annotation not found' },
        { status: 404 }
      );
    }

    const formattedComments = annotation.comments.map((c) => {
      const reactionCounts = { agree: 0, disagree: 0, complicated: 0 };
      let userReaction: string | null = null;

      c.reactions.forEach((r) => {
        if (r.stance in reactionCounts) {
          reactionCounts[r.stance as keyof typeof reactionCounts]++;
        }
        if (session?.userId && r.userId === session.userId) {
          userReaction = r.stance;
        }
      });

      return {
        id: c.id,
        author: c.author,
        stance: c.stance,
        body: c.body,
        isHiddenByAuthor: c.isHiddenByAuthor,
        isOwnComment: session?.userId === c.authorId,
        canHide: session?.userId === annotation.post.authorId,
        reactionCounts,
        userReaction,
        createdAt: c.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      annotation: {
        id: annotation.id,
        postId: annotation.postId,
        post: {
          id: annotation.post.id,
          headlineClaim: annotation.post.headlineClaim,
        },
        author: annotation.author,
        selectedText: annotation.selectedText,
        textHash: annotation.textHash,
        startOffset: annotation.startOffset,
        endOffset: annotation.endOffset,
        contextBefore: annotation.contextBefore,
        contextAfter: annotation.contextAfter,
        isResolved: annotation.isResolved,
        comments: formattedComments,
        responsePostCount: annotation._count.referencingPosts,
        isOwnAnnotation: session?.userId === annotation.authorId,
        isPostAuthor: session?.userId === annotation.post.authorId,
        createdAt: annotation.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching annotation:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch annotation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const annotation = await db.annotation.findUnique({
      where: { id },
      include: {
        post: { select: { authorId: true } },
      },
    });

    if (!annotation) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Annotation not found' },
        { status: 404 }
      );
    }

    const isPostAuthor = session.userId === annotation.post.authorId;
    const isAnnotationAuthor = session.userId === annotation.authorId;

    if (!isPostAuthor && !isAnnotationAuthor) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Not authorized to modify this annotation' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: { isResolved?: boolean } = {};

    if (typeof body.isResolved === 'boolean') {
      updates.isResolved = body.isResolved;
    }

    const updated = await db.annotation.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      annotation: {
        id: updated.id,
        isResolved: updated.isResolved,
      },
    });
  } catch (error) {
    console.error('Error updating annotation:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to update annotation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const annotation = await db.annotation.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!annotation) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Annotation not found' },
        { status: 404 }
      );
    }

    if (annotation.authorId !== session.userId) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Only the annotation author can delete it' },
        { status: 403 }
      );
    }

    await db.annotation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to delete annotation' },
      { status: 500 }
    );
  }
}
