"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import * as htmlToImage from "html-to-image";
import MindlairYearWrapped from "@/components/mindlair-year-wrapped";
import {
  FINGERPRINT_MIN_COHORT_N,
  isMinorityInCohort,
  type ComparisonRow,
  type FingerprintPayload,
} from "@/lib/fingerprint-types";

const C = {
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
  const topTab: "fingerprint" | "wrapped" = tabParam === "wrapped" ? "wrapped" : "fingerprint";

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
    (t: "fingerprint" | "wrapped") => {
      const params = new URLSearchParams(searchParams.toString());
      if (t === "wrapped") params.set("tab", "wrapped");
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
      <div style={{ padding: 48, textAlign: "center", color: C.muted }}>
        Loading your fingerprint…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: C.red }}>
        {error || "Something went wrong."}
      </div>
    );
  }

  if (topTab === "wrapped") {
    return (
      <div>
        <div
          style={{
            display: "flex",
            background: C.rule,
            borderRadius: 12,
            padding: 3,
            gap: 2,
            maxWidth: 400,
            marginBottom: 24,
          }}
        >
          {(
            [
              ["fingerprint", "Fingerprint"],
              ["wrapped", "Year in review"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTopTab(id)}
              style={{
                flex: 1,
                padding: "9px 4px",
                background: id === "wrapped" ? C.ink : "transparent",
                border: "none",
                borderRadius: 9,
                color: id === "wrapped" ? "#FAFAF7" : C.muted,
                fontSize: 11,
                fontWeight: id === "wrapped" ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <MindlairYearWrapped />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        margin: "-32px -16px",
        padding: "32px 16px 48px",
        background: "#EEEEED",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          background: C.rule,
          borderRadius: 12,
          padding: 3,
          gap: 2,
          maxWidth: 400,
          width: "100%",
          marginBottom: 24,
        }}
      >
        {(
          [
            ["fingerprint", "Fingerprint"],
            ["wrapped", "Year in review"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTopTab(id)}
            style={{
              flex: 1,
              padding: "9px 4px",
              background: id === "fingerprint" ? C.ink : "transparent",
              border: "none",
              borderRadius: 9,
              color: id === "fingerprint" ? "#FAFAF7" : C.muted,
              fontSize: 11,
              fontWeight: id === "fingerprint" ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: C.ink,
            letterSpacing: "-0.02em",
            marginBottom: 6,
          }}
        >
          Intellectual Fingerprint
        </div>
        <div style={{ fontSize: 13, color: C.muted, maxWidth: 500, margin: "0 auto", lineHeight: 1.55 }}>
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
                padding: "11px 4px",
                background: C.ink,
                border: "none",
                borderRadius: 10,
                color: "#FAFAF7",
                fontSize: 11,
                fontWeight: 500,
                cursor: downloading ? "wait" : "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              {downloading ? "…" : "⬇ PNG"}
            </button>
            <button
              type="button"
              onClick={copyPageLink}
              style={{
                flex: 1,
                padding: "11px 4px",
                background: C.ink,
                border: "none",
                borderRadius: 10,
                color: "#FAFAF7",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              {copied ? "Copied" : "🔗 Link"}
            </button>
            <button
              type="button"
              onClick={webShare}
              style={{
                flex: 1,
                padding: "11px 4px",
                background: C.ink,
                border: "none",
                borderRadius: 10,
                color: "#FAFAF7",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              Share
            </button>
          </div>
          <div style={{ fontSize: 11, color: C.muted, textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
            Cohort stats are anonymous aggregates with a minimum sample size. Toggle sections in Privacy before
            exporting or sharing your card.
          </div>
        </div>

        <div style={{ width: 360, maxWidth: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", background: C.rule, borderRadius: 12, padding: 3, gap: 2 }}>
            {(
              [
                ["about", "About"],
                ["land", "Where you land"],
                ["privacy", "Privacy"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setInnerTab(id)}
                style={{
                  flex: 1,
                  padding: "9px 4px",
                  background: innerTab === id ? C.ink : "transparent",
                  border: "none",
                  borderRadius: 9,
                  color: innerTab === id ? "#FAFAF7" : C.muted,
                  fontSize: 10,
                  fontWeight: innerTab === id ? 600 : 400,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {innerTab === "about" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: `1px solid ${C.rule}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8 }}>What You Consume</div>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.75, margin: "0 0 14px" }}>
                  Podcasts, articles, and video are treated as equal inputs to your map. The format matters less than
                  the topic. Content you save through Mindlair feeds the same concept clusters.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.consumption.length === 0 ? (
                    <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>No saved sources yet.</p>
                  ) : (
                  data.consumption.map(c => (
                    <div key={c.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ fontSize: 14 }}>{consumptionEmoji(c.iconKey)}</span>
                          <span style={{ fontSize: 12, color: C.body }}>{c.label}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: CONTENT_COLORS[c.contentType] || C.accent }}>
                          {c.count} saved
                        </span>
                      </div>
                      <LightBar
                        value={(c.count / Math.max(1, ...data.consumption.map(x => x.count))) * 100}
                        color={CONTENT_COLORS[c.contentType] || C.accent}
                        height={5}
                      />
                    </div>
                  ))
                  )}
                </div>
              </div>
              <div style={{ background: "#EEF5F0", borderRadius: 12, padding: 18, border: "1px solid #C8E6D6" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 6 }}>
                  Topic format icons
                </div>
                <p style={{ fontSize: 12, color: C.body, lineHeight: 1.7, margin: 0 }}>
                  Icons next to each topic show which content types you have consumed on that subject. Multiple icons
                  mean multi-format engagement.
                </p>
              </div>
              <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: `1px solid ${C.rule}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8 }}>What shifts mean</div>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.75, margin: 0 }}>
                  A shift appears when you record a new stance on a claim that replaces a previous one. The card
                  summarizes movement on that topic without exposing full source chains in the export.
                </p>
              </div>
            </div>
          )}

          {innerTab === "land" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: `1px solid ${C.rule}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8 }}>How this works</div>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.75, margin: "0 0 14px" }}>
                  For topics you have engaged with, we compare your stance to other Mindlair users using anonymous
                  aggregates only. We require at least {FINGERPRINT_MIN_COHORT_N} people before showing a percentage,
                  to reduce small-sample leakage.
                </p>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.75, margin: 0 }}>
                  We do not show US or general-public polling on this card until we can cite real sources. Claim-level
                  percentages reflect “agree” vs other non-skip reactions; topic-level fallback reflects how many users
                  lean affirmative on the topic in their belief map.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.comparisons.map(p => {
                  const minority = isMinorityInCohort(p);
                  return (
                    <div
                      key={`${p.conceptId}-${p.claimId ?? "b"}`}
                      style={{
                        background: "#fff",
                        borderRadius: 10,
                        padding: 16,
                        border: `1px solid ${minority ? "#F5E6D0" : "#C8E6D6"}`,
                        borderLeft: `4px solid ${minority ? C.amber : C.accent}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: C.ink,
                          fontWeight: 500,
                          marginBottom: 10,
                          lineHeight: 1.5,
                        }}
                      >
                        {p.topicLabel}
                      </div>
                      {p.insufficientData ? (
                        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                          Not enough Mindlair users (n&lt;{FINGERPRINT_MIN_COHORT_N}) for a cohort bar.
                        </p>
                      ) : (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 10, color: C.muted }}>Mindlair users</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: C.accent }}>
                              {p.source === "claim" ? `${p.pctMindlairAgree}% agree` : `${p.pctMindlairAgree}% affirmative`}
                            </span>
                          </div>
                          <LightBar value={p.pctMindlairAgree ?? 0} color={C.accent} height={5} />
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>n={p.sampleSize}</div>
                        </div>
                      )}
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 10,
                          fontWeight: 600,
                          color: minority ? C.amber : C.accent,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span>{minority ? "◈" : minority === false ? "◉" : "○"}</span>
                        {minority === true && "Minority vs Mindlair cohort"}
                        {minority === false && "Majority vs Mindlair cohort"}
                        {minority === null && "Your stance"}
                        <span style={{ fontWeight: 400, color: C.muted }}>· {p.userStanceSummary}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ background: "#EEF2FB", borderRadius: 12, padding: 16, border: "1px solid #B8CCE8" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.blue, marginBottom: 6 }}>
                  Why minority views matter
                </div>
                <p style={{ fontSize: 12, color: C.body, lineHeight: 1.7, margin: 0 }}>
                  Being in the minority on some topics and the majority on others resists simple categorisation — that
                  nuance is the point.
                </p>
              </div>
            </div>
          )}

          {innerTab === "privacy" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: `1px solid ${C.rule}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
                  Control what appears on the card
                </div>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, margin: "0 0 16px" }}>
                  Toggle sections off before downloading PNG. The card updates immediately.
                </p>
                {(
                  [
                    { key: "consumption" as const, label: "What You Consume", icon: "🎙" },
                    { key: "positions" as const, label: "Where You Land vs Others", icon: "◈" },
                    { key: "questions" as const, label: "Still Thinking About", icon: "?" },
                    { key: "shifts" as const, label: "Where Thinking Moved", icon: "↝" },
                  ] as const
                ).map(item => (
                  <div
                    key={item.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      marginBottom: 6,
                      background: privacy[item.key] ? C.soft : "#FCEEED",
                      borderRadius: 8,
                      border: `1px solid ${privacy[item.key] ? C.rule : "#F0B8B4"}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: C.muted, fontSize: 13 }}>{item.icon}</span>
                      <span style={{ fontSize: 12, color: C.ink }}>{item.label}</span>
                    </div>
                    <button
                      type="button"
                      aria-pressed={privacy[item.key]}
                      onClick={() => togglePrivacy(item.key)}
                      style={{
                        width: 36,
                        height: 20,
                        borderRadius: 10,
                        background: privacy[item.key] ? C.accent : "#D0D0CC",
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
                          left: privacy[item.key] ? 18 : 2,
                          top: 2,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "#fff",
                          transition: "left 0.2s",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          display: "block",
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ background: "#EEF5F0", borderRadius: 12, padding: 16, border: "1px solid #C8E6D6" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 8 }}>
                  Always use care when sharing
                </div>
                {[
                  "PNG export reflects only toggled sections",
                  "Link copies the private dashboard URL (login required)",
                  "No US general-public benchmark is shown on this card in v1",
                ].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                    <span style={{ color: C.accent, fontSize: 11 }}>🔒</span>
                    <span style={{ fontSize: 12, color: C.body }}>{item}</span>
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
