import { NextRequest, NextResponse } from 'next/server';
import { getBeliefTimeline } from '@/lib/services/belief-graph';
import { getAuthFromRequest } from '@/lib/auth';

type IntervalType = 'day' | 'week' | 'month';

interface ConceptState {
  conceptId: string;
  label: string;
  direction: string;
  positionCount: number;
}

interface Snapshot {
  date: string;
  conceptStates: ConceptState[];
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }
    const userId = user.id;
    const { searchParams } = new URL(request.url);
    
    const interval = (searchParams.get('interval') || 'week') as IntervalType;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const conceptId = searchParams.get('conceptId');

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    let timeline = await getBeliefTimeline(userId, startDate, endDate);

    if (conceptId) {
      timeline = timeline.filter(entry => entry.conceptId === conceptId);
    }

    // Build snapshots grouped by interval
    const snapshots = buildSnapshots(timeline, interval);

    return NextResponse.json({
      snapshots,
      interval,
      dateRange: {
        start: startDate?.toISOString() || timeline[0]?.date,
        end: endDate?.toISOString() || timeline[timeline.length - 1]?.date,
      },
    });
  } catch (error) {
    console.error('Timeline error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}

function buildSnapshots(
  timeline: Array<{
    date: string;
    conceptId: string;
    label: string;
    direction: string;
    strength: number;
    claimText?: string;
    stance?: string;
  }>,
  interval: IntervalType
): Snapshot[] {
  if (timeline.length === 0) return [];

  // Group entries by interval bucket
  const buckets = new Map<string, Map<string, {
    conceptId: string;
    label: string;
    directions: string[];
    positionCount: number;
  }>>();

  for (const entry of timeline) {
    const bucketKey = getBucketKey(entry.date, interval);
    
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, new Map());
    }
    
    const bucket = buckets.get(bucketKey)!;
    
    if (!bucket.has(entry.conceptId)) {
      bucket.set(entry.conceptId, {
        conceptId: entry.conceptId,
        label: entry.label,
        directions: [],
        positionCount: 0,
      });
    }
    
    const conceptData = bucket.get(entry.conceptId)!;
    conceptData.directions.push(entry.direction);
    conceptData.positionCount++;
  }

  // Build cumulative snapshots (each snapshot includes all concepts up to that point)
  const sortedBucketKeys = Array.from(buckets.keys()).sort();
  const cumulativeConcepts = new Map<string, {
    conceptId: string;
    label: string;
    directions: string[];
    positionCount: number;
  }>();

  const snapshots: Snapshot[] = [];

  for (const bucketKey of sortedBucketKeys) {
    const bucket = buckets.get(bucketKey)!;
    
    // Merge this bucket's data into cumulative
    for (const [conceptId, data] of bucket) {
      if (!cumulativeConcepts.has(conceptId)) {
        cumulativeConcepts.set(conceptId, {
          conceptId: data.conceptId,
          label: data.label,
          directions: [...data.directions],
          positionCount: data.positionCount,
        });
      } else {
        const existing = cumulativeConcepts.get(conceptId)!;
        existing.directions.push(...data.directions);
        existing.positionCount += data.positionCount;
      }
    }

    // Build snapshot from cumulative state
    const conceptStates: ConceptState[] = [];
    
    for (const [, data] of cumulativeConcepts) {
      const direction = calculateDominantDirection(data.directions);
      conceptStates.push({
        conceptId: data.conceptId,
        label: data.label,
        direction,
        positionCount: data.positionCount,
      });
    }

    // Sort by position count descending
    conceptStates.sort((a, b) => b.positionCount - a.positionCount);

    snapshots.push({
      date: bucketKeyToDate(bucketKey, interval),
      conceptStates,
    });
  }

  return snapshots;
}

function getBucketKey(dateStr: string, interval: IntervalType): string {
  const date = new Date(dateStr);
  
  switch (interval) {
    case 'day':
      return date.toISOString().split('T')[0];
    
    case 'week': {
      // Get Monday of the week
      const monday = new Date(date);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      return monday.toISOString().split('T')[0];
    }
    
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    default:
      return date.toISOString().split('T')[0];
  }
}

function bucketKeyToDate(bucketKey: string, interval: IntervalType): string {
  if (interval === 'month') {
    return `${bucketKey}-01T00:00:00.000Z`;
  }
  return `${bucketKey}T00:00:00.000Z`;
}

function calculateDominantDirection(directions: string[]): string {
  const counts = new Map<string, number>();
  
  for (const dir of directions) {
    counts.set(dir, (counts.get(dir) || 0) + 1);
  }
  
  let maxCount = 0;
  let dominant = 'mixed';
  
  for (const [dir, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      dominant = dir;
    }
  }
  
  // If no clear majority (less than 60%), mark as mixed
  if (maxCount / directions.length < 0.6) {
    return 'mixed';
  }
  
  return dominant;
}
