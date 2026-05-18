import { NextRequest, NextResponse } from 'next/server';
import {
  getBeliefMap,
  clusterMapNodes,
  getMapReadiness,
  mergeSmallConcepts,
} from '@/lib/services/belief-graph';
import { evaluateConceptQuality } from '@/lib/services/concept-resolver';
import { getAuthFromRequest } from '@/lib/auth';

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

    const { nodes: rawNodes, edges: rawEdges, categories } = await getBeliefMap(userId);
    
    // Filter out low-quality concepts at display time
    const qualityFilteredNodes = rawNodes.filter(node => {
      const quality = evaluateConceptQuality(node.label);
      return quality.isValid;
    });
    
    // Also filter edges to only include connections between valid nodes
    const validNodeIds = new Set(qualityFilteredNodes.map(n => n.id));
    const qualityFilteredEdges = rawEdges.filter(
      edge => validNodeIds.has(edge.source) && validNodeIds.has(edge.target)
    );
    
    const readiness = await getMapReadiness(userId, { nodes: qualityFilteredNodes, edges: qualityFilteredEdges });
    
    const { nodes: mergedNodes, edges: mergedEdges, mergedInto } = mergeSmallConcepts(
      qualityFilteredNodes,
      qualityFilteredEdges,
      3
    );
    
    const clusters = clusterMapNodes(mergedNodes, mergedEdges);

    const filteredOutCount = rawNodes.length - qualityFilteredNodes.length;
    
    return NextResponse.json({
      nodes: mergedNodes,
      edges: mergedEdges,
      clusters,
      categories,
      mergedInto,
      stats: {
        totalConcepts: rawNodes.length,
        qualityFilteredOut: filteredOutCount,
        visiblePlanets: mergedNodes.length,
        echoFlaggedCount: mergedNodes.filter(n => n.echoFlagged).length,
        tensionCount: mergedEdges.filter(e => e.type === 'tension').length,
        averageStrength:
          mergedNodes.length > 0
            ? mergedNodes.reduce((sum, n) => sum + n.strength, 0) / mergedNodes.length
            : 0,
      },
      readiness,
    });
  } catch (error) {
    console.error('Map error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch map data' },
      { status: 500 }
    );
  }
}
