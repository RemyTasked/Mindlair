import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { z } from 'zod';
import { feedbackActionSchema, aiStanceSchema, stanceSchema } from '@/lib/validations';
import { MODEL_VERSION } from '@/lib/services/ai';

const feedbackSchema = z.object({
  claimText: z.string().min(1),
  finalText: z.string().nullable().optional(),
  action: feedbackActionSchema,
  stanceBefore: aiStanceSchema.nullable().optional(),
  stanceAfter: stanceSchema.nullable().optional(),
});

export async function POST(
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
    const parsed = feedbackSchema.safeParse(body);

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

    const feedback = await db.extractionFeedback.create({
      data: {
        captureId: id,
        claimText: parsed.data.claimText,
        finalText: parsed.data.finalText ?? null,
        action: parsed.data.action,
        stanceBefore: parsed.data.stanceBefore ?? null,
        stanceAfter: parsed.data.stanceAfter ?? null,
        modelVersion: MODEL_VERSION,
      },
    });

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
    });
  } catch (error) {
    console.error('Record feedback error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to record feedback' },
      { status: 500 }
    );
  }
}
