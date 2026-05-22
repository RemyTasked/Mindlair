import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import {
  referencedPostSelect,
  serializeReferencedPost,
  validateReferencedPostId,
} from '@/lib/posts/referenced-post';
import { isValidSlug, isSlugAvailable } from '@/lib/utils/slug';
import { validateCitations } from '@/lib/posts/citations';

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

    const publishedPostIds = results
      .filter((p) => p.status === 'published')
      .map((p) => p.id);

    let unresolvedCounts: Record<string, number> = {};
    if (publishedPostIds.length > 0 && authorId === user.id) {
      const counts = await db.annotation.groupBy({
        by: ['postId'],
        where: {
          postId: { in: publishedPostIds },
          isResolved: false,
        },
        _count: true,
      });
      unresolvedCounts = counts.reduce((acc, c) => {
        acc[c.postId] = c._count;
        return acc;
      }, {} as Record<string, number>);
    }

    return NextResponse.json({
      posts: results.map(post => ({
        id: post.id,
        title: post.title,
        headlineClaim: post.headlineClaim,
        body: post.body,
        authorStance: post.authorStance,
        status: post.status,
        visibility: post.visibility,
        publishedAt: post.publishedAt?.toISOString(),
        topicTags: post.topicTags,
        thumbnailUrl: post.thumbnailUrl,
        slug: post.slug,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        author: post.author,
        reactionCount: post._count.reactions,
        unresolvedAnnotationCount: unresolvedCounts[post.id] ?? 0,
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
      title,
      headlineClaim, 
      postBody, 
      authorStance, 
      visibility: rawVisibility,
      topicTags: rawTopicTags,
      referencedPostId: rawRef,
      referencedAnnotationId: rawAnnotationRef,
      thumbnailUrl,
      slug: rawSlug,
      seoTitle,
      seoDescription,
      citations: rawCitations,
    } = body;

    let citationData: ReturnType<typeof validateCitations> = { ok: true, citations: [] };
    if (rawCitations !== undefined && rawCitations !== null) {
      citationData = validateCitations(rawCitations);
      if (!citationData.ok) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: citationData.message },
          { status: 400 }
        );
      }
    }

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

    let referencedAnnotationId: string | null = null;
    if (rawAnnotationRef && typeof rawAnnotationRef === 'string') {
      const annotation = await db.annotation.findUnique({
        where: { id: rawAnnotationRef },
        select: { id: true, postId: true },
      });
      if (!annotation) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Referenced annotation not found' },
          { status: 400 }
        );
      }
      if (referencedPostId && annotation.postId !== referencedPostId) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Annotation does not belong to the referenced post' },
          { status: 400 }
        );
      }
      referencedAnnotationId = annotation.id;
      if (!referencedPostId) {
        referencedPostId = annotation.postId;
      }
    }

    // Validate title (required, 3-120 chars)
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Title is required' },
        { status: 400 }
      );
    }

    if (title.length < 3 || title.length > 120) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Title must be 3-120 characters' },
        { status: 400 }
      );
    }

    // Validate headline claim (required, 10-280 chars)
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

    // Validate visibility (public or unlisted)
    const visibility = rawVisibility === 'unlisted' ? 'unlisted' : 'public';

    // Validate topic tags (0-5 items, each 2-40 chars)
    let topicTags: string[] = [];
    if (rawTopicTags && Array.isArray(rawTopicTags)) {
      topicTags = rawTopicTags
        .filter((t): t is string => typeof t === 'string' && t.length >= 2 && t.length <= 40)
        .slice(0, 5);
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
        title: title.trim(),
        headlineClaim: headlineClaim.trim(),
        body: postBody.trim(),
        authorStance,
        status: 'draft',
        visibility,
        topicTags,
        ...(referencedPostId !== null ? { referencedPostId } : {}),
        ...(referencedAnnotationId !== null ? { referencedAnnotationId } : {}),
        ...(thumbnailUrl && typeof thumbnailUrl === 'string' ? { thumbnailUrl } : {}),
        ...(slug ? { slug } : {}),
        ...(validSeoTitle ? { seoTitle: validSeoTitle } : {}),
        ...(validSeoDescription ? { seoDescription: validSeoDescription } : {}),
        ...(citationData.ok && citationData.citations.length > 0
          ? {
              citations: {
                create: citationData.citations.map((c) => ({
                  url: c.url,
                  title: c.title,
                  author: c.author,
                  outlet: c.outlet,
                  excerpt: c.excerpt,
                  contentType: c.contentType,
                  position: c.position,
                })),
              },
            }
          : {}),
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
        title: post.title,
        headlineClaim: post.headlineClaim,
        body: post.body,
        authorStance: post.authorStance,
        status: post.status,
        visibility: post.visibility,
        topicTags: post.topicTags,
        referencedPostId: post.referencedPostId,
        referencedAnnotationId: post.referencedAnnotationId,
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
