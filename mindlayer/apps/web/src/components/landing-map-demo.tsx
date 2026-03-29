"use client";

import { useState, useEffect, useRef, useMemo } from "react";

const C = {
  bg: "#0f0e0c", surface: "#1a1916", border: "#2a2825",
  text: "#e8e4dc", textSoft: "#c4bfb4", muted: "#7a7469",
  accent: "#52b788", accentDim: "#2d6a4f", accentGlow: "#52b78830",
  amber: "#d4915a", blue: "#6b9fc4",
};

const POS_COLORS: Record<string, { fill: string; stroke: string }> = {
  affirm:     { fill: "#1a3d2e", stroke: "#52b788" },
  disagree:   { fill: "#3d2010", stroke: "#d4915a" },
  ambivalent: { fill: "#1a2a3d", stroke: "#6b9fc4" },
  passive:    { fill: "#252219", stroke: "#4a4540" },
};

const VW = 900, VH = 460;

const NODES = [
  { id: "monetary-policy",  label: "Monetary Policy",       position: "disagree",   baseSize: 72, x0: 0.38, y0: 0.42 },
  { id: "climate",          label: "Climate & Energy",      position: "affirm",     baseSize: 68, x0: 0.62, y0: 0.30 },
  { id: "stoicism",         label: "Stoicism",              position: "affirm",     baseSize: 54, x0: 0.22, y0: 0.30 },
  { id: "ai-ml",            label: "AI & Machine Learning", position: "ambivalent", baseSize: 80, x0: 0.72, y0: 0.55 },
  { id: "geopolitics",      label: "Geopolitics",           position: "ambivalent", baseSize: 58, x0: 0.50, y0: 0.65 },
  { id: "nutrition",        label: "Nutrition & Health",    position: "affirm",     baseSize: 44, x0: 0.28, y0: 0.60 },
  { id: "urbanism",         label: "Urbanism",              position: "affirm",     baseSize: 36, x0: 0.78, y0: 0.35 },
  { id: "crypto",           label: "Crypto & Web3",         position: "disagree",   baseSize: 48, x0: 0.55, y0: 0.20 },
  { id: "philosophy",       label: "Philosophy of Mind",    position: "ambivalent", baseSize: 42, x0: 0.18, y0: 0.50 },
  { id: "supply-chain",     label: "Supply Chains",         position: "passive",    baseSize: 30, x0: 0.45, y0: 0.78 },
  { id: "sleep-science",    label: "Sleep Science",         position: "affirm",     baseSize: 32, x0: 0.15, y0: 0.70 },
  { id: "media-trust",      label: "Media & Trust",         position: "disagree",   baseSize: 50, x0: 0.68, y0: 0.72 },
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

const STANCE_TL: Record<string, string[]> = {
  "crypto":     ["ambivalent","ambivalent","ambivalent","disagree","disagree","disagree","disagree","disagree","disagree","disagree","disagree","disagree"],
  "ai-ml":      ["affirm","affirm","affirm","affirm","ambivalent","ambivalent","ambivalent","ambivalent","ambivalent","ambivalent","ambivalent","ambivalent"],
  "philosophy": ["passive","passive","passive","passive","passive","passive","ambivalent","ambivalent","ambivalent","ambivalent","ambivalent","ambivalent"],
};

const MONTH_INTENSITY = MONTHS.map((_, mi) =>
  NODES.reduce((sum, n) => sum + TL[n.id][mi][0], 0) / NODES.length
);
const MAX_INTENSITY = Math.max(...MONTH_INTENSITY);

const DISCOVERIES: { month: number; text: string; nodeId?: string }[] = [
  { month: 0,  text: "January — Stoicism and Crypto dominate early reading" },
  { month: 1,  text: "Nutrition ramping up — 2 new sources this week", nodeId: "nutrition" },
  { month: 2,  text: "Nutrition peaks — 3 sources in a single week", nodeId: "nutrition" },
  { month: 3,  text: "Crypto shifts from ambivalent to disagree", nodeId: "crypto" },
  { month: 4,  text: "AI: new evidence creates genuine uncertainty", nodeId: "ai-ml" },
  { month: 5,  text: "Stoicism fading — no new reads in 3 weeks", nodeId: "stoicism" },
  { month: 6,  text: "Two new interests emerge: Urbanism and Philosophy", nodeId: "urbanism" },
  { month: 7,  text: "AI overtakes everything in reading volume", nodeId: "ai-ml" },
  { month: 8,  text: "Crypto engagement drops 70% from peak", nodeId: "crypto" },
  { month: 9,  text: "Philosophy has grown quietly for 8 months", nodeId: "philosophy" },
  { month: 10, text: "Media & Trust doubles since summer", nodeId: "media-trust" },
  { month: 11, text: "December — 12 clusters, 3 belief shifts, 1 year of thinking" },
];

const CURVE_OFFSETS = LINKS.map((_, i) => ({
  ox: Math.sin(i * 2.7 + 1.3) * 40,
  oy: Math.cos(i * 3.1 + 0.7) * 40,
}));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
type NodeT = typeof NODES[number];

const ANIM_CSS = `
  @keyframes ld-breathe { 0%,100%{opacity:.05} 50%{opacity:.14} }
  @keyframes ld-pulse   { 0%,100%{stroke-opacity:.35} 50%{stroke-opacity:.6} }
  @keyframes ld-fade-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
`;

export default function LandingMapDemo() {
  const scrubRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const interactedRef = useRef(false);
  const restartRef = useRef<ReturnType<typeof setTimeout>>();

  const [timeValue, setTimeValue] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<NodeT | null>(null);

  const timeIdx = Math.round(timeValue);
  const isActive = isDragging || isPlaying;

  useEffect(() => {
    const t = setTimeout(() => setIsPlaying(true), 600);
    return () => { clearTimeout(t); clearTimeout(restartRef.current); };
  }, []);

  useEffect(() => {
    if (!isPlaying) { lastTsRef.current = 0; return; }
    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      setTimeValue(prev => {
        const next = prev + dt / 1200;
        if (next >= 11) {
          setIsPlaying(false);
          if (!interactedRef.current) {
            restartRef.current = setTimeout(() => {
              setTimeValue(0);
              setIsPlaying(true);
            }, 3500);
          }
          return 11;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

  useEffect(() => {
    if (!isDragging) return;
    const update = (cx: number) => {
      const r = scrubRef.current?.getBoundingClientRect();
      if (!r) return;
      setTimeValue(Math.max(0, Math.min(1, (cx - r.left) / r.width)) * 11);
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

  const nodePos = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {};
    NODES.forEach(n => {
      const { sizeMult } = nodeStates[n.id];
      const fade = Math.max(0, 1 - sizeMult);
      const dx = n.x0 - 0.5, dy = n.y0 - 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const push = fade * 0.07;
      out[n.id] = {
        x: (n.x0 + (dx / dist) * push) * VW,
        y: (n.y0 + (dy / dist) * push) * VH,
      };
    });
    return out;
  }, [nodeStates]);

  const isTensionLink = (l: typeof LINKS[number]) =>
    TENSIONS.some(p => (p.a === l.source && p.b === l.target) || (p.b === l.source && p.a === l.target));
  const hasTension = (id: string) => TENSIONS.some(p => p.a === id || p.b === id);

  const discovery = DISCOVERIES.find(d => d.month === timeIdx);

  const startScrub = (cx: number) => {
    interactedRef.current = true;
    clearTimeout(restartRef.current);
    setIsDragging(true);
    setIsPlaying(false);
    const r = scrubRef.current?.getBoundingClientRect();
    if (r) setTimeValue(Math.max(0, Math.min(1, (cx - r.left) / r.width)) * 11);
  };

  return (
    <div style={{
      background: C.surface, borderRadius: 12,
      border: `1px solid ${C.border}`, overflow: "hidden",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{ANIM_CSS}</style>

      <div style={{
        padding: "8px 16px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted }}>
          Belief Map
        </span>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {(["affirm", "disagree", "ambivalent", "passive"] as const).map(k => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: POS_COLORS[k].stroke }} />
              <span style={{ fontSize: 9, color: C.muted }}>
                {k === "affirm" ? "Agrees" : k === "disagree" ? "Disagrees" : k === "ambivalent" ? "Mixed" : "Passive"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", background: C.bg }}>
        <svg viewBox={`0 0 ${VW} ${VH}`} style={{ display: "block", width: "100%" }}>
          <defs>
            {NODES.map(n => {
              const stance = nodeStances[n.id];
              const col = POS_COLORS[stance];
              return (
                <radialGradient key={`${n.id}-${stance}`} id={`ld-g-${n.id}`} cx="45%" cy="38%" r="62%">
                  <stop offset="0%" stopColor={col.stroke} stopOpacity={0.3} />
                  <stop offset="80%" stopColor={col.fill} stopOpacity={0.92} />
                  <stop offset="100%" stopColor={C.bg} stopOpacity={0.4} />
                </radialGradient>
              );
            })}
            <filter id="ld-glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>

          <rect width={VW} height={VH} fill={C.bg} />

          {LINKS.map((link, i) => {
            const sS = nodeStates[link.source], tS = nodeStates[link.target];
            if (sS.opacity < 0.22 || tS.opacity < 0.22) return null;
            const sp = nodePos[link.source], tp = nodePos[link.target];
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

          {NODES.map((node, ni) => {
            const st = nodeStates[node.id];
            if (st.opacity < 0.2) return null;
            const stance = nodeStances[node.id];
            const col = POS_COLORS[stance];
            const p = nodePos[node.id];
            const isHov = hoveredNode?.id === node.id;
            const tension = hasTension(node.id);
            const ds = isHov ? st.size * 1.06 : st.size;

            return (
              <g key={node.id}
                transform={`translate(${p.x}, ${p.y})`}
                style={{ cursor: "pointer" }}
                opacity={st.opacity}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {tension && (
                  <circle r={ds * 0.58 + 7} fill="none" stroke={C.amber}
                    strokeWidth={1} strokeDasharray="4,3"
                    style={{ animation: `ld-pulse 3s ease-in-out infinite`, animationDelay: `${ni * 0.4}s` }} />
                )}
                <circle r={ds * 0.6} fill={col.stroke}
                  style={{ animation: `ld-breathe ${3.5 + ni * 0.2}s ease-in-out infinite`, animationDelay: `${ni * 0.35}s` }} />
                <circle r={ds * 0.5}
                  fill={`url(#ld-g-${node.id})`} stroke={col.stroke}
                  strokeWidth={isHov ? 1.5 : 1}
                  strokeOpacity={isHov ? 1 : 0.55}
                  filter={isHov ? "url(#ld-glow)" : "none"}
                  style={{ transition: isActive ? "none" : "r 0.5s ease" }}
                />
                <text textAnchor="middle" dy="0.35em"
                  fontSize={Math.max(9, Math.min(12, ds * 0.21))}
                  fill={C.text} fontWeight={400}
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

          {hoveredNode && (() => {
            const st = nodeStates[hoveredNode.id];
            const stance = nodeStances[hoveredNode.id];
            const col = POS_COLORS[stance];
            const p = nodePos[hoveredNode.id];
            const tw = 170, th = 42;
            const tx = p.x + st.size * 0.55 + 12;
            const ty = p.y - 16;
            const ax = tx + tw > VW - 10 ? p.x - tw - st.size * 0.55 - 12 : tx;
            const ay = ty + th > VH - 10 ? VH - th - 10 : Math.max(8, ty);
            const label = stance === "affirm" ? "Generally agrees" : stance === "disagree" ? "Generally disagrees" : stance === "ambivalent" ? "Ambivalent" : "Passive interest";
            return (
              <g style={{ pointerEvents: "none" }}>
                <rect x={ax} y={ay} width={tw} height={th} rx={6}
                  fill={C.surface} stroke={col.stroke} strokeWidth={1} strokeOpacity={0.5} />
                <text x={ax + 10} y={ay + 17} fontSize={11} fontWeight={600} fill={C.text}>{hoveredNode.label}</text>
                <text x={ax + 10} y={ay + 33} fontSize={10} fill={col.stroke}>{label}</text>
              </g>
            );
          })()}
        </svg>

        {discovery && (
          <div key={timeIdx} style={{
            position: "absolute", bottom: 10, left: 14, right: 14,
            maxWidth: 420,
            background: `${C.surface}ee`, border: `1px solid ${C.border}`,
            borderRadius: 7, padding: "8px 14px",
            display: "flex", alignItems: "center", gap: 9,
            animation: "ld-fade-in 0.3s ease-out",
            backdropFilter: "blur(6px)",
          }}>
            <div style={{
              width: 3, height: 24, borderRadius: 2, flexShrink: 0,
              background: discovery.nodeId
                ? POS_COLORS[nodeStances[discovery.nodeId] || NODES.find(n => n.id === discovery.nodeId)?.position || "passive"].stroke
                : C.accent,
            }} />
            <div style={{ fontSize: 11, lineHeight: 1.5, color: C.textSoft }}>{discovery.text}</div>
          </div>
        )}
      </div>

      <div style={{
        padding: "10px 16px 12px",
        borderTop: `1px solid ${C.border}`,
        background: C.surface,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => {
            interactedRef.current = true;
            clearTimeout(restartRef.current);
            if (timeValue >= 10.8) setTimeValue(0);
            setIsPlaying(!isPlaying);
          }} style={{
            background: isPlaying ? C.accentDim : C.accent,
            border: "none", borderRadius: "50%",
            width: 30, height: 30, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, color: "#fff", fontSize: 11,
            transition: "background 0.2s",
          }}>
            {isPlaying ? "⏸" : "▶"}
          </button>

          <div style={{
            fontSize: 12, color: C.accent, width: 28, flexShrink: 0,
            textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums",
          }}>{MONTHS[timeIdx]}</div>

          <div ref={scrubRef} style={{ flex: 1, position: "relative", userSelect: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              {MONTHS.map((m, i) => {
                const shifted = Object.values(STANCE_TL).some(s => i > 0 && s[i] !== s[i - 1]);
                return (
                  <div key={m} onClick={() => {
                    interactedRef.current = true;
                    clearTimeout(restartRef.current);
                    setIsPlaying(false);
                    setTimeValue(i);
                  }} style={{
                    fontSize: 8, cursor: "pointer",
                    color: i === timeIdx ? C.accent : C.muted,
                    fontWeight: i === timeIdx ? 700 : 400,
                    position: "relative",
                  }}>
                    {m}
                    {shifted && <div style={{
                      position: "absolute", top: -3, right: -2,
                      width: 3, height: 3, borderRadius: "50%",
                      background: C.amber, opacity: 0.8,
                    }} />}
                  </div>
                );
              })}
            </div>

            <div style={{
              display: "flex", gap: 1, height: 20,
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

            <div style={{ height: 3, background: `${C.border}80`, borderRadius: 2, position: "relative" }}>
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: `${(timeValue / 11) * 100}%`,
                background: `linear-gradient(90deg, ${C.accentDim}, ${C.accent})`,
                borderRadius: 2, transition: isActive ? "none" : "width 0.3s ease",
              }} />
              <div style={{
                position: "absolute",
                left: `${(timeValue / 11) * 100}%`,
                top: "50%", transform: "translate(-50%, -50%)",
                width: isDragging ? 18 : 14, height: isDragging ? 18 : 14,
                background: C.accent, border: `2px solid ${C.bg}`,
                borderRadius: "50%",
                cursor: isDragging ? "grabbing" : "grab",
                transition: isActive ? "none" : "left 0.3s ease",
                boxShadow: `0 0 ${isDragging ? 14 : 6}px ${C.accentGlow}`,
                zIndex: 2,
              }}
                onMouseDown={e => { e.stopPropagation(); startScrub(e.clientX); }}
                onTouchStart={e => { e.stopPropagation(); startScrub(e.touches[0].clientX); }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
