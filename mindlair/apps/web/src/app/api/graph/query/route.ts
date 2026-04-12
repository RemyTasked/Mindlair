import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { queryBeliefGraph } from '@/lib/services/graph-query';
import { getAuthFromRequest } from '@/lib/auth';

const querySchema = z.object({
  question: z.string().min(5).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }
    const userId = user.id;
    const body = await request.json();
    
    const validation = querySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: validation.error.message },
        { status: 400 }
      );
    }

    const { question } = validation.data;

    const response = await queryBeliefGraph(userId, question);

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error('Graph query error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to process query' },
      { status: 500 }
    );
  }
}
