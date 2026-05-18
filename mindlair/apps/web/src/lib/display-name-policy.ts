const MIN_LEN = 2;
const MAX_LEN = 60;

/**
 * Neutral fallback shown wherever a user has no display name yet (legacy
 * accounts, unset profile, etc). The word "Anonymous" is intentionally
 * reserved by `validateDisplayNameInput` so we never want it leaking into the
 * UI as a system placeholder — pick something obviously branded instead.
 */
export const UNSET_DISPLAY_NAME_FALLBACK = 'Mindlair user';

export type DisplayNameValidation =
  | { ok: true; normalized: string }
  | { ok: false; message: string };

/**
 * Validates a display name the user is saving in Settings.
 * Rejects empty, too short, reserved labels, and @ (no emails as public name).
 *
 * Pure function — safe to call from both client and server.
 */
export function validateDisplayNameInput(raw: string): DisplayNameValidation {
  const v = raw.trim();
  if (v.length < MIN_LEN) {
    return {
      ok: false,
      message: `Display name must be at least ${MIN_LEN} characters.`,
    };
  }
  if (v.length > MAX_LEN) {
    return {
      ok: false,
      message: `Display name must be at most ${MAX_LEN} characters.`,
    };
  }
  if (v.includes('@')) {
    return { ok: false, message: 'Display name cannot contain @.' };
  }
  if (v.toLowerCase() === 'anonymous') {
    return {
      ok: false,
      message: '"Anonymous" is reserved. Choose a different display name.',
    };
  }
  return { ok: true, normalized: v };
}

/** Whether the user may appear publicly (comments, publish, feed as author). */
export function hasPublicDisplayName(name: string | null | undefined): boolean {
  return validateDisplayNameInput(name ?? '').ok;
}

/**
 * Resolves the label to render anywhere we display a user-facing name.
 * Falls back to a neutral, branded placeholder for unset/invalid names so the
 * UI never collides with the reserved word "Anonymous".
 */
export function formatPublicName(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  return trimmed.length > 0 ? trimmed : UNSET_DISPLAY_NAME_FALLBACK;
}
