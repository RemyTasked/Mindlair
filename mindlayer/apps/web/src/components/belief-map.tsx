"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, X } from "lucide-react";

interface Concept {
  id: string;
  label: string;
  type: string;
  positionCount: number;
  direction: string;
  strength: number;
}

interface Cluster {
  id: string;
  type: string;
  concepts: Concept[];
  centerConcept: { id: string; label: string; positionCount: number };
  engagementDepth: number;
  positionConsistency: number;
}

interface Belief {
  id: string;
  conceptId: string;
  conceptLabel: string;
  direction: string;
  strength: number;
  stability: number;
  positionCount: number;
  echoFlagged: boolean;
}

interface Tension {
  id: string;
  beliefA: { conceptId: string; label: string };
  beliefB: { conceptId: string; label: string };
  tensionType: 'implicit_tension' | 'direct_contradiction';
  resolved: boolean;
  metadata?: {
    explanation?: string;
    confidence?: number;
    claimAText?: string;
    claimBText?: string;
  };
}

interface BeliefMapProps {
  clusters: Cluster[];
  beliefs: Belief[];
  tensions: Tension[];
}

export function BeliefMap({ clusters, beliefs, tensions }: BeliefMapProps) {
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [hoveredConcept, setHoveredConcept] = useState<string | null>(null);

  const conceptMap = useMemo(() => {
    const map = new Map<string, Concept>();
    clusters.forEach((cluster) => {
      cluster.concepts.forEach((concept) => {
        map.set(concept.id, concept);
      });
    });
    return map;
  }, [clusters]);

  const beliefMap = useMemo(() => {
    return new Map(beliefs.map((b) => [b.conceptId, b]));
  }, [beliefs]);

  const selectedBelief = selectedConcept ? beliefMap.get(selectedConcept) : null;
  const relatedTensions = selectedConcept
    ? tensions.filter(
        (t) =>
          t.beliefA.conceptId === selectedConcept ||
          t.beliefB.conceptId === selectedConcept
      )
    : [];

  if (clusters.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <p className="text-zinc-500 mb-4">
            Your belief map is empty. Start reading and reacting to build it.
          </p>
          <Button asChild>
            <a href="/inbox">Go to inbox</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Map visualization */}
      <div className="lg:col-span-2">
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="relative min-h-[500px]">
              {/* Cluster visualization */}
              <div className="flex flex-wrap gap-8 justify-center">
                {clusters.map((cluster) => (
                  <ClusterBubble
                    key={cluster.id}
                    cluster={cluster}
                    beliefMap={beliefMap}
                    selectedConcept={selectedConcept}
                    hoveredConcept={hoveredConcept}
                    onSelectConcept={setSelectedConcept}
                    onHoverConcept={setHoveredConcept}
                  />
                ))}
              </div>

              {/* Tension lines would be drawn here with SVG */}
              {tensions.length > 0 && (
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-xs text-zinc-400 text-center">
                    {tensions.filter((t) => !t.resolved).length} unresolved
                    tensions detected in your beliefs
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
          <LegendItem color="bg-emerald-500" label="Positive stance" />
          <LegendItem color="bg-rose-500" label="Negative stance" />
          <LegendItem color="bg-amber-500" label="Mixed/complicated" />
          <LegendItem color="bg-orange-500" label="Echo flagged" />
        </div>
      </div>

      {/* Detail panel */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {selectedBelief ? (
            <motion.div
              key={selectedBelief.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">
                      {selectedBelief.conceptLabel}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedConcept(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <DirectionIcon direction={selectedBelief.direction} />
                    <span className="font-medium capitalize">
                      {selectedBelief.direction} stance
                    </span>
                    {selectedBelief.echoFlagged && (
                      <Badge variant="warning" className="ml-auto">
                        Echo detected
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <StatBox
                      label="Strength"
                      value={`${Math.round(selectedBelief.strength * 100)}%`}
                    />
                    <StatBox
                      label="Stability"
                      value={`${Math.round(selectedBelief.stability * 100)}%`}
                    />
                    <StatBox
                      label="Positions"
                      value={selectedBelief.positionCount.toString()}
                    />
                    <StatBox
                      label="Type"
                      value={conceptMap.get(selectedBelief.conceptId)?.type || "topic"}
                    />
                  </div>

                  {relatedTensions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-zinc-500 mb-2">
                        Related Tensions
                      </h4>
                      <div className="space-y-2">
                        {relatedTensions.map((tension) => {
                          const isDirectContradiction = tension.tensionType === 'direct_contradiction';
                          const otherLabel = tension.beliefA.conceptId === selectedConcept
                            ? tension.beliefB.label
                            : tension.beliefA.label;
                          
                          return (
                            <div
                              key={tension.id}
                              className={cn(
                                "p-3 rounded-lg text-sm",
                                isDirectContradiction 
                                  ? "bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800"
                                  : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                              )}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className={cn(
                                  "w-4 h-4",
                                  isDirectContradiction ? "text-rose-500" : "text-amber-500"
                                )} />
                                <span className="font-medium">
                                  {isDirectContradiction ? 'Direct Contradiction' : 'Implicit Tension'}
                                </span>
                                <span className="text-zinc-500">with</span>
                                <strong>{otherLabel}</strong>
                              </div>
                              
                              {tension.metadata?.explanation && (
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 pl-6">
                                  {tension.metadata.explanation}
                                </p>
                              )}
                              
                              {tension.metadata?.confidence && (
                                <div className="flex items-center gap-2 mt-2 pl-6">
                                  <span className="text-xs text-zinc-400">Confidence:</span>
                                  <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full max-w-[100px]">
                                    <div 
                                      className={cn(
                                        "h-full rounded-full",
                                        isDirectContradiction ? "bg-rose-500" : "bg-amber-500"
                                      )}
                                      style={{ width: `${Math.round(tension.metadata.confidence * 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-zinc-400">
                                    {Math.round(tension.metadata.confidence * 100)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-zinc-400">
                    Click on a concept to see details
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-500">
              Map Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <StatBox label="Concepts" value={beliefs.length.toString()} />
            <StatBox label="Clusters" value={clusters.length.toString()} />
            <StatBox
              label="Echo Flagged"
              value={beliefs.filter((b) => b.echoFlagged).length.toString()}
            />
            <StatBox
              label="Tensions"
              value={tensions.filter((t) => !t.resolved).length.toString()}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClusterBubble({
  cluster,
  beliefMap,
  selectedConcept,
  hoveredConcept,
  onSelectConcept,
  onHoverConcept,
}: {
  cluster: Cluster;
  beliefMap: Map<string, Belief>;
  selectedConcept: string | null;
  hoveredConcept: string | null;
  onSelectConcept: (id: string | null) => void;
  onHoverConcept: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">
        {cluster.type}
      </p>
      <div className="relative flex flex-wrap gap-2 justify-center max-w-[250px]">
        {cluster.concepts.map((concept) => {
          const belief = beliefMap.get(concept.id);
          const isSelected = selectedConcept === concept.id;
          const isHovered = hoveredConcept === concept.id;

          return (
            <motion.button
              key={concept.id}
              onClick={() => onSelectConcept(isSelected ? null : concept.id)}
              onMouseEnter={() => onHoverConcept(concept.id)}
              onMouseLeave={() => onHoverConcept(null)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                getConceptColor(belief),
                isSelected && "ring-2 ring-offset-2 ring-zinc-900 dark:ring-zinc-100",
                isHovered && !isSelected && "scale-105"
              )}
              style={{
                fontSize: Math.max(11, Math.min(16, 10 + concept.positionCount)),
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {concept.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function getConceptColor(belief?: Belief): string {
  if (!belief) return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  
  if (belief.echoFlagged) {
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200";
  }
  
  switch (belief.direction) {
    case "positive":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
    case "negative":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200";
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
  }
}

function DirectionIcon({ direction }: { direction: string }) {
  switch (direction) {
    case "positive":
      return <TrendingUp className="w-5 h-5 text-emerald-500" />;
    case "negative":
      return <TrendingDown className="w-5 h-5 text-rose-500" />;
    default:
      return <Minus className="w-5 h-5 text-amber-500" />;
  }
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900">
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-3 h-3 rounded-full", color)} />
      <span className="text-zinc-500">{label}</span>
    </div>
  );
}
