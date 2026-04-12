import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json({ valid: false, message: 'No API key provided' }, { status: 401 });
    }

    const user = await validateApiKey(apiKey);

    if (!user) {
      return NextResponse.json({ valid: false, message: 'Invalid API key' }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      userId: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Auth validation error:', error);
    return NextResponse.json(
      { valid: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
