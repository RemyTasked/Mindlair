export type Surface = 
  | 'desktop_app'
  | 'mobile_share'
  | 'safari_icloud'
  | 'readwise'
  | 'pocket'
  | 'instapaper';

export type ContentType = 
  | 'article'
  | 'video'
  | 'audio'
  | 'text'
  | 'image'
  | 'unknown';

export type CaptureEventType =
  | 'url_visit'
  | 'audio_transcript'
  | 'screen_text'
  | 'clipboard_content';

export interface CaptureEvent {
  id: string;
  eventType: CaptureEventType;
  timestamp: string;
  url?: string;
  title?: string;
  text?: string;
  appName?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface Source {
  id: string;
  userId: string;
  url: string;
  title?: string;
  contentType: ContentType;
  surface: Surface;
  consumedAt: string;
  dwellTimeMs?: number;
  createdAt: string;
}

export interface Claim {
  id: string;
  sourceId: string;
  text: string;
  summary?: string;
  embedding?: number[];
  extractedAt: string;
}

export type Stance = 'agree' | 'disagree' | 'nuanced' | 'curious' | 'skip';

export interface Position {
  id: string;
  userId: string;
  claimId: string;
  stance: Stance;
  note?: string;
  createdAt: string;
}

export interface Concept {
  id: string;
  name: string;
  slug: string;
  description?: string;
  embedding?: number[];
}

export interface Belief {
  id: string;
  userId: string;
  conceptId: string;
  currentStance: Stance;
  confidence: number;
  lastUpdated: string;
}

export interface Tension {
  id: string;
  userId: string;
  beliefAId: string;
  beliefBId: string;
  description: string;
  detectedAt: string;
  resolvedAt?: string;
}

export interface Digest {
  id: string;
  userId: string;
  claims: string[];
  generatedAt: string;
  completedAt?: string;
}

export interface Nudge {
  id: string;
  userId: string;
  type: 'explore' | 'reflect' | 'challenge';
  message: string;
  sourceUrl?: string;
  dismissed: boolean;
  createdAt: string;
}

export interface CaptureStatus {
  isRunning: boolean;
  urlMonitoring: boolean;
  audioCapture: boolean;
  screenOcr: boolean;
  clipboard: boolean;
}

export interface SyncStatus {
  pendingCount: number;
  lastSyncAt?: string;
  lastError?: string;
}

export interface AppSettings {
  apiEndpoint: string;
  autoStart: boolean;
  captureUrls: boolean;
  captureAudio: boolean;
  captureScreen: boolean;
  captureClipboard: boolean;
}
