"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Palette (matches map) ──────────────────────────────────────
const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#52b788",
  accentDim: "#2d6a4f",
  amber: "#d4915a",
  amberDim: "#7a4a20",
  blue: "#6b9fc4",
  blueDim: "#2a4a62",
  rose: "#c47a7a",
};

// ── Mock wrapped data ──────────────────────────────────────────
const YEAR = 2025;

const TOP_TOPICS = [
  { label: "AI & Machine Learning", sources: 31, reactions: 22, color: "#6b9fc4", position: "Ambivalent", trend: "peaked" },
  { label: "Climate & Energy",      sources: 26, reactions: 19, color: "#52b788", position: "Agrees",     trend: "steady" },
  { label: "Monetary Policy",       sources: 24, reactions: 18, color: "#d4915a", position: "Disagrees",  trend: "peaked" },
  { label: "Geopolitics",           sources: 22, reactions: 16, color: "#6b9fc4", position: "Ambivalent", trend: "steady" },
  { label: "Media & Trust",         sources: 20, reactions: 14, color: "#d4915a", position: "Disagrees",  trend: "growing" },
];

const BELIEF_SHIFTS = [
  {
    topic: "AI Capability Timelines",
    before: "In March you thought AGI was 10+ years away.",
    after: "By August — after three key sources — you moved to \"genuinely uncertain.\"",
    trigger: "Situational Awareness (Leopold Aschenbrenner), June 2025",
    color: "#6b9fc4",
  },
  {
    topic: "Crypto Value",
    before: "Started the year still engaging with DeFi debates.",
    after: "By Q3 your disagree rate hit 85%. You've largely moved on.",
    trigger: "Disengagement was gradual — no single source, just accumulation.",
    color: "#d4915a",
  },
];

const DEEP_READS = [
  { label: "Philosophy of Mind", months: 8, detail: "Grew steadily for 8 consecutive months — your most patient interest" },
  { label: "Climate & Energy",   months: 12, detail: "Active every single month — your most consistent topic all year" },
  { label: "Nutrition & Health",  months: 5, detail: "Intense in Q1 — 3 sources in one week in February — then quiet" },
];

const OPEN_QUESTIONS = [
  { topic: "AI & Machine Learning", question: "Will open-source models actually catch up to closed ones?", engagement: "22 reactions, no consistent direction" },
  { topic: "Geopolitics", question: "Is multipolarity inherently more dangerous or just unfamiliar?", engagement: "16 reactions, deeply ambivalent" },
];

const NUMBERS = { sources: 221, reactions: 151, clusters: 12, shifts: 3, months: 12 };

// ── Animations ─────────────────────────────────────────────────
const CSS = `
  @keyframes wr-fade-up {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes wr-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes wr-count-line {
    from { width: 0%; }
    to   { width: var(--target-w); }
  }
  @keyframes wr-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes wr-glow-pulse {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 0.8; }
  }
  .wr-section {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }
  .wr-section.wr-visible {
    opacity: 1;
    transform: translateY(0);
  }
`;

// ── Intersection observer hook ─────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.18 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ── Animated number ────────────────────────────────────────────
function AnimNum({ value, visible, suffix = "" }: { value: number; visible: boolean; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 1200;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, value]);
  return <>{display}{suffix}</>;
}

// ── Share card toggle ──────────────────────────────────────────
function ShareToggle({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.text }}>{label}</span>
      <button onClick={() => setOn(!on)} style={{
        width: 38, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
        background: on ? C.accent : C.border, position: "relative", transition: "background 0.2s",
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 2,
          left: on ? 20 : 2, transition: "left 0.2s",
        }} />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function MindlayerWrapped() {
  const cover = useReveal();
  const topics = useReveal();
  const shifts = useReveal();
  const deep = useReveal();
  const questions = useReveal();
  const numbers = useReveal();
  const share = useReveal();
  const [shareLink, setShareLink] = useState<string | null>(null);

  const generateLink = useCallback(() => {
    setShareLink(`https://mindlayer.app/wrapped/${YEAR}/u_demo_${Math.random().toString(36).slice(2, 8)}`);
  }, []);

  const sectionStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
    padding: "80px 24px",
    maxWidth: 680, margin: "0 auto", width: "100%",
  };

  return (
    <div style={{
      background: C.bg, color: C.text, minHeight: "100vh",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <style>{CSS}</style>

      {/* ── Floating back link ── */}
      <a href="/map" style={{
        position: "fixed", top: 16, left: 20, zIndex: 50,
        fontSize: 12, color: C.muted, textDecoration: "none",
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 14px", borderRadius: 20,
        background: `${C.surface}dd`, border: `1px solid ${C.border}`,
        backdropFilter: "blur(8px)",
      }}>
        <span>←</span>
        <span>Back to map</span>
      </a>

      {/* ── Progress dots ── */}
      <div style={{
        position: "fixed", right: 16, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 8, zIndex: 50,
      }}>
        {[cover, topics, shifts, deep, questions, numbers, share].map((s, i) => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: s.visible ? C.accent : C.border,
            transition: "background 0.4s",
          }} />
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 0 — COVER
          ══════════════════════════════════════════════════════════ */}
      <div ref={cover.ref} className={`wr-section ${cover.visible ? "wr-visible" : ""}`}
        style={{ ...sectionStyle, minHeight: "100vh", textAlign: "center", gap: 24 }}>
        <div style={{
          fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase",
          color: C.muted, marginBottom: 8,
        }}>Mindlayer Wrapped</div>
        <div style={{
          fontSize: 72, fontWeight: 800, letterSpacing: "-0.06em", lineHeight: 1,
          background: `linear-gradient(135deg, ${C.accent}, ${C.blue}, ${C.amber})`,
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          animation: "wr-shimmer 4s linear infinite",
        }}>{YEAR}</div>
        <div style={{ fontSize: 20, fontWeight: 300, color: C.textSoft, maxWidth: 440, lineHeight: 1.6 }}>
          This is what you read, what you believed,<br />
          where you changed your mind,<br />
          and what you kept coming back to.
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 40 }}>Scroll to begin ↓</div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 1 — YOUR YEAR IN TOPICS
          ══════════════════════════════════════════════════════════ */}
      <div ref={topics.ref} className={`wr-section ${topics.visible ? "wr-visible" : ""}`}
        style={{ ...sectionStyle, gap: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>Your Year in Topics</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>What You Cared About</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 8, maxWidth: 420, lineHeight: 1.6 }}>
            Where your attention actually lived — not where you think it lived.
          </div>
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
          {TOP_TOPICS.map((t, i) => {
            const maxSources = TOP_TOPICS[0].sources;
            const pct = (t.sources / maxSources) * 100;
            return (
              <div key={t.label} style={{
                display: "flex", alignItems: "center", gap: 16,
                opacity: topics.visible ? 1 : 0,
                transform: topics.visible ? "translateX(0)" : "translateX(-20px)",
                transition: `opacity 0.5s ease ${0.15 * i}s, transform 0.5s ease ${0.15 * i}s`,
              }}>
                <div style={{ width: 160, flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{t.position} · {t.sources} sources</div>
                </div>
                <div style={{ flex: 1, height: 28, background: C.surface, borderRadius: 6, overflow: "hidden", position: "relative" }}>
                  <div style={{
                    height: "100%", borderRadius: 6,
                    background: `linear-gradient(90deg, ${t.color}40, ${t.color}90)`,
                    width: topics.visible ? `${pct}%` : "0%",
                    transition: `width 0.8s ease ${0.15 * i}s`,
                  }} />
                  <div style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    fontSize: 11, fontWeight: 600, color: C.text,
                  }}>{t.reactions} reactions</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 2 — WHERE YOU CHANGED YOUR MIND
          ══════════════════════════════════════════════════════════ */}
      <div ref={shifts.ref} className={`wr-section ${shifts.visible ? "wr-visible" : ""}`}
        style={{ ...sectionStyle, gap: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>Your Biggest Shifts</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>Where You Changed Your Mind</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 8, maxWidth: 440, lineHeight: 1.6 }}>
            The moments where a position flipped — or quietly softened.
          </div>
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
          {BELIEF_SHIFTS.map((s, i) => (
            <div key={s.topic} style={{
              background: C.surface, borderRadius: 12,
              border: `1px solid ${C.border}`, overflow: "hidden",
              opacity: shifts.visible ? 1 : 0,
              transform: shifts.visible ? "translateY(0)" : "translateY(16px)",
              transition: `opacity 0.6s ease ${0.2 * i}s, transform 0.6s ease ${0.2 * i}s`,
            }}>
              <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{s.topic}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div style={{ padding: "16px 22px", borderRight: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 8 }}>Before</div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: C.textSoft }}>{s.before}</div>
                </div>
                <div style={{ padding: "16px 22px" }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: s.color, marginBottom: 8 }}>After</div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: C.text }}>{s.after}</div>
                </div>
              </div>
              <div style={{ padding: "12px 22px", background: `${C.bg}`, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>Triggered by: {s.trigger}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3 — WHAT YOU KEPT RETURNING TO
          ══════════════════════════════════════════════════════════ */}
      <div ref={deep.ref} className={`wr-section ${deep.visible ? "wr-visible" : ""}`}
        style={{ ...sectionStyle, gap: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>Your Deepest Reads</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>What You Kept Returning To</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 8, maxWidth: 440, lineHeight: 1.6 }}>
            The topics you circled for months. A portrait of genuine engagement.
          </div>
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
          {DEEP_READS.map((d, i) => (
            <div key={d.label} style={{
              background: C.surface, borderRadius: 10, padding: "20px 24px",
              border: `1px solid ${C.border}`,
              opacity: deep.visible ? 1 : 0,
              transform: deep.visible ? "translateY(0)" : "translateY(14px)",
              transition: `opacity 0.5s ease ${0.18 * i}s, transform 0.5s ease ${0.18 * i}s`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{d.label}</div>
                <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{d.months} months active</div>
              </div>
              {/* Month strip */}
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                {Array.from({ length: 12 }).map((_, mi) => (
                  <div key={mi} style={{
                    flex: 1, height: 6, borderRadius: 3,
                    background: mi < d.months ? C.accent : C.border,
                    opacity: mi < d.months ? 0.7 + (mi / d.months) * 0.3 : 0.3,
                    transition: `background 0.3s ease ${mi * 0.04}s`,
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.65, color: C.muted }}>{d.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 4 — YOUR OPEN QUESTIONS
          ══════════════════════════════════════════════════════════ */}
      <div ref={questions.ref} className={`wr-section ${questions.visible ? "wr-visible" : ""}`}
        style={{ ...sectionStyle, gap: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>Still Open</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>What You Haven&apos;t Settled</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 8, maxWidth: 440, lineHeight: 1.6 }}>
            Topics where you engaged deeply but never landed on a consistent position.<br />
            Not failure — active thinking.
          </div>
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
          {OPEN_QUESTIONS.map((q, i) => (
            <div key={q.topic} style={{
              background: C.surface, borderRadius: 10,
              border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${C.blue}`,
              padding: "22px 24px",
              opacity: questions.visible ? 1 : 0,
              transform: questions.visible ? "translateX(0)" : "translateX(-12px)",
              transition: `opacity 0.5s ease ${0.2 * i}s, transform 0.5s ease ${0.2 * i}s`,
            }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.blue, marginBottom: 8 }}>{q.topic}</div>
              <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.55, marginBottom: 10, fontStyle: "italic" }}>
                &ldquo;{q.question}&rdquo;
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>{q.engagement}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 5 — YOUR NUMBERS
          ══════════════════════════════════════════════════════════ */}
      <div ref={numbers.ref} className={`wr-section ${numbers.visible ? "wr-visible" : ""}`}
        style={{ ...sectionStyle, gap: 40 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>By the Numbers</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>Your {YEAR}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, width: "100%", maxWidth: 480 }}>
          {([
            { label: "Sources Read",    value: NUMBERS.sources,   color: C.text },
            { label: "Reactions",        value: NUMBERS.reactions, color: C.accent },
            { label: "Topic Clusters",   value: NUMBERS.clusters,  color: C.blue },
            { label: "Belief Shifts",    value: NUMBERS.shifts,    color: C.amber },
            { label: "Months Active",    value: NUMBERS.months,    color: C.text },
            { label: "Open Questions",   value: OPEN_QUESTIONS.length, color: C.blue },
          ]).map((n, i) => (
            <div key={n.label} style={{
              background: C.surface, borderRadius: 10,
              border: `1px solid ${C.border}`, padding: "20px 16px",
              textAlign: "center",
              opacity: numbers.visible ? 1 : 0,
              transform: numbers.visible ? "scale(1)" : "scale(0.9)",
              transition: `opacity 0.4s ease ${0.08 * i}s, transform 0.4s ease ${0.08 * i}s`,
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: n.color, letterSpacing: "-0.03em", marginBottom: 4 }}>
                <AnimNum value={n.value} visible={numbers.visible} />
              </div>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted }}>{n.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 6 — SHARE
          ══════════════════════════════════════════════════════════ */}
      <div ref={share.ref} className={`wr-section ${share.visible ? "wr-visible" : ""}`}
        style={{ ...sectionStyle, gap: 32 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>Share Your Wrapped</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>Your map, made public — on your terms</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 8, maxWidth: 440, lineHeight: 1.6, margin: "8px auto 0" }}>
            Choose exactly which cards to share. Everything is private by default.
          </div>
        </div>

        <div style={{
          width: "100%", maxWidth: 400,
          background: C.surface, borderRadius: 12,
          border: `1px solid ${C.border}`, padding: "20px 24px",
        }}>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: C.muted, marginBottom: 12 }}>Include in shared link</div>
          <ShareToggle label="Your Year in Topics" defaultOn />
          <ShareToggle label="Biggest Belief Shifts" />
          <ShareToggle label="Deepest Reads" defaultOn />
          <ShareToggle label="Open Questions" />
          <ShareToggle label="Your Numbers" defaultOn />
        </div>

        {!shareLink ? (
          <button onClick={generateLink} style={{
            background: C.accent, color: "#fff", border: "none",
            borderRadius: 8, padding: "14px 32px",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
            transition: "background 0.2s",
          }}>
            Generate shareable link
          </button>
        ) : (
          <div style={{
            background: C.surface, borderRadius: 10,
            border: `1px solid ${C.accent}40`, padding: "16px 20px",
            display: "flex", alignItems: "center", gap: 12,
            maxWidth: 480, width: "100%",
          }}>
            <div style={{
              flex: 1, fontSize: 13, color: C.accent,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: "monospace",
            }}>{shareLink}</div>
            <button onClick={() => navigator.clipboard?.writeText(shareLink)} style={{
              background: C.accentDim, color: C.accent, border: "none",
              borderRadius: 6, padding: "8px 16px", cursor: "pointer",
              fontSize: 12, fontWeight: 600, flexShrink: 0,
            }}>Copy</button>
          </div>
        )}

        <div style={{ fontSize: 11, color: C.muted, textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
          Your Wrapped generates a unique URL — a beautiful, animated page that works on any device. Not an image. Not a PDF. Something that feels like it came from a person, not a product.
        </div>

        {/* Back to map */}
        <a href="/map" style={{
          marginTop: 20, fontSize: 13, color: C.muted,
          textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
        }}>
          ← Back to your map
        </a>
      </div>
    </div>
  );
}
