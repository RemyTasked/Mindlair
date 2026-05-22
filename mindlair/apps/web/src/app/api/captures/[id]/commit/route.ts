import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { commitCapture, type CaptureDecision } from '@/lib/services/capture-pipeline';
import { z } from 'zod';
import { stanceSchema } from '@/lib/validations';

const commitCaptureSchema = z.object({
  claims: z.array(
    z.object({
      text: z.string().min(1),
      originalText: z.string().optional(),
      stance: stanceSchema,
      dropped: z.boolean().optional(),
      edited: z.boolean().optional(),
      matchedClaimId: z.string().optional(),
    })
  ),
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
    const parsed = commitCaptureSchema.safeParse(body);

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

    if (capture.status !== 'awaiting_confirmation') {
      return NextResponse.json(
        { code: 'INVALID_STATE', message: 'Capture is not awaiting confirmation' },
        { status: 400 }
      );
    }

    const decisions: CaptureDecision[] = parsed.data.claims.map((c) => ({
      text: c.text,
      originalText: c.originalText,
      stance: c.stance,
      dropped: c.dropped,
      edited: c.edited,
      matchedClaimId: c.matchedClaimId,
    }));

    const result = await commitCapture(id, decisions);

    return NextResponse.json({
      success: true,
      claimIds: result.claimIds,
      positionIds: result.positionIds,
    });
  } catch (error) {
    console.error('Commit capture error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to commit capture' },
      { status: 500 }
    );
  }
}
