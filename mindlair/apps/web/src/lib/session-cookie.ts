/**
 * Session cookie name.
 * Note: We avoid __Host- prefix to allow the cookie to persist across
 * different browser contexts (PWA home screen, Safari, in-app browsers).
 * Security is maintained via httpOnly, secure, and sameSite attributes.
 */
export const SESSION_COOKIE_NAME = 'mindlair_session';
