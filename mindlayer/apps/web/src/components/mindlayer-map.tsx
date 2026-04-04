"use client";

import { useState, useEffect, useRef, useMemo } from "react";

// ── Colour system ──────────────────────────────────────────────
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
  amber: "#d4915a",
  amberDim: "#7a4a20",
  blue: "#6b9fc4",
  blueDim: "#2a4a62",
  grey: "#4a4540",
};

const POS_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  affirm:     { fill: "#3d2a1a", stroke: "#d4915a", label: "Generally agrees" },
  disagree:   { fill: "#3d2010", stroke: "#d4915a", label: "Generally disagrees" },
  ambivalent: { fill: "#1a2a3d", stroke: "#6b9fc4", label: "Ambivalent" },
  passive:    { fill: "#252219", stroke: "#4a4540", label: "Passive interest" },
};

// ── Node & link data ───────────────────────────────────────────
const NODES = [
  { id: "monetary-policy",  label: "Monetary Policy",        position: "disagree",   baseSize: 72, x0: 0.38, y0: 0.42 },
  { id: "climate",          label: "Climate & Energy",       position: "affirm",     baseSize: 68, x0: 0.62, y0: 0.30 },
  { id: "stoicism",         label: "Stoicism",               position: "affirm",     baseSize: 54, x0: 0.22, y0: 0.30 },
  { id: "ai-ml",            label: "AI & Machine Learning",  position: "ambivalent", baseSize: 80, x0: 0.72, y0: 0.55 },
  { id: "geopolitics",      label: "Geopolitics",            position: "ambivalent", baseSize: 58, x0: 0.50, y0: 0.65 },
  { id: "nutrition",        label: "Nutrition & Health",     position: "affirm",     baseSize: 44, x0: 0.28, y0: 0.60 },
  { id: "urbanism",         label: "Urbanism",               position: "affirm",     baseSize: 36, x0: 0.78, y0: 0.35 },
  { id: "crypto",           label: "Crypto & Web3",          position: "disagree",   baseSize: 48, x0: 0.55, y0: 0.20 },
  { id: "philosophy",       label: "Philosophy of Mind",     position: "ambivalent", baseSize: 42, x0: 0.18, y0: 0.50 },
  { id: "supply-chain",     label: "Supply Chains",          position: "passive",    baseSize: 30, x0: 0.45, y0: 0.78 },
  { id: "sleep-science",    label: "Sleep Science",          position: "affirm",     baseSize: 32, x0: 0.15, y0: 0.70 },
  { id: "media-trust",      label: "Media & Trust",          position: "disagree",   baseSize: 50, x0: 0.68, y0: 0.72 },
];

const LINKS = [
  { source: "monetary-policy", target: "geopolitics",   weight: 3, type: "solid" },
  { source: "monetary-policy", target: "crypto",        weight: 2, type: "dashed" },
  { source: "climate",         target: "geopolitics",   weight: 2, type: "solid" },
  { source: "climate",         target: "urbanism",      weight: 2, type: "solid" },
  { source: "ai-ml",           target: "philosophy",    weight: 2, type: "dashed" },
  { source: "ai-ml",           target: "media-trust",   weight: 1, type: "dotted" },
  { source: "stoicism",        target: "philosophy",    weight: 3, type: "solid" },
  { source: "nutrition",       target: "sleep-science", weight: 3, type: "solid" },
  { source: "geopolitics",     target: "supply-chain",  weight: 1, type: "dotted" },
  { source: "media-trust",     target: "geopolitics",   weight: 2, type: "solid" },
  { source: "crypto",          target: "ai-ml",         weight: 1, type: "dotted" },
];

const TENSIONS = [
  { a: "monetary-policy", b: "crypto" },
  { a: "ai-ml", b: "philosophy" },
];

// [sizeMultiplier, opacity] per month Jan–Dec
const TL: Record<string, [number, number][]> = {
  "monetary-policy":  [[.3,.4],[.4,.5],[.6,.7],[.8,.85],[1,1],[1,1],[.95,.95],[.9,.9],[1,1],[1,1],[.95,.95],[1,1]],
  "climate":          [[.5,.6],[.55,.65],[.7,.75],[.8,.85],[.85,.9],[1,1],[1,1],[.9,.9],[.85,.88],[.9,.92],[.95,.97],[1,1]],
  "stoicism":         [[1,1],[.95,.95],[.9,.9],[.85,.88],[.7,.75],[.6,.7],[.5,.6],[.45,.55],[.4,.5],[.5,.6],[.6,.7],[.7,.8]],
  "ai-ml":            [[.4,.5],[.5,.6],[.65,.72],[.75,.8],[.85,.9],[.9,.92],[1,1],[1,1],[1,1],[1,1],[1,1],[1,1]],
  "geopolitics":      [[.6,.7],[.7,.75],[.8,.85],[1,1],[1,1],[.9,.92],[.8,.85],[.75,.8],[.85,.88],[.9,.92],[.95,.97],[.9,.92]],
  "nutrition":        [[.8,.85],[.9,.92],[1,1],[.9,.92],[.7,.78],[.6,.7],[.5,.6],[.45,.55],[.5,.6],[.6,.68],[.65,.72],[.7,.78]],
  "urbanism":         [[.3,.4],[.4,.5],[.5,.6],[.65,.72],[.75,.8],[.85,.9],[1,1],[1,1],[.9,.92],[.85,.88],[.8,.85],[.85,.9]],
  "crypto":           [[.9,.92],[.95,.95],[1,1],[.85,.88],[.7,.75],[.5,.6],[.35,.45],[.25,.35],[.2,.3],[.2,.28],[.25,.32],[.3,.38]],
  "philosophy":       [[.5,.6],[.55,.65],[.6,.7],[.65,.72],[.7,.78],[.75,.82],[.8,.85],[.85,.9],[.9,.92],[.95,.95],[1,1],[1,1]],
  "supply-chain":     [[.7,.78],[.8,.85],[.9,.92],[1,1],[.8,.85],[.6,.7],[.4,.5],[.3,.4],[.25,.35],[.2,.28],[.2,.28],[.25,.32]],
  "sleep-science":    [[.5,.6],[.65,.72],[.8,.85],[.9,.92],[1,1],[.85,.9],[.7,.78],[.6,.7],[.55,.65],[.5,.6],[.5,.6],[.55,.65]],
  "media-trust":      [[.3,.4],[.35,.45],[.5,.6],[.6,.7],[.7,.78],[.8,.85],[.9,.92],[1,1],[1,1],[.95,.97],[.9,.92],[1,1]],
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Stance evolution: beliefs that shifted over the year ────────
const STANCE_TL: Record<string, string[]> = {
  "crypto":     ["ambivalent","ambivalent","ambivalent","disagree","disagree","disagree","disagree","disagree","disagree","disagree","disagree","disagree"],
  "ai-ml":      ["affirm","affirm","affirm","affirm","ambivalent","ambivalent","ambivalent","ambivalent","ambivalent","ambivalent","ambivalent","ambivalent"],
  "philosophy": ["passive","passive","passive","passive","passive","passive","ambivalent","ambivalent","ambivalent","ambivalent","ambivalent","ambivalent"],
};

// ── Activity sparkline data ────────────────────────────────────
const MONTH_INTENSITY = MONTHS.map((_, mi) =>
  NODES.reduce((sum, n) => sum + TL[n.id][mi][0], 0) / NODES.length
);
const MAX_INTENSITY = Math.max(...MONTH_INTENSITY);

// ── Discoveries: one per month ─────────────────────────────────
const DISCOVERIES: { month: number; text: string; nodeId?: string }[] = [
  { month: 0,  text: "Your map at the start of the year — Stoicism and Crypto dominated" },
  { month: 1,  text: "Nutrition ramping up — you read 2 sources this week alone",      nodeId: "nutrition" },
  { month: 2,  text: "Nutrition peaked — 3 sources in a single week",                  nodeId: "nutrition" },
  { month: 3,  text: "Your Crypto stance hardens — shifted from ambivalent to disagree", nodeId: "crypto" },
  { month: 4,  text: "AI: accumulating evidence made you genuinely uncertain",          nodeId: "ai-ml" },
  { month: 5,  text: "Stoicism fading — no new reads in 3 weeks",                      nodeId: "stoicism" },
  { month: 6,  text: "Two new interests emerge: Urbanism and Philosophy of Mind",       nodeId: "urbanism" },
  { month: 7,  text: "AI overtakes everything else in reading volume",                  nodeId: "ai-ml" },
  { month: 8,  text: "Crypto engagement drops 70% from its peak",                      nodeId: "crypto" },
  { month: 9,  text: "Philosophy has grown quietly for 8 straight months",              nodeId: "philosophy" },
  { month: 10, text: "Media & Trust doubles since summer — a late-year surge",          nodeId: "media-trust" },
  { month: 11, text: "Your map today — 12 clusters, 3 belief shifts, 1 year of thinking" },
];

// Timeline event markers on the scrubber
const SCRUB_EVENTS = [
  { month: 3, color: C.amber },
  { month: 4, color: C.blue },
  { month: 5, color: C.accent },
  { month: 6, color: C.blue },
  { month: 8, color: C.amber },
];

const NODE_DETAILS: Record<string, { sources: number; reactions: number; lastActive: string; topClaims: string[]; tension: boolean; summary: string }> = {
  "monetary-policy": { sources: 24, reactions: 18, lastActive: "3 days ago", topClaims: ["Central banks are losing inflation credibility","Rate hikes disproportionately hurt working class","Quantitative easing caused structural inequality"], tension: true, summary: "You consistently push back on mainstream central banking doctrine — 14 disagrees vs 4 agrees across 18 reactions." },
  "ai-ml": { sources: 31, reactions: 22, lastActive: "Yesterday", topClaims: ["LLMs don't truly understand — they pattern match","AI will displace more jobs than it creates","Open source models are catching closed ones"], tension: true, summary: "Your most-read topic. Genuinely ambivalent — positions are split and shifting. You've changed your mind on capability timelines twice." },
  "climate": { sources: 26, reactions: 19, lastActive: "1 week ago", topClaims: ["Nuclear is essential to any realistic transition","Carbon pricing works better than mandates","Adaptation is being underfunded vs mitigation"], tension: false, summary: "Strong consistent agreement across climate and energy content. Your most settled topic." },
  "stoicism": { sources: 18, reactions: 14, lastActive: "6 months ago", topClaims: ["Emotional regulation is a learnable skill","Modern stoicism misses the political dimension","Virtue ethics > consequentialism for daily decisions"], tension: false, summary: "Was your dominant interest in Q1. Quiet since May — this cluster has faded significantly." },
  "crypto": { sources: 19, reactions: 15, lastActive: "4 months ago", topClaims: ["Most crypto value is speculative not fundamental","DeFi solves problems that don't exist for most people","Bitcoin as store of value is more credible than altcoins"], tension: true, summary: "Strong disagreement with crypto maximalism. Engagement has declined sharply since Q2." },
  "geopolitics": { sources: 22, reactions: 16, lastActive: "2 days ago", topClaims: ["Multipolar world is already here, West hasn't adjusted","Supply chain decoupling will take decades not years","Energy dependency reshaped European foreign policy permanently"], tension: false, summary: "Consistently ambivalent — you engage deeply but rarely land on strong positions. Still an open question." },
  "philosophy": { sources: 14, reactions: 10, lastActive: "1 week ago", topClaims: ["Consciousness may not be computationally reducible","Free will compatibilism is more defensible than it sounds","Philosophy of mind and AI are converging"], tension: true, summary: "Slow-growing cluster. Your interest has been building steadily for 8 months." },
  "nutrition": { sources: 16, reactions: 11, lastActive: "2 months ago", topClaims: ["Time-restricted eating has stronger evidence than most diets","Ultra-processed food is the primary driver of chronic disease","Protein targets are systematically underestimated"], tension: false, summary: "Peak engagement in Q1. Has quietened significantly since spring." },
  "urbanism": { sources: 12, reactions: 9, lastActive: "3 weeks ago", topClaims: ["Zoning reform is the highest-leverage housing intervention","Parking minimums are a hidden tax on density","Transit works when it's frequent not just when it exists"], tension: false, summary: "Emerging cluster — growing since April. Consistent agreement with pro-density arguments." },
  "media-trust": { sources: 20, reactions: 14, lastActive: "4 days ago", topClaims: ["Institutional media trust collapse is structural not cyclical","Social media hasn't replaced journalism — it's replaced editors","Local news collapse has no viable business model fix yet"], tension: false, summary: "Strong disagree with mainstream media narratives. Engagement picking up in H2." },
  "sleep-science": { sources: 11, reactions: 8, lastActive: "5 weeks ago", topClaims: ["Sleep deprivation is the most underrated health risk","Chronotypes are real and systematically ignored by society","Napping evidence is stronger than most people realise"], tension: false, summary: "Consistent agreement. Quiet recently but well-established cluster." },
  "supply-chain": { sources: 8, reactions: 4, lastActive: "4 months ago", topClaims: ["Reshoring is politically attractive but economically costly","Just-in-time is being replaced by just-in-case everywhere","Critical mineral dependency is the new energy dependency"], tension: false, summary: "Fading cluster. Was active during peak supply chain news cycle, now quiet." },
};

const CURVE_OFFSETS = LINKS.map((_, i) => ({
  ox: Math.sin(i * 2.7 + 1.3) * 40,
  oy: Math.cos(i * 3.1 + 0.7) * 40,
}));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
type Node = typeof NODES[number];

const ANIM_CSS = `
  @keyframes ml-breathe {
    0%, 100% { opacity: 0.05; }
    50%      { opacity: 0.14; }
  }
  @keyframes ml-pulse-ring {
    0%, 100% { stroke-opacity: 0.35; }
    50%      { stroke-opacity: 0.6; }
  }
  @keyframes ml-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ml-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
`;

// ── Component ──────────────────────────────────────────────────
export default function MindlayerMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const tvRef = useRef(11);
  const playRef = useRef(false);

  const [dims, setDims] = useState({ w: 900, h: 560 });
  const [timeValue, setTimeValue] = useState(11);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const timeIdx = Math.round(timeValue);
  const isActive = isDragging || isPlaying;

  useEffect(() => { tvRef.current = timeValue; }, [timeValue]);
  useEffect(() => { playRef.current = isPlaying; }, [isPlaying]);

  // ── Measure container ──
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setDims({ w: r.width, h: Math.max(340, Math.min(r.height - 220, 580)) });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ── rAF playback ──
  useEffect(() => {
    if (!isPlaying) { lastTsRef.current = 0; return; }
    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      setTimeValue(prev => {
        const next = prev + dt / 1400;
        if (next >= 11) { setIsPlaying(false); return 11; }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  // ── Drag-to-scrub ──
  useEffect(() => {
    if (!isDragging) return;
    const update = (clientX: number) => {
      const rect = scrubRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTimeValue(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 11);
    };
    const onMove = (e: MouseEvent) => update(e.clientX);
    const onTouch = (e: TouchEvent) => update(e.touches[0].clientX);
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouch);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onUp);
    };
  }, [isDragging]);

  // ── Keyboard: ← → step, shift fine-scrub, space play/pause ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setTimeValue(v => Math.max(0, v - (e.shiftKey ? 0.25 : 1)));
          break;
        case "ArrowRight":
          e.preventDefault();
          setTimeValue(v => Math.min(11, v + (e.shiftKey ? 0.25 : 1)));
          break;
        case " ":
          e.preventDefault();
          if (playRef.current) {
            setIsPlaying(false);
          } else {
            if (tvRef.current >= 10.8) setTimeValue(0);
            setIsPlaying(true);
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Per-frame computations ──────────────────────────────────
  const nodeStates = useMemo(() => {
    const fl = Math.max(0, Math.floor(timeValue));
    const cl = Math.min(11, fl + 1);
    const t = timeValue - fl;
    const out: Record<string, { size: number; opacity: number; sizeMult: number }> = {};
    NODES.forEach(n => {
      const sm = lerp(TL[n.id][fl][0], TL[n.id][cl][0], t);
      const op = lerp(TL[n.id][fl][1], TL[n.id][cl][1], t);
      out[n.id] = { size: Math.max(14, n.baseSize * sm), opacity: op, sizeMult: sm };
    });
    return out;
  }, [timeValue]);

  const nodeStances = useMemo(() => {
    const out: Record<string, string> = {};
    NODES.forEach(n => {
      const tl = STANCE_TL[n.id];
      out[n.id] = tl ? tl[timeIdx] : n.position;
    });
    return out;
  }, [timeIdx]);

  // Positions with engagement-based spatial drift
  const nodePos = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {};
    NODES.forEach(n => {
      const { sizeMult } = nodeStates[n.id];
      const fade = Math.max(0, 1 - sizeMult);
      const dx = n.x0 - 0.5;
      const dy = n.y0 - 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const push = fade * 0.07;
      out[n.id] = {
        x: (n.x0 + (dx / dist) * push) * dims.w,
        y: (n.y0 + (dy / dist) * push) * dims.h,
      };
    });
    return out;
  }, [nodeStates, dims]);

  const hasTension = (id: string) => TENSIONS.some(p => p.a === id || p.b === id);
  const isTensionLink = (link: typeof LINKS[number]) =>
    TENSIONS.some(p => (p.a === link.source && p.b === link.target) || (p.b === link.source && p.a === link.target));

  const discovery = DISCOVERIES.find(d => d.month === timeIdx);
  if (!dims.w) return <div style={{ background: C.bg, height: "100vh" }} />;

  const detail = selectedNode ? NODE_DETAILS[selectedNode.id] : null;
  const selStance = selectedNode ? nodeStances[selectedNode.id] : null;
  const selCol = selStance ? POS_COLORS[selStance] : null;
  const activeCount = NODES.filter(n => nodeStates[n.id].opacity > 0.5).length;
  const peakCount = NODES.filter(n => nodeStates[n.id].sizeMult > 0.8).length;

  // ── Scrubber hit handler ──
  const startScrub = (clientX: number) => {
    setIsDragging(true);
    const rect = scrubRef.current?.getBoundingClientRect();
    if (rect) setTimeValue(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 11);
  };

  return (
    <div ref={containerRef} style={{
      background: C.bg, minHeight: "100vh",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: C.text, display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative",
    }}>
      <style>{ANIM_CSS}</style>

      {/* ── Header ── */}
      <div style={{
        padding: "14px 24px 12px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, zIndex: 5,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.04em" }}>
            Mind<span style={{ color: C.accent, fontStyle: "italic", fontWeight: 500 }}>layer</span>
          </div>
          <div style={{
            fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
            color: C.muted, paddingLeft: 14, borderLeft: `1px solid ${C.border}`,
          }}>Belief Map</div>
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          {(["affirm","disagree","ambivalent","passive"] as const).map(k => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: POS_COLORS[k].stroke, opacity: 0.9 }} />
              <span style={{ fontSize: 10, color: C.muted }}>
                {k === "affirm" ? "Agrees" : k === "disagree" ? "Disagrees" : k === "ambivalent" ? "Ambivalent" : "Passive"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── SVG graph ── */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <svg width="100%" height="100%" style={{ display: "block" }} viewBox={`0 0 ${dims.w} ${dims.h}`}>
            <defs>
              {NODES.map(n => {
                const stance = nodeStances[n.id];
                const col = POS_COLORS[stance];
                return (
                  <radialGradient key={`${n.id}-${stance}`} id={`g-${n.id}`} cx="45%" cy="38%" r="62%">
                    <stop offset="0%"   stopColor={col.stroke} stopOpacity={0.3} />
                    <stop offset="80%"  stopColor={col.fill}   stopOpacity={0.92} />
                    <stop offset="100%" stopColor={C.bg}       stopOpacity={0.4} />
                  </radialGradient>
                );
              })}
              <filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>

            <rect width={dims.w} height={dims.h} fill={C.bg} />

            {/* Links */}
            {LINKS.map((link, i) => {
              const sS = nodeStates[link.source], tS = nodeStates[link.target];
              if (sS.opacity < 0.22 || tS.opacity < 0.22) return null;
              const sp = nodePos[link.source], tp = nodePos[link.target];
              if (!sp || !tp) return null;
              const cv = CURVE_OFFSETS[i];
              const opacity = Math.min(sS.opacity, tS.opacity) * 0.35;
              const tension = isTensionLink(link);
              const dash = link.type === "dashed" ? "6,4" : link.type === "dotted" ? "2,5" : "none";
              return (
                <path key={i}
                  d={`M ${sp.x} ${sp.y} Q ${(sp.x + tp.x) / 2 + cv.ox} ${(sp.y + tp.y) / 2 + cv.oy} ${tp.x} ${tp.y}`}
                  fill="none" stroke={tension ? C.amber : C.muted}
                  strokeWidth={link.weight * 0.5} strokeDasharray={dash} strokeOpacity={opacity}
                  style={{ transition: isActive ? "none" : "stroke-opacity 0.4s" }}
                />
              );
            })}

            {/* Nodes */}
            {NODES.map((node, ni) => {
              const st = nodeStates[node.id];
              if (st.opacity < 0.2) return null;
              const stance = nodeStances[node.id];
              const col = POS_COLORS[stance];
              const p = nodePos[node.id];
              if (!p) return null;
              const isHov = hoveredNode?.id === node.id;
              const isSel = selectedNode?.id === node.id;
              const tension = hasTension(node.id);
              const ds = isHov ? st.size * 1.06 : st.size;

              return (
                <g key={node.id}
                  transform={`translate(${p.x}, ${p.y})`}
                  style={{ cursor: "pointer" }}
                  opacity={st.opacity}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(isSel ? null : node)}
                >
                  {tension && (
                    <circle r={ds * 0.58 + 7} fill="none" stroke={C.amber}
                      strokeWidth={1} strokeDasharray="4,3"
                      style={{ animation: `ml-pulse-ring 3s ease-in-out infinite`, animationDelay: `${ni * 0.4}s` }} />
                  )}
                  {isSel && (
                    <circle r={ds * 0.58 + 11} fill="none" stroke={col.stroke}
                      strokeWidth={1.5} strokeOpacity={0.75} />
                  )}
                  <circle r={ds * 0.6} fill={col.stroke}
                    style={{ animation: `ml-breathe ${3.5 + ni * 0.2}s ease-in-out infinite`, animationDelay: `${ni * 0.35}s` }} />
                  <circle r={ds * 0.5}
                    fill={`url(#g-${node.id})`} stroke={col.stroke}
                    strokeWidth={isSel ? 2 : isHov ? 1.5 : 1}
                    strokeOpacity={isSel || isHov ? 1 : 0.55}
                    filter={isHov ? "url(#glow)" : "none"}
                    style={{ transition: isActive ? "none" : "r 0.5s ease, stroke-opacity 0.25s" }}
                  />
                  <text textAnchor="middle" dy="0.35em"
                    fontSize={Math.max(9, Math.min(12, ds * 0.21))}
                    fill={C.text} fontWeight={isSel ? 600 : 400}
                    style={{ pointerEvents: "none", userSelect: "none" }}>
                    {node.label.split(" ").length > 2
                      ? <>
                          <tspan x="0" dy="-0.55em">{node.label.split(" ").slice(0, Math.ceil(node.label.split(" ").length / 2)).join(" ")}</tspan>
                          <tspan x="0" dy="1.15em">{node.label.split(" ").slice(Math.ceil(node.label.split(" ").length / 2)).join(" ")}</tspan>
                        </>
                      : node.label}
                  </text>
                </g>
              );
            })}

            {/* Hover tooltip */}
            {hoveredNode && !selectedNode && (() => {
              const st = nodeStates[hoveredNode.id];
              const stance = nodeStances[hoveredNode.id];
              const col = POS_COLORS[stance];
              const det = NODE_DETAILS[hoveredNode.id];
              const p = nodePos[hoveredNode.id];
              const tw = 186, th = 74;
              const tx = p.x + st.size * 0.55 + 14, ty = p.y - 32;
              const ax = tx + tw > dims.w - 12 ? p.x - tw - st.size * 0.55 - 14 : tx;
              const ay = ty + th > dims.h - 12 ? dims.h - th - 12 : Math.max(10, ty);
              return (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={ax} y={ay} width={tw} height={th} rx={7}
                    fill={C.surface} stroke={col.stroke} strokeWidth={1} strokeOpacity={0.5} />
                  <text x={ax + 11} y={ay + 18} fontSize={11} fontWeight={600} fill={C.text}>{hoveredNode.label}</text>
                  <text x={ax + 11} y={ay + 33} fontSize={10} fill={col.stroke}>{col.label}</text>
                  <text x={ax + 11} y={ay + 49} fontSize={10} fill={C.muted}>{det?.sources} sources · {det?.reactions} reactions</text>
                  <text x={ax + 11} y={ay + 63} fontSize={9} fill={C.muted}>Active {det?.lastActive}</text>
                </g>
              );
            })()}
          </svg>

          {/* Discovery insight */}
          {discovery && (
            <div key={timeIdx} style={{
              position: "absolute", bottom: 14, left: 20, right: selectedNode ? 0 : 20,
              maxWidth: 400,
              background: `${C.surface}f0`, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
              animation: "ml-fade-in 0.3s ease-out", backdropFilter: "blur(6px)",
            }}>
              <div style={{
                width: 3, height: 28, borderRadius: 2, flexShrink: 0,
                background: discovery.nodeId
                  ? POS_COLORS[nodeStances[discovery.nodeId] || NODES.find(n => n.id === discovery.nodeId)?.position || "passive"].stroke
                  : C.accent,
              }} />
              <div style={{ fontSize: 12, lineHeight: 1.55, color: C.textSoft }}>{discovery.text}</div>
            </div>
          )}
        </div>

        {/* ── Detail panel ── */}
        {selectedNode && detail && selCol && (
          <div style={{
            width: 280, borderLeft: `1px solid ${C.border}`,
            background: C.surface, padding: 20, overflowY: "auto",
            flexShrink: 0, display: "flex", flexDirection: "column", gap: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{selectedNode.label}</div>
                <div style={{ fontSize: 11, color: selCol.stroke }}>{selCol.label}</div>
              </div>
              <button onClick={() => setSelectedNode(null)}
                style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {([
                { label: "Sources", val: String(detail.sources), warn: false },
                { label: "Reactions", val: String(detail.reactions), warn: false },
                { label: "Last active", val: detail.lastActive, warn: false },
                { label: "Tension", val: detail.tension ? "Yes" : "None", warn: detail.tension },
              ]).map(s => (
                <div key={s.label} style={{ background: C.bg, borderRadius: 6, padding: "10px 12px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.muted, marginBottom: 3, letterSpacing: "0.14em", textTransform: "uppercase" }}>{s.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: s.warn ? C.amber : C.text }}>{s.val}</div>
                </div>
              ))}
            </div>

            <div style={{
              fontSize: 12, lineHeight: 1.7, color: C.muted,
              padding: "12px 14px", background: C.bg,
              borderRadius: 6, borderLeft: `3px solid ${selCol.stroke}`,
            }}>{detail.summary}</div>

            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>Top Claims</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {detail.topClaims.map((claim, i) => (
                  <div key={i} style={{
                    fontSize: 12, lineHeight: 1.6, color: C.text,
                    padding: "8px 12px", background: C.bg, borderRadius: 6,
                    borderLeft: `2px solid ${C.border}`, fontStyle: "italic",
                  }}>&ldquo;{claim}&rdquo;</div>
                ))}
              </div>
            </div>

            {/* Engagement sparkline — bar colors reflect stance at each month */}
            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>Engagement This Year</div>
              <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 40 }}>
                {TL[selectedNode.id].map(([mult], mi) => {
                  const barStance = STANCE_TL[selectedNode.id]?.[mi] || selectedNode.position;
                  const barCol = POS_COLORS[barStance];
                  return (
                    <div key={mi} style={{
                      flex: 1, height: Math.max(4, mult * 36),
                      background: mi === timeIdx ? barCol.stroke : C.border,
                      borderRadius: 2, transition: "height 0.3s ease",
                      opacity: mi === timeIdx ? 1 : 0.55,
                    }} />
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 9, color: C.muted }}>Jan</span>
                <span style={{ fontSize: 9, color: C.muted }}>Dec</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          TIMELINE SCRUBBER
          ════════════════════════════════════════════════════════ */}
      <div style={{
        padding: "12px 24px 14px",
        borderTop: `1px solid ${C.border}`,
        background: C.surface, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

          {/* Play / Pause */}
          <button onClick={() => {
            if (timeValue >= 10.8) setTimeValue(0);
            setIsPlaying(!isPlaying);
          }} style={{
            background: isPlaying ? C.accentDim : C.accent,
            border: "none", borderRadius: "50%",
            width: 34, height: 34, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, color: "#fff", fontSize: 13,
            transition: "background 0.2s",
          }}>{isPlaying ? "⏸" : "▶"}</button>

          {/* Replay from Jan */}
          <button onClick={() => { setTimeValue(0); setIsPlaying(true); }} style={{
            background: "none", border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "5px 10px",
            fontSize: 10, color: C.muted, cursor: "pointer",
            letterSpacing: "0.04em", flexShrink: 0,
          }}>↺ Replay year</button>

          {/* Current month */}
          <div style={{
            fontSize: 13, color: C.accent, width: 32, flexShrink: 0,
            textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums",
          }}>{MONTHS[timeIdx]}</div>

          {/* ── Scrubber body ── */}
          <div ref={scrubRef} style={{ flex: 1, position: "relative", userSelect: "none" }}>

            {/* Month labels with stance-shift dots */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              {MONTHS.map((m, i) => {
                const shifted = Object.values(STANCE_TL).some(s => i > 0 && s[i] !== s[i - 1]);
                return (
                  <div key={m} onClick={() => setTimeValue(i)} style={{
                    fontSize: 9, cursor: "pointer",
                    color: i === timeIdx ? C.accent : C.muted,
                    fontWeight: i === timeIdx ? 700 : 400,
                    transition: isActive ? "none" : "color 0.15s",
                    position: "relative",
                  }}>
                    {m}
                    {shifted && <div style={{
                      position: "absolute", top: -3, right: -2,
                      width: 4, height: 4, borderRadius: "50%",
                      background: C.amber, opacity: 0.8,
                    }} />}
                  </div>
                );
              })}
            </div>

            {/* Activity sparkline — draggable */}
            <div style={{
              display: "flex", gap: 1, height: 24,
              alignItems: "flex-end", marginBottom: 3, cursor: "pointer",
            }}
              onMouseDown={e => startScrub(e.clientX)}
              onTouchStart={e => startScrub(e.touches[0].clientX)}
            >
              {MONTH_INTENSITY.map((v, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: 2,
                  height: `${Math.max(14, (v / MAX_INTENSITY) * 100)}%`,
                  background: i === timeIdx ? C.accent : i < timeIdx ? `${C.accent}25` : `${C.border}50`,
                  transition: isActive ? "none" : "background 0.15s",
                }} />
              ))}
            </div>

            {/* Thin progress track + handle */}
            <div style={{ height: 3, background: `${C.border}80`, borderRadius: 2, position: "relative" }}>
              {/* Fill */}
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${(timeValue / 11) * 100}%`,
                background: `linear-gradient(90deg, ${C.accentDim}, ${C.accent})`,
                borderRadius: 2,
                transition: isActive ? "none" : "width 0.3s ease",
              }} />

              {/* Event markers */}
              {SCRUB_EVENTS.map(ev => (
                <div key={ev.month} style={{
                  position: "absolute",
                  left: `${(ev.month / 11) * 100}%`,
                  top: -2, width: 5, height: 5, borderRadius: "50%",
                  background: ev.color, transform: "translateX(-50%)",
                  opacity: Math.abs(timeValue - ev.month) < 0.6 ? 0.9 : 0.35,
                  transition: "opacity 0.2s",
                }} />
              ))}

              {/* Handle */}
              <div style={{
                position: "absolute",
                left: `${(timeValue / 11) * 100}%`,
                top: "50%", transform: "translate(-50%, -50%)",
                width: isDragging ? 20 : 16, height: isDragging ? 20 : 16,
                background: C.accent, border: `2px solid ${C.bg}`,
                borderRadius: "50%",
                cursor: isDragging ? "grabbing" : "grab",
                transition: isActive ? "none" : "left 0.3s ease",
                boxShadow: `0 0 ${isDragging ? 16 : 8}px ${C.accentGlow}`,
                zIndex: 2,
              }}
                onMouseDown={e => { e.stopPropagation(); setIsDragging(true); }}
                onTouchStart={e => { e.stopPropagation(); setIsDragging(true); }}
              />
            </div>
          </div>

          {/* Live stats */}
          <div style={{ fontSize: 11, color: C.muted, flexShrink: 0, textAlign: "right", lineHeight: 1.55, minWidth: 80 }}>
            <div>{activeCount} active</div>
            <div style={{ color: C.accent }}>{peakCount} at peak</div>
          </div>
        </div>

        {/* Hint */}
        <div style={{ marginTop: 8, fontSize: 10, color: C.muted, textAlign: "center", letterSpacing: "0.02em" }}>
          ← → to step · Space to play · Drag the timeline to watch your thinking evolve
        </div>
      </div>

      {/* ── Wrapped teaser ── */}
      <a href="/wrapped" style={{
        position: "absolute", top: 14, right: 24,
        background: `${C.surface}e0`, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "8px 14px", textDecoration: "none",
        display: "flex", alignItems: "center", gap: 8,
        backdropFilter: "blur(6px)", zIndex: 10,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 600,
          background: `linear-gradient(90deg, ${C.accent}, ${C.blue}, ${C.amber})`,
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          animation: "ml-shimmer 3s linear infinite",
        }}>Your 2025 Wrapped</span>
        <span style={{ fontSize: 11, color: C.muted }}>→</span>
      </a>
    </div>
  );
}
