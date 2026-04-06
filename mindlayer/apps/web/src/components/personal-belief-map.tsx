"use client";

import { useMemo, useState, useEffect, useRef } from "react";

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
}

interface MapEdge {
  source: string;
  target: string;
  type: "tension" | "related";
  weight: number;
}

interface MapCluster {
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
`;

export type MapApiPayload = {
  nodes: MapNode[];
  edges: MapEdge[];
  clusters: MapCluster[];
  stats: {
    totalConcepts: number;
    echoFlaggedCount: number;
    tensionCount: number;
    averageStrength: number;
  };
  readiness: MapReadiness;
};

function stanceForNode(node: MapNode): string {
  const d = node.direction;
  if (d === "positive" || d === "negative" || d === "mixed") return d;
  return "mixed";
}

export default function PersonalBeliefMap({ payload }: { payload: MapApiPayload }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 900, h: 520 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapNode | null>(null);

  const { nodes, edges, clusters, stats, readiness } = payload;

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setDims({ w: r.width, h: Math.max(320, Math.min(r.height - 160, 540)) });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const nodePos = useMemo(() => {
    const n = nodes.length;
    const cx = dims.w / 2;
    const cy = dims.h / 2;
    const r = Math.min(dims.w, dims.h) * (n <= 4 ? 0.22 : n <= 8 ? 0.28 : 0.32);
    const out: Record<string, { x: number; y: number }> = {};
    if (n === 0) return out;
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      out[node.id] = {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });
    return out;
  }, [nodes, dims.w, dims.h]);

  const curveOffsets = useMemo(
    () =>
      edges.map((_, i) => ({
        ox: Math.sin(i * 2.7 + 1.3) * 36,
        oy: Math.cos(i * 3.1 + 0.7) * 36,
      })),
    [edges]
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
          href="/wrapped"
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
          Your 2025 Wrapped →
        </a>
      </div>

      <div
        style={{
          padding: "14px 24px 12px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          zIndex: 5,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.04em" }}>
            Mind<span style={{ color: C.accent, fontStyle: "italic", fontWeight: 500 }}>layer</span>
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
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          {(["positive", "negative", "mixed"] as const).map(k => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: POS_COLORS[k].stroke,
                  opacity: 0.9,
                }}
              />
              <span style={{ fontSize: 10, color: C.muted }}>{POS_COLORS[k].label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
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
                  const stance = stanceForNode(n);
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

              {edges.map((link, i) => {
                const sp = nodePos[link.source];
                const tp = nodePos[link.target];
                if (!sp || !tp) return null;
                const cv = curveOffsets[i] ?? { ox: 0, oy: 0 };
                const tension = link.type === "tension";
                return (
                  <path
                    key={`${link.source}-${link.target}-${i}`}
                    d={`M ${sp.x} ${sp.y} Q ${(sp.x + tp.x) / 2 + cv.ox} ${(sp.y + tp.y) / 2 + cv.oy} ${tp.x} ${tp.y}`}
                    fill="none"
                    stroke={tension ? C.amber : C.muted}
                    strokeWidth={Math.max(1, (link.weight || 1) * 0.35)}
                    strokeDasharray={tension ? "6,4" : "2,5"}
                    strokeOpacity={0.35}
                  />
                );
              })}

              {nodes.map((node, ni) => {
                const stance = stanceForNode(node);
                const col = POS_COLORS[stance];
                const p = nodePos[node.id];
                if (!p) return null;
                const baseR = 18 + node.strength * 42;
                const isHov = hoveredId === node.id;
                const isSel = selected?.id === node.id;
                const r = isHov ? baseR * 1.06 : baseR;
                const hasTension = edges.some(
                  e =>
                    e.type === "tension" &&
                    (e.source === node.id || e.target === node.id)
                );

                return (
                  <g
                    key={node.id}
                    transform={`translate(${p.x}, ${p.y})`}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setSelected(isSel ? null : node)}
                  >
                    {hasTension && (
                      <circle
                        r={r * 0.58 + 8}
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
                        r={r * 0.58 + 12}
                        fill="none"
                        stroke={col.stroke}
                        strokeWidth={1.5}
                        strokeOpacity={0.75}
                      />
                    )}
                    <circle
                      r={r * 0.58}
                      fill={col.stroke}
                      style={{
                        animation: `pb-breathe ${3.4 + ni * 0.15}s ease-in-out infinite`,
                        animationDelay: `${ni * 0.3}s`,
                      }}
                    />
                    <circle
                      r={r * 0.48}
                      fill={`url(#pg-${node.id})`}
                      stroke={col.stroke}
                      strokeWidth={isSel ? 2 : isHov ? 1.5 : 1}
                      strokeOpacity={isSel || isHov ? 1 : 0.55}
                      filter={isHov ? "url(#pglow)" : "none"}
                    />
                    <text
                      textAnchor="middle"
                      dy="0.35em"
                      fontSize={Math.max(9, Math.min(12, r * 0.22))}
                      fill={C.text}
                      fontWeight={isSel ? 600 : 400}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {node.label.length > 22 ? `${node.label.slice(0, 20)}…` : node.label}
                    </text>
                  </g>
                );
              })}

              {hoveredId && !selected && (() => {
                const node = nodeById.get(hoveredId);
                const p = nodePos[hoveredId];
                if (!node || !p) return null;
                const stance = stanceForNode(node);
                const col = POS_COLORS[stance];
                const tw = 200;
                const th = 72;
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
                      stroke={col.stroke}
                      strokeWidth={1}
                      strokeOpacity={0.45}
                    />
                    <text x={ax + 11} y={ay + 18} fontSize={11} fontWeight={600} fill={C.text}>
                      {node.label}
                    </text>
                    <text x={ax + 11} y={ay + 34} fontSize={10} fill={col.stroke}>
                      {col.label}
                    </text>
                    <text x={ax + 11} y={ay + 50} fontSize={10} fill={C.muted}>
                      Strength {(node.strength * 100).toFixed(0)}% · Positions {node.positionCount}
                    </text>
                  </g>
                );
              })()}
            </svg>
          )}
        </div>

        {selected && (
          <div
            style={{
              width: 280,
              borderLeft: `1px solid ${C.border}`,
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
                <div style={{ fontSize: 11, color: POS_COLORS[stanceForNode(selected)].stroke }}>
                  {POS_COLORS[stanceForNode(selected)].label}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
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
                  Strength
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {(selected.strength * 100).toFixed(0)}%
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
                  Positions
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{selected.positionCount}</div>
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
                  Stability
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {(selected.stability * 100).toFixed(0)}%
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
                  Echo flagged
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: selected.echoFlagged ? C.amber : C.text }}>
                  {selected.echoFlagged ? "Yes" : "No"}
                </div>
              </div>
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
