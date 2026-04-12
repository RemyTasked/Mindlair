import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import {
  referencedPostSelect,
  serializeReferencedPost,
  validateReferencedPostId,
} from '@/lib/posts/referenced-post';
import { isValidSlug, isSlugAvailable } from '@/lib/utils/slug';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // draft, published, or all
    const authorId = searchParams.get('authorId') || user.id;
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');

    const where: { authorId?: string; status?: 'draft' | 'published' } = {};

    // If viewing own posts, show all. If viewing others, only published
    if (authorId === user.id) {
      if (status && status !== 'all') {
        where.status = status as 'draft' | 'published';
      }
      where.authorId = user.id;
    } else {
      where.authorId = authorId;
      where.status = 'published';
    }

    const posts = await db.post.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
        referencedPost: { select: referencedPostSelect },
        _count: {
          select: { reactions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const hasMore = posts.length > limit;
    const results = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore ? results[results.length - 1]?.id : null;

    return NextResponse.json({
      posts: results.map(post => ({
        id: post.id,
        headlineClaim: post.headlineClaim,
        body: post.body,
        authorStance: post.authorStance,
        status: post.status,
        publishedAt: post.publishedAt?.toISOString(),
        topicTags: post.topicTags,
        thumbnailUrl: post.thumbnailUrl,
        slug: post.slug,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        author: post.author,
        reactionCount: post._count.reactions,
        referencedPost: serializeReferencedPost(post.referencedPost),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      })),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Posts list error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      headlineClaim, 
      postBody, 
      authorStance, 
      referencedPostId: rawRef, 
      thumbnailUrl,
      slug: rawSlug,
      seoTitle,
      seoDescription,
    } = body;

    let referencedPostId: string | null = null;
    if (rawRef !== undefined && rawRef !== null) {
      if (typeof rawRef !== 'string') {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'referencedPostId must be a string' },
          { status: 400 }
        );
      }
      const refCheck = await validateReferencedPostId(rawRef.trim(), user.id);
      if (!refCheck.ok) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: refCheck.message },
          { status: refCheck.status }
        );
      }
      referencedPostId = refCheck.id;
    }

    if (!headlineClaim || typeof headlineClaim !== 'string') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Headline claim is required' },
        { status: 400 }
      );
    }

    if (headlineClaim.length < 10 || headlineClaim.length > 280) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Headline claim must be 10-280 characters' },
        { status: 400 }
      );
    }

    if (!postBody || typeof postBody !== 'string') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Post body is required' },
        { status: 400 }
      );
    }

    const wordCount = postBody.trim().split(/\s+/).length;
    if (wordCount < 100 || wordCount > 2000) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Post body must be 100-2000 words' },
        { status: 400 }
      );
    }

    if (!authorStance || !['arguing', 'exploring', 'steelmanning'].includes(authorStance)) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Valid author stance is required (arguing, exploring, steelmanning)' },
        { status: 400 }
      );
    }

    // Validate slug if provided
    let slug: string | null = null;
    if (rawSlug && typeof rawSlug === 'string') {
      const trimmedSlug = rawSlug.trim().toLowerCase();
      if (!isValidSlug(trimmedSlug)) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Invalid slug format. Use only lowercase letters, numbers, and hyphens (3-80 characters).' },
          { status: 400 }
        );
      }
      if (!(await isSlugAvailable(trimmedSlug))) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'This URL slug is already taken. Please choose a different one.' },
          { status: 400 }
        );
      }
      slug = trimmedSlug;
    }

    // Validate SEO fields
    const validSeoTitle = seoTitle && typeof seoTitle === 'string' && seoTitle.trim().length > 0
      ? seoTitle.trim().slice(0, 70)
      : null;
    const validSeoDescription = seoDescription && typeof seoDescription === 'string' && seoDescription.trim().length > 0
      ? seoDescription.trim().slice(0, 160)
      : null;

    // Check rate limit for new accounts (7 days old = limited)
    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const isNewAccount = accountAge < 7 * 24 * 60 * 60 * 1000;

    if (isNewAccount) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayPosts = await db.post.count({
        where: {
          authorId: user.id,
          createdAt: { gte: todayStart },
        },
      });

      if (todayPosts >= 2) {
        return NextResponse.json(
          { code: 'RATE_LIMITED', message: 'New accounts are limited to 2 posts per day' },
          { status: 429 }
        );
      }
    }

    const post = await db.post.create({
      data: {
        authorId: user.id,
        headlineClaim: headlineClaim.trim(),
        body: postBody.trim(),
        authorStance,
        status: 'draft',
        ...(referencedPostId !== null ? { referencedPostId } : {}),
        ...(thumbnailUrl && typeof thumbnailUrl === 'string' ? { thumbnailUrl } : {}),
        ...(slug ? { slug } : {}),
        ...(validSeoTitle ? { seoTitle: validSeoTitle } : {}),
        ...(validSeoDescription ? { seoDescription: validSeoDescription } : {}),
      },
    });

    await db.analyticsEvent.create({
      data: {
        userId: user.id,
        type: 'post_created',
        surface: 'web',
        payload: {
          postId: post.id,
          authorStance,
          wordCount,
          referencedPostId: post.referencedPostId,
        },
      },
    });

    return NextResponse.json({
      post: {
        id: post.id,
        headlineClaim: post.headlineClaim,
        body: post.body,
        authorStance: post.authorStance,
        status: post.status,
        referencedPostId: post.referencedPostId,
        thumbnailUrl: post.thumbnailUrl,
        slug: post.slug,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        createdAt: post.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to create post' },
      { status: 500 }
    );
  }
}
