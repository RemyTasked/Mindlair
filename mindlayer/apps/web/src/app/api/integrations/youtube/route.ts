import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { parseYouTubeJSON, parseYouTubeHTML, mapYouTubeItemToSource } from '@/lib/services/integrations/youtube';
import { isContentExplicit } from '@/lib/services/content-filter';

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    let raw: string;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || typeof file === 'string') {
        return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'File upload required' }, { status: 400 });
      }
      if (file.size > MAX_UPLOAD_SIZE) {
        return NextResponse.json({ code: 'FILE_TOO_LARGE', message: 'Max upload size is 50MB' }, { status: 413 });
      }
      raw = await file.text();
    } else {
      raw = await request.text();
      if (raw.length > MAX_UPLOAD_SIZE) {
        return NextResponse.json({ code: 'FILE_TOO_LARGE', message: 'Max upload size is 50MB' }, { status: 413 });
      }
    }

    if (!raw.trim()) {
      return NextResponse.json({ code: 'EMPTY_FILE', message: 'File is empty' }, { status: 400 });
    }

    let items;
    const trimmed = raw.trimStart();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      items = parseYouTubeJSON(raw);
    } else if (trimmed.startsWith('<') || trimmed.includes('<!DOCTYPE')) {
      items = parseYouTubeHTML(raw);
    } else {
      return NextResponse.json(
        { code: 'UNSUPPORTED_FORMAT', message: 'Expected JSON or HTML watch history file from Google Takeout' },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json({ code: 'NO_ITEMS', message: 'No YouTube watch history items found in file' }, { status: 400 });
    }

    let imported = 0;
    let skippedDuplicate = 0;
    let skippedExplicit = 0;

    for (const item of items) {
      const mapped = mapYouTubeItemToSource(item);

      const filter = isContentExplicit({ url: mapped.url, title: mapped.title });
      if (filter.blocked) {
        skippedExplicit++;
        continue;
      }

      const existing = await db.source.findFirst({
        where: { userId: user.id, url: mapped.url },
      });
      if (existing) {
        skippedDuplicate++;
        continue;
      }

      await db.source.create({
        data: {
          userId: user.id,
          url: mapped.url,
          title: mapped.title,
          outlet: 'YouTube',
          author: item.channelName || null,
          contentType: mapped.contentType,
          surface: mapped.surface,
          consumedAt: item.watchedAt ? new Date(item.watchedAt) : new Date(),
        },
      });
      imported++;
    }

    return NextResponse.json({
      totalParsed: items.length,
      imported,
      skippedDuplicate,
      skippedExplicit,
    });
  } catch (error) {
    console.error('YouTube import error:', error);
    const message = error instanceof Error ? error.message : 'Failed to import YouTube history';
    return NextResponse.json({ code: 'IMPORT_ERROR', message }, { status: 500 });
  }
}
