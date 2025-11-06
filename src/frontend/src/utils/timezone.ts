/**
 * Timezone Utilities
 * 
 * Detects and manages user timezone for accurate scheduling
 */

/**
 * Get the user's IANA timezone (e.g., "America/New_York", "Europe/London")
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Failed to detect timezone:', error);
    return 'America/New_York'; // Fallback
  }
}

/**
 * Get a human-readable timezone display (e.g., "EST (UTC-5)")
 */
export function getTimezoneDisplay(): string {
  const timezone = getUserTimezone();
  const offset = new Date().getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset <= 0 ? '+' : '-';
  
  return `${timezone} (UTC${sign}${hours}${minutes > 0 ? `:${minutes}` : ''})`;
}

/**
 * Check if the user's timezone has changed and needs updating
 */
export function hasTimezoneChanged(savedTimezone: string): boolean {
  const currentTimezone = getUserTimezone();
  return currentTimezone !== savedTimezone;
}

