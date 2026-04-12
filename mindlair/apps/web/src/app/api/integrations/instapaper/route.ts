import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { authenticateInstapaper } from '@/lib/services/integrations/instapaper';

const connectSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const connection = await db.connectedSource.findUnique({
      where: { userId_provider: { userId: user.id, provider: 'instapaper' } },
      select: { id: true, lastSyncAt: true, createdAt: true },
    });

    return NextResponse.json({ connected: !!connection, connection });
  } catch (error) {
    console.error('Instapaper status error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to get status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validation = connectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Email and password required' }, { status: 400 });
    }

    const { oauthToken, oauthTokenSecret } = await authenticateInstapaper(
      validation.data.email,
      validation.data.password,
    );

    await db.connectedSource.upsert({
      where: { userId_provider: { userId: user.id, provider: 'instapaper' } },
      create: {
        userId: user.id,
        provider: 'instapaper',
        accessToken: oauthToken,
        refreshToken: oauthTokenSecret,
      },
      update: {
        accessToken: oauthToken,
        refreshToken: oauthTokenSecret,
      },
    });

    return NextResponse.json({ connected: true });
  } catch (error) {
    console.error('Instapaper connect error:', error);
    const message = error instanceof Error ? error.message : 'Failed to connect';
    return NextResponse.json({ code: 'AUTH_FAILED', message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    await db.connectedSource.deleteMany({
      where: { userId: user.id, provider: 'instapaper' },
    });

    return NextResponse.json({ disconnected: true });
  } catch (error) {
    console.error('Instapaper disconnect error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to disconnect' }, { status: 500 });
  }
}
