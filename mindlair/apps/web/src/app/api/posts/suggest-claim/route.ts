import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { generateHeadlineClaim } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, body: postBody, authorStance, currentClaim } = body;

    if (!title || typeof title !== 'string' || title.length < 3) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Title is required (min 3 characters)' },
        { status: 400 }
      );
    }

    if (!postBody || typeof postBody !== 'string' || postBody.trim().split(/\s+/).length < 50) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Post body is too short for claim generation (min ~50 words)' },
        { status: 400 }
      );
    }

    if (!authorStance || !['arguing', 'exploring', 'steelmanning'].includes(authorStance)) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Valid author stance is required' },
        { status: 400 }
      );
    }

    const result = await generateHeadlineClaim({
      title,
      body: postBody,
      authorStance,
      existingClaim: currentClaim || undefined,
    });

    return NextResponse.json({
      claim: result.claim,
      rationale: result.rationale,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error('Suggest claim error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to generate claim suggestion' },
      { status: 500 }
    );
  }
}
