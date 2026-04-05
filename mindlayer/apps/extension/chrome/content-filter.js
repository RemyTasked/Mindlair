/**
 * NSFW content filter for the browser extension.
 * Mirrors the server-side filter in apps/web/src/lib/services/content-filter.ts
 */

const BLOCKED_DOMAINS = [
  "pornhub.com","xvideos.com","xnxx.com","xhamster.com","redtube.com",
  "youporn.com","spankbang.com","tube8.com","beeg.com","brazzers.com",
  "bangbros.com","realitykings.com","naughtyamerica.com","mofos.com",
  "twistys.com","babes.com","digitalplayground.com","kink.com","eporner.com",
  "tnaflix.com","drtuber.com","txxx.com","hclips.com","porntrex.com",
  "fuq.com","4tube.com","sexvid.xxx","sex.com","youjizz.com","pornone.com",
  "thumbzilla.com","porn.com","porntube.com","xtube.com","cam4.com",
  "chaturbate.com","livejasmin.com","bongacams.com","stripchat.com",
  "myfreecams.com","camsoda.com","onlyfans.com","fansly.com","manyvids.com",
  "clips4sale.com","iwara.tv","hentaihaven.xxx","hanime.tv","nhentai.net",
  "rule34.xxx","e-hentai.org","gelbooru.com","danbooru.donmai.us",
  "literotica.com","fapello.com","coomer.su","motherless.com","efukt.com",
  "heavy-r.com","bestgore.fun",
];

const BLOCKED_PATH_PATTERNS = [
  /\/porn\b/i, /\/xxx\b/i, /\/nsfw\b/i, /\/adult[_-]?video/i,
  /\/hentai\b/i, /\/erotic/i, /\/(cam|live)[-_]?girls/i, /\/escort/i,
];

// Skip non-content pages
const SKIP_URL_PREFIXES = [
  "chrome://", "chrome-extension://", "about:", "moz-extension://",
  "edge://", "brave://", "opera://", "vivaldi://", "file://",
  "devtools://", "view-source:", "data:",
];

function isInternalUrl(url) {
  const lower = url.toLowerCase();
  return SKIP_URL_PREFIXES.some(p => lower.startsWith(p));
}

function isUrlBlocked(url) {
  if (isInternalUrl(url)) return true;

  try {
    const { hostname, pathname, search } = new URL(url);
    const host = hostname.toLowerCase();

    for (const domain of BLOCKED_DOMAINS) {
      if (host === domain || host.endsWith("." + domain)) return true;
    }

    const fullPath = (pathname + search).toLowerCase();
    for (const pattern of BLOCKED_PATH_PATTERNS) {
      if (pattern.test(fullPath)) return true;
    }
  } catch {
    return true;
  }

  return false;
}

// Exported for use by background.js and content.js
if (typeof globalThis !== "undefined") {
  globalThis.MindlairFilter = { isUrlBlocked, isInternalUrl, BLOCKED_DOMAINS };
}
