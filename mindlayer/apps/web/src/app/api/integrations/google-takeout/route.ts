import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import {
  parseYouTubeWatchHistory,
  parseChromeHistory,
  mapYouTubeToSource,
  mapChromeToSource,
  categorizeContent,
} from '@/lib/services/integrations/google-takeout';
import { isContentExplicit } from '@/lib/services/content-filter';
import JSZip from 'jszip';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileType = formData.get('type') as string | null;

    if (!file) {
      return NextResponse.json(
        { code: 'NO_FILE', message: 'No file provided' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let youtubeItems: ReturnType<typeof parseYouTubeWatchHistory> = [];
    let chromeItems: ReturnType<typeof parseChromeHistory> = [];

    // Handle ZIP files (full Takeout export)
    if (file.name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(buffer);
      
      // Look for YouTube watch history
      const youtubeFile = zip.file(/YouTube.*watch-history\.html$/i)[0] ||
                          zip.file(/Takeout\/YouTube.*\/history\/watch-history\.html$/i)[0];
      if (youtubeFile) {
        const html = await youtubeFile.async('string');
        youtubeItems = parseYouTubeWatchHistory(html);
      }

      // Look for Chrome history
      const chromeFile = zip.file(/Chrome.*BrowserHistory\.json$/i)[0] ||
                         zip.file(/Chrome.*History\.json$/i)[0];
      if (chromeFile) {
        const json = await chromeFile.async('string');
        chromeItems = parseChromeHistory(json);
      }
    } else if (fileType === 'youtube' || file.name.includes('watch-history')) {
      // Single YouTube watch history file
      const html = buffer.toString('utf-8');
      youtubeItems = parseYouTubeWatchHistory(html);
    } else if (fileType === 'chrome' || file.name.includes('BrowserHistory') || file.name.includes('History.json')) {
      // Single Chrome history file
      const json = buffer.toString('utf-8');
      chromeItems = parseChromeHistory(json);
    } else {
      // Try to detect file type
      const content = buffer.toString('utf-8');
      if (content.includes('youtube.com/watch')) {
        youtubeItems = parseYouTubeWatchHistory(content);
      } else if (content.startsWith('{') || content.startsWith('[')) {
        chromeItems = parseChromeHistory(content);
      }
    }

    // Check if we found any data
    if (youtubeItems.length === 0 && chromeItems.length === 0) {
      return NextResponse.json(
        { 
          code: 'NO_DATA_FOUND', 
          message: 'No YouTube or Chrome history found in this file. Make sure you selected "YouTube and YouTube Music" or "Chrome → BrowserHistory" when exporting from Google Takeout.' 
        },
        { status: 400 }
      );
    }

    let importedYoutube = 0;
    let importedChrome = 0;
    let skippedDuplicate = 0;
    let skippedFiltered = 0;

    // Import YouTube items
    for (const item of youtubeItems) {
      const mapped = mapYouTubeToSource(item);
      
      const filter = isContentExplicit({ url: mapped.url, title: mapped.title });
      if (filter.blocked) {
        skippedFiltered++;
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
          outlet: mapped.metadata.outlet,
          author: mapped.metadata.author,
          contentType: mapped.contentType,
          surface: mapped.surface,
          consumedAt: new Date(mapped.consumedAt),
        },
      });
      importedYoutube++;
    }

    // Import Chrome items (only articles and videos)
    for (const item of chromeItems) {
      const { shouldImport } = categorizeContent(item.url);
      if (!shouldImport) continue;

      const mapped = mapChromeToSource(item);
      
      const filter = isContentExplicit({ url: mapped.url, title: mapped.title });
      if (filter.blocked) {
        skippedFiltered++;
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
          outlet: mapped.metadata.outlet,
          contentType: mapped.contentType,
          surface: mapped.surface,
          consumedAt: new Date(mapped.consumedAt),
          visitCount: mapped.metadata.visitCount || 1,
        },
      });
      importedChrome++;
    }

    return NextResponse.json({
      success: true,
      imported: {
        youtube: importedYoutube,
        chrome: importedChrome,
        total: importedYoutube + importedChrome,
      },
      parsed: {
        youtube: youtubeItems.length,
        chrome: chromeItems.length,
      },
      skipped: {
        duplicate: skippedDuplicate,
        filtered: skippedFiltered,
      },
    });
  } catch (error) {
    console.error('Google Takeout import error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('Invalid or unsupported zip')) {
      return NextResponse.json(
        { code: 'INVALID_ZIP', message: 'Invalid ZIP file. Make sure you downloaded the file completely.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: `Import failed: ${message.slice(0, 100)}` },
      { status: 500 }
    );
  }
}
