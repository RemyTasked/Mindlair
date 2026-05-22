import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { commitCaptureManualClaim } from '@/lib/services/capture-pipeline';
import { z } from 'zod';
import { stanceSchema } from '@/lib/validations';

const manualClaimSchema = z.object({
  text: z.string().min(3).max(500),
  stance: stanceSchema,
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
    const parsed = manualClaimSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: parsed.error.message },
        { status: 400 }
      );
    }

    const capture = await db.capture.findUnique({ where: { id } });

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

    // Only allow manual claim when AI couldn't extract — keeps the normal
    // commit path as the canonical flow for confirmed candidates.
    if (
      capture.status !== 'awaiting_reaction' &&
      capture.status !== 'awaiting_confirmation'
    ) {
      return NextResponse.json(
        { code: 'INVALID_STATE', message: 'Capture is not awaiting input' },
        { status: 400 }
      );
    }

    const result = await commitCaptureManualClaim(id, {
      text: parsed.data.text,
      stance: parsed.data.stance,
    });

    return NextResponse.json({
      success: true,
      claimId: result.claimId,
      positionId: result.positionId,
    });
  } catch (error) {
    console.error('Manual claim error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to save claim' },
      { status: 500 }
    );
  }
}
