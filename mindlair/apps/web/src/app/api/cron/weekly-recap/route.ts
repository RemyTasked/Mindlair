import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/cron-auth';
import { runWeeklyRecapJob } from '@/lib/jobs/recap-delivery';

export const maxDuration = 300;

async function handle(request: NextRequest) {
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await runWeeklyRecapJob();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[cron] weekly-recap failed:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Weekly recap job failed',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
