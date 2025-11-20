// Cache-busting timestamp for icon assets
// Update this timestamp whenever icon files change to force browser refresh
export const LOGO_VERSION = '20251118010000'; // YYYYMMDDHHMMSS - Regenerated all PNG icons from teal SVG

// Icon paths for PWA, favicon, and notifications
// Note: The main logo is now text-based (see components/Logo.tsx)
export const LOGO_PATHS = {
  favicon: `/favicon.png?v=${LOGO_VERSION}`,
  ogImage: `/og-image.png?v=${LOGO_VERSION}`,
  icon192: `/icons/icon-192x192.png?v=${LOGO_VERSION}`,
  icon512: `/icons/icon-512x512.png?v=${LOGO_VERSION}`,
  // Legacy: kept for notification icons
  main: `/icons/icon-192x192.png?v=${LOGO_VERSION}`,
};

