// Cache-busting timestamp for logo assets
// Update this timestamp whenever logo files change to force browser refresh
export const LOGO_VERSION = '20251118010000'; // YYYYMMDDHHMMSS - Regenerated all PNG icons from teal SVG

// Logo paths - using M logo with circle
export const LOGO_PATHS = {
  main: `/icons/meetcute-logo.png?v=${LOGO_VERSION}`,
  favicon: `/favicon.png?v=${LOGO_VERSION}`,
  ogImage: `/og-image.png?v=${LOGO_VERSION}`,
  icon192: `/icons/icon-192x192.png?v=${LOGO_VERSION}`,
  icon512: `/icons/icon-512x512.png?v=${LOGO_VERSION}`,
};

