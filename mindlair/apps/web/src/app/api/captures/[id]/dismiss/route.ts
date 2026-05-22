import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { dismissCapture } from '@/lib/services/capture-pipeline';

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

    await dismissCapture(id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Dismiss capture error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to dismiss capture' },
      { status: 500 }
    );
  }
}
