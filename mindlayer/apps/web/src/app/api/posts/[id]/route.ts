import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import {
  referencedPostSelect,
  serializeReferencedPost,
  validateReferencedPostId,
} from '@/lib/posts/referenced-post';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getAuthFromRequest(request);

    const post = await db.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        referencedPost: { select: referencedPostSelect },
        reactions: user
          ? {
              where: { userId: user.id },
              select: { stance: true },
            }
          : false,
        _count: {
          select: { reactions: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Post not found' },
        { status: 404 }
      );
    }

    // Only show draft posts to their author
    if (post.status === 'draft' && post.authorId !== user?.id) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if user is blocked by author
    if (user && user.id !== post.authorId) {
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
          { code: 'BLOCKED', message: 'You cannot view this post' },
          { status: 403 }
        );
      }
    }

    const userReaction = user && post.reactions && post.reactions.length > 0
      ? post.reactions[0].stance
      : null;

    // Get aggregate reaction counts (only after user has reacted)
    let reactionCounts = null;
    if (userReaction) {
      const counts = await db.postReaction.groupBy({
        by: ['stance'],
        where: { postId: id },
        _count: true,
      });
      reactionCounts = counts.reduce((acc, c) => {
        acc[c.stance] = c._count;
        return acc;
      }, {} as Record<string, number>);
    }

    return NextResponse.json({
      post: {
        id: post.id,
        headlineClaim: post.headlineClaim,
        body: post.body,
        authorStance: post.authorStance,
        status: post.status,
        publishedAt: post.publishedAt?.toISOString(),
        topicTags: post.topicTags,
        thumbnailUrl: post.thumbnailUrl,
        author: post.author,
        totalReactions: post._count.reactions,
        userReaction,
        reactionCounts,
        referencedPostId: post.referencedPostId,
        referencedPost: serializeReferencedPost(post.referencedPost),
        commentsEnabled: post.commentsEnabled,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get post error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    });

    if (!post) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.authorId !== user.id) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'You can only edit your own posts' },
        { status: 403 }
      );
    }

    // Only allow editing drafts
    if (post.status !== 'draft') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Published posts cannot be edited' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updates: Parameters<typeof db.post.update>[0]['data'] = {};

    if (body.headlineClaim !== undefined) {
      if (body.headlineClaim.length < 10 || body.headlineClaim.length > 280) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Headline claim must be 10-280 characters' },
          { status: 400 }
        );
      }
      updates.headlineClaim = body.headlineClaim.trim();
    }

    if (body.postBody !== undefined) {
      const wordCount = body.postBody.trim().split(/\s+/).length;
      if (wordCount < 100 || wordCount > 2000) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Post body must be 100-2000 words' },
          { status: 400 }
        );
      }
      updates.body = body.postBody.trim();
    }

    if (body.authorStance !== undefined) {
      if (!['arguing', 'exploring', 'steelmanning'].includes(body.authorStance)) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Invalid author stance' },
          { status: 400 }
        );
      }
      updates.authorStance = body.authorStance;
    }

    if (body.referencedPostId !== undefined) {
      const raw =
        body.referencedPostId === null || body.referencedPostId === ''
          ? null
          : typeof body.referencedPostId === 'string'
            ? body.referencedPostId.trim()
            : null;
      if (body.referencedPostId !== null && body.referencedPostId !== '' && typeof body.referencedPostId !== 'string') {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'referencedPostId must be a string or null' },
          { status: 400 }
        );
      }
      const refCheck = await validateReferencedPostId(raw, user.id, id);
      if (!refCheck.ok) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: refCheck.message },
          { status: refCheck.status }
        );
      }
      updates.referencedPostId = refCheck.id;
    }

    if (body.thumbnailUrl !== undefined) {
      updates.thumbnailUrl = body.thumbnailUrl === '' ? null : body.thumbnailUrl;
    }

    const updated = await db.post.update({
      where: { id },
      data: updates,
    });

    const withRef = await db.post.findUnique({
      where: { id: updated.id },
      include: { referencedPost: { select: referencedPostSelect } },
    });

    return NextResponse.json({
      post: {
        id: updated.id,
        headlineClaim: updated.headlineClaim,
        body: updated.body,
        authorStance: updated.authorStance,
        status: updated.status,
        thumbnailUrl: updated.thumbnailUrl,
        referencedPostId: updated.referencedPostId,
        referencedPost: serializeReferencedPost(withRef?.referencedPost ?? null),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Update post error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to update post' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    });

    if (!post) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.authorId !== user.id) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    // Soft delete: mark as removed instead of deleting
    await db.post.update({
      where: { id },
      data: { status: 'removed' },
    });

    await db.analyticsEvent.create({
      data: {
        userId: user.id,
        type: 'post_deleted',
        surface: 'web',
        payload: { postId: id, wasPublished: post.status === 'published' },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
