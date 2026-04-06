import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getFingerprint } from '@/lib/services/fingerprint';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = await getFingerprint(user.id);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Fingerprint error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to load fingerprint' },
      { status: 500 }
    );
  }
}
