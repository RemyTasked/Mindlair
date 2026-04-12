export interface TimelineConceptState {
  conceptId: string;
  label: string;
  direction: string;
  positionCount: number;
}

export interface TimelineSnapshot {
  date: string;
  conceptStates: TimelineConceptState[];
}

export interface LerpedConceptActivity {
  positionCount: number;
  direction: string;
  label: string;
  /** Present when interpolated from timeline; optional for callers that only use counts. */
  appeared?: boolean;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function snapshotToMap(snap: TimelineSnapshot | undefined): Map<string, TimelineConceptState> {
  const m = new Map<string, TimelineConceptState>();
  if (!snap) return m;
  for (const c of snap.conceptStates) {
    m.set(c.conceptId, c);
  }
  return m;
}

/**
 * @param timeValue fractional index in [0, lastIndex]; lastIndex = snapshots.length - 1 (or 0)
 */
export function interpolateTimelineActivity(
  snapshots: TimelineSnapshot[],
  timeValue: number,
  nodeLabels: Map<string, string>,
): Map<string, LerpedConceptActivity> {
  const out = new Map<string, LerpedConceptActivity>();
  if (snapshots.length === 0) return out;

  const lastIdx = Math.max(0, snapshots.length - 1);
  const clamped = Math.max(0, Math.min(lastIdx, timeValue));
  const i0 = Math.floor(clamped);
  const i1 = Math.min(lastIdx, i0 + 1);
  const t = clamped - i0;

  const m0 = snapshotToMap(snapshots[i0]);
  const m1 = snapshotToMap(snapshots[i1]);

  const ids = new Set<string>([...m0.keys(), ...m1.keys()]);

  for (const id of ids) {
    const a = m0.get(id);
    const b = m1.get(id);
    const label = a?.label || b?.label || nodeLabels.get(id) || id;
    const countA = a?.positionCount ?? 0;
    const countB = b?.positionCount ?? 0;
    const dirA = a?.direction ?? 'mixed';
    const dirB = b?.direction ?? 'mixed';

    const positionCount = Math.round(lerp(countA, countB, t));
    const direction = t < 0.5 ? dirA : dirB;
    const appeared = countA > 0 || countB > 0 || (i0 > 0 && snapshotToMap(snapshots[Math.max(0, i0 - 1)]).has(id));

    out.set(id, {
      positionCount,
      direction,
      label,
      appeared: appeared || countA > 0 || countB > 0,
    });
  }

  return out;
}

export interface MapEdgeLike {
  source: string;
  target: string;
  type: 'tension' | 'related';
  weight: number;
}

/**
 * Draw edge only if both endpoints have activity in the scrubbed month and tension/related applies.
 */
export function filterEdgesGated(
  edges: MapEdgeLike[],
  activity: Map<string, LerpedConceptActivity>,
  minCount = 1,
): MapEdgeLike[] {
  return edges.filter(e => {
    const sa = activity.get(e.source);
    const ta = activity.get(e.target);
    if (!sa || !ta) return false;
    if (sa.positionCount < minCount || ta.positionCount < minCount) return false;
    return true;
  });
}

/** Normalize positionCount to size multiplier ~0.2..1 and opacity ~0.25..1 */
export function activityToVisual(
  activity: LerpedConceptActivity | undefined,
  maxCountInView: number,
): { sizeMult: number; opacity: number; direction: string } {
  if (!activity || activity.positionCount <= 0) {
    return { sizeMult: 0.15, opacity: 0.2, direction: 'mixed' };
  }
  const maxC = Math.max(maxCountInView, 1);
  const n = activity.positionCount;
  const sizeMult = 0.28 + 0.72 * Math.min(1, Math.log1p(n) / Math.log1p(maxC));
  const opacity = 0.35 + 0.55 * Math.min(1, n / maxC);
  return { sizeMult, opacity, direction: activity.direction };
}

export function maxCountInActivity(activity: Map<string, LerpedConceptActivity>): number {
  let m = 1;
  for (const v of activity.values()) {
    if (v.positionCount > m) m = v.positionCount;
  }
  return m;
}

export function sparklineTotals(snapshots: TimelineSnapshot[]): number[] {
  return snapshots.map(s =>
    s.conceptStates.reduce((sum, c) => sum + c.positionCount, 0),
  );
}

export function formatSnapshotMonthLabel(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

export function discoveryForIndex(snapshots: TimelineSnapshot[], index: number): string | null {
  if (snapshots.length < 2 || index < 1 || index >= snapshots.length) {
    if (snapshots.length === 1) {
      const n = snapshots[0].conceptStates.length;
      return n > 0 ? `Your map starts with ${n} topic${n === 1 ? '' : 's'} this period.` : null;
    }
    return null;
  }
  const prev = snapshots[index - 1];
  const cur = snapshots[index];
  const prevIds = new Set(prev.conceptStates.map(c => c.conceptId));
  const newConcepts = cur.conceptStates.filter(c => !prevIds.has(c.conceptId));
  if (newConcepts.length > 0) {
    const first = newConcepts[0];
    return `New on your map: “${first.label}” (${newConcepts.length} new topic${newConcepts.length > 1 ? 's' : ''}).`;
  }
  let flips = 0;
  for (const c of cur.conceptStates) {
    const p = prev.conceptStates.find(x => x.conceptId === c.conceptId);
    if (p && p.direction !== c.direction && c.positionCount >= p.positionCount) {
      flips++;
    }
  }
  if (flips > 0) {
    return `${flips} topic${flips > 1 ? 's' : ''} shifted direction this month.`;
  }
  const delta =
    cur.conceptStates.reduce((s, c) => s + c.positionCount, 0) -
    prev.conceptStates.reduce((s, c) => s + c.positionCount, 0);
  if (delta > 2) {
    return `Activity picked up — ${delta} more positions than the prior month.`;
  }
  return null;
}
