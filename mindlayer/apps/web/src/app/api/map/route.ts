import { NextRequest, NextResponse } from 'next/server';
import {
  getBeliefMap,
  clusterMapNodes,
  getMapReadiness,
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

    const { nodes, edges } = await getBeliefMap(userId);
    const readiness = await getMapReadiness(userId, { nodes, edges });
    const clusters = clusterMapNodes(nodes, edges);

    return NextResponse.json({
      nodes,
      edges,
      clusters,
      stats: {
        totalConcepts: nodes.length,
        echoFlaggedCount: nodes.filter(n => n.echoFlagged).length,
        tensionCount: edges.filter(e => e.type === 'tension').length,
        averageStrength:
          nodes.length > 0
            ? nodes.reduce((sum, n) => sum + n.strength, 0) / nodes.length
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
