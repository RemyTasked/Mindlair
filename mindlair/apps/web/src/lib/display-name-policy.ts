const MIN_LEN = 2;
const MAX_LEN = 60;

export type DisplayNameValidation =
  | { ok: true; normalized: string }
  | { ok: false; message: string };

/**
 * Validates a display name the user is saving in Settings.
 * Rejects empty, too short, reserved labels, and @ (no emails as public name).
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
