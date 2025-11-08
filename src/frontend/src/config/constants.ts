// Cache-busting timestamp for logo assets
// Update this timestamp whenever logo files change to force browser refresh
export const LOGO_VERSION = '20251108160700'; // YYYYMMDDHHMMSS - FRESH BUILD - All old logos removed

// Logo paths with cache-busting
export const LOGO_PATHS = {
  main: `/icons/meetcute-logo-new.png?v=${LOGO_VERSION}`,
  favicon: `/icons/meetcute-logo-new.png?v=${LOGO_VERSION}`,
  ogImage: `/icons/icon-512x512.png?v=${LOGO_VERSION}`,
  icon192: `/icons/icon-192x192.png?v=${LOGO_VERSION}`,
  icon512: `/icons/icon-512x512.png?v=${LOGO_VERSION}`,
};

