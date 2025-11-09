// Cache-busting timestamp for logo assets
// Update this timestamp whenever logo files change to force browser refresh
export const LOGO_VERSION = '20251108190651'; // YYYYMMDDHHMMSS - Meet Cute clapperboard v3

// Logo paths - using completely new filename (v3) to bypass iOS cache
export const LOGO_PATHS = {
  main: `/icons/meetcute-logo-v3.png`,
  favicon: `/favicon.png?v=${LOGO_VERSION}`,
  ogImage: `/og-image.png?v=${LOGO_VERSION}`,
  icon192: `/icons/icon-192x192.png?v=${LOGO_VERSION}`,
  icon512: `/icons/icon-512x512.png?v=${LOGO_VERSION}`,
};

