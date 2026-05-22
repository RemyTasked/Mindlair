"use client";

import { useEffect, useState } from "react";

interface CaptureData {
  id: string;
  modality: string;
  rawText: string | null;
  rawAudioUrl: string | null;
  rawAudioMs: number | null;
  createdAt: string;
  confirmedAt: string | null;
  source: {
    id: string;
    url: string;
    title: string | null;
    outlet: string | null;
    transcriptText: string | null;
  } | null;
}

interface ApiResponse {
  claimId: string;
  capture: CaptureData | null;
  source: {
    id: string;
    url: string;
    title: string | null;
    outlet: string | null;
  } | null;
  extractedFrom?: string | null;
  aiStance?: string | null;
}

interface OriginalCaptureDrawerProps {
  claimId: string;
  open: boolean;
  onClose: () => void;
}

export function OriginalCaptureDrawer({
  claimId,
  open,
  onClose,
}: OriginalCaptureDrawerProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch(`/api/captures/by-claim/${claimId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load original capture");
        return res.json();
      })
      .then((json: ApiResponse) => setData(json))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Unknown error")
      )
      .finally(() => setLoading(false));
  }, [open, claimId]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1916",
          borderTop: "1px solid #2a2825",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: 20,
          maxWidth: 600,
          width: "100%",
          maxHeight: "80vh",
          overflowY: "auto",
          color: "#e8e4dc",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: 1, color: "#d4915a", fontWeight: 700 }}>
            ORIGINAL CAPTURE
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#7a7469",
              fontSize: 22,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {loading && <div style={{ color: "#7a7469" }}>Loading…</div>}
        {error && <div style={{ color: "#ef4444" }}>{error}</div>}

        {data && !data.capture && data.source && (
          <div style={{ fontSize: 14, color: "#c4bfb4" }}>
            <div style={{ marginBottom: 12, fontStyle: "italic" }}>
              This claim predates the capture system. Source on file:
            </div>
            <a
              href={data.source.url}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#d4915a" }}
            >
              {data.source.title || data.source.url}
            </a>
          </div>
        )}

        {data?.capture && (
          <div>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 12,
                fontSize: 11,
                color: "#7a7469",
              }}
            >
              <span style={{ textTransform: "uppercase", fontWeight: 600 }}>
                {data.capture.modality.replace("_", " ")}
              </span>
              <span>·</span>
              <span>
                {new Date(data.capture.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              {data.extractedFrom && (
                <>
                  <span>·</span>
                  <span>extracted from {data.extractedFrom}</span>
                </>
              )}
            </div>

            {data.capture.rawAudioUrl && (
              <div style={{ marginBottom: 16 }}>
                <audio
                  src={data.capture.rawAudioUrl}
                  controls
                  style={{ width: "100%" }}
                />
              </div>
            )}

            {data.capture.rawText && (
              <div
                style={{
                  background: "#0f0e0c",
                  border: "1px solid #2a2825",
                  borderRadius: 8,
                  padding: 14,
                  fontSize: 14,
                  color: "#c4bfb4",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  marginBottom: 12,
                }}
              >
                {data.capture.rawText}
              </div>
            )}

            {data.capture.source && (
              <div style={{ fontSize: 12, color: "#7a7469" }}>
                <div style={{ marginBottom: 4 }}>Source:</div>
                <a
                  href={data.capture.source.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#d4915a" }}
                >
                  {data.capture.source.title || data.capture.source.url}
                  {data.capture.source.outlet
                    ? ` · ${data.capture.source.outlet}`
                    : ""}
                </a>
              </div>
            )}

            {data.aiStance && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 11,
                  color: "#7a7469",
                  fontStyle: "italic",
                }}
              >
                AI-suggested stance: {data.aiStance.replace("_", " ")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
