export interface ClusterForLayout {
  id: string;
  nodeIds: string[];
}

interface MapNode {
  id: string;
  label: string;
}

/**
 * Place map clusters in the plane. Cluster membership matches the API: connected components
 * over tension + related edges (`clusterMapNodes` in `belief-graph.ts`).
 * Multi-node components get a local mini-ring; singletons share an outer ring.
 */
export function computeClusterLayout(
  nodes: MapNode[],
  clusters: ClusterForLayout[],
  width: number,
  height: number,
): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const n = nodes.length;
  if (n === 0) return out;

  const cx = width / 2;
  const cy = height / 2;
  const minDim = Math.min(width, height);

  const nodeSet = new Set(nodes.map(nd => nd.id));
  const validClusters = clusters.filter(c => c.nodeIds.some(id => nodeSet.has(id)));

  const multi = validClusters.filter(c => c.nodeIds.filter(id => nodeSet.has(id)).length > 1);
  const singletonClusterIds = new Set(
    validClusters.filter(c => c.nodeIds.filter(id => nodeSet.has(id)).length === 1).flatMap(c => c.nodeIds),
  );

  const multiNodes = new Set<string>();
  for (const c of multi) {
    for (const id of c.nodeIds) {
      if (nodeSet.has(id)) multiNodes.add(id);
    }
  }

  const singletons = nodes.filter(nd => !multiNodes.has(nd.id)).map(nd => nd.id);

  const R_group = minDim * 0.26;
  const r_mini = minDim * 0.11;
  const R_outer = minDim * 0.34;

  let angleCursor = -Math.PI / 2;

  if (multi.length === 0) {
    const r = minDim * (n <= 4 ? 0.22 : n <= 8 ? 0.28 : 0.32);
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      out[node.id] = {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });
    return out;
  }

  const sector = (2 * Math.PI) / Math.max(multi.length, 1);

  multi.forEach((cluster, ci) => {
    const members = cluster.nodeIds.filter(id => nodeSet.has(id));
    const theta = angleCursor + sector / 2;
    angleCursor += sector;

    const gcx = cx + R_group * Math.cos(theta);
    const gcy = cy + R_group * Math.sin(theta);
    const m = members.length;
    members.forEach((id, j) => {
      const a = (2 * Math.PI * j) / m - Math.PI / 2;
      out[id] = {
        x: gcx + r_mini * Math.cos(a),
        y: gcy + r_mini * Math.sin(a),
      };
    });
  });

  singletons.forEach((id, j) => {
    const angle = (2 * Math.PI * j) / Math.max(singletons.length, 1) - Math.PI / 2;
    out[id] = {
      x: cx + R_outer * Math.cos(angle),
      y: cy + R_outer * Math.sin(angle),
    };
  });

  return out;
}
