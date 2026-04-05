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

/**
 * Parse YouTube watch history from Takeout HTML file.
 * The HTML structure has divs with class "content-cell" containing video info.
 */
export function parseYouTubeWatchHistory(html: string): YouTubeWatchItem[] {
  const items: YouTubeWatchItem[] = [];
  
  // Match video entries - YouTube Takeout uses a specific HTML structure
  // Each entry has: video link, channel link, and timestamp
  const entryRegex = /<div class="content-cell[^"]*"[^>]*>[\s\S]*?<a href="(https:\/\/www\.youtube\.com\/watch\?v=[^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?(?:<a href="(https:\/\/www\.youtube\.com\/channel\/[^"]+)"[^>]*>([^<]+)<\/a>)?[\s\S]*?<br\s*\/?>[\s\S]*?(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2}[^<]*)<\/div>/gi;

  let match;
  while ((match = entryRegex.exec(html)) !== null) {
    const [, videoUrl, title, channelUrl, channelName, timestamp] = match;
    
    if (videoUrl && title) {
      items.push({
        title: decodeHtmlEntities(title.trim()),
        url: videoUrl,
        channelName: channelName ? decodeHtmlEntities(channelName.trim()) : 'Unknown Channel',
        channelUrl: channelUrl || null,
        watchedAt: parseYouTubeTimestamp(timestamp),
      });
    }
  }

  // Fallback: simpler pattern for different Takeout formats
  if (items.length === 0) {
    const simpleRegex = /Watched\s+<a[^>]*href="(https:\/\/www\.youtube\.com\/watch\?v=[^"]+)"[^>]*>([^<]+)<\/a>/gi;
    const timeRegex = /(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2})/gi;
    
    const videoMatches = [...html.matchAll(simpleRegex)];
    const timeMatches = [...html.matchAll(timeRegex)];
    
    for (let i = 0; i < videoMatches.length; i++) {
      const [, url, title] = videoMatches[i];
      const timestamp = timeMatches[i]?.[1] || new Date().toISOString();
      
      items.push({
        title: decodeHtmlEntities(title.trim()),
        url,
        channelName: 'Unknown Channel',
        channelUrl: null,
        watchedAt: parseYouTubeTimestamp(timestamp),
      });
    }
  }

  return items;
}

/**
 * Parse Chrome browsing history from Takeout JSON file.
 */
export function parseChromeHistory(jsonString: string): ChromeHistoryItem[] {
  const items: ChromeHistoryItem[] = [];
  
  try {
    const data = JSON.parse(jsonString);
    
    // Handle both possible formats
    const browserHistory = data['Browser History'] || data.browser_history || data;
    
    if (Array.isArray(browserHistory)) {
      for (const entry of browserHistory) {
        const url = entry.url || entry.page_url;
        const title = entry.title || entry.page_title || 'Untitled';
        const timestamp = entry.time_usec || entry.last_visit_time || entry.time;
        const visitCount = entry.visit_count || 1;
        
        if (url && !isInternalUrl(url)) {
          items.push({
            title: title.trim(),
            url,
            visitedAt: timestamp ? convertChromeTimestamp(timestamp) : new Date().toISOString(),
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
  
  // YouTube videos
  if (lowerUrl.includes('youtube.com/watch') || lowerUrl.includes('youtu.be/')) {
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
