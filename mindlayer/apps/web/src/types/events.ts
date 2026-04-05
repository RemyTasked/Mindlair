/**
 * Mindlayer Event Taxonomy
 * Canonical event schema for cross-surface analytics
 */

export type EventType =
  | 'content_consumed'
  | 'claim_extracted'
  | 'reaction_submitted'
  | 'digest_opened'
  | 'digest_completed'
  | 'nudge_surfaced'
  | 'nudge_clicked'
  | 'nudge_dismissed'
  | 'map_viewed'
  | 'timeline_scrubbed'
  | 'source_chain_viewed';

export type Surface =
  | 'chrome_extension'
  | 'firefox_extension'
  | 'edge_extension'
  | 'safari_extension'
  | 'ios_share'
  | 'android_share'
  | 'web_app'
  | 'readwise_import'
  | 'instapaper_import';

export type Stance = 'agree' | 'disagree' | 'complicated' | 'skip';

export interface BaseEvent {
  id: string;
  type: EventType;
  userId: string;
  surface: Surface;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ContentConsumedEvent extends BaseEvent {
  type: 'content_consumed';
  payload: {
    sourceId: string;
    url: string;
    title: string;
    dwellTimeMs: number;
    scrollDepth: number;
    completionPercent: number;
    contentType: 'article' | 'video' | 'podcast' | 'thread';
  };
}

export interface ClaimExtractedEvent extends BaseEvent {
  type: 'claim_extracted';
  payload: {
    claimId: string;
    sourceId: string;
    claimText: string;
    confidenceScore: number;
    modelVersion: string;
  };
}

export interface ReactionSubmittedEvent extends BaseEvent {
  type: 'reaction_submitted';
  payload: {
    positionId: string;
    claimId: string;
    stance: Stance;
    note?: string;
    reactionContext: 'realtime' | 'digest';
  };
}

export interface DigestOpenedEvent extends BaseEvent {
  type: 'digest_opened';
  payload: {
    digestId: string;
    digestWindow: 'morning' | 'evening';
    itemCount: number;
  };
}

export interface DigestCompletedEvent extends BaseEvent {
  type: 'digest_completed';
  payload: {
    digestId: string;
    reactedCount: number;
    skippedCount: number;
    durationMs: number;
  };
}

export interface NudgeSurfacedEvent extends BaseEvent {
  type: 'nudge_surfaced';
  payload: {
    nudgeId: string;
    conceptId: string;
    nudgeType: 'echo_chamber' | 'blind_spot';
    sourceUrl: string;
  };
}

export interface NudgeClickedEvent extends BaseEvent {
  type: 'nudge_clicked';
  payload: {
    nudgeId: string;
  };
}

export interface NudgeDismissedEvent extends BaseEvent {
  type: 'nudge_dismissed';
  payload: {
    nudgeId: string;
  };
}

export interface MapViewedEvent extends BaseEvent {
  type: 'map_viewed';
  payload: {
    viewDurationMs: number;
    conceptsExplored: string[];
  };
}

export interface TimelineScrubEvent extends BaseEvent {
  type: 'timeline_scrubbed';
  payload: {
    fromDate: Date;
    toDate: Date;
  };
}

export interface SourceChainViewedEvent extends BaseEvent {
  type: 'source_chain_viewed';
  payload: {
    claimId: string;
    chainDepth: number;
  };
}

export type MindlayerEvent =
  | ContentConsumedEvent
  | ClaimExtractedEvent
  | ReactionSubmittedEvent
  | DigestOpenedEvent
  | DigestCompletedEvent
  | NudgeSurfacedEvent
  | NudgeClickedEvent
  | NudgeDismissedEvent
  | MapViewedEvent
  | TimelineScrubEvent
  | SourceChainViewedEvent;
