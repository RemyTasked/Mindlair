"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { computeOrganicLayout, categoryColor, formatCategoryLabel, type OrganicPosition } from "@/lib/map/organic-layout";
import {
  interpolateTimelineActivity,
  filterEdgesGated,
  activityToVisual,
  maxCountInActivity,
  discoveryForIndex,
  type TimelineSnapshot,
  type LerpedConceptActivity,
} from "@/lib/map/timeline-scrub";
import MapTimelineScrubber from "@/components/map-timeline-scrubber";

interface UserCategory {
  name: string;
  conceptCount: number;
  positionCount: number;
  color: string;
}

/** Mirrors `/api/map` + belief-graph shapes (client-safe; do not import belief-graph here). */
interface MapNode {
  id: string;
  label: string;
  type: "concept";
  direction: string;
  strength: number;
  stability: number;
  echoFlagged: boolean;
  positionCount: number;
  category: string;
  mergedFrom?: string[];
  totalPositionCount?: number;
}

interface MapEdge {
  source: string;
  target: string;
  type: "tension" | "related";
  weight: number;
}

export interface MapCluster {
  id: string;
  label: string;
  nodeIds: string[];
  dominantDirection: string;
}

interface MapReadiness {
  discoveryClaimCount: number;
  sourceRichClusterCount: number;
  usePersonalMap: boolean;
}

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#d4915a",
  accentDim: "#6b4a2a",
  accentGlow: "#d4915a30",
  blue: "#6b9fc4",
  amber: "#d4915a",
  amberDim: "#7a4a20",
  green: "#a3c47a",
  rose: "#e57373",
  chipBlue: "#4a9eff",
};

const POS_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  positive: { fill: "#3d2a1a", stroke: "#d4915a", label: "Generally agrees" },
  negative: { fill: "#3d2010", stroke: "#d4915a", label: "Generally disagrees" },
  mixed: { fill: "#1a2a3d", stroke: "#6b9fc4", label: "Ambivalent / mixed" },
};

const ANIM_CSS = `
  @keyframes pb-breathe {
    0%, 100% { opacity: 0.06; }
    50%      { opacity: 0.14; }
  }
  @keyframes pb-pulse-ring {
    0%, 100% { stroke-opacity: 0.35; }
    50%      { stroke-opacity: 0.55; }
  }
  @keyframes pb-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

function formatLastActive(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

export type MapApiPayload = {
  nodes: MapNode[];
  edges: MapEdge[];
  clusters: MapCluster[];
  categories?: UserCategory[];
  mergedInto?: Record<string, string>;
  stats: {
    totalConcepts: number;
    visiblePlanets?: number;
    echoFlaggedCount: number;
    tensionCount: number;
    averageStrength: number;
  };
  readiness: MapReadiness;
};

export type MapTimelinePayload = {
  snapshots: TimelineSnapshot[];
  interval: string;
  dateRange?: { start?: string; end?: string };
};

function stanceForNode(node: Pick<MapNode, "direction">): string {
  const d = node.direction;
  if (d === "positive" || d === "negative" || d === "mixed") return d;
  return "mixed";
}

interface MapRecentPosition {
  stance: string;
  context: string;
  createdAt: string;
  claim: { id: string; textPreview: string; contributingConcepts?: string[] };
}

function reactionStanceChip(stance: string): { label: string; bg: string; color: string } {
  switch (stance) {
    case "agree":
      return { label: "Agree", bg: `${C.green}22`, color: C.green };
    case "disagree":
      return { label: "Disagree", bg: `${C.rose}22`, color: C.rose };
    case "complicated":
      return { label: "Complicated", bg: `${C.chipBlue}22`, color: C.chipBlue };
    default:
      return { label: stance, bg: C.bg, color: C.muted };
  }
}

interface ConceptSummary {
  reactionCount: number;
  sourceCount: number;
  lastActive: string | null;
  sources: Array<{ id: string; title: string; url: string; outlet: string | null; date: string; stance: string }>;
  insightText: string | null;
  engagementByMonth: Array<{ month: string; count: number }>;
  belief: {
    direction: string;
    strength: number;
    stability: number;
    echoFlagged: boolean;
  } | null;
}

interface TensionRow {
  otherId: string;
  otherLabel: string;
  tensionType: string;
  surfacedCount: number;
  resolved: boolean;
  explanation: string | null;
}

export default function PersonalBeliefMap({
  payload,
  timeline,
}: {
  payload: MapApiPayload;
  timeline?: MapTimelinePayload | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 900, h: 520 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapNode | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentPositions, setRecentPositions] = useState<MapRecentPosition[] | null>(null);
  const [recentError, setRecentError] = useState(false);
  const [timeValue, setTimeValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoverSummary, setHoverSummary] = useState<ConceptSummary | null>(null);
  const [detailSummary, setDetailSummary] = useState<ConceptSummary | null>(null);
  const [tensionRows, setTensionRows] = useState<TensionRow[] | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [showTension, setShowTension] = useState(false);

  const { nodes, edges, clusters, categories, stats, readiness } = payload;
  const snapshots = timeline?.snapshots ?? [];
  const useTimeline = snapshots.length >= 2;
  
  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (categories) {
      for (const cat of categories) {
        map.set(cat.name, cat.color);
      }
    }
    return map;
  }, [categories]);
  
  const getCatColor = useCallback((catName: string): string => {
    return categoryColorMap.get(catName) || categoryColor(catName);
  }, [categoryColorMap]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const syncNarrow = () => setIsNarrow(mq.matches);
    syncNarrow();
    mq.addEventListener("change", syncNarrow);
    return () => mq.removeEventListener("change", syncNarrow);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const reserve = useTimeline ? 260 : 160;
      setDims({ w: r.width, h: Math.max(320, Math.min(r.height - reserve, 540)) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [useTimeline]);

  const maxIdx = Math.max(0, snapshots.length - 1);

  useEffect(() => {
    if (useTimeline) setTimeValue(maxIdx);
  }, [useTimeline, maxIdx]);

  const nodeLabelMap = useMemo(
    () => new Map(nodes.map(n => [n.id, n.label])),
    [nodes],
  );

  const activity = useMemo(() => {
    if (!useTimeline) return new Map<string, LerpedConceptActivity>();
    let act = interpolateTimelineActivity(snapshots, timeValue, nodeLabelMap);
    for (const n of nodes) {
      if (!act.has(n.id)) {
        act.set(n.id, { positionCount: 0, direction: n.direction, label: n.label });
      }
    }
    return act;
  }, [useTimeline, snapshots, timeValue, nodeLabelMap, nodes]);

  const maxC = useMemo(() => (useTimeline ? maxCountInActivity(activity) : 1), [useTimeline, activity]);

  const effectiveEdges = useMemo(() => {
    if (!useTimeline) return edges;
    return filterEdgesGated(
      edges.map(e => ({ ...e })),
      activity,
      1,
    );
  }, [useTimeline, edges, activity]);

  const organicLayout = useMemo(() => {
    const mergedNodes = nodes.map(n => ({
      ...n,
      mergedFrom: n.mergedFrom || [],
      totalPositionCount: n.totalPositionCount ?? n.positionCount,
    }));
    return computeOrganicLayout(mergedNodes, categories || [], dims.w, dims.h);
  }, [nodes, categories, dims.w, dims.h]);

  const nodePos = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {};
    for (const node of nodes) {
      const pos = organicLayout[node.id];
      if (pos) {
        out[node.id] = { x: pos.x, y: pos.y };
      }
    }
    return out;
  }, [nodes, organicLayout]);

  const activeCount = useMemo(() => {
    if (!useTimeline) return nodes.length;
    return nodes.filter(n => {
      const v = activityToVisual(activity.get(n.id), maxC);
      return v.opacity > 0.42;
    }).length;
  }, [useTimeline, nodes, activity, maxC]);

  const peakCount = useMemo(() => {
    if (!useTimeline) return nodes.filter(n => n.strength >= 0.65).length;
    return nodes.filter(n => {
      const c = activity.get(n.id)?.positionCount ?? 0;
      return maxC > 0 && c >= maxC * 0.72;
    }).length;
  }, [useTimeline, nodes, activity, maxC]);

  const discoveryText = useMemo(() => {
    if (!useTimeline || snapshots.length < 2) return null;
    const idx = Math.min(Math.max(0, Math.round(timeValue)), snapshots.length - 1);
    return discoveryForIndex(snapshots, idx);
  }, [useTimeline, snapshots, timeValue]);

  const visForNode = useCallback(
    (node: MapNode) => {
      if (!useTimeline) {
        return { sizeMult: 1, opacity: 1, direction: node.direction };
      }
      const act = activity.get(node.id);
      const v = activityToVisual(act, maxC);
      return {
        sizeMult: v.sizeMult,
        opacity: v.opacity,
        direction: act && act.positionCount > 0 ? act.direction : node.direction,
      };
    },
    [useTimeline, activity, maxC],
  );

  /** Timeline scrub: weak topics drift slightly outward from center (landing-map parity). */
  const displayPos = useMemo(() => {
    if (!useTimeline) return nodePos;
    const cx = dims.w / 2;
    const cy = dims.h / 2;
    const minD = Math.min(dims.w, dims.h);
    const out: Record<string, { x: number; y: number }> = {};
    for (const node of nodes) {
      const p = nodePos[node.id];
      if (!p) continue;
      const vis = visForNode(node);
      const fade = Math.max(0, 1 - vis.sizeMult);
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const push = fade * minD * 0.07;
      out[node.id] = {
        x: p.x + (dx / dist) * push,
        y: p.y + (dy / dist) * push,
      };
    }
    return out;
  }, [useTimeline, nodePos, nodes, dims.w, dims.h, visForNode]);

  const curveOffsets = useMemo(
    () =>
      effectiveEdges.map((_, i) => ({
        ox: Math.sin(i * 2.7 + 1.3) * 36,
        oy: Math.cos(i * 3.1 + 0.7) * 36,
      })),
    [effectiveEdges],
  );

  const nodeById = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const clusterForNode = useMemo(() => {
    const m = new Map<string, MapCluster>();
    for (const c of clusters) {
      for (const id of c.nodeIds) {
        m.set(id, c);
      }
    }
    return m;
  }, [clusters]);

  useEffect(() => {
    if (!hoveredId) {
      setHoverSummary(null);
      return;
    }
    const t = window.setTimeout(() => {
      fetch(`/api/map/concept-summary?conceptId=${encodeURIComponent(hoveredId)}`)
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data) setHoverSummary(data as ConceptSummary);
        })
        .catch(() => setHoverSummary(null));
    }, 200);
    return () => clearTimeout(t);
  }, [hoveredId]);

  useEffect(() => {
    if (!selected) {
      setDetailSummary(null);
      setTensionRows(null);
      setShowSources(false);
      setShowTension(false);
      return;
    }
    
    setDetailSummary(null);
    setTensionRows(null);
    setShowSources(false);
    setShowTension(false);
    
    const id = selected.id;
    Promise.all([
      fetch(`/api/map/concept-summary?conceptId=${encodeURIComponent(id)}`).then(r =>
        r.ok ? r.json() : null,
      ),
      fetch(`/api/map/tensions-for?conceptId=${encodeURIComponent(id)}`).then(r =>
        r.ok ? r.json() : null,
      ),
    ])
      .then(([sum, ten]) => {
        if (sum) setDetailSummary(sum as ConceptSummary);
        if (ten?.tensions) setTensionRows(ten.tensions as TensionRow[]);
      })
      .catch(() => {
        setDetailSummary(null);
        setTensionRows(null);
      });
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      setRecentPositions(null);
      setRecentError(false);
      setRecentLoading(false);
      return;
    }
    setRecentLoading(true);
    setRecentError(false);
    const mergedIds = selected.mergedFrom?.join(',') || '';
    const url = `/api/map/recent-positions?conceptId=${encodeURIComponent(selected.id)}&limit=5${mergedIds ? `&mergedIds=${encodeURIComponent(mergedIds)}` : ''}`;
    fetch(url)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("recent"))))
      .then(data => {
        setRecentPositions((data?.positions as MapRecentPosition[]) ?? []);
        setRecentLoading(false);
      })
      .catch(() => {
        setRecentError(true);
        setRecentLoading(false);
        setRecentPositions(null);
      });
  }, [selected]);

  const isScrubAnimating = useTimeline && (isDragging || isPlaying);

  if (!dims.w) {
    return <div style={{ background: C.bg, height: "100vh" }} />;
  }

  const selectedCluster = selected ? clusterForNode.get(selected.id) : null;

  return (
    <div
      ref={containerRef}
      style={{
        background: C.bg,
        minHeight: "100vh",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        color: C.text,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{ANIM_CSS}</style>

      <div
        style={{
          padding: "10px 16px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          background: C.surface,
        }}
      >
        <span style={{ fontSize: 12, color: C.textSoft }}>
          Your map from reactions and saved sources — {stats.totalConcepts} topic
          {stats.totalConcepts === 1 ? "" : "s"}
          {readiness.discoveryClaimCount > 0 && (
            <span style={{ color: C.muted }}>
              {" "}
              · {readiness.discoveryClaimCount} discover claim
              {readiness.discoveryClaimCount === 1 ? "" : "s"}
            </span>
          )}
        </span>
        <a
          href="/fingerprint"
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "6px 12px",
            textDecoration: "none",
            fontSize: 11,
            fontWeight: 600,
            color: C.accent,
            flexShrink: 0,
          }}
        >
          Mindlair Fingerprint →
        </a>
      </div>

      <div
        style={{
          padding: "14px 24px 12px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          zIndex: 5,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.04em" }}>
            Mind<span style={{ color: C.accent, fontStyle: "italic", fontWeight: 500 }}>lair</span>
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: C.muted,
              paddingLeft: 14,
              borderLeft: `1px solid ${C.border}`,
            }}
          >
            Belief Map
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: isNarrow ? "column" : "row",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: isNarrow && selected ? 260 : 0,
            minWidth: 0,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {nodes.length === 0 ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 32,
                textAlign: "center",
                gap: 16,
              }}
            >
              <p style={{ fontSize: 15, color: C.textSoft, maxWidth: 400, lineHeight: 1.6 }}>
                You have enough activity to leave the demo map, but your belief graph has not formed
                yet. React to claims in Discover or complete a digest session to populate topics.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <a
                  href="/feed"
                  style={{
                    padding: "10px 18px",
                    background: C.accent,
                    color: "#fff",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  Open Discover
                </a>
                <a
                  href="/inbox"
                  style={{
                    padding: "10px 18px",
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    color: C.textSoft,
                    borderRadius: 8,
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: 14,
                  }}
                >
                  Inbox digest
                </a>
                <a
                  href="/settings"
                  style={{
                    padding: "10px 18px",
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    color: C.muted,
                    borderRadius: 8,
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: 14,
                  }}
                >
                  Connect sources
                </a>
              </div>
            </div>
          ) : (
            <svg width="100%" height="100%" style={{ display: "block" }} viewBox={`0 0 ${dims.w} ${dims.h}`}>
              <defs>
                {nodes.map(n => {
                  const vis = visForNode(n);
                  const stance = stanceForNode({ direction: vis.direction });
                  const col = POS_COLORS[stance];
                  return (
                    <radialGradient key={n.id} id={`pg-${n.id}`} cx="45%" cy="38%" r="62%">
                      <stop offset="0%" stopColor={col.stroke} stopOpacity={0.28} />
                      <stop offset="80%" stopColor={col.fill} stopOpacity={0.92} />
                      <stop offset="100%" stopColor={C.bg} stopOpacity={0.35} />
                    </radialGradient>
                  );
                })}
                <filter id="pglow">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect width={dims.w} height={dims.h} fill={C.bg} />

              {effectiveEdges.map((link, i) => {
                const sp = displayPos[link.source];
                const tp = displayPos[link.target];
                if (!sp || !tp) return null;
                const cv = curveOffsets[i] ?? { ox: 0, oy: 0 };
                const tension = link.type === "tension";
                const ns = nodeById.get(link.source);
                const nt = nodeById.get(link.target);
                const sOp = ns ? visForNode(ns).opacity : 1;
                const tOp = nt ? visForNode(nt).opacity : 1;
                const edgeFade = Math.min(sOp, tOp);
                const baseOp = tension ? 0.5 : 0.4;
                const baseW = Math.max(1.2, (link.weight || 1) * 0.5);
                const weight = link.weight || 1;
                const dashPattern = tension
                  ? "6,4"
                  : weight >= 2
                    ? "none"
                    : "4,6";
                return (
                  <path
                    key={`${link.source}-${link.target}-${i}`}
                    d={`M ${sp.x} ${sp.y} Q ${(sp.x + tp.x) / 2 + cv.ox} ${(sp.y + tp.y) / 2 + cv.oy} ${tp.x} ${tp.y}`}
                    fill="none"
                    stroke={tension ? C.amber : C.muted}
                    strokeWidth={Math.max(0.8, baseW * (0.6 + 0.4 * edgeFade))}
                    strokeDasharray={dashPattern}
                    strokeOpacity={baseOp * edgeFade}
                    style={{
                      transition: isScrubAnimating ? "none" : "stroke-opacity 0.45s ease, stroke-width 0.45s ease",
                    }}
                  />
                );
              })}

              {nodes.map((node, ni) => {
                const vis = visForNode(node);
                const stance = stanceForNode({ direction: vis.direction });
                const col = POS_COLORS[stance];
                const p = displayPos[node.id];
                const orgPos = organicLayout[node.id];
                if (!p || !orgPos) return null;
                const baseR = orgPos.radius * vis.sizeMult;
                const isHov = hoveredId === node.id;
                const isSel = selected?.id === node.id;
                const r = isHov ? baseR * 1.08 : baseR;
                const hasTension = effectiveEdges.some(
                  e =>
                    e.type === "tension" &&
                    (e.source === node.id || e.target === node.id),
                );
                const nodeCatColor = getCatColor(node.category);
                const radiusMotionStyle = {
                  transition: isScrubAnimating ? "none" : "r 0.45s ease",
                } as const;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${p.x}, ${p.y})`}
                    style={{
                      cursor: "pointer",
                      opacity: vis.opacity,
                      transition: isScrubAnimating ? "none" : "opacity 0.45s ease",
                    }}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => {
                      setShowSources(false);
                      setShowTension(false);
                      setSelected(isSel ? null : node);
                    }}
                  >
                    {hasTension && (
                      <circle
                        r={r + 8}
                        fill="none"
                        stroke={C.amber}
                        strokeWidth={1}
                        strokeDasharray="4,3"
                        style={{
                          animation: `pb-pulse-ring 3.2s ease-in-out infinite`,
                          animationDelay: `${ni * 0.35}s`,
                        }}
                      />
                    )}
                    {isSel && (
                      <circle
                        r={r + 10}
                        fill="none"
                        stroke={nodeCatColor}
                        strokeWidth={1.5}
                        strokeOpacity={0.75}
                      />
                    )}
                    <circle
                      r={r + 4}
                      fill={nodeCatColor}
                      fillOpacity={0.15}
                      style={{
                        animation: `pb-breathe ${3.4 + ni * 0.15}s ease-in-out infinite`,
                        animationDelay: `${ni * 0.3}s`,
                      }}
                    />
                    <circle
                      r={r}
                      fill={`url(#pg-${node.id})`}
                      stroke={nodeCatColor}
                      strokeWidth={isSel ? 2.5 : isHov ? 2 : 1.5}
                      strokeOpacity={isSel || isHov ? 1 : 0.65}
                      filter={isHov ? "url(#pglow)" : "none"}
                      style={radiusMotionStyle}
                    />
                    <text
                      textAnchor="middle"
                      dy="0.35em"
                      fontSize={Math.max(8, Math.min(11, r * 0.35))}
                      fill={C.text}
                      fontWeight={isSel ? 600 : 400}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {node.label.length > 18 ? `${node.label.slice(0, 16)}…` : node.label}
                    </text>
                    {(node.mergedFrom?.length ?? 0) > 0 && (
                      <text
                        textAnchor="middle"
                        dy={r * 0.5 + 8}
                        fontSize={7}
                        fill={C.muted}
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        +{node.mergedFrom!.length} merged
                      </text>
                    )}
                  </g>
                );
              })}

              {hoveredId && !selected && (() => {
                const node = nodeById.get(hoveredId);
                const p = displayPos[hoveredId];
                if (!node || !p) return null;
                const hVis = visForNode(node);
                const hStance = stanceForNode({ direction: hVis.direction });
                const hCol = POS_COLORS[hStance];
                const hoverCatColor = getCatColor(node.category);
                const hoverCatLabel = formatCategoryLabel(node.category);
                const tw = 220;
                const hasMerged = (node.mergedFrom?.length ?? 0) > 0;
                const extra = (hoverSummary ? 18 : 0) + (hasMerged ? 16 : 0);
                const th = 70 + extra;
                const tx = p.x + 28;
                const ty = p.y - 28;
                const ax = tx + tw > dims.w - 12 ? p.x - tw - 28 : tx;
                const ay = ty + th > dims.h - 12 ? dims.h - th - 12 : Math.max(10, ty);
                return (
                  <g style={{ pointerEvents: "none" }}>
                    <rect
                      x={ax}
                      y={ay}
                      width={tw}
                      height={th}
                      rx={7}
                      fill={C.surface}
                      stroke={hoverCatColor}
                      strokeWidth={1}
                      strokeOpacity={0.55}
                    />
                    <text x={ax + 11} y={ay + 18} fontSize={11} fontWeight={600} fill={C.text}>
                      {node.label}
                    </text>
                    <text x={ax + 11} y={ay + 33} fontSize={9} fill={hoverCatColor}>
                      {hoverCatLabel}
                    </text>
                    <text x={ax + 11} y={ay + 48} fontSize={10} fill={hCol.stroke}>
                      {hCol.label}
                    </text>
                    <text x={ax + 11} y={ay + 63} fontSize={10} fill={C.muted}>
                      Strength {(node.strength * 100).toFixed(0)}% · Positions {node.totalPositionCount ?? node.positionCount}
                    </text>
                    {hoverSummary && (
                      <text x={ax + 11} y={ay + 78} fontSize={9} fill={C.muted}>
                        {hoverSummary.sourceCount} sources · {hoverSummary.reactionCount} reactions ·{" "}
                        {formatLastActive(hoverSummary.lastActive)}
                      </text>
                    )}
                    {hasMerged && (
                      <text x={ax + 11} y={ay + (hoverSummary ? 93 : 78)} fontSize={9} fill={hoverCatColor}>
                        +{node.mergedFrom!.length} concepts merged into this planet
                      </text>
                    )}
                  </g>
                );
              })()}
            </svg>
          )}

          {nodes.length > 0 && useTimeline && discoveryText && (
            <div
              key={Math.round(timeValue)}
              style={{
                position: "absolute",
                bottom: 14,
                left: 20,
                right: selected ? 0 : 20,
                maxWidth: 420,
                background: `${C.surface}f0`,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                animation: "pb-fade-in 0.3s ease-out",
                backdropFilter: "blur(6px)",
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 28,
                  borderRadius: 2,
                  flexShrink: 0,
                  background: C.accent,
                }}
              />
              <div style={{ fontSize: 12, lineHeight: 1.55, color: C.textSoft }}>{discoveryText}</div>
            </div>
          )}

          {nodes.length > 0 && !selected && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                justifyContent: "flex-end",
                maxWidth: 280,
              }}
            >
              {(categories || [])
                .filter(cat => nodes.some(n => n.category === cat.name))
                .map(cat => (
                  <div
                    key={cat.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      background: `${C.surface}e0`,
                      borderRadius: 4,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: cat.color,
                      }}
                    />
                    <span style={{ fontSize: 9, color: C.textSoft }}>
                      {formatCategoryLabel(cat.name)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {selected && (
          <div
            style={{
              width: isNarrow ? "100%" : 280,
              maxHeight: isNarrow ? 420 : undefined,
              borderLeft: isNarrow ? "none" : `1px solid ${C.border}`,
              borderTop: isNarrow ? `1px solid ${C.border}` : "none",
              background: C.surface,
              padding: 20,
              overflowY: "auto",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{selected.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "3px 8px",
                      borderRadius: 4,
                      background: `${getCatColor(selected.category)}20`,
                      color: getCatColor(selected.category),
                    }}
                  >
                    {formatCategoryLabel(selected.category)}
                  </span>
                  {(selected.mergedFrom?.length ?? 0) > 0 && (
                    <span style={{ fontSize: 10, color: C.muted }}>
                      +{selected.mergedFrom!.length} merged
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: POS_COLORS[stanceForNode(selected)].stroke,
                    marginTop: 4,
                  }}
                >
                  {POS_COLORS[stanceForNode(selected)].label}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSources(false);
                  setShowTension(false);
                  setSelected(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: C.muted,
                  cursor: "pointer",
                  fontSize: 18,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowSources(!showSources)}
                style={{
                  background: showSources ? C.accentDim : C.bg,
                  borderRadius: 6,
                  padding: "10px 12px",
                  border: `1px solid ${showSources ? C.accent : C.border}`,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.2s, border-color 0.2s",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: C.muted,
                    marginBottom: 3,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  Sources
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: showSources ? C.accent : C.text,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {detailSummary != null ? detailSummary.sourceCount : "…"}
                  <span style={{ fontSize: 10, color: C.muted }}>{showSources ? "▲" : "▼"}</span>
                </div>
              </button>
              <div style={{ background: C.bg, borderRadius: 6, padding: "10px 12px", border: `1px solid ${C.border}` }}>
                <div
                  style={{
                    fontSize: 9,
                    color: C.muted,
                    marginBottom: 3,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  Reactions
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {detailSummary != null ? detailSummary.reactionCount : "…"}
                </div>
              </div>
              <div style={{ background: C.bg, borderRadius: 6, padding: "10px 12px", border: `1px solid ${C.border}` }}>
                <div
                  style={{
                    fontSize: 9,
                    color: C.muted,
                    marginBottom: 3,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  Last active
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {detailSummary != null ? formatLastActive(detailSummary.lastActive) : "…"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (tensionRows && tensionRows.length > 0) setShowTension(!showTension);
                }}
                disabled={!tensionRows || tensionRows.length === 0}
                style={{
                  background: showTension ? C.amberDim : C.bg,
                  borderRadius: 6,
                  padding: "10px 12px",
                  border: `1px solid ${showTension ? C.amber : C.border}`,
                  cursor: tensionRows && tensionRows.length > 0 ? "pointer" : "default",
                  textAlign: "left",
                  opacity: tensionRows && tensionRows.length > 0 ? 1 : 0.55,
                  transition: "background 0.2s, border-color 0.2s",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: C.muted,
                    marginBottom: 3,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  Tension
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color:
                      tensionRows && tensionRows.length > 0 ? C.amber : C.text,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {tensionRows == null
                    ? "…"
                    : tensionRows.length > 0
                      ? "Yes"
                      : "No"}
                  {tensionRows && tensionRows.length > 0 && (
                    <span style={{ fontSize: 10, color: C.muted }}>{showTension ? "▲" : "▼"}</span>
                  )}
                </div>
              </button>
            </div>

            {detailSummary?.insightText && (
              <div
                style={{
                  padding: "12px 14px",
                  background: C.bg,
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${getCatColor(selected.category)}`,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontStyle: "italic",
                    lineHeight: 1.55,
                    color: C.textSoft,
                  }}
                >
                  "{detailSummary.insightText}"
                </p>
              </div>
            )}

            {showSources && detailSummary && detailSummary.sources.length > 0 && (
              <div
                style={{
                  background: C.bg,
                  borderRadius: 8,
                  border: `1px solid ${C.accent}40`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "10px 12px",
                    borderBottom: `1px solid ${C.border}`,
                    background: `${C.accent}10`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: C.accent,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Recent sources
                  </div>
                </div>
                <div style={{ maxHeight: 220, overflowY: "auto" }}>
                  {detailSummary.sources.map((source, i) => {
                    const stanceChip = source.stance ? reactionStanceChip(source.stance) : null;
                    return (
                      <a
                        key={source.id}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block",
                          padding: "10px 12px",
                          borderBottom:
                            i < detailSummary.sources.length - 1 ? `1px solid ${C.border}` : "none",
                          textDecoration: "none",
                          color: "inherit",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = `${C.accent}08`;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: C.text,
                              lineHeight: 1.4,
                              flex: 1,
                            }}
                          >
                            {source.title}
                          </div>
                          {stanceChip && (
                            <span
                              style={{
                                fontSize: 8,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                padding: "2px 6px",
                                borderRadius: 3,
                                background: stanceChip.bg,
                                color: stanceChip.color,
                                flexShrink: 0,
                              }}
                            >
                              {stanceChip.label === "Agree" ? "Agreed" : stanceChip.label === "Disagree" ? "Disagreed" : stanceChip.label}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: C.muted }}>
                          {source.outlet ?? "Source"}
                          <span style={{ margin: "0 6px" }}>·</span>
                          {new Date(source.date).toLocaleDateString()}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {showTension && tensionRows && tensionRows.length > 0 && (
              <div
                style={{
                  background: C.bg,
                  borderRadius: 8,
                  border: `1px solid ${C.amber}40`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "10px 12px",
                    borderBottom: `1px solid ${C.border}`,
                    background: `${C.amber}10`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: C.amber,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Tensions
                  </div>
                </div>
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 14 }}>
                  {tensionRows.map((row, ri) => {
                    const other = nodeById.get(row.otherId);
                    const isLast = ri === tensionRows.length - 1;
                    return (
                      <div
                        key={`${row.otherId}-${row.tensionType}`}
                        style={{
                          borderBottom: isLast ? "none" : `1px solid ${C.border}`,
                          paddingBottom: isLast ? 0 : 12,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                          With {row.otherLabel}
                          <span style={{ fontWeight: 400, color: C.muted, marginLeft: 8 }}>
                            {row.tensionType.replace(/_/g, " ")} · {row.surfacedCount}×
                            {row.resolved ? " · resolved" : ""}
                          </span>
                        </div>
                        {row.explanation && (
                          <p style={{ fontSize: 12, lineHeight: 1.55, color: C.textSoft, margin: "0 0 10px" }}>
                            {row.explanation}
                          </p>
                        )}
                        {other && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(other);
                              setShowTension(false);
                              setShowSources(false);
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              background: C.surface,
                              border: `1px solid ${C.border}`,
                              borderRadius: 6,
                              color: C.textSoft,
                              fontSize: 11,
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            View {row.otherLabel} →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {detailSummary?.engagementByMonth && detailSummary.engagementByMonth.length > 0 && (
              <div
                style={{
                  background: C.bg,
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: C.muted,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    marginBottom: 10,
                    fontWeight: 600,
                  }}
                >
                  Engagement This Year
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 3,
                    height: 40,
                  }}
                >
                  {(() => {
                    const maxCount = Math.max(...detailSummary.engagementByMonth.map(m => m.count), 1);
                    return detailSummary.engagementByMonth.map((item, idx) => {
                      const heightPct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      const barHeight = Math.max(2, (heightPct / 100) * 36);
                      return (
                        <div
                          key={idx}
                          title={`${item.month}: ${item.count}`}
                          style={{
                            flex: 1,
                            height: barHeight,
                            background: item.count > 0 ? getCatColor(selected.category) : `${C.muted}40`,
                            borderRadius: 2,
                            transition: "height 0.3s ease",
                            opacity: item.count > 0 ? 0.85 : 0.3,
                          }}
                        />
                      );
                    });
                  })()}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6,
                    fontSize: 8,
                    color: C.muted,
                  }}
                >
                  <span>{detailSummary.engagementByMonth[0]?.month}</span>
                  <span>{detailSummary.engagementByMonth[detailSummary.engagementByMonth.length - 1]?.month}</span>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  fontSize: 9,
                  color: getCatColor(selected.category),
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Top Claims
              </div>
              {recentLoading && (
                <div style={{ fontSize: 12, color: C.muted }}>Loading…</div>
              )}
              {recentError && !recentLoading && (
                <div style={{ fontSize: 12, color: C.rose }}>Could not load recent claims.</div>
              )}
              {!recentLoading &&
                !recentError &&
                recentPositions &&
                recentPositions.length === 0 && (
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                    No claims yet. React on Discover to grow this planet.
                  </div>
                )}
              {!recentLoading &&
                recentPositions &&
                recentPositions.map((row, i) => {
                  const chip = reactionStanceChip(row.stance);
                  return (
                    <div
                      key={`${row.claim.id}-${row.createdAt}-${i}`}
                      style={{
                        padding: "10px 12px",
                        background: C.bg,
                        borderRadius: 6,
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          fontStyle: "italic",
                          color: C.textSoft,
                          lineHeight: 1.5,
                          marginBottom: 8,
                        }}
                      >
                        "{row.claim.textPreview}"
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: chip.bg,
                            color: chip.color,
                          }}
                        >
                          {chip.label}
                        </span>
                        <span style={{ fontSize: 9, color: C.muted }}>
                          {new Date(row.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {selectedCluster && selectedCluster.nodeIds.length > 1 && (
              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.55,
                  color: C.textSoft,
                  padding: "10px 12px",
                  background: C.bg,
                  borderRadius: 6,
                  borderLeft: `3px solid ${C.accent}`,
                }}
              >
                Part of cluster &ldquo;{selectedCluster.label}&rdquo; with{" "}
                {selectedCluster.nodeIds.length} linked topics (tension graph).
              </div>
            )}

            <a
              href="/feed"
              style={{
                marginTop: "auto",
                textAlign: "center",
                padding: "10px",
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.accent,
                fontSize: 12,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              React on Discover →
            </a>
          </div>
        )}
      </div>

      {useTimeline && snapshots.length >= 2 && (
        <MapTimelineScrubber
          snapshots={snapshots}
          timeValue={timeValue}
          setTimeValue={setTimeValue}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          activeCount={activeCount}
          peakCount={peakCount}
        />
      )}

      <div
        style={{
          padding: "12px 24px 16px",
          borderTop: `1px solid ${C.border}`,
          background: C.surface,
          flexShrink: 0,
          fontSize: 11,
          color: C.muted,
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>
          {stats.tensionCount} tension{stats.tensionCount === 1 ? "" : "s"} · {clusters.length} cluster
          {clusters.length === 1 ? "" : "s"} · Avg strength {(stats.averageStrength * 100).toFixed(0)}%
        </span>
        <span style={{ color: C.muted }}>
          {readiness.sourceRichClusterCount} cluster
          {readiness.sourceRichClusterCount === 1 ? "" : "s"} with extracted claims from your sources
        </span>
      </div>
    </div>
  );
}
