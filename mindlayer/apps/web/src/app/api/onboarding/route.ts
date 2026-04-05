import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
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

    await db.user.update({
      where: { id: user.id },
      data: { onboardingComplete: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: { onboardingComplete: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset onboarding error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to reset onboarding' },
      { status: 500 }
    );
  }
}
