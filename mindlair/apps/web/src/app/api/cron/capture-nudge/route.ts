import { NextRequest, NextResponse } from 'next/server';
import { assertCronAuth } from '@/lib/cron-auth';
import { runCaptureNudgeJob } from '@/lib/jobs/capture-nudge';

export const maxDuration = 300;

async function handle(request: NextRequest) {
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await runCaptureNudgeJob();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[cron] capture-nudge failed:', error);
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Capture nudge job failed',
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
