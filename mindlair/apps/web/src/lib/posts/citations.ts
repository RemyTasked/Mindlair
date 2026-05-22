/**
 * Helpers for validating and serializing PostCitation records.
 */

export interface CitationInput {
  url: string;
  title?: string | null;
  author?: string | null;
  outlet?: string | null;
  excerpt?: string | null;
  contentType?: string | null;
}

export interface CitationOutput {
  id: string;
  url: string;
  title: string | null;
  author: string | null;
  outlet: string | null;
  excerpt: string | null;
  contentType: string;
  position: number;
}

const VALID_CONTENT_TYPES = new Set([
  'article',
  'video',
  'podcast',
  'paper',
  'book',
  'other',
]);

const MAX_CITATIONS = 20;
const MAX_URL_LEN = 2000;
const MAX_TITLE_LEN = 300;
const MAX_AUTHOR_LEN = 200;
const MAX_OUTLET_LEN = 200;
const MAX_EXCERPT_LEN = 1000;

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeOptional(
  value: string | null | undefined,
  maxLen: number
): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLen);
}

export function validateCitations(
  raw: unknown
): { ok: true; citations: Array<Required<CitationInput> & { position: number }> } | { ok: false; message: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, message: 'citations must be an array' };
  }

  if (raw.length > MAX_CITATIONS) {
    return { ok: false, message: `Too many citations (max ${MAX_CITATIONS})` };
  }

  const citations: Array<Required<CitationInput> & { position: number }> = [];

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as Record<string, unknown>;
    if (!item || typeof item !== 'object') {
      return { ok: false, message: `Citation ${i + 1} is invalid` };
    }

    const url = typeof item.url === 'string' ? item.url.trim() : '';
    if (!url) {
      return { ok: false, message: `Citation ${i + 1} requires a URL` };
    }
    if (url.length > MAX_URL_LEN) {
      return { ok: false, message: `Citation ${i + 1} URL is too long` };
    }
    if (!isValidUrl(url)) {
      return { ok: false, message: `Citation ${i + 1} URL is invalid` };
    }

    const rawType = typeof item.contentType === 'string' ? item.contentType.trim() : '';
    const contentType = VALID_CONTENT_TYPES.has(rawType) ? rawType : 'article';

    citations.push({
      url,
      title: sanitizeOptional(item.title as string | null | undefined, MAX_TITLE_LEN),
      author: sanitizeOptional(item.author as string | null | undefined, MAX_AUTHOR_LEN),
      outlet: sanitizeOptional(item.outlet as string | null | undefined, MAX_OUTLET_LEN),
      excerpt: sanitizeOptional(item.excerpt as string | null | undefined, MAX_EXCERPT_LEN),
      contentType,
      position: i,
    });
  }

  return { ok: true, citations };
}

interface RawCitation {
  id: string;
  url: string;
  title: string | null;
  author: string | null;
  outlet: string | null;
  excerpt: string | null;
  contentType: string;
  position: number;
}

export function serializeCitation(c: RawCitation): CitationOutput {
  return {
    id: c.id,
    url: c.url,
    title: c.title,
    author: c.author,
    outlet: c.outlet,
    excerpt: c.excerpt,
    contentType: c.contentType,
    position: c.position,
  };
}
