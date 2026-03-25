const READWISE_API_BASE = 'https://readwise.io/api/v2';

export interface ReadwiseHighlight {
  id: number;
  text: string;
  note: string;
  location: number;
  location_type: string;
  highlighted_at: string;
  url: string | null;
  color: string;
  updated: string;
  book_id: number;
  tags: Array<{ id: number; name: string }>;
}

export interface ReadwiseBook {
  id: number;
  title: string;
  author: string;
  category: string;
  source: string;
  num_highlights: number;
  last_highlight_at: string;
  updated: string;
  cover_image_url: string;
  highlights_url: string;
  source_url: string | null;
  asin: string | null;
  tags: Array<{ id: number; name: string }>;
}

export interface ReadwiseExportResponse {
  count: number;
  nextPageCursor: string | null;
  results: ReadwiseBook[];
}

export class ReadwiseClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${READWISE_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Token ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Readwise API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.request('/auth/');
      return true;
    } catch {
      return false;
    }
  }

  async getBooks(params: {
    page_size?: number;
    page?: number;
    category?: string;
    source?: string;
    updated_after?: string;
  } = {}): Promise<{ count: number; results: ReadwiseBook[] }> {
    const searchParams = new URLSearchParams();
    if (params.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.category) searchParams.set('category', params.category);
    if (params.source) searchParams.set('source', params.source);
    if (params.updated_after) searchParams.set('updated__gt', params.updated_after);

    const query = searchParams.toString();
    return this.request(`/books/${query ? `?${query}` : ''}`);
  }

  async getHighlights(params: {
    page_size?: number;
    page?: number;
    book_id?: number;
    updated_after?: string;
  } = {}): Promise<{ count: number; results: ReadwiseHighlight[] }> {
    const searchParams = new URLSearchParams();
    if (params.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.book_id) searchParams.set('book_id', params.book_id.toString());
    if (params.updated_after) searchParams.set('updated__gt', params.updated_after);

    const query = searchParams.toString();
    return this.request(`/highlights/${query ? `?${query}` : ''}`);
  }

  async exportAll(updatedAfter?: string): Promise<ReadwiseBook[]> {
    const allBooks: ReadwiseBook[] = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
      const response = await this.getBooks({
        page,
        page_size: pageSize,
        updated_after: updatedAfter,
      });

      allBooks.push(...response.results);

      if (response.results.length < pageSize) {
        break;
      }
      page++;
    }

    return allBooks;
  }
}

export function mapReadwiseToSource(book: ReadwiseBook): {
  url: string;
  title: string;
  contentType: string;
  surface: string;
  consumedAt: string;
  metadata: Record<string, unknown>;
} {
  const categoryToContentType: Record<string, string> = {
    articles: 'article',
    books: 'book',
    tweets: 'thread',
    podcasts: 'audio',
    supplementals: 'article',
  };

  return {
    url: book.source_url || `https://readwise.io/bookreview/${book.id}`,
    title: book.title,
    contentType: categoryToContentType[book.category] || 'article',
    surface: 'readwise_import',
    consumedAt: book.last_highlight_at || book.updated,
    metadata: {
      author: book.author,
      source: book.source,
      highlightCount: book.num_highlights,
      readwiseBookId: book.id,
      coverImage: book.cover_image_url,
      tags: book.tags.map(t => t.name),
    },
  };
}
