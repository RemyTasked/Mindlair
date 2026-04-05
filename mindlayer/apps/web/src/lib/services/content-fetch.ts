interface FetchedContent {
  title: string;
  text: string;
  author?: string;
  publishedAt?: string;
  wordCount: number;
  outlet?: string;
}

export async function fetchArticleContent(url: string): Promise<FetchedContent | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Mindlair/1.0; +https://mindlair.app)',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    return parseHtmlContent(html, url);
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error);
    return null;
  }
}

function parseHtmlContent(html: string, url: string): FetchedContent {
  const title = extractMetaOrTag(html, [
    /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
    /<meta[^>]*name="twitter:title"[^>]*content="([^"]+)"/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ]) || url;

  const text = extractArticleText(html);
  
  const author = extractMetaOrTag(html, [
    /<meta[^>]*name="author"[^>]*content="([^"]+)"/i,
    /<meta[^>]*property="article:author"[^>]*content="([^"]+)"/i,
    /<a[^>]*rel="author"[^>]*>([^<]+)<\/a>/i,
  ]);

  const publishedAt = extractMetaOrTag(html, [
    /<meta[^>]*property="article:published_time"[^>]*content="([^"]+)"/i,
    /<time[^>]*datetime="([^"]+)"/i,
  ]);

  const outlet = extractMetaOrTag(html, [
    /<meta[^>]*property="og:site_name"[^>]*content="([^"]+)"/i,
  ]) || new URL(url).hostname.replace('www.', '');

  return {
    title: cleanText(title),
    text: cleanText(text),
    author: author ? cleanText(author) : undefined,
    publishedAt,
    wordCount: text.split(/\s+/).length,
    outlet,
  };
}

function extractMetaOrTag(html: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }
  return undefined;
}

function extractArticleText(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');

  const articleMatch = text.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    text = articleMatch[1];
  } else {
    const mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) {
      text = mainMatch[1];
    }
  }

  const paragraphs: string[] = [];
  const pMatches = text.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  for (const match of pMatches) {
    const pText = match[1].replace(/<[^>]+>/g, '').trim();
    if (pText.length > 50) {
      paragraphs.push(pText);
    }
  }

  if (paragraphs.length === 0) {
    text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.slice(0, 10000);
  }

  return paragraphs.join('\n\n').slice(0, 10000);
}

function cleanText(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char);
  }

  result = result.replace(/&#(\d+);/g, (_, code) => 
    String.fromCharCode(parseInt(code, 10))
  );

  return result;
}
