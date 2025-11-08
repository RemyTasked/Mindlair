// Cache-busting timestamp for logo assets
// Update this timestamp whenever logo files change to force browser refresh
export const LOGO_VERSION = '20251108172500'; // YYYYMMDDHHMMSS - New filename to bypass iOS cache

// Logo paths - using completely new filename iOS has never cached
export const LOGO_PATHS = {
  main: `/icons/meetcute-clapperboard-v2.png`,
  favicon: `/favicon.png?v=${LOGO_VERSION}`,
  ogImage: `/og-image.png?v=${LOGO_VERSION}`,
  icon192: `/icons/icon-192x192.png?v=${LOGO_VERSION}`,
  icon512: `/icons/icon-512x512.png?v=${LOGO_VERSION}`,
};

