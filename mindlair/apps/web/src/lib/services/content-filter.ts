/**
 * Content filter — blocks explicit/NSFW content from entering the belief graph.
 *
 * Three layers:
 *   1. Domain blocklist  (fast, exact or suffix match)
 *   2. URL path patterns  (regex on path/query)
 *   3. Title / text keyword scan  (tokenized, case-insensitive)
 *
 * Returns { blocked: true, reason } or { blocked: false }.
 */

// ── 1. Domain blocklist ──────────────────────────────────────────────
// Suffixes: matches "foo.pornhub.com" as well as "pornhub.com"
const BLOCKED_DOMAINS: string[] = [
  "pornhub.com",
  "xvideos.com",
  "xnxx.com",
  "xhamster.com",
  "redtube.com",
  "youporn.com",
  "spankbang.com",
  "tube8.com",
  "beeg.com",
  "brazzers.com",
  "bangbros.com",
  "realitykings.com",
  "naughtyamerica.com",
  "mofos.com",
  "twistys.com",
  "babes.com",
  "digitalplayground.com",
  "kink.com",
  "eporner.com",
  "tnaflix.com",
  "drtuber.com",
  "txxx.com",
  "hclips.com",
  "porntrex.com",
  "fuq.com",
  "4tube.com",
  "sexvid.xxx",
  "sex.com",
  "youjizz.com",
  "pornone.com",
  "thumbzilla.com",
  "porn.com",
  "porntube.com",
  "xtube.com",
  "cam4.com",
  "chaturbate.com",
  "livejasmin.com",
  "bongacams.com",
  "stripchat.com",
  "myfreecams.com",
  "camsoda.com",
  "onlyfans.com",
  "fansly.com",
  "manyvids.com",
  "clips4sale.com",
  "iwara.tv",
  "hentaihaven.xxx",
  "hanime.tv",
  "nhentai.net",
  "rule34.xxx",
  "e-hentai.org",
  "gelbooru.com",
  "danbooru.donmai.us",
  "literotica.com",
  "fapello.com",
  "coomer.su",
  "motherless.com",
  "efukt.com",
  "heavy-r.com",
  "bestgore.fun",
];

// ── 2. URL path patterns ─────────────────────────────────────────────
const BLOCKED_PATH_PATTERNS: RegExp[] = [
  /\/porn\b/i,
  /\/xxx\b/i,
  /\/nsfw\b/i,
  /\/adult[_-]?video/i,
  /\/hentai\b/i,
  /\/erotic/i,
  /\/(cam|live)[-_]?girls/i,
  /\/escort/i,
];

// ── 3. Title / text keywords ─────────────────────────────────────────
// Multi-word phrases checked first (prevents false positives from single words)
const BLOCKED_PHRASES: string[] = [
  "porn video",
  "xxx video",
  "adult video",
  "sex video",
  "sex tape",
  "free porn",
  "live sex",
  "cam girl",
  "cam show",
  "nude video",
  "naked video",
  "erotic video",
  "hentai video",
  "only fans leak",
  "onlyfans leak",
];

// Single keywords — only flag if 2+ appear in the same text
const NSFW_SIGNAL_WORDS: string[] = [
  "pornstar",
  "milf",
  "stepmom",
  "stepsister",
  "creampie",
  "gangbang",
  "blowjob",
  "handjob",
  "threesome",
  "deepthroat",
  "cumshot",
  "orgasm",
  "stripper",
  "escort",
  "dominatrix",
  "fetish",
  "bondage",
  "hentai",
  "nsfw",
  "xxx",
  "xrated",
  "x-rated",
];

// ── Public API ───────────────────────────────────────────────────────

export interface FilterResult {
  blocked: boolean;
  reason?: string;
}

export function isContentExplicit(input: {
  url?: string | null;
  title?: string | null;
  text?: string | null;
}): FilterResult {
  // Layer 1: domain check
  if (input.url) {
    const domainResult = checkDomain(input.url);
    if (domainResult.blocked) return domainResult;

    const pathResult = checkUrlPath(input.url);
    if (pathResult.blocked) return pathResult;
  }

  // Layer 2: title check (stricter — phrases or 2+ signal words)
  if (input.title) {
    const titleResult = checkText(input.title, "title");
    if (titleResult.blocked) return titleResult;
  }

  // Layer 3: body text check (same logic, but only on first 2000 chars for perf)
  if (input.text) {
    const sample = input.text.slice(0, 2000);
    const textResult = checkText(sample, "text");
    if (textResult.blocked) return textResult;
  }

  return { blocked: false };
}

/**
 * Quick URL-only check — used by desktop capture where we don't have
 * title/text yet. Returns the list of blocked domain suffixes for Rust interop.
 */
export function isUrlExplicit(url: string): FilterResult {
  const domainResult = checkDomain(url);
  if (domainResult.blocked) return domainResult;
  return checkUrlPath(url);
}

/**
 * Export the domain list so the desktop Rust code can consume it.
 */
export function getBlockedDomains(): string[] {
  return [...BLOCKED_DOMAINS];
}

// ── Internals ────────────────────────────────────────────────────────

function checkDomain(url: string): FilterResult {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const blocked of BLOCKED_DOMAINS) {
      if (hostname === blocked || hostname.endsWith("." + blocked)) {
        return { blocked: true, reason: `Blocked domain: ${blocked}` };
      }
    }
  } catch {
    // malformed URL — don't block, let downstream handle it
  }
  return { blocked: false };
}

function checkUrlPath(url: string): FilterResult {
  try {
    const { pathname, search } = new URL(url);
    const fullPath = (pathname + search).toLowerCase();
    for (const pattern of BLOCKED_PATH_PATTERNS) {
      if (pattern.test(fullPath)) {
        return { blocked: true, reason: `Blocked URL pattern: ${pattern.source}` };
      }
    }
  } catch {
    // malformed URL
  }
  return { blocked: false };
}

function checkText(text: string, source: string): FilterResult {
  const lower = text.toLowerCase();

  // Phrase match — any single phrase is enough
  for (const phrase of BLOCKED_PHRASES) {
    if (lower.includes(phrase)) {
      return { blocked: true, reason: `Explicit phrase in ${source}: "${phrase}"` };
    }
  }

  // Signal word accumulation — 2+ distinct hits
  let hitCount = 0;
  const hits: string[] = [];
  for (const word of NSFW_SIGNAL_WORDS) {
    if (lower.includes(word)) {
      hitCount++;
      hits.push(word);
      if (hitCount >= 2) {
        return {
          blocked: true,
          reason: `Multiple NSFW signals in ${source}: ${hits.join(", ")}`,
        };
      }
    }
  }

  return { blocked: false };
}
