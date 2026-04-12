import Anthropic from '@anthropic-ai/sdk';
import { Prisma } from '@prisma/client';
import db from '@/lib/db';
import { fetchArticleContent } from './content-fetch';

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }
  return anthropicClient;
}

const MODEL_VERSION = 'claude-sonnet-4-20250514';

export interface SourceChainNode {
  url: string;
  title: string;
  outlet: string;
  author?: string;
  publishedAt?: string;
  claimText?: string;
  confidence: number;
  nodeType: 'primary' | 'cited' | 'origin';
}

export interface SourceChain {
  chainNodes: SourceChainNode[];
  originSource: SourceChainNode | null;
  chainConfidence: number;
  analysisNotes: string;
}

const CITATION_EXTRACTION_PROMPT = `You are an expert at tracing the origins of claims and ideas through their citation chains.

Given a claim and the content where it appeared, identify:
1. Direct quotes or citations mentioned in the text
2. References to other sources, studies, or reports
3. Attribution to specific people, organizations, or publications
4. The apparent origin of the idea (if traceable)

For each citation or reference found, extract:
- The source name/outlet
- Author if mentioned
- Any URLs if present
- The specific claim being attributed

Respond in JSON format:
{
  "citations": [
    {
      "sourceType": "direct_quote" | "study_reference" | "organization_claim" | "attributed_statement",
      "outlet": "Publication or organization name",
      "author": "Author name if available",
      "url": "URL if mentioned",
      "claimText": "The specific claim attributed to this source",
      "confidence": 0.0-1.0
    }
  ],
  "apparentOrigin": {
    "outlet": "Original source if identifiable",
    "confidence": 0.0-1.0,
    "reasoning": "Why this appears to be the origin"
  },
  "analysisNotes": "Brief analysis of the citation chain"
}`;

export async function buildSourceChain(claimId: string): Promise<SourceChain | null> {
  const claim = await db.claim.findUnique({
    where: { id: claimId },
    include: {
      source: true,
    },
  });

  if (!claim) return null;

  const primaryNode: SourceChainNode = {
    url: claim.source.url,
    title: claim.source.title || 'Unknown',
    outlet: claim.source.outlet || 'Unknown',
    author: claim.source.author || undefined,
    publishedAt: claim.source.publishedAt?.toISOString(),
    claimText: claim.text,
    confidence: 1.0,
    nodeType: 'primary',
  };

  const chainNodes: SourceChainNode[] = [primaryNode];

  let sourceContent: string | null = null;
  try {
    const fetchedContent = await fetchArticleContent(claim.source.url);
    sourceContent = fetchedContent?.text || null;
  } catch (error) {
    console.error('Failed to fetch source content:', error);
  }

  if (sourceContent) {
    try {
      const response = await getAnthropic().messages.create({
        model: MODEL_VERSION,
        max_tokens: 1500,
        temperature: 0.2,
        system: CITATION_EXTRACTION_PROMPT + '\n\nRespond ONLY with valid JSON. No markdown fences, no commentary.',
        messages: [
          { 
            role: 'user', 
            content: `Claim: "${claim.text}"\n\nSource content:\n${sourceContent.slice(0, 10000)}`
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const result = JSON.parse(text);

      for (const citation of (result.citations || [])) {
        if (citation.confidence >= 0.5) {
          chainNodes.push({
            url: citation.url || '',
            title: citation.outlet || 'Unknown',
            outlet: citation.outlet || 'Unknown',
            author: citation.author,
            claimText: citation.claimText,
            confidence: citation.confidence,
            nodeType: 'cited',
          });
        }
      }

      let originSource: SourceChainNode | null = null;
      if (result.apparentOrigin?.confidence >= 0.6) {
        originSource = {
          url: '',
          title: result.apparentOrigin.outlet,
          outlet: result.apparentOrigin.outlet,
          confidence: result.apparentOrigin.confidence,
          nodeType: 'origin',
        };
      }

      const avgConfidence = chainNodes.reduce((sum, n) => sum + n.confidence, 0) / chainNodes.length;
      const chainConfidence = originSource 
        ? (avgConfidence + originSource.confidence) / 2 
        : avgConfidence * 0.8;

      return {
        chainNodes,
        originSource,
        chainConfidence,
        analysisNotes: result.analysisNotes || '',
      };
    } catch (error) {
      console.error('Citation extraction error:', error);
    }
  }

  return {
    chainNodes,
    originSource: null,
    chainConfidence: 0.5,
    analysisNotes: 'Unable to trace citations - content not available or analysis failed',
  };
}

export async function saveSourceChain(
  claimId: string,
  chain: SourceChain
): Promise<void> {
  await db.claimChain.upsert({
    where: { claimId },
    create: {
      claimId,
      chainNodes: chain.chainNodes as unknown as Prisma.InputJsonValue,
      originSource: chain.originSource as unknown as Prisma.InputJsonValue,
      chainConfidence: chain.chainConfidence,
      generatedAt: new Date(),
    },
    update: {
      chainNodes: chain.chainNodes as unknown as Prisma.InputJsonValue,
      originSource: chain.originSource as unknown as Prisma.InputJsonValue,
      chainConfidence: chain.chainConfidence,
      generatedAt: new Date(),
    },
  });
}

export async function buildAndSaveSourceChain(claimId: string): Promise<SourceChain | null> {
  const chain = await buildSourceChain(claimId);
  
  if (chain) {
    await saveSourceChain(claimId, chain);
  }
  
  return chain;
}

export async function queueChainBuildingForHighEngagement(
  sourceId: string
): Promise<number> {
  const claims = await db.claim.findMany({
    where: {
      sourceId,
      claimChain: null,
    },
    include: {
      positions: {
        where: {
          stance: { in: ['agree', 'disagree'] },
        },
      },
    },
  });

  const engagedClaims = claims.filter(c => c.positions.length > 0);
  
  let built = 0;
  for (const claim of engagedClaims.slice(0, 3)) {
    try {
      await buildAndSaveSourceChain(claim.id);
      built++;
    } catch (error) {
      console.error(`Failed to build chain for claim ${claim.id}:`, error);
    }
  }
  
  return built;
}
