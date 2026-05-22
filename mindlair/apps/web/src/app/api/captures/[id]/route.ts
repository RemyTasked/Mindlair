import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { processCapture } from '@/lib/services/capture-pipeline';
import { z } from 'zod';

const updateCaptureSchema = z.object({
  rawText: z.string().min(1).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const capture = await db.capture.findUnique({
      where: { id },
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
    });

    if (!capture) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Capture not found' },
        { status: 404 }
      );
    }

    if (capture.userId !== user.id) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: capture.id,
      modality: capture.modality,
      status: capture.status,
      rawText: capture.rawText,
      rawAudioUrl: capture.rawAudioUrl,
      rawAudioMs: capture.rawAudioMs,
      candidateClaims: capture.candidateClaims,
      errorReason: capture.errorReason,
      source: capture.source,
      parentCaptureId: capture.parentCaptureId,
      createdAt: capture.createdAt.toISOString(),
      confirmedAt: capture.confirmedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Get capture error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to get capture' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateCaptureSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: parsed.error.message },
        { status: 400 }
      );
    }

    const capture = await db.capture.findUnique({
      where: { id },
    });

    if (!capture) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Capture not found' },
        { status: 404 }
      );
    }

    if (capture.userId !== user.id) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Access denied' },
        { status: 403 }
      );
    }

    if (capture.status !== 'awaiting_reaction') {
      return NextResponse.json(
        { code: 'INVALID_STATE', message: 'Capture is not awaiting reaction' },
        { status: 400 }
      );
    }

    const { rawText } = parsed.data;

    await db.capture.update({
      where: { id },
      data: {
        rawText: rawText?.trim(),
        status: 'queued',
      },
    });

    processCapture(id).catch((err) => {
      console.error('Background capture processing failed:', err);
    });

    return NextResponse.json({
      id,
      status: 'processing',
    });
  } catch (error) {
    console.error('Update capture error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to update capture' },
      { status: 500 }
    );
  }
}
