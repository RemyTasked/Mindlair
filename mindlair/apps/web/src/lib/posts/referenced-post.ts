import db from '@/lib/db';

/** Prisma select fragment for API responses */
export const referencedPostSelect = {
  id: true,
  headlineClaim: true,
  publishedAt: true,
  author: { select: { id: true, name: true, avatarUrl: true } },
} as const;

export type ReferencedPostSummary = {
  id: string;
  headlineClaim: string;
  publishedAt: string | null;
  author: { id: string; name: string | null; avatarUrl: string | null };
};

type ReferencedRow = {
  id: string;
  headlineClaim: string;
  publishedAt: Date | null;
  author: { id: string; name: string | null; avatarUrl: string | null };
};

export function serializeReferencedPost(
  post: ReferencedRow | null,
): ReferencedPostSummary | null {
  if (!post) return null;
  return {
    id: post.id,
    headlineClaim: post.headlineClaim,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    author: post.author,
  };
}

/** Prepends referenced-post context for claim extraction (not stored on the post body). */
export function buildExtractionTextForPublish(
  body: string,
  ref: { headlineClaim: string; topicTags: string[] } | null,
): string {
  if (!ref) return body;
  const tags =
    ref.topicTags?.length > 0
      ? ` Related topics from the referenced post: ${ref.topicTags.slice(0, 8).join(', ')}.`
      : '';
  return `This post responds to an earlier claim: "${ref.headlineClaim}".${tags}\n\n---\n\n${body}`;
}

/**
 * Validates that the current user may set this reference on a draft.
 * Pass `null` or `''` to clear the reference.
 */
export async function validateReferencedPostId(
  referencedPostId: string | null,
  viewerId: string,
  draftPostId?: string,
): Promise<{ ok: true; id: string | null } | { ok: false; message: string; status: number }> {
  if (referencedPostId === null || referencedPostId === '') {
    return { ok: true, id: null };
  }

  if (draftPostId && referencedPostId === draftPostId) {
    return { ok: false, message: 'A post cannot reference itself', status: 400 };
  }

  const target = await db.post.findUnique({
    where: { id: referencedPostId },
    select: { id: true, status: true, authorId: true },
  });

  if (!target) {
    return { ok: false, message: 'Referenced post not found', status: 404 };
  }

  if (target.status !== 'published') {
    return { ok: false, message: 'You can only reference published posts', status: 400 };
  }

  if (viewerId !== target.authorId) {
    const blocked = await db.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: target.authorId,
          blockedId: viewerId,
        },
      },
    });
    if (blocked) {
      return { ok: false, message: 'You cannot reference this post', status: 403 };
    }
  }

  return { ok: true, id: referencedPostId };
}
