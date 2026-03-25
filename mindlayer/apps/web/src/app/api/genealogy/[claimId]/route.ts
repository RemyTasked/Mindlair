import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { buildAndSaveSourceChain } from '@/lib/services/genealogy';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }
    const { claimId } = await params;
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    const claim = await db.claim.findUnique({
      where: { id: claimId },
      include: {
        claimChain: true,
        source: true,
      },
    });

    if (!claim) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Claim not found' },
        { status: 404 }
      );
    }

    // If refresh requested or no chain exists, try to build one
    if (refresh || !claim.claimChain) {
      const chain = await buildAndSaveSourceChain(claimId);
      
      if (chain) {
        return NextResponse.json({
          claimId: claim.id,
          claimText: claim.text,
          chainNodes: chain.chainNodes,
          originSource: chain.originSource,
          chainConfidence: chain.chainConfidence,
          analysisNotes: chain.analysisNotes,
          generatedAt: new Date().toISOString(),
        });
      }
      
      // Fallback to minimal if building failed
      return NextResponse.json({
        claimId: claim.id,
        claimText: claim.text,
        chainNodes: [{
          url: claim.source.url,
          title: claim.source.title || 'Unknown',
          outlet: claim.source.outlet || 'Unknown',
          author: claim.source.author,
          publishedAt: claim.source.publishedAt?.toISOString(),
          claimText: claim.text,
          confidence: 1.0,
          nodeType: 'primary',
        }],
        originSource: null,
        chainConfidence: 0.5,
        analysisNotes: 'Unable to trace citation chain',
        generatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      claimId: claim.id,
      claimText: claim.text,
      chainNodes: claim.claimChain.chainNodes,
      originSource: claim.claimChain.originSource,
      chainConfidence: claim.claimChain.chainConfidence,
      generatedAt: claim.claimChain.generatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Get genealogy error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch genealogy' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }
    const { claimId } = await params;

    const claim = await db.claim.findUnique({
      where: { id: claimId },
    });

    if (!claim) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Claim not found' },
        { status: 404 }
      );
    }

    const chain = await buildAndSaveSourceChain(claimId);

    if (!chain) {
      return NextResponse.json(
        { code: 'BUILD_FAILED', message: 'Failed to build source chain' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      claimId: claim.id,
      chainNodes: chain.chainNodes.length,
      hasOrigin: !!chain.originSource,
      chainConfidence: chain.chainConfidence,
    });
  } catch (error) {
    console.error('Build genealogy error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to build genealogy' },
      { status: 500 }
    );
  }
}
