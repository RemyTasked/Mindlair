import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createMagicLinkToken, checkMagicLinkRateLimit } from '@/lib/auth';
import { sendMagicLink } from '@/lib/services/email';

const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    const withinLimit = await checkMagicLinkRateLimit(email);
    if (!withinLimit) {
      return NextResponse.json(
        { code: 'RATE_LIMIT', message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const token = await createMagicLinkToken(email);
    const sent = await sendMagicLink(email, token);

    if (!sent) {
      return NextResponse.json(
        { code: 'EMAIL_ERROR', message: 'Failed to send email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Check your email for a sign-in link',
    });
  } catch (error) {
    console.error('Magic link request error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to send magic link' },
      { status: 500 }
    );
  }
}
