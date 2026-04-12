import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: { onboardingComplete: true },
    });

    return NextResponse.json({
      onboardingComplete: fullUser?.onboardingComplete ?? false,
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to get onboarding status' },
      { status: 500 }
    );
  }
}
