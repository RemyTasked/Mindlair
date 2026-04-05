/**
 * Mindlayer API Contracts
 * Type definitions for all API endpoints
 */

import { Stance, Surface } from './events';

// ============================================
// Ingestion API
// ============================================

export interface IngestContentRequest {
  url: string;
  surface: Surface;
  title?: string;
  contentType?: 'article' | 'video' | 'podcast' | 'thread';
  dwellTimeMs?: number;
  scrollDepth?: number;
  completionPercent?: number;
  consumedAt?: string; // ISO date
  metadata?: {
    author?: string;
    publishedAt?: string;
    outlet?: string;
    wordCount?: number;
    videoDurationMs?: number;
  };
}

export interface IngestContentResponse {
  sourceId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  claimId?: string;
}

// ============================================
// Claims API
// ============================================

export interface ExtractClaimRequest {
  sourceId: string;
}

export interface ExtractClaimResponse {
  claimId: string;
  claimText: string;
  claimType: 'factual' | 'opinion' | 'prediction' | 'policy';
  confidenceScore: number;
  modelVersion: string;
  extractedAt: string;
}

export interface ClaimWithSource {
  id: string;
  text: string;
  type: 'factual' | 'opinion' | 'prediction' | 'policy';
  confidenceScore: number;
  source: {
    id: string;
    url: string;
    title: string;
    outlet?: string;
    consumedAt: string;
  };
  position?: {
    stance: Stance;
    note?: string;
    createdAt: string;
  };
}

// ============================================
// Reactions API
// ============================================

export interface SubmitReactionRequest {
  claimId: string;
  stance: Stance;
  note?: string;
  context: 'realtime' | 'digest';
}

export interface SubmitReactionResponse {
  positionId: string;
  beliefUpdated: boolean;
  conceptsAffected: string[];
}

// ============================================
// Digest API
// ============================================

export interface DigestItem {
  claim: ClaimWithSource;
  priority: number;
  hasCounterAngle: boolean;
  relatedBeliefStrength?: number;
}

export interface GetDigestResponse {
  digestId: string;
  window: 'morning' | 'evening';
  items: DigestItem[];
  generatedAt: string;
  expiresAt: string;
}

export interface CompleteDigestRequest {
  digestId: string;
  reactions: Array<{
    claimId: string;
    stance: Stance;
    note?: string;
  }>;
  durationMs: number;
}

export interface CompleteDigestResponse {
  processedCount: number;
  beliefsUpdated: number;
}

// ============================================
// Map/Graph API
// ============================================

export interface Concept {
  id: string;
  label: string;
  type: 'topic' | 'person' | 'institution';
  positionCount: number;
  lastEngagedAt: string;
}

export interface Belief {
  id: string;
  conceptId: string;
  direction: 'positive' | 'negative' | 'mixed';
  strength: number; // 0-1
  stability: number; // 0-1
  positionCount: number;
  firstSeenAt: string;
  lastUpdatedAt: string;
}

export interface Tension {
  id: string;
  beliefA: Belief;
  beliefB: Belief;
  tensionType: 'direct_contradiction' | 'implicit_tension';
  surfacedCount: number;
  resolved: boolean;
}

export interface ConceptCluster {
  id: string;
  concepts: Concept[];
  centerConcept: Concept;
  engagementDepth: number;
  positionConsistency: number; // 0-1
}

export interface GetMapResponse {
  clusters: ConceptCluster[];
  beliefs: Belief[];
  tensions: Tension[];
  totalConcepts: number;
  totalPositions: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
}

export interface GetTimelineResponse {
  snapshots: Array<{
    date: string;
    clusters: ConceptCluster[];
    beliefs: Belief[];
    tensions: Tension[];
  }>;
  interval: 'day' | 'week' | 'month';
}

// ============================================
// Nudges API
// ============================================

export interface Nudge {
  id: string;
  type: 'echo_chamber' | 'blind_spot';
  conceptId: string;
  conceptLabel: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceOutlet?: string;
  framing: string; // "This take on X is worth a look"
  createdAt: string;
  expiresAt: string;
}

export interface GetNudgesResponse {
  nudges: Nudge[];
  totalPending: number;
}

export interface NudgeFeedbackRequest {
  nudgeId: string;
  action: 'clicked' | 'dismissed' | 'helpful' | 'not_helpful';
}

// ============================================
// Genealogy API
// ============================================

export interface SourceChainNode {
  url: string;
  title: string;
  outlet: string;
  publishedAt?: string;
  biasTag?: 'left' | 'center-left' | 'center' | 'center-right' | 'right';
  reliabilityScore?: number; // 0-1
  framingDelta?: string; // How framing changed from previous node
}

export interface GetGenealogyResponse {
  claimId: string;
  claimText: string;
  chainNodes: SourceChainNode[];
  originSource?: SourceChainNode;
  chainConfidence: number; // 0-1
  generatedAt: string;
}

// ============================================
// User Settings API
// ============================================

export interface UserSettings {
  digestWindows: {
    morning: { enabled: boolean; hour: number; minute: number };
    evening: { enabled: boolean; hour: number; minute: number };
  };
  notifications: {
    push: boolean;
    sms: boolean;
    email: boolean;
  };
  timezone: string;
  connectedSources: {
    readwise: boolean;
    instapaper: boolean;
  };
}

export interface UpdateSettingsRequest {
  digestWindows?: UserSettings['digestWindows'];
  notifications?: UserSettings['notifications'];
  timezone?: string;
}

// ============================================
// Common Response Types
// ============================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}
