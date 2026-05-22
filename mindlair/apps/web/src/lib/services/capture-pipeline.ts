import db from '@/lib/db';
import {
  extractClaims,
  extractClaimsFromSpokenText,
  generateClaimEmbedding,
  cosineSimilarity,
  transcribeAudio,
  MODEL_VERSION,
} from './ai';
import { linkClaimToConcepts, updateBeliefGraph } from './belief-graph';
import { sendCaptureReadyNotification } from './push';
import { resolveSpokenSource } from './source-resolver';

type Stance = 'agree' | 'disagree' | 'complicated' | 'skip';
type AIStance = 'endorse' | 'dispute' | 'complicated' | 'changed_my_mind';

export interface NormalizedInput {
  text: string;
  sourceMeta: {
    url?: string;
    title?: string;
    outlet?: string;
    contentType?: string;
  };
  scope: 'source_text' | 'user_reaction';
}

export interface CandidateClaim {
  text: string;
  type: 'factual' | 'opinion' | 'prediction' | 'policy';
  confidence: number;
  concepts: string[];
  aiStance?: AIStance;
  embedding?: number[];
  matchedClaimId?: string;
  matchedClaimText?: string;
  clarificationNeeded?: boolean;
}

export interface CaptureDecision {
  text: string;
  originalText?: string;
  stance: Stance;
  dropped?: boolean;
  edited?: boolean;
  matchedClaimId?: string;
}

const DUPLICATE_THRESHOLD = 0.88;

export function normalizeInput(capture: {
  rawText?: string | null;
  source?: {
    url?: string;
    title?: string | null;
    outlet?: string | null;
    contentType?: string;
    transcriptText?: string | null;
  } | null;
}): NormalizedInput {
  const source = capture.source;
  const hasReaction = Boolean(capture.rawText && capture.rawText.trim().length > 0);
  const hasSourceContent = Boolean(
    source?.transcriptText && source.transcriptText.length > 100
  );

  const isOpenContent =
    source?.contentType === 'article' ||
    source?.contentType === 'thread' ||
    source?.contentType === 'podcast';

  if (hasReaction) {
    return {
      text: capture.rawText!.trim(),
      sourceMeta: {
        url: source?.url,
        title: source?.title ?? undefined,
        outlet: source?.outlet ?? undefined,
        contentType: source?.contentType,
      },
      scope: 'user_reaction',
    };
  }

  if (hasSourceContent && isOpenContent) {
    return {
      text: source!.transcriptText!.slice(0, 10000),
      sourceMeta: {
        url: source?.url,
        title: source?.title ?? undefined,
        outlet: source?.outlet ?? undefined,
        contentType: source?.contentType,
      },
      scope: 'source_text',
    };
  }

  return {
    text: source?.title || '',
    sourceMeta: {
      url: source?.url,
      title: source?.title ?? undefined,
      outlet: source?.outlet ?? undefined,
      contentType: source?.contentType,
    },
    scope: 'user_reaction',
  };
}

export async function extractCandidateClaims(
  input: NormalizedInput,
  userId: string,
  mode: 'written' | 'spoken' = 'written'
): Promise<CandidateClaim[]> {
  if (!input.text || input.text.trim().length < 5) {
    return [];
  }

  const existingConcepts = await db.concept.findMany({
    take: 100,
    orderBy: { updatedAt: 'desc' },
    select: { label: true },
  });
  const conceptLabels = existingConcepts.map((c) => c.label);

  const content = {
    title: input.sourceMeta.title || 'Captured reaction',
    text: input.text,
    url: input.sourceMeta.url || '',
  };

  const analysis =
    mode === 'spoken'
      ? await extractClaimsFromSpokenText(content, conceptLabels)
      : await extractClaims(content, conceptLabels);
  const candidates: CandidateClaim[] = [];

  for (const claim of analysis.claims) {
    if (!claim.text || claim.text.length < 5) continue;

    const embedding = await generateClaimEmbedding(claim.text);

    const candidate: CandidateClaim = {
      text: claim.text,
      type: claim.type,
      confidence: claim.confidence,
      concepts: claim.concepts || [],
      embedding: embedding.length > 0 ? embedding : undefined,
    };

    // Spoken-mode extractor flags mind-changes; seed AI stance accordingly.
    if (mode === 'spoken' && (claim as { changedMind?: boolean }).changedMind) {
      candidate.aiStance = 'changed_my_mind';
    }

    candidates.push(candidate);
  }

  const deduped = await dedupAgainstUserClaims(candidates, userId);

  return deduped;
}

export async function dedupAgainstUserClaims(
  candidates: CandidateClaim[],
  userId: string
): Promise<CandidateClaim[]> {
  if (candidates.length === 0) return candidates;

  const userSources = await db.source.findMany({
    where: { userId },
    select: { id: true },
  });
  const sourceIds = userSources.map((s) => s.id);

  if (sourceIds.length === 0) return candidates;

  const existingClaims = await db.claim.findMany({
    where: {
      sourceId: { in: sourceIds },
      embeddingJson: { not: { equals: null } },
    },
    select: {
      id: true,
      text: true,
      embeddingJson: true,
    },
    take: 500,
    orderBy: { extractedAt: 'desc' },
  });

  if (existingClaims.length === 0) return candidates;

  for (const candidate of candidates) {
    if (!candidate.embedding || candidate.embedding.length === 0) continue;

    let bestMatch: { id: string; text: string; similarity: number } | null = null;

    for (const existing of existingClaims) {
      const existingEmbedding = existing.embeddingJson as number[] | null;
      if (!existingEmbedding || existingEmbedding.length === 0) continue;

      const similarity = cosineSimilarity(candidate.embedding, existingEmbedding);
      if (similarity >= DUPLICATE_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { id: existing.id, text: existing.text, similarity };
        }
      }
    }

    if (bestMatch) {
      candidate.matchedClaimId = bestMatch.id;
      candidate.matchedClaimText = bestMatch.text;
    }
  }

  return candidates;
}

export async function classifyStance(
  claimText: string,
  surroundingText: string
): Promise<AIStance> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  });

  const prompt = `Given a claim and the surrounding context where it was mentioned, determine the speaker's stance on the claim.

Stances:
- "endorse": The speaker agrees with or supports this claim
- "dispute": The speaker disagrees with or opposes this claim  
- "complicated": The speaker sees nuance, has mixed feelings, or is uncertain
- "changed_my_mind": The speaker indicates this changed their view (words like "actually", "I used to think", "now I believe", "that changed my mind")

Context: "${surroundingText.slice(0, 1000)}"

Claim: "${claimText}"

Respond with ONLY one word: endorse, dispute, complicated, or changed_my_mind`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-35-20241022',
      max_tokens: 50,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      response.content[0].type === 'text'
        ? response.content[0].text.trim().toLowerCase()
        : 'endorse';

    if (['endorse', 'dispute', 'complicated', 'changed_my_mind'].includes(text)) {
      return text as AIStance;
    }
    return 'endorse';
  } catch (error) {
    console.error('Stance classification error:', error);
    return 'endorse';
  }
}

function aiStanceToUserStance(aiStance: AIStance): Stance {
  switch (aiStance) {
    case 'endorse':
      return 'agree';
    case 'dispute':
      return 'disagree';
    case 'complicated':
      return 'complicated';
    case 'changed_my_mind':
      return 'agree';
    default:
      return 'agree';
  }
}

function getConfidenceForModality(
  modality: string,
  extractedFrom: string
): number {
  if (extractedFrom === 'source') {
    return 0.45;
  }
  if (modality === 'extension') {
    return 0.25;
  }
  return 0.85;
}

export async function commitCapture(
  captureId: string,
  decisions: CaptureDecision[]
): Promise<{ claimIds: string[]; positionIds: string[] }> {
  const capture = await db.capture.findUnique({
    where: { id: captureId },
    include: { source: true },
  });

  if (!capture) {
    throw new Error('Capture not found');
  }

  const candidateClaims = (capture.candidateClaims as unknown as CandidateClaim[]) || [];
  const claimIds: string[] = [];
  const positionIds: string[] = [];
  const feedbackRecords: Array<{
    captureId: string;
    claimText: string;
    finalText: string | null;
    action: string;
    stanceBefore: string | null;
    stanceAfter: string | null;
    modelVersion: string;
  }> = [];

  await db.$transaction(async (tx) => {
    let sourceId = capture.sourceId;

    if (!sourceId && capture.source) {
      sourceId = capture.source.id;
    }

    if (!sourceId) {
      const newSource = await tx.source.create({
        data: {
          userId: capture.userId,
          url: `/capture/${captureId}`,
          title: capture.rawText?.slice(0, 200) || 'Voice capture',
          contentType: 'article',
          surface: capture.modality === 'voice' ? 'voice_capture' : 'share_sheet',
          consumedAt: new Date(),
        },
      });
      sourceId = newSource.id;
    }

    for (const decision of decisions) {
      const originalCandidate = candidateClaims.find(
        (c) => c.text === (decision.originalText || decision.text)
      );

      if (decision.dropped) {
        feedbackRecords.push({
          captureId,
          claimText: decision.originalText || decision.text,
          finalText: null,
          action: 'dropped',
          stanceBefore: originalCandidate?.aiStance || null,
          stanceAfter: null,
          modelVersion: MODEL_VERSION,
        });
        continue;
      }

      const action = decision.edited
        ? 'edited'
        : originalCandidate?.aiStance &&
          aiStanceToUserStance(originalCandidate.aiStance) !== decision.stance
        ? 'stance_flipped'
        : 'kept';

      feedbackRecords.push({
        captureId,
        claimText: decision.originalText || decision.text,
        finalText: decision.text,
        action,
        stanceBefore: originalCandidate?.aiStance || null,
        stanceAfter: decision.stance,
        modelVersion: MODEL_VERSION,
      });

      if (decision.matchedClaimId) {
        const existingPosition = await tx.position.findFirst({
          where: {
            userId: capture.userId,
            claimId: decision.matchedClaimId,
          },
          orderBy: { createdAt: 'desc' },
        });

        const position = await tx.position.create({
          data: {
            userId: capture.userId,
            claimId: decision.matchedClaimId,
            stance: decision.stance,
            context: 'capture',
            confidence: getConfidenceForModality(capture.modality, 'reaction'),
            supersedesId: existingPosition?.id,
          },
        });

        positionIds.push(position.id);
        claimIds.push(decision.matchedClaimId);

        const existingClaim = await tx.claim.findUnique({
          where: { id: decision.matchedClaimId },
          include: { claimConcepts: true },
        });
        if (existingClaim) {
          const conceptIds = existingClaim.claimConcepts.map((cc) => cc.conceptId);
          const confidence = getConfidenceForModality(capture.modality, 'reaction');
          await updateBeliefGraph(
            capture.userId,
            decision.matchedClaimId,
            decision.stance,
            conceptIds,
            confidence
          );
        }
      } else {
        const claim = await tx.claim.create({
          data: {
            sourceId,
            text: decision.text,
            claimType: originalCandidate?.type || 'opinion',
            confidenceScore: originalCandidate?.confidence || 0.7,
            modelVersion: MODEL_VERSION,
            captureId,
            extractedFrom: 'reaction',
            aiStance: originalCandidate?.aiStance,
            embeddingJson: originalCandidate?.embedding,
          },
        });

        claimIds.push(claim.id);

        const concepts = originalCandidate?.concepts || [];
        const conceptIds = await linkClaimToConcepts(claim.id, concepts);

        const position = await tx.position.create({
          data: {
            userId: capture.userId,
            claimId: claim.id,
            stance: decision.stance,
            context: 'capture',
            confidence: getConfidenceForModality(capture.modality, 'reaction'),
          },
        });

        positionIds.push(position.id);

        if (conceptIds.length > 0) {
          const confidence = getConfidenceForModality(capture.modality, 'reaction');
          await updateBeliefGraph(
            capture.userId,
            claim.id,
            decision.stance,
            conceptIds,
            confidence
          );
        }
      }
    }

    if (feedbackRecords.length > 0) {
      await tx.extractionFeedback.createMany({
        data: feedbackRecords,
      });
    }

    await tx.capture.update({
      where: { id: captureId },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
      },
    });
  });

  return { claimIds, positionIds };
}

export async function processCapture(captureId: string): Promise<void> {
  const capture = await db.capture.findUnique({
    where: { id: captureId },
    include: { source: true },
  });

  if (!capture) {
    throw new Error('Capture not found');
  }

  // Bare share with no reaction and no audio: park as awaiting_reaction.
  if (!capture.rawText && !capture.rawAudioUrl && !capture.source?.transcriptText) {
    await db.capture.update({
      where: { id: captureId },
      data: { status: 'awaiting_reaction' },
    });
    return;
  }

  try {
    await db.capture.update({
      where: { id: captureId },
      data: { status: 'processing' },
    });

    let workingRawText = capture.rawText;

    // Voice modality: transcribe first if we don't already have text.
    if (
      capture.modality === 'voice' &&
      capture.rawAudioUrl &&
      !workingRawText
    ) {
      const transcript = await transcribeAudio(capture.rawAudioUrl);
      if (transcript) {
        workingRawText = transcript;
        await db.capture.update({
          where: { id: captureId },
          data: { rawText: transcript },
        });

        // Best-effort: if transcript references a known source, attach it.
        // Runs in parallel — does not block confirmation.
        resolveSpokenSource(transcript)
          .then(async (resolved) => {
            if (!resolved || capture.sourceId) return;
            const newSource = await db.source.create({
              data: {
                userId: capture.userId,
                url: resolved.url || `voice://${captureId}`,
                title: resolved.title,
                outlet: resolved.outlet,
                contentType: resolved.contentType,
                surface: 'voice_capture',
                transcriptText: transcript,
                consumedAt: new Date(),
              },
            });
            await db.capture.update({
              where: { id: captureId },
              data: { sourceId: newSource.id },
            });
          })
          .catch((err) => console.error('Source resolution failed:', err));
      }
    }

    const normalized = normalizeInput({
      rawText: workingRawText,
      source: capture.source,
    });

    const mode = capture.modality === 'voice' ? 'spoken' : 'written';
    const candidates = await extractCandidateClaims(normalized, capture.userId, mode);

    if (normalized.text && candidates.length > 0) {
      for (const candidate of candidates) {
        if (!candidate.aiStance) {
          const stance = await classifyStance(candidate.text, normalized.text);
          candidate.aiStance = stance;
        }
      }
    }

    if (candidates.length === 0) {
      await db.capture.update({
        where: { id: captureId },
        data: {
          status: 'awaiting_reaction',
          candidateClaims: [],
        },
      });

      // Voice captures always notify the user when ready, even on empty result.
      if (capture.modality === 'voice') {
        sendCaptureReadyNotification(capture.userId, {
          captureId,
          modality: capture.modality,
          claimCount: 0,
        }).catch((err) => console.error('Push notification failed:', err));
      }
      return;
    }

    await db.capture.update({
      where: { id: captureId },
      data: {
        status: 'awaiting_confirmation',
        candidateClaims: candidates as unknown as object,
      },
    });

    // Async-confirmation: voice captures fire-and-forget the push so the user
    // can come back to confirm; share-sheet stays in foreground and skips push.
    if (capture.modality === 'voice') {
      sendCaptureReadyNotification(capture.userId, {
        captureId,
        modality: capture.modality,
        claimCount: candidates.length,
      }).catch((err) => console.error('Push notification failed:', err));
    }
  } catch (error) {
    console.error('Capture processing error:', error);
    await db.capture.update({
      where: { id: captureId },
      data: {
        status: 'failed',
        errorReason: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

export async function dismissCapture(captureId: string): Promise<void> {
  await db.capture.update({
    where: { id: captureId },
    data: { status: 'dismissed' },
  });
}
