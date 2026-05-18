import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { 
  auditConcepts, 
  runConceptCleanup, 
  formatCleanupReport 
} from '@/lib/jobs/concept-cleanup';

/**
 * GET /api/admin/concepts/audit
 * 
 * Returns a concept quality audit report.
 * Query params:
 *   - format: 'json' | 'text' (default: json)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // In production, you'd want to check for admin role here
    // For now, any authenticated user can run the audit

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    const audit = await auditConcepts();

    if (format === 'text') {
      const report = formatCleanupReport(audit);
      return new NextResponse(report, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return NextResponse.json({
      totalConcepts: audit.totalConcepts,
      lowQualityCount: audit.lowQualityConcepts.length,
      orphanedCount: audit.orphanedConcepts.length,
      lowQualityConcepts: audit.lowQualityConcepts.slice(0, 100).map(c => ({
        id: c.id,
        label: c.label,
        usageCount: c.usageCount,
        reason: c.quality.reason,
        score: c.quality.score,
      })),
      orphanedConcepts: audit.orphanedConcepts.slice(0, 50).map(c => ({
        id: c.id,
        label: c.label,
        reason: c.quality.reason,
      })),
    });
  } catch (error) {
    console.error('Concept audit error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to run concept audit' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/concepts/audit
 * 
 * Runs concept cleanup operations.
 * Body params:
 *   - deleteOrphans: boolean (default: false)
 *   - dryRun: boolean (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { deleteOrphans = false, dryRun = true } = body;

    const result = await runConceptCleanup({
      dryRun,
      deleteOrphans,
      autoMerge: false, // Disable auto-merge for safety
    });

    return NextResponse.json({
      dryRun,
      totalConcepts: result.audit.totalConcepts,
      lowQualityCount: result.audit.lowQualityConcepts.length,
      orphanedCount: result.audit.orphanedConcepts.length,
      deletedOrphans: result.deletedOrphans,
      mergedConcepts: result.mergedConcepts,
      message: dryRun 
        ? 'Dry run complete. No changes made. Set dryRun: false to apply changes.'
        : `Cleanup complete. Deleted ${result.deletedOrphans} orphaned concepts.`,
    });
  } catch (error) {
    console.error('Concept cleanup error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to run concept cleanup' },
      { status: 500 }
    );
  }
}
