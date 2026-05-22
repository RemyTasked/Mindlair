import Anthropic from '@anthropic-ai/sdk';

interface ExtractedSourceInfo {
  kind: 'podcast' | 'article' | 'video' | 'book' | 'person' | 'unknown';
  title?: string;
  person?: string;
  outlet?: string;
  confidence: number;
}

interface ResolvedSource {
  url?: string;
  title: string;
  outlet?: string;
  contentType: string;
  resolved: boolean;
}

const FAST_MODEL = 'claude-haiku-35-20241022';

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }
  return anthropicClient;
}

const SOURCE_EXTRACTION_PROMPT = `You are an expert at identifying source references in spoken language.

Given a transcript snippet, extract any identifiable source mentioned (podcast, article, video, book, person/interview).

Look for patterns like:
- "the Ezra Klein episode about..."
- "that Atlantic piece on..."
- "I heard [person] say..."
- "in [book title]..."
- "that YouTube video about..."

Respond in JSON format:
{
  "found": true/false,
  "kind": "podcast|article|video|book|person|unknown",
  "title": "title or topic mentioned (if any)",
  "person": "person name (if mentioned)",
  "outlet": "outlet/publisher/show name (if mentioned)",
  "confidence": 0.0-1.0
}

If no clear source reference is found, return found: false.`;

export async function extractSourceFromTranscript(
  transcript: string
): Promise<ExtractedSourceInfo | null> {
  if (!transcript || transcript.length < 20) {
    return null;
  }

  try {
    const response = await getAnthropic().messages.create({
      model: FAST_MODEL,
      max_tokens: 300,
      temperature: 0.1,
      system: SOURCE_EXTRACTION_PROMPT,
      messages: [{ role: 'user', content: transcript.slice(0, 2000) }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const result = JSON.parse(text);

    if (!result.found) {
      return null;
    }

    return {
      kind: result.kind || 'unknown',
      title: result.title,
      person: result.person,
      outlet: result.outlet,
      confidence: result.confidence || 0.5,
    };
  } catch (error) {
    console.error('Source extraction error:', error);
    return null;
  }
}

export async function resolveSourceToUrl(
  info: ExtractedSourceInfo
): Promise<string | null> {
  const searchKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchCx = process.env.GOOGLE_SEARCH_CX;

  if (!searchKey || !searchCx) {
    return null;
  }

  const queryParts: string[] = [];
  if (info.title) queryParts.push(info.title);
  if (info.person) queryParts.push(info.person);
  if (info.outlet) queryParts.push(info.outlet);

  const kindModifiers: Record<string, string> = {
    podcast: 'podcast episode',
    article: 'article',
    video: 'video',
    book: 'book',
    person: 'interview',
  };

  if (info.kind !== 'unknown' && kindModifiers[info.kind]) {
    queryParts.push(kindModifiers[info.kind]);
  }

  const query = queryParts.join(' ');
  if (!query.trim()) {
    return null;
  }

  try {
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', searchKey);
    url.searchParams.set('cx', searchCx);
    url.searchParams.set('q', query);
    url.searchParams.set('num', '1');

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error('Google Search error:', response.status);
      return null;
    }

    const data = await response.json();
    const firstResult = data.items?.[0];

    if (firstResult?.link) {
      return firstResult.link;
    }

    return null;
  } catch (error) {
    console.error('Source resolution error:', error);
    return null;
  }
}

export async function resolveSpokenSource(
  transcript: string
): Promise<ResolvedSource | null> {
  const extracted = await extractSourceFromTranscript(transcript);

  if (!extracted || extracted.confidence < 0.3) {
    return null;
  }

  const url = await resolveSourceToUrl(extracted);

  const kindToContentType: Record<string, string> = {
    podcast: 'podcast',
    article: 'article',
    video: 'video',
    book: 'book',
    person: 'article',
    unknown: 'article',
  };

  const title =
    extracted.title ||
    (extracted.person ? `Discussion with ${extracted.person}` : 'Source reference');

  return {
    url: url || undefined,
    title,
    outlet: extracted.outlet,
    contentType: kindToContentType[extracted.kind] || 'article',
    resolved: Boolean(url),
  };
}
