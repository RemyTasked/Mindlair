import { NextRequest, NextResponse } from 'next/server';
import { fetchOGPreview } from '@/lib/services/og-preview';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter required' },
      { status: 400 }
    );
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL' },
      { status: 400 }
    );
  }

  const preview = await fetchOGPreview(url);

  return NextResponse.json(preview, {
    headers: {
      'Cache-Control': 'public, max-age=300',
    },
  });
}
