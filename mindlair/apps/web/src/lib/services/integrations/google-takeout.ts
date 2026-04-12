/**
 * Google Takeout import service.
 * Parses YouTube watch history and Chrome browsing history from Takeout exports.
 * 
 * Supported files:
 * - YouTube/history/watch-history.html
 * - Chrome/BrowserHistory.json (or History.json)
 */

export interface YouTubeWatchItem {
  title: string;
  url: string;
  channelName: string;
  channelUrl: string | null;
  watchedAt: string;
}

export interface ChromeHistoryItem {
  title: string;
  url: string;
  visitedAt: string;
  visitCount: number;
}

export interface TakeoutParseResult {
  youtube: YouTubeWatchItem[];
  chrome: ChromeHistoryItem[];
  errors: string[];
}

/** Href capture: www/m youtube watch|shorts, or youtu.be (Takeout may HTML-encode &). */
const YT_HREF_CAPTURE =
  '(https:\\/\\/(?:www\\.|m\\.)?youtube\\.com\\/(?:watch\\?[^"#\\s>]+|shorts\\/[a-zA-Z0-9_-]+)|https:\\/\\/youtu\\.be\\/[a-zA-Z0-9_-]+(?:\\?[^"#\\s>]*)?)';

/**
 * Parse YouTube watch history from Takeout HTML file.
 * The HTML structure has divs with class "content-cell" containing video info.
 */
export function parseYouTubeWatchHistory(html: string): YouTubeWatchItem[] {
  const items: YouTubeWatchItem[] = [];

  const entryRegex = new RegExp(
    `<div class="content-cell[^"]*"[^>]*>[\\s\\S]*?<a href="${YT_HREF_CAPTURE}"[^>]*>([^<]+)<\\/a>[\\s\\S]*?(?:<a href="(https:\\/\\/(?:www\\.)?youtube\\.com\\/channel\\/[^"]+)"[^>]*>([^<]+)<\\/a>)?[\\s\\S]*?<br\\s*\\/?>[\\s\\S]*?(\\w{3} \\d{1,2}, \\d{4}, \\d{1,2}:\\d{2}:\\d{2}[^<]*)<\\/div>`,
    'gi',
  );

  let match;
  while ((match = entryRegex.exec(html)) !== null) {
    const [, videoUrl, title, channelUrl, channelName, timestamp] = match;

    if (videoUrl && title) {
      items.push({
        title: decodeHtmlEntities(title.trim()),
        url: videoUrl.replace(/&amp;/g, '&'),
        channelName: channelName ? decodeHtmlEntities(channelName.trim()) : 'Unknown Channel',
        channelUrl: channelUrl ? channelUrl.replace(/&amp;/g, '&') : null,
        watchedAt: parseYouTubeTimestamp(timestamp),
      });
    }
  }

  // Fallback: any YouTube link + title in anchor
  if (items.length === 0) {
    const linkRe = new RegExp(`<a[^>]*href="${YT_HREF_CAPTURE}"[^>]*>([^<]+)<\\/a>`, 'gi');
    const timeRegex = /(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2})/gi;

    const videoMatches = [...html.matchAll(linkRe)];
    const timeMatches = [...html.matchAll(timeRegex)];

    for (let i = 0; i < videoMatches.length; i++) {
      const [, url, title] = videoMatches[i];
      if (!url || !title) continue;
      const timestamp = timeMatches[i]?.[1] || new Date().toISOString();

      items.push({
        title: decodeHtmlEntities(title.trim()),
        url: url.replace(/&amp;/g, '&'),
        channelName: 'Unknown Channel',
        channelUrl: null,
        watchedAt: parseYouTubeTimestamp(timestamp),
      });
    }
  }

  return items;
}

function extractChromeHistoryRows(data: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const keys = [
    'Browser History',
    'browser_history',
    'BrowserHistory',
    'History',
    'history',
  ];
  for (const k of keys) {
    const v = o[k];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  for (const v of Object.values(o)) {
    if (!Array.isArray(v) || v.length === 0) continue;
    const first = v[0];
    if (first && typeof first === 'object' && ('url' in first || 'page_url' in first)) {
      return v as Record<string, unknown>[];
    }
  }
  return null;
}

/**
 * Parse Chrome browsing history from Takeout JSON file.
 */
export function parseChromeHistory(jsonString: string): ChromeHistoryItem[] {
  const items: ChromeHistoryItem[] = [];

  try {
    const data = JSON.parse(jsonString);
    const browserHistory = extractChromeHistoryRows(data);

    if (browserHistory) {
      for (const entry of browserHistory) {
        const url = (entry.url || entry.page_url) as string | undefined;
        const title = (entry.title || entry.page_title || 'Untitled') as string;
        const timestamp = entry.time_usec ?? entry.last_visit_time ?? entry.time;
        const visitCount = (entry.visit_count as number) || 1;

        if (url && typeof url === 'string' && !isInternalUrl(url)) {
          items.push({
            title: String(title).trim(),
            url,
            visitedAt: timestamp != null ? convertChromeTimestamp(timestamp as number | string) : new Date().toISOString(),
            visitCount,
          });
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse Chrome history JSON:', e);
  }

  return items;
}

/**
 * Filter and categorize content for import.
 */
export function categorizeContent(url: string): { contentType: string; shouldImport: boolean } {
  const lowerUrl = url.toLowerCase();
  
  // Skip internal/utility URLs
  if (isInternalUrl(url)) {
    return { contentType: 'other', shouldImport: false };
  }
  
  // YouTube videos (watch, shorts, mobile)
  if (
    lowerUrl.includes('youtube.com/watch') ||
    lowerUrl.includes('m.youtube.com/') ||
    lowerUrl.includes('youtube.com/shorts/') ||
    lowerUrl.includes('youtu.be/')
  ) {
    return { contentType: 'video', shouldImport: true };
  }
  
  // Podcast platforms
  if (
    lowerUrl.includes('podcasts.apple.com') ||
    lowerUrl.includes('open.spotify.com/episode') ||
    lowerUrl.includes('pocketcasts.com') ||
    lowerUrl.includes('overcast.fm')
  ) {
    return { contentType: 'podcast', shouldImport: true };
  }
  
  // News/article sites (common patterns)
  const articleDomains = [
    'medium.com', 'substack.com', 'nytimes.com', 'washingtonpost.com',
    'theguardian.com', 'bbc.com', 'bbc.co.uk', 'reuters.com', 'apnews.com',
    'theatlantic.com', 'newyorker.com', 'wired.com', 'arstechnica.com',
    'techcrunch.com', 'theverge.com', 'engadget.com', 'vice.com',
    'vox.com', 'slate.com', 'salon.com', 'huffpost.com',
    'forbes.com', 'businessinsider.com', 'bloomberg.com', 'ft.com',
    'economist.com', 'wsj.com', 'cnn.com', 'foxnews.com', 'msnbc.com',
    'npr.org', 'politico.com', 'axios.com', 'thehill.com',
    'hackernews.com', 'news.ycombinator.com', 'reddit.com',
  ];
  
  for (const domain of articleDomains) {
    if (lowerUrl.includes(domain)) {
      return { contentType: 'article', shouldImport: true };
    }
  }
  
  // General articles - URLs with article-like patterns
  if (
    lowerUrl.match(/\/\d{4}\/\d{2}\//) || // Date in URL
    lowerUrl.includes('/article') ||
    lowerUrl.includes('/post') ||
    lowerUrl.includes('/blog') ||
    lowerUrl.includes('/news/')
  ) {
    return { contentType: 'article', shouldImport: true };
  }
  
  // Default: don't import non-article pages
  return { contentType: 'other', shouldImport: false };
}

/**
 * Map YouTube item to source format.
 */
export function mapYouTubeToSource(item: YouTubeWatchItem) {
  return {
    url: item.url,
    title: item.title,
    contentType: 'video' as const,
    surface: 'google_takeout_youtube' as const,
    consumedAt: item.watchedAt,
    metadata: {
      author: item.channelName,
      outlet: 'YouTube',
    },
  };
}

/**
 * Map Chrome history item to source format.
 */
export function mapChromeToSource(item: ChromeHistoryItem) {
  const { contentType } = categorizeContent(item.url);
  const domain = extractDomain(item.url);
  
  return {
    url: item.url,
    title: item.title,
    contentType,
    surface: 'google_takeout_chrome' as const,
    consumedAt: item.visitedAt,
    metadata: {
      outlet: domain,
      visitCount: item.visitCount,
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}

function parseYouTubeTimestamp(timestamp: string): string {
  try {
    // Format: "Mar 15, 2024, 3:42:15 PM PST"
    const date = new Date(timestamp.replace(/\s+(PST|PDT|EST|EDT|CST|CDT|MST|MDT)/, ''));
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // Fall through
  }
  return new Date().toISOString();
}

function convertChromeTimestamp(timestamp: number | string): string {
  try {
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toISOString();
    }
    // Chrome timestamps are in microseconds since Jan 1, 1601
    if (timestamp > 1e15) {
      const epochMicroseconds = timestamp - 11644473600000000;
      return new Date(epochMicroseconds / 1000).toISOString();
    }
    // Already in milliseconds
    return new Date(timestamp).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function isInternalUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.startsWith('chrome://') ||
    lowerUrl.startsWith('chrome-extension://') ||
    lowerUrl.startsWith('about:') ||
    lowerUrl.startsWith('file://') ||
    lowerUrl.startsWith('data:') ||
    lowerUrl.includes('google.com/search') ||
    lowerUrl.includes('google.com/url') ||
    lowerUrl.includes('accounts.google.com') ||
    lowerUrl.includes('mail.google.com') ||
    lowerUrl.includes('drive.google.com') ||
    lowerUrl.includes('docs.google.com') ||
    lowerUrl.includes('calendar.google.com') ||
    lowerUrl.includes('localhost')
  );
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown';
  }
}
