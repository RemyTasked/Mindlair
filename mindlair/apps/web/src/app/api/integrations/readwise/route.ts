import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { verifyReadwiseToken } from '@/lib/services/integrations/readwise';

const connectSchema = z.object({
  token: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const connection = await db.connectedSource.findUnique({
      where: { userId_provider: { userId: user.id, provider: 'readwise' } },
      select: { id: true, lastSyncAt: true, createdAt: true },
    });

    return NextResponse.json({ connected: !!connection, connection });
  } catch (error) {
    console.error('Readwise status error:', error);
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
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Token required' }, { status: 400 });
    }

    const { token } = validation.data;
    const valid = await verifyReadwiseToken(token);
    if (!valid) {
      return NextResponse.json({ code: 'INVALID_TOKEN', message: 'Invalid Readwise token' }, { status: 401 });
    }

    await db.connectedSource.upsert({
      where: { userId_provider: { userId: user.id, provider: 'readwise' } },
      create: {
        userId: user.id,
        provider: 'readwise',
        accessToken: token,
      },
      update: {
        accessToken: token,
      },
    });

    return NextResponse.json({ connected: true });
  } catch (error) {
    console.error('Readwise connect error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to connect Readwise' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    await db.connectedSource.deleteMany({
      where: { userId: user.id, provider: 'readwise' },
    });

    return NextResponse.json({ disconnected: true });
  } catch (error) {
    console.error('Readwise disconnect error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Failed to disconnect' }, { status: 500 });
  }
}
