/**
 * Readwise integration.
 * Uses Readwise API v2 with personal access token.
 * Fetches highlights grouped by book/article, maps them to sources.
 */

const READWISE_API_BASE = 'https://readwise.io/api/v2';

export interface ReadwiseBook {
  id: number;
  title: string;
  author: string;
  category: string; // books, articles, tweets, supplementals, podcasts
  source: string; // kindle, instapaper, pocket, etc.
  sourceUrl: string | null;
  numHighlights: number;
  lastHighlightAt: string | null;
  updatedAt: string;
  coverImageUrl: string | null;
}

export interface ReadwiseHighlight {
  id: number;
  text: string;
  note: string;
  location: number;
  locationType: string;
  bookId: number;
  url: string | null;
  highlightedAt: string;
  updatedAt: string;
}

export async function verifyReadwiseToken(token: string): Promise<boolean> {
  const response = await fetch(`${READWISE_API_BASE}/auth/`, {
    headers: { 'Authorization': `Token ${token}` },
  });
  return response.ok;
}

export async function fetchReadwiseBooks(
  token: string,
  updatedAfter?: string,
): Promise<ReadwiseBook[]> {
  const books: ReadwiseBook[] = [];
  let nextUrl: string | null = `${READWISE_API_BASE}/books/`;

  if (updatedAfter) {
    nextUrl += `?updated__gt=${updatedAfter}`;
  }

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: { 'Authorization': `Token ${token}` },
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('INVALID_TOKEN');
      throw new Error(`Readwise API error: ${response.status}`);
    }

    const data = await response.json();

    for (const book of data.results || []) {
      books.push({
        id: book.id,
        title: book.title || 'Untitled',
        author: book.author || '',
        category: book.category || 'articles',
        source: book.source || '',
        sourceUrl: book.source_url || null,
        numHighlights: book.num_highlights || 0,
        lastHighlightAt: book.last_highlight_at || null,
        updatedAt: book.updated,
        coverImageUrl: book.cover_image_url || null,
      });
    }

    nextUrl = data.next;
  }

  return books;
}

export async function fetchReadwiseHighlights(
  token: string,
  bookId: number,
): Promise<ReadwiseHighlight[]> {
  const highlights: ReadwiseHighlight[] = [];
  let nextUrl: string | null = `${READWISE_API_BASE}/highlights/?book_id=${bookId}`;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: { 'Authorization': `Token ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Readwise API error: ${response.status}`);
    }

    const data = await response.json();

    for (const h of data.results || []) {
      highlights.push({
        id: h.id,
        text: h.text || '',
        note: h.note || '',
        location: h.location || 0,
        locationType: h.location_type || '',
        bookId: h.book_id,
        url: h.url || null,
        highlightedAt: h.highlighted_at || h.created_at || '',
        updatedAt: h.updated,
      });
    }

    nextUrl = data.next;
  }

  return highlights;
}

export function mapReadwiseBookToSource(book: ReadwiseBook) {
  const contentType = categoryToContentType(book.category);
  const url = book.sourceUrl || `https://readwise.io/bookreview/${book.id}`;

  return {
    url,
    title: book.title,
    contentType,
    surface: 'readwise_import' as const,
    consumedAt: book.lastHighlightAt || book.updatedAt,
    metadata: {
      author: book.author,
      outlet: book.source || 'Readwise',
    },
  };
}

function categoryToContentType(category: string): string {
  switch (category) {
    case 'books': return 'book';
    case 'podcasts': return 'podcast';
    case 'tweets': return 'thread';
    case 'articles':
    case 'supplementals':
    default:
      return 'article';
  }
}
