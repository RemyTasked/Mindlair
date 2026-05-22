import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import {
  referencedPostSelect,
  serializeReferencedPost,
  validateReferencedPostId,
} from '@/lib/posts/referenced-post';
import { isValidSlug, isSlugAvailable, isCuid } from '@/lib/utils/slug';
import { validateCitations, serializeCitation } from '@/lib/posts/citations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: identifier } = await params;
    const user = await getAuthFromRequest(request);

    // Support lookup by ID or slug
    const whereClause = isCuid(identifier)
      ? { id: identifier }
      : { slug: identifier };

    const post = await db.post.findUnique({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        referencedPost: { select: referencedPostSelect },
        citations: {
          orderBy: { position: 'asc' },
        },
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
        where: { postId: post.id },
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
        title: post.title,
        headlineClaim: post.headlineClaim,
        body: post.body,
        authorStance: post.authorStance,
        status: post.status,
        visibility: post.visibility,
        currentVersion: post.currentVersion,
        publishedAt: post.publishedAt?.toISOString(),
        topicTags: post.topicTags,
        thumbnailUrl: post.thumbnailUrl,
        slug: post.slug,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        author: post.author,
        totalReactions: post._count.reactions,
        userReaction,
        reactionCounts,
        referencedPostId: post.referencedPostId,
        referencedPost: serializeReferencedPost(post.referencedPost),
        citations: post.citations.map(serializeCitation),
        commentsEnabled: post.commentsEnabled,
        isAuthor: user?.id === post.authorId,
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

    const body = await request.json();
    const updates: Parameters<typeof db.post.update>[0]['data'] = {};

    const isPublished = post.status === 'published';
    
    // For published posts, require changeType
    if (isPublished) {
      const validChangeTypes = ['edit', 'qualification', 'retraction', 'reversal'];
      if (!body.changeType || !validChangeTypes.includes(body.changeType)) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'changeType is required for editing published posts (edit, qualification, retraction, reversal)' },
          { status: 400 }
        );
      }
      
      const changeNote = body.changeNote || null;
      if (changeNote && changeNote.length > 500) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'changeNote must be 500 characters or less' },
          { status: 400 }
        );
      }
    }

    // Handle title updates
    if (body.title !== undefined) {
      if (body.title.length < 3 || body.title.length > 120) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Title must be 3-120 characters' },
          { status: 400 }
        );
      }
      updates.title = body.title.trim();
    }

    if (body.headlineClaim !== undefined) {
      if (body.headlineClaim.length < 10 || body.headlineClaim.length > 280) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Headline claim must be 10-280 characters' },
          { status: 400 }
        );
      }
      updates.headlineClaim = body.headlineClaim.trim();
    }

    // Handle visibility updates
    if (body.visibility !== undefined) {
      if (!['public', 'unlisted'].includes(body.visibility)) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Visibility must be "public" or "unlisted"' },
          { status: 400 }
        );
      }
      updates.visibility = body.visibility;
    }

    // Handle topic tags updates
    if (body.topicTags !== undefined) {
      if (Array.isArray(body.topicTags)) {
        updates.topicTags = body.topicTags
          .filter((t: unknown): t is string => typeof t === 'string' && t.length >= 2 && t.length <= 40)
          .slice(0, 5);
      }
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

    if (body.referencedAnnotationId !== undefined) {
      if (body.referencedAnnotationId === null || body.referencedAnnotationId === '') {
        updates.referencedAnnotationId = null;
      } else if (typeof body.referencedAnnotationId === 'string') {
        const annotation = await db.annotation.findUnique({
          where: { id: body.referencedAnnotationId },
          select: { id: true, postId: true },
        });
        if (!annotation) {
          return NextResponse.json(
            { code: 'VALIDATION_ERROR', message: 'Referenced annotation not found' },
            { status: 400 }
          );
        }
        const targetPostId = updates.referencedPostId ?? post.referencedPostId;
        if (targetPostId && annotation.postId !== targetPostId) {
          return NextResponse.json(
            { code: 'VALIDATION_ERROR', message: 'Annotation does not belong to the referenced post' },
            { status: 400 }
          );
        }
        updates.referencedAnnotationId = annotation.id;
        if (!targetPostId) {
          updates.referencedPostId = annotation.postId;
        }
      }
    }

    if (body.thumbnailUrl !== undefined) {
      updates.thumbnailUrl = body.thumbnailUrl === '' ? null : body.thumbnailUrl;
    }

    // Handle slug updates
    if (body.slug !== undefined) {
      if (body.slug === '' || body.slug === null) {
        updates.slug = null;
      } else if (typeof body.slug === 'string') {
        const trimmedSlug = body.slug.trim().toLowerCase();
        if (!isValidSlug(trimmedSlug)) {
          return NextResponse.json(
            { code: 'VALIDATION_ERROR', message: 'Invalid slug format. Use only lowercase letters, numbers, and hyphens (3-80 characters).' },
            { status: 400 }
          );
        }
        if (!(await isSlugAvailable(trimmedSlug, id))) {
          return NextResponse.json(
            { code: 'VALIDATION_ERROR', message: 'This URL slug is already taken. Please choose a different one.' },
            { status: 400 }
          );
        }
        updates.slug = trimmedSlug;
      }
    }

    // Handle SEO fields
    if (body.seoTitle !== undefined) {
      updates.seoTitle = body.seoTitle === '' || body.seoTitle === null
        ? null
        : String(body.seoTitle).trim().slice(0, 70);
    }

    if (body.seoDescription !== undefined) {
      updates.seoDescription = body.seoDescription === '' || body.seoDescription === null
        ? null
        : String(body.seoDescription).trim().slice(0, 160);
    }

    let pendingCitations: Array<{
      url: string;
      title: string | null;
      author: string | null;
      outlet: string | null;
      excerpt: string | null;
      contentType: string;
      position: number;
    }> | null = null;
    if (body.citations !== undefined) {
      const result = validateCitations(body.citations);
      if (!result.ok) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: result.message },
          { status: 400 }
        );
      }
      pendingCitations = result.citations;
    }

    // For published posts, create a revision before updating
    if (isPublished) {
      await db.postRevision.create({
        data: {
          postId: post.id,
          version: post.currentVersion,
          title: post.title,
          headlineClaim: post.headlineClaim,
          body: post.body,
          authorStance: post.authorStance,
          topicTags: post.topicTags,
          changeType: body.changeType,
          changeNote: body.changeNote || null,
        },
      });
      
      updates.currentVersion = post.currentVersion + 1;
    }

    const updated = await db.post.update({
      where: { id },
      data: updates,
    });

    if (pendingCitations !== null) {
      await db.$transaction([
        db.postCitation.deleteMany({ where: { postId: id } }),
        ...(pendingCitations.length > 0
          ? [
              db.postCitation.createMany({
                data: pendingCitations.map((c) => ({
                  postId: id,
                  url: c.url,
                  title: c.title,
                  author: c.author,
                  outlet: c.outlet,
                  excerpt: c.excerpt,
                  contentType: c.contentType,
                  position: c.position,
                })),
              }),
            ]
          : []),
      ]);
    }

    const withRef = await db.post.findUnique({
      where: { id: updated.id },
      include: {
        referencedPost: { select: referencedPostSelect },
        citations: { orderBy: { position: 'asc' } },
      },
    });

    // Log analytics event for post edit
    if (isPublished) {
      await db.analyticsEvent.create({
        data: {
          userId: user.id,
          type: 'post_edited',
          surface: 'web',
          payload: {
            postId: id,
            changeType: body.changeType,
            newVersion: updated.currentVersion,
          },
        },
      });
    }

    return NextResponse.json({
      post: {
        id: updated.id,
        title: updated.title,
        headlineClaim: updated.headlineClaim,
        body: updated.body,
        authorStance: updated.authorStance,
        status: updated.status,
        visibility: updated.visibility,
        currentVersion: updated.currentVersion,
        topicTags: updated.topicTags,
        thumbnailUrl: updated.thumbnailUrl,
        slug: updated.slug,
        seoTitle: updated.seoTitle,
        seoDescription: updated.seoDescription,
        referencedPostId: updated.referencedPostId,
        referencedAnnotationId: updated.referencedAnnotationId,
        referencedPost: serializeReferencedPost(withRef?.referencedPost ?? null),
        citations: (withRef?.citations ?? []).map(serializeCitation),
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
