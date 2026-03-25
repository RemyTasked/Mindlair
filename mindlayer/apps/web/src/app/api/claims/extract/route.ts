import { NextRequest, NextResponse } from 'next/server';
import { extractClaimSchema } from '@/lib/validations';
import db from '@/lib/db';
import { extractClaims, MODEL_VERSION } from '@/lib/services/ai';
import { fetchArticleContent } from '@/lib/services/content-fetch';
import { linkClaimToConcepts } from '@/lib/services/belief-graph';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = extractClaimSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: validation.error.message },
        { status: 400 }
      );
    }

    const { sourceId } = validation.data;

    const source = await db.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Source not found' },
        { status: 404 }
      );
    }

    const existingClaims = await db.claim.findMany({
      where: { sourceId },
      include: {
        claimConcepts: {
          include: { concept: true },
        },
      },
    });

    if (existingClaims.length > 0) {
      return NextResponse.json({
        claims: existingClaims.map(claim => ({
          claimId: claim.id,
          claimText: claim.text,
          claimType: claim.claimType,
          confidenceScore: claim.confidenceScore,
          concepts: claim.claimConcepts.map(cc => cc.concept.label),
          modelVersion: claim.modelVersion,
          extractedAt: claim.extractedAt.toISOString(),
        })),
      });
    }

    const content = await fetchArticleContent(source.url);
    
    const analysis = await extractClaims({
      title: source.title || source.url,
      text: content?.text,
      url: source.url,
    });

    const createdClaims = [];

    for (const extractedClaim of analysis.claims) {
      const claim = await db.claim.create({
        data: {
          sourceId,
          text: extractedClaim.text,
          claimType: extractedClaim.type,
          confidenceScore: extractedClaim.confidence,
          modelVersion: MODEL_VERSION,
        },
      });

      const conceptIds = await linkClaimToConcepts(claim.id, extractedClaim.concepts);

      await db.analyticsEvent.create({
        data: {
          userId: source.userId,
          type: 'claim_extracted',
          surface: source.surface,
          payload: {
            claimId: claim.id,
            sourceId,
            confidenceScore: claim.confidenceScore,
            conceptCount: conceptIds.length,
          },
        },
      });

      createdClaims.push({
        claimId: claim.id,
        claimText: claim.text,
        claimType: claim.claimType,
        confidenceScore: claim.confidenceScore,
        concepts: extractedClaim.concepts,
        modelVersion: claim.modelVersion,
        extractedAt: claim.extractedAt.toISOString(),
      });
    }

    return NextResponse.json({ claims: createdClaims });
  } catch (error) {
    console.error('Extract claim error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to extract claim' },
      { status: 500 }
    );
  }
}
