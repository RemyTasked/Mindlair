/**
 * YouTube watch history parser.
 * Handles two Google Takeout formats:
 *   1. JSON (watch-history.json) — array of objects
 *   2. HTML (watch-history.html) — rendered table from older exports
 */

export interface YouTubeWatchItem {
  title: string;
  url: string;
  channelName?: string;
  channelUrl?: string;
  watchedAt?: string;
}

export function parseYouTubeJSON(raw: string): YouTubeWatchItem[] {
  let data: unknown[];
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON file');
  }

  if (!Array.isArray(data)) {
    throw new Error('Expected an array of watch history items');
  }

  const items: YouTubeWatchItem[] = [];

  for (const entry of data) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;

    if (e.header !== 'YouTube' && e.header !== 'YouTube Music') continue;

    const titleLink = (e.titleUrl as string) || '';
    if (!titleLink.includes('youtube.com/watch') && !titleLink.includes('youtu.be/')) continue;

    const rawTitle = (e.title as string) || '';
    const title = rawTitle.replace(/^Watched\s+/i, '');

    let channelName: string | undefined;
    let channelUrl: string | undefined;
    const subtitles = e.subtitles as { name?: string; url?: string }[] | undefined;
    if (subtitles && subtitles.length > 0) {
      channelName = subtitles[0].name;
      channelUrl = subtitles[0].url;
    }

    items.push({
      title,
      url: normalizeYouTubeUrl(titleLink),
      channelName,
      channelUrl,
      watchedAt: tryParseTime(e.time as string),
    });
  }

  return items;
}

export function parseYouTubeHTML(html: string): YouTubeWatchItem[] {
  const items: YouTubeWatchItem[] = [];

  const cellPattern = /<div class="content-cell[^"]*">([\s\S]*?)<\/div>/gi;
  let match;

  while ((match = cellPattern.exec(html)) !== null) {
    const cell = match[1];

    const links = [...cell.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    if (links.length === 0) continue;

    const videoLink = links[0][1] || '';
    const videoTitle = stripTags(links[0][2] || '');

    if (!videoLink.includes('youtube.com/watch') && !videoLink.includes('youtu.be/')) continue;

    let channelName: string | undefined;
    let channelUrl: string | undefined;
    if (links.length > 1) {
      channelUrl = links[1][1];
      channelName = stripTags(links[1][2] || '');
    }

    const dateMatch = cell.match(/(\w{3}\s+\d{1,2},\s+\d{4},?\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?)/i);

    items.push({
      title: videoTitle.replace(/^Watched\s+/i, ''),
      url: normalizeYouTubeUrl(videoLink),
      channelName,
      channelUrl,
      watchedAt: dateMatch ? tryParseTime(dateMatch[1]) : undefined,
    });
  }

  return items;
}

function normalizeYouTubeUrl(url: string): string {
  try {
    const u = new URL(url);
    const videoId = u.searchParams.get('v');
    if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  } catch { /* noop */ }
  return url;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

function tryParseTime(str?: string): string | undefined {
  if (!str) return undefined;
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
  } catch {
    return undefined;
  }
}

export function mapYouTubeItemToSource(item: YouTubeWatchItem) {
  return {
    url: item.url,
    title: item.title || 'Untitled Video',
    contentType: 'video' as const,
    surface: 'youtube_import' as const,
    consumedAt: item.watchedAt || new Date().toISOString(),
    metadata: {
      author: item.channelName,
      outlet: 'YouTube',
    },
  };
}
