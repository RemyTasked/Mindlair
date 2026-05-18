/**
 * Concept Cleanup Job
 * 
 * Identifies and handles low-quality concepts in the database.
 * Can be run periodically or manually to maintain concept quality.
 */

import db from '@/lib/db';
import { evaluateConceptQuality, normalizeConceptLabel } from '../services/concept-resolver';

interface ConceptAuditResult {
  id: string;
  label: string;
  usageCount: number;
  quality: {
    isValid: boolean;
    score: number;
    reason: string;
  };
}

interface CleanupStats {
  totalConcepts: number;
  lowQualityConcepts: ConceptAuditResult[];
  orphanedConcepts: ConceptAuditResult[];
  suggestedMerges: Array<{
    source: ConceptAuditResult;
    target: string;
    reason: string;
  }>;
}

/**
 * Audits all concepts in the database for quality issues.
 * Returns a report of problematic concepts without making changes.
 */
export async function auditConcepts(): Promise<CleanupStats> {
  const concepts = await db.concept.findMany({
    select: {
      id: true,
      label: true,
      _count: {
        select: {
          claimConcepts: true,
        },
      },
    },
  });

  const stats: CleanupStats = {
    totalConcepts: concepts.length,
    lowQualityConcepts: [],
    orphanedConcepts: [],
    suggestedMerges: [],
  };

  for (const concept of concepts) {
    const quality = evaluateConceptQuality(concept.label);
    const usageCount = concept._count.claimConcepts;

    const result: ConceptAuditResult = {
      id: concept.id,
      label: concept.label,
      usageCount,
      quality,
    };

    if (!quality.isValid) {
      stats.lowQualityConcepts.push(result);
    }

    if (usageCount === 0) {
      stats.orphanedConcepts.push(result);
    }
  }

  // Sort by usage count descending (highest impact first)
  stats.lowQualityConcepts.sort((a, b) => b.usageCount - a.usageCount);
  stats.orphanedConcepts.sort((a, b) => b.usageCount - a.usageCount);

  return stats;
}

/**
 * Deletes orphaned concepts (concepts with no claim links).
 * Safe to run - only removes concepts that aren't being used.
 */
export async function deleteOrphanedConcepts(): Promise<{ deleted: number; labels: string[] }> {
  const orphaned = await db.concept.findMany({
    where: {
      claimConcepts: {
        none: {},
      },
    },
    select: {
      id: true,
      label: true,
    },
  });

  if (orphaned.length === 0) {
    return { deleted: 0, labels: [] };
  }

  const ids = orphaned.map(c => c.id);
  const labels = orphaned.map(c => c.label);

  await db.concept.deleteMany({
    where: {
      id: { in: ids },
    },
  });

  return { deleted: orphaned.length, labels };
}

/**
 * Merges a low-quality concept into a higher-quality one.
 * Updates all claim links to point to the target concept.
 */
export async function mergeConcepts(
  sourceConceptId: string,
  targetConceptId: string
): Promise<{ movedLinks: number }> {
  // Get all claim links for the source concept
  const links = await db.claimConcept.findMany({
    where: { conceptId: sourceConceptId },
  });

  if (links.length === 0) {
    // Just delete the orphaned concept
    await db.concept.delete({ where: { id: sourceConceptId } });
    return { movedLinks: 0 };
  }

  // Check for existing links to avoid duplicates
  const existingTargetLinks = await db.claimConcept.findMany({
    where: { conceptId: targetConceptId },
    select: { claimId: true },
  });
  const existingClaimIds = new Set(existingTargetLinks.map(l => l.claimId));

  let movedLinks = 0;

  for (const link of links) {
    if (existingClaimIds.has(link.claimId)) {
      // Claim already linked to target - just delete the source link
      await db.claimConcept.delete({
        where: {
          claimId_conceptId: {
            claimId: link.claimId,
            conceptId: sourceConceptId,
          },
        },
      });
    } else {
      // Move the link to the target concept
      await db.claimConcept.update({
        where: {
          claimId_conceptId: {
            claimId: link.claimId,
            conceptId: sourceConceptId,
          },
        },
        data: {
          conceptId: targetConceptId,
        },
      });
      movedLinks++;
    }
  }

  // Delete the source concept
  await db.concept.delete({ where: { id: sourceConceptId } });

  return { movedLinks };
}

/**
 * Finds potential merge targets for a low-quality concept.
 * Uses the alias map and similarity to suggest better concepts.
 */
export async function findMergeTarget(
  conceptLabel: string
): Promise<{ conceptId: string; label: string; reason: string } | null> {
  const norm = normalizeConceptLabel(conceptLabel);

  // Check if this concept should map to a known alias
  const ALIAS_MAP: Record<string, string> = {
    'ai': 'artificial intelligence',
    'ml': 'machine learning',
    'llm': 'large language models',
    'llms': 'large language models',
    'gpt': 'large language models',
    'chatgpt': 'large language models',
    'crypto': 'cryptocurrency',
    'bitcoin': 'cryptocurrency',
    'fed': 'monetary policy',
    'federal reserve': 'monetary policy',
  };

  // Check direct alias match
  if (ALIAS_MAP[norm]) {
    const target = await db.concept.findUnique({
      where: { label: ALIAS_MAP[norm] },
    });
    if (target) {
      return {
        conceptId: target.id,
        label: target.label,
        reason: 'alias_match',
      };
    }
  }

  // Check if label contains an alias
  for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
    if (norm.includes(alias) && alias.length >= 3) {
      const target = await db.concept.findUnique({
        where: { label: canonical },
      });
      if (target) {
        return {
          conceptId: target.id,
          label: target.label,
          reason: 'contains_alias',
        };
      }
    }
  }

  return null;
}

/**
 * Runs a full cleanup: audits, deletes orphans, and suggests merges.
 * Use dryRun=true to see what would happen without making changes.
 */
export async function runConceptCleanup(options: {
  dryRun?: boolean;
  deleteOrphans?: boolean;
  autoMerge?: boolean;
} = {}): Promise<{
  audit: CleanupStats;
  deletedOrphans: number;
  mergedConcepts: number;
}> {
  const { dryRun = true, deleteOrphans = true, autoMerge = false } = options;

  // Step 1: Audit
  const audit = await auditConcepts();

  let deletedOrphans = 0;
  let mergedConcepts = 0;

  // Step 2: Delete orphaned concepts (if not dry run)
  if (deleteOrphans && !dryRun) {
    const result = await deleteOrphanedConcepts();
    deletedOrphans = result.deleted;
  } else if (deleteOrphans) {
    deletedOrphans = audit.orphanedConcepts.length;
  }

  // Step 3: Auto-merge low-quality concepts (if enabled and not dry run)
  if (autoMerge && !dryRun) {
    for (const concept of audit.lowQualityConcepts) {
      const target = await findMergeTarget(concept.label);
      if (target) {
        await mergeConcepts(concept.id, target.conceptId);
        mergedConcepts++;
      }
    }
  }

  return {
    audit,
    deletedOrphans,
    mergedConcepts,
  };
}

/**
 * Generates a human-readable cleanup report.
 */
export function formatCleanupReport(stats: CleanupStats): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════════',
    '                    CONCEPT QUALITY AUDIT REPORT',
    '═══════════════════════════════════════════════════════════════════',
    '',
    `Total concepts in database: ${stats.totalConcepts}`,
    `Low-quality concepts found: ${stats.lowQualityConcepts.length}`,
    `Orphaned concepts (no links): ${stats.orphanedConcepts.length}`,
    '',
  ];

  if (stats.lowQualityConcepts.length > 0) {
    lines.push('── LOW-QUALITY CONCEPTS (sorted by usage) ──────────────────────');
    lines.push('');
    
    for (const c of stats.lowQualityConcepts.slice(0, 50)) {
      lines.push(`  "${c.label}"`);
      lines.push(`    - Used in ${c.usageCount} claims`);
      lines.push(`    - Reason: ${c.quality.reason}`);
      lines.push(`    - Score: ${c.quality.score.toFixed(2)}`);
      lines.push('');
    }

    if (stats.lowQualityConcepts.length > 50) {
      lines.push(`  ... and ${stats.lowQualityConcepts.length - 50} more`);
      lines.push('');
    }
  }

  if (stats.orphanedConcepts.length > 0) {
    lines.push('── ORPHANED CONCEPTS (safe to delete) ──────────────────────────');
    lines.push('');
    
    for (const c of stats.orphanedConcepts.slice(0, 20)) {
      lines.push(`  "${c.label}" - ${c.quality.reason}`);
    }

    if (stats.orphanedConcepts.length > 20) {
      lines.push(`  ... and ${stats.orphanedConcepts.length - 20} more`);
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
