import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  const user = await getAuthFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { claimId } = await params;

  const claim = await db.claim.findUnique({
    where: { id: claimId },
    include: {
      capture: {
        include: {
          source: true,
        },
      },
      source: true,
    },
  });

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  // Authorization: only the capture's owner can view its original.
  if (claim.capture && claim.capture.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!claim.capture) {
    // Legacy claim without a capture — fall back to source-only context.
    return NextResponse.json({
      claimId,
      capture: null,
      source: claim.source
        ? {
            id: claim.source.id,
            url: claim.source.url,
            title: claim.source.title,
            outlet: claim.source.outlet,
          }
        : null,
    });
  }

  return NextResponse.json({
    claimId,
    capture: {
      id: claim.capture.id,
      modality: claim.capture.modality,
      rawText: claim.capture.rawText,
      rawAudioUrl: claim.capture.rawAudioUrl,
      rawAudioMs: claim.capture.rawAudioMs,
      createdAt: claim.capture.createdAt.toISOString(),
      confirmedAt: claim.capture.confirmedAt?.toISOString() ?? null,
      source: claim.capture.source
        ? {
            id: claim.capture.source.id,
            url: claim.capture.source.url,
            title: claim.capture.source.title,
            outlet: claim.capture.source.outlet,
            transcriptText: claim.capture.source.transcriptText,
          }
        : null,
    },
    extractedFrom: claim.extractedFrom,
    aiStance: claim.aiStance,
  });
}
