/** Minimum distinct users required before showing cohort percentages. */
export const FINGERPRINT_MIN_COHORT_N = 25;

export type ContentTypeBucket = "article" | "podcast" | "video" | "thread" | "other";

export interface ConsumptionRow {
  contentType: ContentTypeBucket;
  label: string;
  iconKey: "article" | "podcast" | "video" | "thread";
  count: number;
}

export interface TopTopicRow {
  conceptId: string;
  label: string;
  count: number;
  contentTypeIcons: Array<"podcast" | "article" | "video" | "thread">;
}

export interface ShiftRow {
  topic: string;
  detail: string;
}

export interface ComparisonRow {
  topicLabel: string;
  claimId: string | null;
  conceptId: string;
  userStanceSummary: string;
  stanceKey: "agree" | "disagree" | "complicated" | "positive" | "negative" | "mixed";
  pctMindlairAgree: number | null;
  sampleSize: number;
  insufficientData: boolean;
  source: "claim" | "belief";
}

export interface FingerprintPayload {
  user: {
    displayName: string | null;
    handleHint: string | null;
    memberSince: string;
  };
  headerStats: {
    sources: number;
    reactions: number;
    topics: number;
    shifts: number;
  };
  consumption: ConsumptionRow[];
  topTopics: TopTopicRow[];
  shifts: ShiftRow[];
  openQuestions: string[];
  comparisons: ComparisonRow[];
}

export function isMinorityInCohort(row: ComparisonRow): boolean | null {
  if (row.insufficientData || row.pctMindlairAgree === null) return null;
  const p = row.pctMindlairAgree;
  if (row.source === "claim") {
    if (row.stanceKey === "agree") return p < 50;
    if (row.stanceKey === "disagree") return p > 50;
    return null;
  }
  if (row.stanceKey === "positive") return p < 50;
  if (row.stanceKey === "negative") return p > 50;
  return null;
}
