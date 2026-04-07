import { NextRequest, NextResponse } from 'next/server';
import {
  getBeliefMap,
  clusterMapNodes,
  getMapReadiness,
  mergeSmallConcepts,
} from '@/lib/services/belief-graph';
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

    const { nodes: rawNodes, edges: rawEdges } = await getBeliefMap(userId);
    const readiness = await getMapReadiness(userId, { nodes: rawNodes, edges: rawEdges });
    
    const { nodes: mergedNodes, edges: mergedEdges, mergedInto } = mergeSmallConcepts(
      rawNodes,
      rawEdges,
      3
    );
    
    const clusters = clusterMapNodes(mergedNodes, mergedEdges);

    return NextResponse.json({
      nodes: mergedNodes,
      edges: mergedEdges,
      clusters,
      mergedInto,
      stats: {
        totalConcepts: rawNodes.length,
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
