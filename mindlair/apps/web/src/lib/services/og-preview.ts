export interface OGPreview {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url?: string;
}

const CACHE = new Map<string, { preview: OGPreview; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function extractMeta(
  html: string,
  attr: 'property' | 'name',
  value: string
): string | undefined {
  // Match <meta ... attr="value" ... content="..." ...> in either attribute order
  const patterns = [
    new RegExp(
      `<meta[^>]*\\b${attr}\\s*=\\s*["']${value}["'][^>]*\\bcontent\\s*=\\s*["']([^"']*)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]*\\bcontent\\s*=\\s*["']([^"']*)["'][^>]*\\b${attr}\\s*=\\s*["']${value}["']`,
      'i'
    ),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]).trim();
    }
  }

  return undefined;
}

function extractTitle(html: string): string | undefined {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (match?.[1]) {
    return decodeHtmlEntities(match[1]).trim().replace(/\s+/g, ' ');
  }
  return undefined;
}

export async function fetchOGPreview(url: string): Promise<OGPreview> {
  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.preview;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Mindlair/1.0; +https://mindlair.com)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {};
    }

    const fullHtml = await response.text();
    // Only the <head> matters for OG metadata; cap length to avoid huge bodies.
    const headMatch = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(fullHtml);
    const html = (headMatch?.[1] || fullHtml).slice(0, 200_000);

    const preview: OGPreview = {
      title:
        extractMeta(html, 'property', 'og:title') ||
        extractMeta(html, 'name', 'twitter:title') ||
        extractTitle(html),
      description:
        extractMeta(html, 'property', 'og:description') ||
        extractMeta(html, 'name', 'twitter:description') ||
        extractMeta(html, 'name', 'description'),
      image:
        extractMeta(html, 'property', 'og:image') ||
        extractMeta(html, 'name', 'twitter:image'),
      siteName:
        extractMeta(html, 'property', 'og:site_name') ||
        (() => {
          try {
            return new URL(url).hostname.replace('www.', '');
          } catch {
            return undefined;
          }
        })(),
      url: extractMeta(html, 'property', 'og:url') || url,
    };

    if (preview.image && !preview.image.startsWith('http')) {
      try {
        const baseUrl = new URL(url);
        preview.image = new URL(preview.image, baseUrl.origin).toString();
      } catch {
        preview.image = undefined;
      }
    }

    CACHE.set(url, { preview, timestamp: Date.now() });
    return preview;
  } catch (error) {
    console.error('OG preview fetch error:', error);
    return {
      siteName: (() => {
        try {
          return new URL(url).hostname.replace('www.', '');
        } catch {
          return undefined;
        }
      })(),
      url,
    };
  }
}
