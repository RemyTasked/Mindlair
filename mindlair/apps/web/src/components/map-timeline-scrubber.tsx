"use client";

import { useEffect, useRef, useCallback } from "react";
import { formatSnapshotMonthLabel, sparklineTotals, type TimelineSnapshot } from "@/lib/map/timeline-scrub";

const C = {
  border: "#2a2825",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#d4915a",
  accentDim: "#6b4a2a",
  accentGlow: "#d4915a30",
  bg: "#0f0e0c",
};

type Props = {
  snapshots: TimelineSnapshot[];
  timeValue: number;
  setTimeValue: (v: number | ((p: number) => number)) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  activeCount: number;
  peakCount: number;
};

export default function MapTimelineScrubber({
  snapshots,
  timeValue,
  setTimeValue,
  isDragging,
  setIsDragging,
  isPlaying,
  setIsPlaying,
  activeCount,
  peakCount,
}: Props) {
  const scrubRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const tvRef = useRef(timeValue);
  const playRef = useRef(isPlaying);
  const maxIdx = Math.max(0, snapshots.length - 1);

  useEffect(() => {
    tvRef.current = timeValue;
  }, [timeValue]);
  useEffect(() => {
    playRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying || maxIdx <= 0) {
      lastTsRef.current = 0;
      return;
    }
    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      setTimeValue(prev => {
        const next = prev + dt / 2200;
        if (next >= maxIdx - 0.01) {
          setIsPlaying(false);
          return maxIdx;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, maxIdx, setTimeValue, setIsPlaying]);

  useEffect(() => {
    if (!isDragging) return;
    const update = (clientX: number) => {
      const rect = scrubRef.current?.getBoundingClientRect();
      if (!rect || maxIdx <= 0) return;
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setTimeValue(frac * maxIdx);
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
  }, [isDragging, maxIdx, setTimeValue, setIsDragging]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (maxIdx <= 0) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setTimeValue(v => Math.max(0, v - (e.shiftKey ? 0.25 : 1)));
          break;
        case "ArrowRight":
          e.preventDefault();
          setTimeValue(v => Math.min(maxIdx, v + (e.shiftKey ? 0.25 : 1)));
          break;
        case " ":
          e.preventDefault();
          if (playRef.current) setIsPlaying(false);
          else {
            if (tvRef.current >= maxIdx - 0.05) setTimeValue(0);
            setIsPlaying(true);
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maxIdx, setTimeValue, setIsPlaying]);

  const startScrub = useCallback(
    (clientX: number) => {
      setIsDragging(true);
      const rect = scrubRef.current?.getBoundingClientRect();
      if (!rect || maxIdx <= 0) return;
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setTimeValue(frac * maxIdx);
    },
    [maxIdx, setTimeValue, setIsDragging],
  );

  const spark = sparklineTotals(snapshots);
  const maxSpark = Math.max(...spark, 1);
  const timeIdx = Math.round(timeValue);
  const isActive = isDragging || isPlaying;

  return (
    <div
      style={{
        padding: "12px 24px 14px",
        borderTop: `1px solid ${C.border}`,
        background: "#1a1916",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          type="button"
          onClick={() => {
            if (timeValue >= maxIdx - 0.05) setTimeValue(0);
            setIsPlaying(!isPlaying);
          }}
          style={{
            background: isPlaying ? C.accentDim : C.accent,
            border: "none",
            borderRadius: "50%",
            width: 34,
            height: 34,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#fff",
            fontSize: 13,
          }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <button
          type="button"
          onClick={() => {
            setTimeValue(0);
            setIsPlaying(true);
          }}
          style={{
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "5px 10px",
            fontSize: 10,
            color: C.muted,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Replay
        </button>

        <div
          style={{
            fontSize: 12,
            color: C.accent,
            width: 72,
            flexShrink: 0,
            textAlign: "right",
            fontWeight: 700,
          }}
        >
          {snapshots[Math.min(timeIdx, snapshots.length - 1)]
            ? formatSnapshotMonthLabel(snapshots[Math.min(timeIdx, snapshots.length - 1)].date)
            : "—"}
        </div>

        <div ref={scrubRef} style={{ flex: 1, position: "relative", userSelect: "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 2 }}>
            {snapshots.map((s, i) => (
              <button
                key={s.date}
                type="button"
                onClick={() => setTimeValue(i)}
                style={{
                  fontSize: 8,
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  padding: "2px 0",
                  color: i === timeIdx ? C.accent : C.muted,
                  fontWeight: i === timeIdx ? 700 : 400,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {formatSnapshotMonthLabel(s.date)}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: 1,
              height: 24,
              alignItems: "flex-end",
              marginBottom: 3,
              cursor: "pointer",
            }}
            onMouseDown={e => startScrub(e.clientX)}
            onTouchStart={e => startScrub(e.touches[0].clientX)}
          >
            {spark.map((v, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  borderRadius: 2,
                  height: `${Math.max(14, (v / maxSpark) * 100)}%`,
                  background: i === timeIdx ? C.accent : i < timeIdx ? `${C.accent}25` : `${C.border}50`,
                  transition: isActive ? "none" : "background 0.15s",
                }}
              />
            ))}
          </div>

          <div style={{ height: 3, background: `${C.border}80`, borderRadius: 2, position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${maxIdx > 0 ? (timeValue / maxIdx) * 100 : 0}%`,
                background: `linear-gradient(90deg, ${C.accentDim}, ${C.accent})`,
                borderRadius: 2,
                transition: isActive ? "none" : "width 0.3s ease",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: `${maxIdx > 0 ? (timeValue / maxIdx) * 100 : 0}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: isDragging ? 20 : 16,
                height: isDragging ? 20 : 16,
                background: C.accent,
                border: `2px solid ${C.bg}`,
                borderRadius: "50%",
                cursor: isDragging ? "grabbing" : "grab",
                zIndex: 2,
                boxShadow: `0 0 ${isDragging ? 16 : 8}px ${C.accentGlow}`,
              }}
              onMouseDown={e => {
                e.stopPropagation();
                setIsDragging(true);
              }}
              onTouchStart={e => {
                e.stopPropagation();
                setIsDragging(true);
              }}
            />
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            color: C.muted,
            flexShrink: 0,
            textAlign: "right",
            lineHeight: 1.55,
            minWidth: 80,
          }}
        >
          <div>{activeCount} active</div>
          <div style={{ color: C.accent }}>{peakCount} at peak</div>
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 10,
          color: C.muted,
          textAlign: "center",
        }}
      >
        ← → step · Space play · Drag timeline · Monthly snapshots
      </div>
    </div>
  );
}
