import { NextRequest, NextResponse } from 'next/server';
import { ingestContentSchema } from '@/lib/validations';
import db from '@/lib/db';
import { getDomainFromUrl, calculateEngagementScore } from '@/lib/utils';
import { getAuthFromRequest } from '@/lib/auth';

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
    const validation = ingestContentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: validation.error.message },
        { status: 400 }
      );
    }

    const data = validation.data;
    const userId = user.id;

    // Check if source already exists for this user + URL (for revisit tracking)
    const existingSource = data.url ? await db.source.findFirst({
      where: {
        userId,
        url: data.url,
      },
    }) : null;

    let source;
    let isRevisit = false;

    if (existingSource) {
      // Update existing source with better engagement metrics
      isRevisit = true;
      const newVisitCount = (existingSource.visitCount || 1) + 1;
      
      source = await db.source.update({
        where: { id: existingSource.id },
        data: {
          visitCount: newVisitCount,
          dwellTimeMs: Math.max(existingSource.dwellTimeMs || 0, data.dwellTimeMs || 0),
          scrollDepth: Math.max(existingSource.scrollDepth || 0, data.scrollDepth || 0),
          completionPercent: Math.max(existingSource.completionPercent || 0, data.completionPercent || 0),
          // Update title if we have a better one
          title: data.title || existingSource.title,
          // Update consumed time to most recent
          consumedAt: data.consumedAt ? new Date(data.consumedAt) : new Date(),
        },
      });
    } else {
      // Create new source record
      source = await db.source.create({
        data: {
          userId,
          url: data.url,
          title: data.title,
          outlet: data.metadata?.outlet || getDomainFromUrl(data.url),
          author: data.metadata?.author,
          contentType: data.contentType || 'article',
          surface: data.surface,
          dwellTimeMs: data.dwellTimeMs,
          scrollDepth: data.scrollDepth,
          completionPercent: data.completionPercent,
          visitCount: data.visitCount || 1,
          wordCount: data.metadata?.wordCount,
          videoDurationMs: data.metadata?.videoDurationMs,
          publishedAt: data.metadata?.publishedAt ? new Date(data.metadata.publishedAt) : null,
          consumedAt: data.consumedAt ? new Date(data.consumedAt) : new Date(),
        },
      });
    }

    // Calculate engagement score
    const engagementScore = calculateEngagementScore({
      dwellTimeMs: source.dwellTimeMs ?? undefined,
      scrollDepth: source.scrollDepth ?? undefined,
      completionPercent: source.completionPercent ?? undefined,
    });

    // Log analytics event
    await db.analyticsEvent.create({
      data: {
        userId,
        type: isRevisit ? 'content_revisited' : 'content_consumed',
        surface: data.surface,
        payload: {
          sourceId: source.id,
          url: data.url,
          engagementScore,
          visitCount: source.visitCount,
          isRevisit,
        },
      },
    });

    // Queue claim extraction (in production, this would be a job queue)
    // For now, we'll return immediately and handle extraction async
    
    return NextResponse.json({
      sourceId: source.id,
      status: isRevisit ? 'updated' : 'queued',
      isRevisit,
      visitCount: source.visitCount,
      engagementScore,
    });
  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to ingest content' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }
    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const [sources, totalCount] = await Promise.all([
      db.source.findMany({
        where: { userId },
        orderBy: { consumedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          claims: {
            include: {
              positions: {
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      }),
      db.source.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      data: sources,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('Get sources error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}
