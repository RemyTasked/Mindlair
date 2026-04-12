import { db } from "@/lib/db";

/**
 * Generate a URL-friendly slug from text
 * - Lowercase
 * - Replace spaces and special chars with hyphens
 * - Remove consecutive hyphens
 * - Trim hyphens from start/end
 * - Max 80 characters
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, "") // Trim hyphens from start/end
    .slice(0, 80); // Max length
}

/**
 * Validate a slug format
 * - Only lowercase letters, numbers, and hyphens
 * - Must start with a letter or number
 * - 3-80 characters
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length < 3 || slug.length > 80) {
    return false;
  }
  
  // Must match: starts with alphanumeric, contains only alphanumeric and hyphens
  const slugPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
  return slugPattern.test(slug);
}

/**
 * Check if a slug is available (not used by another post)
 * @param slug - The slug to check
 * @param excludePostId - Optional post ID to exclude (for editing)
 */
export async function isSlugAvailable(
  slug: string,
  excludePostId?: string
): Promise<boolean> {
  const existing = await db.post.findUnique({
    where: { slug },
    select: { id: true },
  });
  
  if (!existing) return true;
  if (excludePostId && existing.id === excludePostId) return true;
  
  return false;
}

/**
 * Generate a unique slug, appending numbers if needed
 * @param baseText - The text to generate slug from
 * @param excludePostId - Optional post ID to exclude (for editing)
 */
export async function generateUniqueSlug(
  baseText: string,
  excludePostId?: string
): Promise<string> {
  const baseSlug = generateSlug(baseText);
  
  // Check if base slug is available
  if (await isSlugAvailable(baseSlug, excludePostId)) {
    return baseSlug;
  }
  
  // Try appending numbers
  for (let i = 2; i <= 100; i++) {
    const numberedSlug = `${baseSlug.slice(0, 75)}-${i}`;
    if (await isSlugAvailable(numberedSlug, excludePostId)) {
      return numberedSlug;
    }
  }
  
  // Fallback: append timestamp
  const timestamp = Date.now().toString(36);
  return `${baseSlug.slice(0, 70)}-${timestamp}`;
}

/**
 * Detect if a string looks like a CUID (used for ID vs slug routing)
 * CUIDs match pattern like "clx1abc..." (25 chars starting with 'c')
 */
export function isCuid(str: string): boolean {
  return /^c[a-z0-9]{24}$/.test(str);
}
