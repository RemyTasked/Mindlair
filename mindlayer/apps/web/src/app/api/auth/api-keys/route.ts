import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getSessionFromCookie,
  createApiKey,
  listApiKeys,
  deleteApiKey,
  maskApiKey,
} from '@/lib/auth';

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  try {
    const user = await getSessionFromCookie();

    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const keys = await listApiKeys(user.id);

    const maskedKeys = keys.map((key: { id: string; name: string; key: string; lastUsedAt: Date | null; createdAt: Date }) => ({
      id: key.id,
      name: key.name,
      keyPreview: maskApiKey(key.key),
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
    }));

    return NextResponse.json({ keys: maskedKeys });
  } catch (error) {
    console.error('List API keys error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to list API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromCookie();

    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid key name' },
        { status: 400 }
      );
    }

    const { name } = validation.data;
    const key = await createApiKey(user.id, name);

    return NextResponse.json({
      success: true,
      key,
      message: 'API key created. Copy it now - you won\'t be able to see it again.',
    });
  } catch (error) {
    console.error('Create API key error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionFromCookie();

    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Key ID required' },
        { status: 400 }
      );
    }

    const deleted = await deleteApiKey(user.id, keyId);

    if (!deleted) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'API key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
