/**
 * RSS / Atom feed parser and sync service.
 * No external dependencies — uses native fetch + regex/XML parsing.
 */

export interface FeedItem {
  title: string;
  url: string;
  author?: string;
  publishedAt?: string;
  description?: string;
  contentType: string;
}

export interface FeedMeta {
  title: string;
  siteUrl: string;
  description?: string;
}

export interface ParsedFeed {
  meta: FeedMeta;
  items: FeedItem[];
}

export async function fetchAndParseFeed(feedUrl: string): Promise<ParsedFeed> {
  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Mindlayer/1.0 (+https://mindlayer.app)',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();

  if (xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"')) {
    return parseAtom(xml);
  }
  return parseRSS(xml);
}

function parseRSS(xml: string): ParsedFeed {
  const channelTitle = extractTag(xml, 'channel', 'title') || 'Unknown Feed';
  const channelLink = extractTag(xml, 'channel', 'link') || '';
  const channelDesc = extractTag(xml, 'channel', 'description');

  const items: FeedItem[] = [];
  const itemBlocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];

  for (const block of itemBlocks) {
    const title = extractSimpleTag(block, 'title') || '';
    const link = extractSimpleTag(block, 'link') || '';
    const author = extractSimpleTag(block, 'dc:creator') || extractSimpleTag(block, 'author') || '';
    const pubDate = extractSimpleTag(block, 'pubDate');
    const description = extractSimpleTag(block, 'description');
    const enclosureType = block.match(/<enclosure[^>]*type="([^"]+)"/i)?.[1] || '';

    if (!link) continue;

    items.push({
      title: decodeEntities(title),
      url: link.trim(),
      author: author ? decodeEntities(author) : undefined,
      publishedAt: pubDate ? tryParseDate(pubDate) : undefined,
      description: description ? decodeEntities(description).slice(0, 500) : undefined,
      contentType: guessContentType(enclosureType, link, title),
    });
  }

  return {
    meta: { title: decodeEntities(channelTitle), siteUrl: channelLink, description: channelDesc ? decodeEntities(channelDesc) : undefined },
    items,
  };
}

function parseAtom(xml: string): ParsedFeed {
  const feedTitle = extractSimpleTag(xml.split(/<entry/i)[0], 'title') || 'Unknown Feed';
  const feedLink = xml.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i)?.[1]
    || xml.match(/<link[^>]*href="([^"]+)"/i)?.[1]
    || '';

  const items: FeedItem[] = [];
  const entryBlocks = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];

  for (const block of entryBlocks) {
    const title = extractSimpleTag(block, 'title') || '';
    const link = block.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i)?.[1]
      || block.match(/<link[^>]*href="([^"]+)"/i)?.[1]
      || '';
    const author = extractSimpleTag(block, 'name');
    const updated = extractSimpleTag(block, 'updated') || extractSimpleTag(block, 'published');

    if (!link) continue;

    items.push({
      title: decodeEntities(title),
      url: link.trim(),
      author: author ? decodeEntities(author) : undefined,
      publishedAt: updated ? tryParseDate(updated) : undefined,
      contentType: guessContentType('', link, title),
    });
  }

  return {
    meta: { title: decodeEntities(feedTitle), siteUrl: feedLink },
    items,
  };
}

function guessContentType(mimeType: string, url: string, title: string): string {
  const lower = (mimeType + url + title).toLowerCase();
  if (mimeType.startsWith('audio/') || lower.includes('podcast') || lower.includes('episode')) return 'podcast';
  if (mimeType.startsWith('video/') || lower.includes('youtube.com') || lower.includes('vimeo.com')) return 'video';
  return 'article';
}

// ── XML helpers ───────────────────────────────────────────────────

function extractTag(xml: string, parent: string, tag: string): string | undefined {
  const parentBlock = xml.match(new RegExp(`<${parent}[\\s>][\\s\\S]*?</${parent}>`, 'i'));
  if (!parentBlock) return undefined;
  return extractSimpleTag(parentBlock[0], tag);
}

function extractSimpleTag(xml: string, tag: string): string | undefined {
  // Handle CDATA
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i'));
  if (cdataMatch) return cdataMatch[1].trim();

  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? match[1].trim() : undefined;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, '')
    .trim();
}

function tryParseDate(str: string): string | undefined {
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
  } catch {
    return undefined;
  }
}

export function mapFeedItemToSource(item: FeedItem, feedTitle: string): {
  url: string;
  title: string;
  contentType: string;
  surface: string;
  consumedAt: string;
  metadata: Record<string, unknown>;
} {
  return {
    url: item.url,
    title: item.title || item.url,
    contentType: item.contentType,
    surface: 'rss_feed',
    consumedAt: item.publishedAt || new Date().toISOString(),
    metadata: {
      author: item.author,
      outlet: feedTitle,
      publishedAt: item.publishedAt,
      description: item.description,
    },
  };
}
