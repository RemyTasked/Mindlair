import { NextRequest, NextResponse } from 'next/server';
import { getBeliefMap } from '@/lib/services/belief-graph';
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

    const clusters = clusterNodes(nodes, edges);

    return NextResponse.json({
      nodes,
      edges,
      clusters,
      stats: {
        totalConcepts: nodes.length,
        echoFlaggedCount: nodes.filter(n => n.echoFlagged).length,
        tensionCount: edges.filter(e => e.type === 'tension').length,
        averageStrength: nodes.length > 0 
          ? nodes.reduce((sum, n) => sum + n.strength, 0) / nodes.length 
          : 0,
      },
    });
  } catch (error) {
    console.error('Map error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch map data' },
      { status: 500 }
    );
  }
}

interface ClusterResult {
  id: string;
  label: string;
  nodeIds: string[];
  dominantDirection: string;
}

function clusterNodes(
  nodes: { id: string; label: string; direction: string }[],
  edges: { source: string; target: string }[]
): ClusterResult[] {
  if (nodes.length === 0) return [];

  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const visited = new Set<string>();
  const clusters: ClusterResult[] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const cluster: string[] = [];
    const queue = [node.id];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      
      visited.add(current);
      cluster.push(current);

      const neighbors = adjacency.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    if (cluster.length > 0) {
      const clusterNodes = nodes.filter(n => cluster.includes(n.id));
      const directions = clusterNodes.map(n => n.direction);
      const dominantDirection = mode(directions) || 'mixed';
      const primaryLabel = clusterNodes
        .sort((a, b) => b.label.length - a.label.length)[0]?.label || 'Cluster';

      clusters.push({
        id: `cluster-${clusters.length}`,
        label: primaryLabel,
        nodeIds: cluster,
        dominantDirection,
      });
    }
  }

  return clusters;
}

function mode(arr: string[]): string | undefined {
  const counts = new Map<string, number>();
  let maxCount = 0;
  let maxValue: string | undefined;

  for (const val of arr) {
    const count = (counts.get(val) || 0) + 1;
    counts.set(val, count);
    if (count > maxCount) {
      maxCount = count;
      maxValue = val;
    }
  }

  return maxValue;
}
