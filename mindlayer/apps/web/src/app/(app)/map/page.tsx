"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { BeliefMap } from "@/components/belief-map";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface MapNode {
  id: string;
  label: string;
  type: string;
  direction: string;
  strength: number;
  stability: number;
  echoFlagged: boolean;
  positionCount: number;
}

interface MapEdge {
  source: string;
  target: string;
  type: "tension" | "related";
  weight: number;
}

interface ClusterData {
  id: string;
  label: string;
  nodeIds: string[];
  dominantDirection: string;
}

interface MapResponse {
  nodes: MapNode[];
  edges: MapEdge[];
  clusters: ClusterData[];
  stats: {
    totalConcepts: number;
    echoFlaggedCount: number;
    tensionCount: number;
    averageStrength: number;
  };
}

export default function MapPage() {
  const [mapData, setMapData] = useState<MapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMap = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/map");
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error("Failed to fetch map");
      }
      const data = await response.json();
      setMapData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMap();
  }, [fetchMap]);

  const transformedData = useMemo(() => {
    if (!mapData) return null;

    const nodeMap = new Map(mapData.nodes.map(n => [n.id, n]));

    const clusters = mapData.clusters.map(cluster => {
      const concepts = cluster.nodeIds
        .map(id => nodeMap.get(id))
        .filter((n): n is MapNode => !!n)
        .map(n => ({
          id: n.id,
          label: n.label,
          type: n.type,
          positionCount: n.positionCount,
          direction: n.direction,
          strength: n.strength,
        }));

      const centerConcept = concepts.reduce((max, c) => 
        c.positionCount > max.positionCount ? c : max,
        concepts[0] || { id: "", label: cluster.label, positionCount: 0 }
      );

      return {
        id: cluster.id,
        type: cluster.dominantDirection,
        concepts,
        centerConcept,
        engagementDepth: concepts.reduce((sum, c) => sum + c.strength, 0) / concepts.length,
        positionConsistency: 0.8,
      };
    });

    const beliefs = mapData.nodes.map(n => ({
      id: n.id,
      conceptId: n.id,
      conceptLabel: n.label,
      direction: n.direction,
      strength: n.strength,
      stability: n.stability,
      positionCount: n.positionCount,
      echoFlagged: n.echoFlagged,
    }));

    const tensions = mapData.edges
      .filter(e => e.type === "tension")
      .map((e, idx) => ({
        id: `tension-${idx}`,
        beliefA: { 
          conceptId: e.source, 
          label: nodeMap.get(e.source)?.label || e.source 
        },
        beliefB: { 
          conceptId: e.target, 
          label: nodeMap.get(e.target)?.label || e.target 
        },
        tensionType: "implicit_tension" as const,
        resolved: false,
      }));

    return { clusters, beliefs, tensions };
  }, [mapData]);

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Belief Map
          </h1>
          <p className="text-zinc-500">
            A living landscape of your thinking. Click concepts to explore.
          </p>
        </div>
        <Button variant="outline" onClick={fetchMap} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchMap}>Try again</Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : transformedData ? (
        <BeliefMap
          clusters={transformedData.clusters}
          beliefs={transformedData.beliefs}
          tensions={transformedData.tensions}
        />
      ) : null}
    </div>
  );
}
