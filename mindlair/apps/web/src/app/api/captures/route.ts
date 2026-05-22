import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { processCapture } from '@/lib/services/capture-pipeline';
import { z } from 'zod';
import { captureModalitySchema } from '@/lib/validations';

const createCaptureSchema = z.object({
  modality: captureModalitySchema,
  rawText: z.string().optional(),
  rawAudioUrl: z.string().url().optional(),
  rawAudioMs: z.number().int().positive().optional(),
  parentCaptureId: z.string().optional(),
  source: z
    .object({
      url: z.string().url().optional(),
      title: z.string().optional(),
      outlet: z.string().optional(),
      contentType: z.string().optional(),
    })
    .optional(),
});

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
    const parsed = createCaptureSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: parsed.error.message },
        { status: 400 }
      );
    }

    const { modality, rawText, rawAudioUrl, rawAudioMs, parentCaptureId, source } =
      parsed.data;

    let sourceId: string | undefined;

    if (source?.url) {
      const existingSource = await db.source.findFirst({
        where: {
          userId: user.id,
          url: source.url,
        },
      });

      if (existingSource) {
        sourceId = existingSource.id;
      } else {
        const newSource = await db.source.create({
          data: {
            userId: user.id,
            url: source.url,
            title: source.title,
            outlet: source.outlet,
            contentType: source.contentType || 'article',
            surface: modality === 'voice' ? 'voice_capture' : 'share_sheet',
            consumedAt: new Date(),
          },
        });
        sourceId = newSource.id;
      }
    }

    const hasContent = Boolean(rawText?.trim()) || Boolean(rawAudioUrl);
    const initialStatus = hasContent ? 'queued' : 'awaiting_reaction';

    const capture = await db.capture.create({
      data: {
        userId: user.id,
        modality,
        status: initialStatus,
        rawText: rawText?.trim() || null,
        rawAudioUrl: rawAudioUrl || null,
        rawAudioMs: rawAudioMs || null,
        sourceId: sourceId || null,
        parentCaptureId: parentCaptureId || null,
      },
    });

    if (hasContent && modality !== 'voice') {
      processCapture(capture.id).catch((err) => {
        console.error('Background capture processing failed:', err);
      });
    } else if (hasContent && modality === 'voice') {
      processCapture(capture.id).catch((err) => {
        console.error('Background voice capture processing failed:', err);
      });
    }

    return NextResponse.json({
      captureId: capture.id,
      status: capture.status,
    });
  } catch (error) {
    console.error('Create capture error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to create capture' },
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const cursor = searchParams.get('cursor');

    const where: { userId: string; status?: string } = {
      userId: user.id,
    };

    if (status) {
      where.status = status;
    }

    const captures = await db.capture.findMany({
      where,
      include: {
        source: {
          select: {
            id: true,
            url: true,
            title: true,
            outlet: true,
            contentType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const hasMore = captures.length > limit;
    const results = hasMore ? captures.slice(0, -1) : captures;
    const nextCursor = hasMore ? results[results.length - 1]?.id : null;

    return NextResponse.json({
      captures: results.map((c) => ({
        id: c.id,
        modality: c.modality,
        status: c.status,
        rawText: c.rawText,
        rawAudioUrl: c.rawAudioUrl,
        rawAudioMs: c.rawAudioMs,
        candidateClaims: c.candidateClaims,
        source: c.source,
        createdAt: c.createdAt.toISOString(),
        confirmedAt: c.confirmedAt?.toISOString() || null,
      })),
      nextCursor,
    });
  } catch (error) {
    console.error('List captures error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to list captures' },
      { status: 500 }
    );
  }
}
