import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createMagicLinkToken,
  checkMagicLinkRateLimit,
  revokeMagicLinkToken,
} from '@/lib/auth';
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

    const plaintextToken = await createMagicLinkToken(email);

    try {
      const result = await sendMagicLink(email, plaintextToken);

      if (!result.success) {
        await revokeMagicLinkToken(plaintextToken).catch(() => {
          /* best-effort cleanup */
        });

        console.error('[MagicLink] Email send failed:', {
          email,
          error: result.error,
          errorCode: result.errorCode,
        });

        let userMessage = 'Failed to send email. Please try again.';

        if (result.errorCode === 'validation_error' || result.error?.includes('domain')) {
          userMessage = 'Email service configuration error. Please contact support.';
        } else if (result.errorCode === 'NETWORK_ERROR') {
          userMessage = 'Network error while sending email. Please try again.';
        } else if (result.error?.includes('rate') || result.error?.includes('limit')) {
          userMessage = 'Too many emails sent. Please wait a moment and try again.';
        }

        return NextResponse.json(
          {
            code: 'EMAIL_ERROR',
            message: userMessage,
            debug: process.env.NODE_ENV === 'development' ? result.error : undefined,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Check your email for a sign-in link',
      });
    } catch (sendErr) {
      await revokeMagicLinkToken(plaintextToken).catch(() => {});
      throw sendErr;
    }
  } catch (error) {
    console.error('[MagicLink] Request error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to send magic link' },
      { status: 500 }
    );
  }
}
