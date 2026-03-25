import { z } from 'zod';

export const surfaceSchema = z.enum([
  'chrome_extension',
  'firefox_extension',
  'edge_extension',
  'safari_extension',
  'ios_share',
  'android_share',
  'web_app',
  'desktop_app',
  'safari_icloud',
  'readwise_import',
  'pocket_import',
  'instapaper_import',
]);

export const stanceSchema = z.enum(['agree', 'disagree', 'complicated', 'skip']);

export const contentTypeSchema = z.enum(['article', 'video', 'podcast', 'thread']);

export const ingestContentSchema = z.object({
  url: z.string().url(),
  surface: surfaceSchema,
  title: z.string().optional(),
  contentType: contentTypeSchema.optional(),
  dwellTimeMs: z.number().int().positive().optional(),
  scrollDepth: z.number().min(0).max(1).optional(),
  completionPercent: z.number().min(0).max(1).optional(),
  visitCount: z.number().int().positive().optional(),
  consumedAt: z.string().datetime().optional(),
  metadata: z.object({
    author: z.string().optional(),
    publishedAt: z.string().datetime().optional(),
    outlet: z.string().optional(),
    wordCount: z.number().int().positive().optional(),
    videoDurationMs: z.number().int().positive().optional(),
    engagement: z.object({
      dwellTimeMs: z.number().int().optional(),
      scrollDepth: z.number().optional(),
      completionPercent: z.number().optional(),
      visitCount: z.number().int().optional(),
      engagementScore: z.number().optional(),
    }).optional(),
  }).optional(),
});

export const extractClaimSchema = z.object({
  sourceId: z.string().min(1),
});

export const submitReactionSchema = z.object({
  claimId: z.string().min(1),
  stance: stanceSchema,
  note: z.string().max(500).optional(),
  context: z.enum(['realtime', 'digest']),
});

export const completeDigestSchema = z.object({
  digestId: z.string().min(1),
  reactions: z.array(z.object({
    claimId: z.string().min(1),
    stance: stanceSchema,
    note: z.string().max(500).optional(),
  })),
  durationMs: z.number().int().positive(),
});

export const nudgeFeedbackSchema = z.object({
  nudgeId: z.string().min(1),
  action: z.enum(['clicked', 'dismissed', 'helpful', 'not_helpful']),
});

export const updateSettingsSchema = z.object({
  digestWindows: z.object({
    morning: z.object({
      enabled: z.boolean(),
      hour: z.number().int().min(0).max(23),
      minute: z.number().int().min(0).max(59),
    }).optional(),
    evening: z.object({
      enabled: z.boolean(),
      hour: z.number().int().min(0).max(23),
      minute: z.number().int().min(0).max(59),
    }).optional(),
  }).optional(),
  notifications: z.object({
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
    email: z.boolean().optional(),
  }).optional(),
  timezone: z.string().optional(),
});

export type IngestContentInput = z.infer<typeof ingestContentSchema>;
export type ExtractClaimInput = z.infer<typeof extractClaimSchema>;
export type SubmitReactionInput = z.infer<typeof submitReactionSchema>;
export type CompleteDigestInput = z.infer<typeof completeDigestSchema>;
export type NudgeFeedbackInput = z.infer<typeof nudgeFeedbackSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
