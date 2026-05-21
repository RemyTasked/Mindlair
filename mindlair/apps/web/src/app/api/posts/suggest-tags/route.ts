import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { suggestTopicTagsFromContent } from '@/lib/services/ai';

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
    const { title, body: postBody } = body;

    if (!title || typeof title !== 'string' || title.length < 3) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Title is required (min 3 characters)' },
        { status: 400 }
      );
    }

    if (!postBody || typeof postBody !== 'string' || postBody.trim().length < 100) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Post body is too short for tag suggestion' },
        { status: 400 }
      );
    }

    const result = await suggestTopicTagsFromContent({
      title,
      body: postBody,
    });

    return NextResponse.json({
      tags: result.tags,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error('Suggest tags error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to generate tag suggestions' },
      { status: 500 }
    );
  }
}
