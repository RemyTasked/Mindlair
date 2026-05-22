import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { flipClaim } from '@/lib/services/ai';

const flipSchema = z.object({
  claimText: z.string().min(1).max(2000),
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
    const parsed = flipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: parsed.error.message },
        { status: 400 }
      );
    }

    const capture = await db.capture.findUnique({
      where: { id },
      select: { id: true, userId: true },
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

    const flippedText = await flipClaim(parsed.data.claimText);

    return NextResponse.json({ flippedText });
  } catch (error) {
    console.error('Flip claim error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to flip claim' },
      { status: 500 }
    );
  }
}
