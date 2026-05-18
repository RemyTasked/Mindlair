import db from '@/lib/db';

/**
 * Louvain community detection algorithm for clustering concepts in the belief graph.
 * This is used to identify distinct topic clusters in a user's map for rare card detection.
 */

interface GraphNode {
  id: string;
  label: string;
  community: number;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

interface Graph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  adjacency: Map<string, Map<string, number>>; // node -> neighbor -> weight
}

interface ClusterAssignment {
  conceptId: string;
  clusterId: string;
  clusterSize: number;
}

interface ClusterStats {
  clusterId: string;
  size: number;
  conceptIds: string[];
  labels: string[];
}

function buildAdjacencyMap(edges: GraphEdge[]): Map<string, Map<string, number>> {
  const adj = new Map<string, Map<string, number>>();
  
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, new Map());
    if (!adj.has(edge.target)) adj.set(edge.target, new Map());
    
    const sourceAdj = adj.get(edge.source)!;
    const targetAdj = adj.get(edge.target)!;
    
    sourceAdj.set(edge.target, (sourceAdj.get(edge.target) || 0) + edge.weight);
    targetAdj.set(edge.source, (targetAdj.get(edge.source) || 0) + edge.weight);
  }
  
  return adj;
}

function getTotalWeight(graph: Graph): number {
  return graph.edges.reduce((sum, e) => sum + e.weight, 0);
}

function getNodeDegree(graph: Graph, nodeId: string): number {
  const neighbors = graph.adjacency.get(nodeId);
  if (!neighbors) return 0;
  
  let degree = 0;
  for (const weight of neighbors.values()) {
    degree += weight;
  }
  return degree;
}

function getCommunityInternalWeight(
  graph: Graph,
  community: number,
  nodesByCommunity: Map<number, Set<string>>
): number {
  const communityNodes = nodesByCommunity.get(community);
  if (!communityNodes) return 0;
  
  let internalWeight = 0;
  for (const nodeId of communityNodes) {
    const neighbors = graph.adjacency.get(nodeId);
    if (!neighbors) continue;
    
    for (const [neighborId, weight] of neighbors) {
      if (communityNodes.has(neighborId)) {
        internalWeight += weight;
      }
    }
  }
  
  return internalWeight / 2; // Each edge counted twice
}

function getCommunityTotalDegree(
  graph: Graph,
  community: number,
  nodesByCommunity: Map<number, Set<string>>
): number {
  const communityNodes = nodesByCommunity.get(community);
  if (!communityNodes) return 0;
  
  let totalDegree = 0;
  for (const nodeId of communityNodes) {
    totalDegree += getNodeDegree(graph, nodeId);
  }
  
  return totalDegree;
}

function computeModularityGain(
  graph: Graph,
  nodeId: string,
  targetCommunity: number,
  nodesByCommunity: Map<number, Set<string>>,
  totalWeight: number
): number {
  const nodeDegree = getNodeDegree(graph, nodeId);
  const neighbors = graph.adjacency.get(nodeId);
  if (!neighbors || !totalWeight) return 0;
  
  const targetNodes = nodesByCommunity.get(targetCommunity) || new Set();
  
  let edgesToTarget = 0;
  for (const [neighborId, weight] of neighbors) {
    if (targetNodes.has(neighborId)) {
      edgesToTarget += weight;
    }
  }
  
  const targetTotalDegree = getCommunityTotalDegree(graph, targetCommunity, nodesByCommunity);
  
  // Modularity gain formula
  const m2 = 2 * totalWeight;
  const gain = edgesToTarget - (nodeDegree * targetTotalDegree) / m2;
  
  return gain / totalWeight;
}

function louvainPhase1(graph: Graph): boolean {
  const totalWeight = getTotalWeight(graph);
  if (totalWeight === 0) return false;
  
  // Build community membership map
  const nodesByCommunity = new Map<number, Set<string>>();
  for (const [nodeId, node] of graph.nodes) {
    if (!nodesByCommunity.has(node.community)) {
      nodesByCommunity.set(node.community, new Set());
    }
    nodesByCommunity.get(node.community)!.add(nodeId);
  }
  
  let improved = false;
  let hasChanges = true;
  let iterations = 0;
  const maxIterations = 100;
  
  while (hasChanges && iterations < maxIterations) {
    hasChanges = false;
    iterations++;
    
    for (const [nodeId, node] of graph.nodes) {
      const currentCommunity = node.community;
      const neighbors = graph.adjacency.get(nodeId);
      if (!neighbors) continue;
      
      // Find neighboring communities
      const neighborCommunities = new Set<number>();
      for (const [neighborId] of neighbors) {
        const neighborNode = graph.nodes.get(neighborId);
        if (neighborNode) {
          neighborCommunities.add(neighborNode.community);
        }
      }
      
      // Remove node from current community temporarily
      nodesByCommunity.get(currentCommunity)?.delete(nodeId);
      
      // Find best community
      let bestCommunity = currentCommunity;
      let bestGain = 0;
      
      for (const targetCommunity of neighborCommunities) {
        if (targetCommunity === currentCommunity) continue;
        
        const gain = computeModularityGain(
          graph,
          nodeId,
          targetCommunity,
          nodesByCommunity,
          totalWeight
        );
        
        if (gain > bestGain) {
          bestGain = gain;
          bestCommunity = targetCommunity;
        }
      }
      
      // Move node to best community
      if (bestCommunity !== currentCommunity && bestGain > 0.0001) {
        node.community = bestCommunity;
        if (!nodesByCommunity.has(bestCommunity)) {
          nodesByCommunity.set(bestCommunity, new Set());
        }
        nodesByCommunity.get(bestCommunity)!.add(nodeId);
        hasChanges = true;
        improved = true;
      } else {
        // Return node to original community
        nodesByCommunity.get(currentCommunity)?.add(nodeId);
      }
    }
  }
  
  return improved;
}

function renumberCommunities(graph: Graph): void {
  const communityMap = new Map<number, number>();
  let nextId = 0;
  
  for (const node of graph.nodes.values()) {
    if (!communityMap.has(node.community)) {
      communityMap.set(node.community, nextId++);
    }
    node.community = communityMap.get(node.community)!;
  }
}

export function runLouvain(
  nodes: Array<{ id: string; label: string }>,
  edges: Array<{ source: string; target: string; weight: number }>
): Map<string, number> {
  if (nodes.length === 0) return new Map();
  
  // Initialize graph
  const graph: Graph = {
    nodes: new Map(),
    edges: edges.filter(e => 
      nodes.some(n => n.id === e.source) && 
      nodes.some(n => n.id === e.target)
    ),
    adjacency: new Map(),
  };
  
  // Each node starts in its own community
  for (let i = 0; i < nodes.length; i++) {
    graph.nodes.set(nodes[i].id, {
      id: nodes[i].id,
      label: nodes[i].label,
      community: i,
    });
  }
  
  graph.adjacency = buildAdjacencyMap(graph.edges);
  
  // Run Louvain iterations
  let iteration = 0;
  const maxMainIterations = 10;
  
  while (iteration < maxMainIterations) {
    const improved = louvainPhase1(graph);
    if (!improved) break;
    renumberCommunities(graph);
    iteration++;
  }
  
  // Return community assignments
  const assignments = new Map<string, number>();
  for (const [nodeId, node] of graph.nodes) {
    assignments.set(nodeId, node.community);
  }
  
  return assignments;
}

export async function getUserConceptGraph(userId: string): Promise<{
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ source: string; target: string; weight: number }>;
}> {
  // Get user's beliefs (concepts they have positions on)
  const beliefs = await db.belief.findMany({
    where: { userId },
    include: {
      concept: true,
    },
  });
  
  const conceptIds = beliefs.map(b => b.conceptId);
  
  if (conceptIds.length === 0) {
    return { nodes: [], edges: [] };
  }
  
  // Get tensions between these concepts (conflict edges)
  const tensions = await db.tension.findMany({
    where: {
      OR: [
        { conceptAId: { in: conceptIds }, conceptBId: { in: conceptIds } },
      ],
    },
  });
  
  // Get co-occurrence edges (concepts appearing on same claims)
  const positions = await db.position.findMany({
    where: { userId },
    include: {
      claim: {
        include: {
          claimConcepts: true,
        },
      },
    },
  });
  
  // Count co-occurrences
  const cooccurrences = new Map<string, number>();
  for (const position of positions) {
    const claimConceptIds = position.claim.claimConcepts
      .map(cc => cc.conceptId)
      .filter(id => conceptIds.includes(id));
    
    for (let i = 0; i < claimConceptIds.length; i++) {
      for (let j = i + 1; j < claimConceptIds.length; j++) {
        const key = [claimConceptIds[i], claimConceptIds[j]].sort().join('|');
        cooccurrences.set(key, (cooccurrences.get(key) || 0) + 1);
      }
    }
  }
  
  // Build nodes
  const nodes = beliefs.map(b => ({
    id: b.conceptId,
    label: b.concept.label,
  }));
  
  // Build edges
  const edges: Array<{ source: string; target: string; weight: number }> = [];
  
  // Add tension edges (stronger weight)
  for (const tension of tensions) {
    edges.push({
      source: tension.conceptAId,
      target: tension.conceptBId,
      weight: 2, // Tensions are strong connections
    });
  }
  
  // Add co-occurrence edges (with count as weight)
  for (const [key, count] of cooccurrences) {
    if (count >= 2) { // Only include meaningful co-occurrences
      const [source, target] = key.split('|');
      
      // Don't double-add if already a tension edge
      const hasTension = edges.some(e =>
        (e.source === source && e.target === target) ||
        (e.source === target && e.target === source)
      );
      
      if (!hasTension) {
        edges.push({
          source,
          target,
          weight: Math.min(count, 5), // Cap weight
        });
      }
    }
  }
  
  return { nodes, edges };
}

export async function runLouvainClustering(userId: string): Promise<ClusterAssignment[]> {
  const graph = await getUserConceptGraph(userId);
  
  if (graph.nodes.length === 0) {
    return [];
  }
  
  const communityAssignments = runLouvain(graph.nodes, graph.edges);
  
  // Count cluster sizes
  const clusterSizes = new Map<number, number>();
  for (const community of communityAssignments.values()) {
    clusterSizes.set(community, (clusterSizes.get(community) || 0) + 1);
  }
  
  // Build assignments
  const assignments: ClusterAssignment[] = [];
  for (const [conceptId, community] of communityAssignments) {
    assignments.push({
      conceptId,
      clusterId: `cluster_${community}`,
      clusterSize: clusterSizes.get(community) || 1,
    });
  }
  
  return assignments;
}

export async function updateUserClusters(userId: string): Promise<ClusterStats[]> {
  const assignments = await runLouvainClustering(userId);
  
  if (assignments.length === 0) {
    return [];
  }
  
  // Group by cluster
  const clusterMap = new Map<string, ClusterAssignment[]>();
  for (const assignment of assignments) {
    if (!clusterMap.has(assignment.clusterId)) {
      clusterMap.set(assignment.clusterId, []);
    }
    clusterMap.get(assignment.clusterId)!.push(assignment);
  }
  
  // Update concept cluster assignments
  for (const assignment of assignments) {
    await db.concept.update({
      where: { id: assignment.conceptId },
      data: {
        clusterId: assignment.clusterId,
        clusterDepth: assignment.clusterSize,
      },
    });
  }
  
  // Build stats
  const stats: ClusterStats[] = [];
  for (const [clusterId, clusterAssignments] of clusterMap) {
    const conceptIds = clusterAssignments.map(a => a.conceptId);
    const concepts = await db.concept.findMany({
      where: { id: { in: conceptIds } },
      select: { label: true },
    });
    
    stats.push({
      clusterId,
      size: clusterAssignments.length,
      conceptIds,
      labels: concepts.map(c => c.label),
    });
  }
  
  return stats.sort((a, b) => b.size - a.size);
}

export function calculateGiniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  
  if (mean === 0) return 0;
  
  let sumOfAbsoluteDifferences = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumOfAbsoluteDifferences += Math.abs(sorted[i] - sorted[j]);
    }
  }
  
  return sumOfAbsoluteDifferences / (2 * n * n * mean);
}

export async function getClusterStats(userId: string): Promise<{
  clusterCount: number;
  maxClusterDepth: number;
  clusterSizes: number[];
  giniCoefficient: number;
}> {
  const beliefs = await db.belief.findMany({
    where: { userId },
    include: {
      concept: {
        select: { clusterId: true, clusterDepth: true },
      },
    },
  });
  
  if (beliefs.length === 0) {
    return {
      clusterCount: 0,
      maxClusterDepth: 0,
      clusterSizes: [],
      giniCoefficient: 0,
    };
  }
  
  // Group by cluster
  const clusterSizeMap = new Map<string, number>();
  for (const belief of beliefs) {
    const clusterId = belief.concept.clusterId || 'unclustered';
    clusterSizeMap.set(clusterId, (clusterSizeMap.get(clusterId) || 0) + 1);
  }
  
  const clusterSizes = Array.from(clusterSizeMap.values());
  const maxClusterDepth = Math.max(...clusterSizes, 0);
  const giniCoefficient = calculateGiniCoefficient(clusterSizes);
  
  return {
    clusterCount: clusterSizeMap.size,
    maxClusterDepth,
    clusterSizes,
    giniCoefficient,
  };
}
