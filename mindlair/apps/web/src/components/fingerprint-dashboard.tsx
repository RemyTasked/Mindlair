"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import * as htmlToImage from "html-to-image";
import MindlairYearWrapped from "@/components/mindlair-year-wrapped";
import CardCollection from "@/components/card-collection";
import {
  FINGERPRINT_MIN_COHORT_N,
  isMinorityInCohort,
  type ComparisonRow,
  type FingerprintPayload,
} from "@/lib/fingerprint-types";

// The inner ProfileCard is a self-contained designed artifact (intended for PNG
// export) and uses its own paper/ink palette. The wrapping dashboard converges
// on the app's warm-dark palette so it reads as part of Mindlair, not a foreign
// page. The exported `C` object below is used by both the ProfileCard
// (paper/ink) and the wrapping UI - keep both palettes here, separated.
const C = {
  // ProfileCard (inner artifact) palette
  ink: "#16161A",
  ink2: "#242428",
  paper: "#FAFAF7",
  soft: "#F2F2EE",
  rule: "#E4E4E0",
  muted: "#78787E",
  body: "#3C3C42",
  accent: "#2A6B4E",
  accent2: "#48A97A",
  amber: "#C47D3A",
  blue: "#2E5FA3",
  purple: "#6B4FA3",
  red: "#C0392B",
};

// Wrapping dashboard palette (matches rest of Mindlair app shell).
const W = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  surfaceAlt: "#211f1c",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#d4915a",
  green: "#a3c47a",
  rose: "#e57373",
  blue: "#4a9eff",
};

const CONTENT_COLORS: Record<string, string> = {
  podcast: C.accent2,
  article: C.blue,
  video: C.purple,
  thread: C.muted,
  other: C.muted,
};

function consumptionEmoji(iconKey: string): string {
  if (iconKey === "podcast") return "🎙";
  if (iconKey === "video") return "▶";
  return "📄";
}

function topicTypeEmoji(t: string): string {
  if (t === "podcast") return "🎙";
  if (t === "video") return "▶";
  return "📄";
}

function Bar({
  value,
  color = C.accent,
  height = 4,
  bg = "rgba(255,255,255,0.08)",
}: {
  value: number;
  color?: string;
  height?: number;
  bg?: string;
}) {
  return (
    <div style={{ height, background: bg, borderRadius: height, overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: "100%",
          background: color,
          borderRadius: height,
          opacity: 0.85,
        }}
      />
    </div>
  );
}

function LightBar({ value, color = C.accent, height = 5 }: { value: number; color?: string; height?: number }) {
  return (
    <div style={{ height, background: C.rule, borderRadius: height, overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: "100%",
          background: color,
          borderRadius: height,
          opacity: 0.75,
        }}
      />
    </div>
  );
}

export type PrivacySection = "consumption" | "positions" | "questions" | "shifts";

const defaultPrivacy: Record<PrivacySection, boolean> = {
  consumption: true,
  positions: true,
  questions: true,
  shifts: true,
};

function ProfileCard({
  data,
  privacy,
  cardRef,
}: {
  data: FingerprintPayload;
  privacy: Record<PrivacySection, boolean>;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const maxTopic = Math.max(1, ...data.topTopics.map(t => t.count));
  const displayName = data.user.displayName || data.user.handleHint || "You";
  const since = new Date(data.user.memberSince);
  const sinceStr = since.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const appHost =
    typeof window !== "undefined"
      ? window.location.host.replace(/^www\./, "")
      : (process.env.NEXT_PUBLIC_APP_URL || "mindlair.app").replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div
      ref={cardRef}
      style={{
        width: 360,
        background: C.ink,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          background: "linear-gradient(140deg, #1A3D2E 0%, #1A1A20 55%)",
          padding: "22px 22px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#FAFAF7",
                letterSpacing: "-0.02em",
              }}
            >
              Mind<span style={{ color: C.accent2, fontStyle: "italic" }}>lair</span>
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.28)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginTop: 1,
              }}
            >
              Intellectual Fingerprint
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#FAFAF7" }}>{displayName}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>since {sinceStr}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
          {[
            { n: data.headerStats.sources, l: "Sources" },
            { n: data.headerStats.reactions, l: "Reactions" },
            { n: data.headerStats.topics, l: "Topics" },
            { n: data.headerStats.shifts, l: "Shifts" },
          ].map(s => (
            <div
              key={s.l}
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: 8,
                padding: "9px 0",
                textAlign: "center",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: C.accent2,
                  fontFamily: "Georgia, serif",
                  lineHeight: 1,
                }}
              >
                {s.n}
              </div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {privacy.consumption && (
        <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
              marginBottom: 14,
            }}
          >
            What You Consume
          </div>
          {data.consumption.length === 0 ? (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0 }}>
              Save articles, podcasts, or video through Mindlair to see this section.
            </p>
          ) : (
            <>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {data.consumption.map(c => (
                  <div
                    key={c.label}
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: 8,
                      padding: "10px 8px",
                      textAlign: "center",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{consumptionEmoji(c.iconKey)}</div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: CONTENT_COLORS[c.contentType] || C.accent2,
                        fontFamily: "Georgia, serif",
                        lineHeight: 1,
                      }}
                    >
                      {c.count}
                    </div>
                    <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{c.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.topTopics.length === 0 ? (
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0 }}>
                    React to claims to build topic clusters on your map.
                  </p>
                ) : (
                  data.topTopics.map(t => (
                    <div key={t.conceptId}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ display: "flex", gap: 2 }}>
                            {(t.contentTypeIcons.length ? t.contentTypeIcons : ["article"]).map((ty, i) => (
                              <span key={i} style={{ fontSize: 9 }}>
                                {topicTypeEmoji(ty)}
                              </span>
                            ))}
                          </div>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{t.label}</span>
                        </div>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{t.count}</span>
                      </div>
                      <Bar value={(t.count / maxTopic) * 100} color={C.accent2} height={3} />
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {privacy.positions && (
        <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
              marginBottom: 6,
            }}
          >
            Where You Land vs Others
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginBottom: 14, lineHeight: 1.5 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 8,
                  height: 3,
                  background: C.accent2,
                  display: "inline-block",
                  borderRadius: 2,
                }}
              />
              Mindlair users (anonymous aggregate, n≥{FINGERPRINT_MIN_COHORT_N})
            </span>
            <div style={{ marginTop: 6, color: "rgba(255,255,255,0.25)" }}>
              General-public polling comparison is not shown yet — only in-app cohorts, never fabricated.
            </div>
          </div>
          {data.comparisons.length === 0 ? (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0 }}>
              No comparison rows yet. Engage with more claims to appear here.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.comparisons.map((p: ComparisonRow) => (
                <div key={`${p.conceptId}-${p.claimId ?? "b"}`}>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: "rgba(255,255,255,0.65)",
                      marginBottom: 6,
                      lineHeight: 1.4,
                    }}
                  >
                    {p.topicLabel}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      {p.insufficientData || p.pctMindlairAgree === null ? (
                        <Bar value={0} color={C.accent2} height={5} />
                      ) : (
                        <Bar value={p.pctMindlairAgree} color={C.accent2} height={5} />
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: C.accent2, width: 36, textAlign: "right" }}>
                      {p.insufficientData || p.pctMindlairAgree === null ? "—" : `${p.pctMindlairAgree}%`}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginBottom: 5 }}>
                    {p.source === "claim"
                      ? "% agree with this claim among Mindlair users who reacted"
                      : "% leaning affirmative on this topic among Mindlair users with a mapped stance"}
                    {p.sampleSize > 0 && ` · n=${p.sampleSize}`}
                  </div>
                  {p.insufficientData ? (
                    <div style={{ fontSize: 9, color: C.amber, marginTop: 2 }}>
                      Not enough Mindlair users yet for a cohort percentage.
                    </div>
                  ) : (
                    (() => {
                      const minority = isMinorityInCohort(p);
                      if (minority === null) {
                        return (
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                            {p.userStanceSummary}
                          </div>
                        );
                      }
                      return (
                        <div style={{ fontSize: 9, color: minority ? C.amber : C.accent2, marginTop: 2 }}>
                          {minority ? "Minority vs Mindlair cohort" : "Majority vs Mindlair cohort"} ·{" "}
                          {p.userStanceSummary}
                        </div>
                      );
                    })()
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {privacy.questions && (
        <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
              marginBottom: 12,
            }}
          >
            Still Thinking About
          </div>
          {data.openQuestions.length === 0 ? (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0 }}>
              Topics where you are most ambivalent will surface here.
            </p>
          ) : (
            data.openQuestions.map((q, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  marginBottom: i < data.openQuestions.length - 1 ? 8 : 0,
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 8,
                  padding: "9px 12px",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <span style={{ color: C.blue, fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>?</span>
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.55)",
                    fontStyle: "italic",
                    lineHeight: 1.55,
                  }}
                >
                  {q}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {privacy.shifts && (
        <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
              marginBottom: 12,
            }}
          >
            Where Thinking Moved
          </div>
          {data.shifts.length === 0 ? (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0 }}>
              When you revise a stance on a claim, it will show up here.
            </p>
          ) : (
            data.shifts.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  marginBottom: i < data.shifts.length - 1 ? 8 : 0,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 9, color: C.accent2 }}>↝</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{s.topic}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{s.detail}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div
        style={{
          padding: "12px 22px",
          display: "flex",
          justifyContent: "space-between",
          background: "rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.18)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {appHost}
        </div>
        <div
          style={{
            fontSize: 9,
            color: "rgba(255,255,255,0.18)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}

export default function FingerprintDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const topTab: "fingerprint" | "wrapped" | "cards" = 
    tabParam === "wrapped" ? "wrapped" : 
    tabParam === "cards" ? "cards" : 
    "fingerprint";

  const [data, setData] = useState<FingerprintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [innerTab, setInnerTab] = useState<"about" | "land" | "privacy">("about");
  const [privacy, setPrivacy] = useState(defaultPrivacy);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fingerprint")
      .then(r => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((j: FingerprintPayload) => {
        if (!cancelled) setData(j);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your fingerprint.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTopTab = useCallback(
    (t: "fingerprint" | "wrapped" | "cards") => {
      const params = new URLSearchParams(searchParams.toString());
      if (t === "wrapped") params.set("tab", "wrapped");
      else if (t === "cards") params.set("tab", "cards");
      else params.delete("tab");
      router.push(`/fingerprint${params.toString() ? `?${params}` : ""}`);
    },
    [router, searchParams]
  );

  const togglePrivacy = (key: PrivacySection) => {
    setPrivacy(p => ({ ...p, [key]: !p[key] }));
  };

  const downloadPng = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: C.ink,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `mindlair-fingerprint-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const copyPageLink = async () => {
    const url = `${window.location.origin}/fingerprint`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const webShare = async () => {
    const url = `${window.location.origin}/fingerprint`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Mindlair — Intellectual Fingerprint",
          text: "My Mindlair intellectual fingerprint",
          url,
        });
      } catch {
        /* dismissed */
      }
    } else {
      copyPageLink();
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: W.muted }}>
        Loading your fingerprint…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: W.rose }}>
        {error || "Something went wrong."}
      </div>
    );
  }

  const tabStrip = (
    <div
      style={{
        display: "flex",
        background: W.surfaceAlt,
        border: `1px solid ${W.border}`,
        borderRadius: 12,
        padding: 3,
        gap: 2,
        maxWidth: 500,
        width: "100%",
        marginBottom: 24,
      }}
    >
      {(
        [
          ["fingerprint", "Fingerprint"],
          ["wrapped", "Year in review"],
          ["cards", "Cards"],
        ] as const
      ).map(([id, label]) => {
        const active = topTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTopTab(id)}
            style={{
              flex: 1,
              padding: "9px 4px",
              background: active ? W.accent : "transparent",
              border: "none",
              borderRadius: 9,
              color: active ? "#fff" : W.muted,
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  if (topTab === "wrapped") {
    return (
      <div style={{ padding: "0 16px" }}>
        {tabStrip}
        <MindlairYearWrapped />
      </div>
    );
  }

  if (topTab === "cards") {
    return (
      <div style={{ padding: "0 16px" }}>
        {tabStrip}
        <CardCollection />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "0 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {tabStrip}

      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: W.text,
            letterSpacing: "-0.02em",
            marginBottom: 8,
          }}
        >
          Intellectual Fingerprint
        </div>
        <div style={{ fontSize: 14, color: W.muted, maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
          What you consume across reading, podcasts, and video — and how your stances compare to anonymous
          Mindlair cohorts when enough people have engaged. No fabricated public polling.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <ProfileCard data={data} privacy={privacy} cardRef={cardRef} />
          <div style={{ display: "flex", gap: 8, width: 360, maxWidth: "100%" }}>
            <button
              type="button"
              onClick={downloadPng}
              disabled={downloading}
              style={{
                flex: 1,
                padding: "10px 4px",
                background: W.accent,
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: downloading ? "wait" : "pointer",
                opacity: downloading ? 0.7 : 1,
              }}
            >
              {downloading ? "…" : "⬇ PNG"}
            </button>
            <button
              type="button"
              onClick={copyPageLink}
              style={{
                flex: 1,
                padding: "10px 4px",
                background: W.surface,
                border: `1px solid ${W.border}`,
                borderRadius: 10,
                color: W.textSoft,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {copied ? "Copied" : "🔗 Link"}
            </button>
            <button
              type="button"
              onClick={webShare}
              style={{
                flex: 1,
                padding: "10px 4px",
                background: W.surface,
                border: `1px solid ${W.border}`,
                borderRadius: 10,
                color: W.textSoft,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Share
            </button>
          </div>
          <div style={{ fontSize: 12, color: W.muted, textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
            Cohort stats are anonymous aggregates with a minimum sample size. Toggle sections in Privacy before
            exporting or sharing your card.
          </div>
        </div>

        <div style={{ width: 360, maxWidth: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "flex",
              background: W.surfaceAlt,
              border: `1px solid ${W.border}`,
              borderRadius: 12,
              padding: 3,
              gap: 2,
            }}
          >
            {(
              [
                ["about", "About"],
                ["land", "Where you land"],
                ["privacy", "Privacy"],
              ] as const
            ).map(([id, label]) => {
              const active = innerTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setInnerTab(id)}
                  style={{
                    flex: 1,
                    padding: "9px 4px",
                    background: active ? W.accent : "transparent",
                    border: "none",
                    borderRadius: 9,
                    color: active ? "#fff" : W.muted,
                    fontSize: 11,
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {innerTab === "about" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  background: W.surface,
                  borderRadius: 12,
                  padding: 18,
                  border: `1px solid ${W.border}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: W.text, marginBottom: 8 }}>What You Consume</div>
                <p style={{ fontSize: 12, color: W.muted, lineHeight: 1.75, margin: "0 0 14px" }}>
                  Podcasts, articles, and video are treated as equal inputs to your map. The format matters less than
                  the topic. Content you save through Mindlair feeds the same concept clusters.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.consumption.length === 0 ? (
                    <p style={{ fontSize: 12, color: W.muted, margin: 0 }}>No saved sources yet.</p>
                  ) : (
                    data.consumption.map(c => (
                      <div key={c.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{ fontSize: 14 }}>{consumptionEmoji(c.iconKey)}</span>
                            <span style={{ fontSize: 12, color: W.textSoft }}>{c.label}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: W.accent }}>{c.count} saved</span>
                        </div>
                        <div style={{ height: 5, background: W.surfaceAlt, borderRadius: 5, overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(0, (c.count / Math.max(1, ...data.consumption.map(x => x.count))) * 100))}%`,
                              height: "100%",
                              background: W.accent,
                              borderRadius: 5,
                              opacity: 0.85,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div
                style={{
                  background: `${W.accent}10`,
                  borderRadius: 12,
                  padding: 18,
                  border: `1px solid ${W.accent}30`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: W.accent, marginBottom: 6 }}>
                  Topic format icons
                </div>
                <p style={{ fontSize: 12, color: W.textSoft, lineHeight: 1.7, margin: 0 }}>
                  Icons next to each topic show which content types you have consumed on that subject. Multiple icons
                  mean multi-format engagement.
                </p>
              </div>
              <div
                style={{
                  background: W.surface,
                  borderRadius: 12,
                  padding: 18,
                  border: `1px solid ${W.border}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: W.text, marginBottom: 8 }}>What shifts mean</div>
                <p style={{ fontSize: 12, color: W.muted, lineHeight: 1.75, margin: 0 }}>
                  A shift appears when you record a new stance on a claim that replaces a previous one. The card
                  summarizes movement on that topic without exposing full source chains in the export.
                </p>
              </div>
            </div>
          )}

          {innerTab === "land" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  background: W.surface,
                  borderRadius: 12,
                  padding: 18,
                  border: `1px solid ${W.border}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: W.text, marginBottom: 8 }}>How this works</div>
                <p style={{ fontSize: 12, color: W.muted, lineHeight: 1.75, margin: "0 0 14px" }}>
                  For topics you have engaged with, we compare your stance to other Mindlair users using anonymous
                  aggregates only. We require at least {FINGERPRINT_MIN_COHORT_N} people before showing a percentage,
                  to reduce small-sample leakage.
                </p>
                <p style={{ fontSize: 12, color: W.muted, lineHeight: 1.75, margin: 0 }}>
                  We do not show US or general-public polling on this card until we can cite real sources. Claim-level
                  percentages reflect &ldquo;agree&rdquo; vs other non-skip reactions; topic-level fallback reflects how many users
                  lean affirmative on the topic in their belief map.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.comparisons.map(p => {
                  const minority = isMinorityInCohort(p);
                  const flagColor = minority ? W.accent : W.green;
                  return (
                    <div
                      key={`${p.conceptId}-${p.claimId ?? "b"}`}
                      style={{
                        background: W.surface,
                        borderRadius: 10,
                        padding: 16,
                        border: `1px solid ${W.border}`,
                        borderLeft: `4px solid ${flagColor}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: W.text,
                          fontWeight: 500,
                          marginBottom: 10,
                          lineHeight: 1.5,
                        }}
                      >
                        {p.topicLabel}
                      </div>
                      {p.insufficientData ? (
                        <p style={{ fontSize: 11, color: W.muted, margin: 0 }}>
                          Not enough Mindlair users (n&lt;{FINGERPRINT_MIN_COHORT_N}) for a cohort bar.
                        </p>
                      ) : (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 10, color: W.muted }}>Mindlair users</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: W.accent }}>
                              {p.source === "claim"
                                ? `${p.pctMindlairAgree}% agree`
                                : `${p.pctMindlairAgree}% affirmative`}
                            </span>
                          </div>
                          <div style={{ height: 5, background: W.surfaceAlt, borderRadius: 5, overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(0, p.pctMindlairAgree ?? 0))}%`,
                                height: "100%",
                                background: W.accent,
                                borderRadius: 5,
                                opacity: 0.85,
                              }}
                            />
                          </div>
                          <div style={{ fontSize: 10, color: W.muted, marginTop: 6 }}>n={p.sampleSize}</div>
                        </div>
                      )}
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 10,
                          fontWeight: 600,
                          color: flagColor,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span>{minority ? "◈" : minority === false ? "◉" : "○"}</span>
                        {minority === true && "Minority vs Mindlair cohort"}
                        {minority === false && "Majority vs Mindlair cohort"}
                        {minority === null && "Your stance"}
                        <span style={{ fontWeight: 400, color: W.muted }}>· {p.userStanceSummary}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  background: `${W.blue}10`,
                  borderRadius: 12,
                  padding: 16,
                  border: `1px solid ${W.blue}30`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: W.blue, marginBottom: 6 }}>
                  Why minority views matter
                </div>
                <p style={{ fontSize: 12, color: W.textSoft, lineHeight: 1.7, margin: 0 }}>
                  Being in the minority on some topics and the majority on others resists simple categorisation — that
                  nuance is the point.
                </p>
              </div>
            </div>
          )}

          {innerTab === "privacy" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  background: W.surface,
                  borderRadius: 12,
                  padding: 18,
                  border: `1px solid ${W.border}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: W.text, marginBottom: 4 }}>
                  Control what appears on the card
                </div>
                <p style={{ fontSize: 12, color: W.muted, lineHeight: 1.7, margin: "0 0 16px" }}>
                  Toggle sections off before downloading PNG. The card updates immediately.
                </p>
                {(
                  [
                    { key: "consumption" as const, label: "What You Consume", icon: "🎙" },
                    { key: "positions" as const, label: "Where You Land vs Others", icon: "◈" },
                    { key: "questions" as const, label: "Still Thinking About", icon: "?" },
                    { key: "shifts" as const, label: "Where Thinking Moved", icon: "↝" },
                  ] as const
                ).map(item => {
                  const enabled = privacy[item.key];
                  return (
                    <div
                      key={item.key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        marginBottom: 6,
                        background: enabled ? W.surfaceAlt : `${W.rose}10`,
                        borderRadius: 8,
                        border: `1px solid ${enabled ? W.border : `${W.rose}30`}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: W.muted, fontSize: 13 }}>{item.icon}</span>
                        <span style={{ fontSize: 12, color: W.text }}>{item.label}</span>
                      </div>
                      <button
                        type="button"
                        aria-pressed={enabled}
                        onClick={() => togglePrivacy(item.key)}
                        style={{
                          width: 36,
                          height: 20,
                          borderRadius: 10,
                          background: enabled ? W.accent : W.border,
                          border: "none",
                          cursor: "pointer",
                          position: "relative",
                          transition: "background 0.2s",
                          flexShrink: 0,
                          padding: 0,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            left: enabled ? 18 : 2,
                            top: 2,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "#fff",
                            transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                            display: "block",
                          }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  background: `${W.accent}10`,
                  borderRadius: 12,
                  padding: 16,
                  border: `1px solid ${W.accent}30`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: W.accent, marginBottom: 8 }}>
                  Always use care when sharing
                </div>
                {[
                  "PNG export reflects only toggled sections",
                  "Link copies the private dashboard URL (login required)",
                  "No US general-public benchmark is shown on this card in v1",
                ].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                    <span style={{ color: W.accent, fontSize: 11 }}>🔒</span>
                    <span style={{ fontSize: 12, color: W.textSoft }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
