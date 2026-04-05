"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  Monitor,
  Download,
  Share,
  Bell,
  Wifi,
  Plus,
  Check,
} from "lucide-react";

type PlatformType = "windows" | "mac" | "linux" | "ios" | "android" | "other";

interface DetectedDevice {
  platform: PlatformType;
  isMobile: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const C = {
  bg: "#0f0e0c", surface: "#1a1916", border: "#2a2825",
  text: "#e8e4dc", textSoft: "#c4bfb4", muted: "#7a7469",
  accent: "#d4915a", amber: "#d4915a",
};

function detectDevice(): DetectedDevice {
  if (typeof window === "undefined") return { platform: "other", isMobile: false };

  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /iphone|ipad|ipod|android/.test(ua);

  let platform: PlatformType = "other";
  if (ua.includes("iphone") || ua.includes("ipad")) platform = "ios";
  else if (ua.includes("android")) platform = "android";
  else if (ua.includes("mac")) platform = "mac";
  else if (ua.includes("win")) platform = "windows";
  else if (ua.includes("linux")) platform = "linux";

  return { platform, isMobile };
}

export function GetStartedHub() {
  const [device, setDevice] = useState<DetectedDevice | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useEffect(() => {
    setDevice(detectDevice());

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsPwaInstalled(isStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handlePwaInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsPwaInstalled(true);
    setDeferredPrompt(null);
  };

  if (!device) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, color: C.muted }}>
        <span>Detecting your device...</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Section heading */}
      <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, textAlign: "center" }}>
        Install options
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Mobile / PWA */}
        <MobilePwaCard
          platform={device.platform}
          onInstall={handlePwaInstall}
          canInstall={!!deferredPrompt}
          isInstalled={isPwaInstalled}
        />
        {/* Desktop */}
        <DesktopCard platform={device.platform} />
      </div>

      {/* Integration callout */}
      <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, padding: "16px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: C.textSoft }}>
          Use <strong>Readwise</strong> or <strong>Instapaper</strong>? Connect after sign-in to import your reading history.
        </p>
      </div>
    </div>
  );
}

function MobilePwaCard({
  platform,
  onInstall,
  canInstall,
  isInstalled,
}: {
  platform: PlatformType;
  onInstall: () => void;
  canInstall: boolean;
  isInstalled: boolean;
}) {
  const isIOS = platform === "ios";

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, background: C.surface }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Smartphone style={{ width: 20, height: 20, color: C.accent }} />
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Mobile / Browser</h3>
      </div>

      {isInstalled ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: `${C.accent}18` }}>
          <Check style={{ width: 18, height: 18, color: C.accent }} />
          <span style={{ fontSize: 14, color: C.accent, fontWeight: 500 }}>PWA installed</span>
        </div>
      ) : (
        <>
          {/* Feature icons */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <PwaFeature icon={Bell} label="Notifications" />
            <PwaFeature icon={Share} label="Share Target" />
            <PwaFeature icon={Wifi} label="Offline" />
          </div>

          {isIOS ? (
            <div style={{ fontSize: 13, color: C.textSoft, background: `${C.border}40`, borderRadius: 10, padding: "12px 14px", lineHeight: 1.7 }}>
              In Safari: tap <Share style={{ width: 14, height: 14, display: "inline", verticalAlign: "-2px" }} /> Share → <strong>Add to Home Screen</strong>
            </div>
          ) : canInstall ? (
            <Button size="lg" variant="gradient" className="w-full" onClick={onInstall}>
              <Plus className="w-4 h-4 mr-2" /> Add to Home Screen
            </Button>
          ) : (
            <div style={{ fontSize: 13, color: C.textSoft, background: `${C.border}40`, borderRadius: 10, padding: "12px 14px", lineHeight: 1.7 }}>
              In Chrome: tap <strong>⋮</strong> menu → <strong>Add to Home screen</strong>
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>
        Works in any browser. Install the PWA for the best mobile experience.
      </p>
    </div>
  );
}

const GITHUB_REPO = "clodel-MeetCute/meet-cute";
const APP_VERSION = "0.1.0";

const DOWNLOADS: { os: string; label: string; file: string }[] = [
  { os: "mac",     label: "macOS (Apple Silicon)", file: `Mindlair_${APP_VERSION}_aarch64.dmg` },
  { os: "mac",     label: "macOS (Intel)",         file: `Mindlair_${APP_VERSION}_x64.dmg` },
  { os: "windows", label: "Windows",               file: `Mindlair_${APP_VERSION}_x64-setup.exe` },
  { os: "linux",   label: "Linux (AppImage)",       file: `mindlair_${APP_VERSION}_amd64.AppImage` },
];

function DesktopCard({ platform }: { platform: PlatformType }) {
  const primaryOs = platform === "windows" ? "windows" : platform === "linux" ? "linux" : "mac";

  const sorted = [...DOWNLOADS].sort((a, b) => {
    if (a.os === primaryOs && b.os !== primaryOs) return -1;
    if (a.os !== primaryOs && b.os === primaryOs) return 1;
    return 0;
  });

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, background: C.surface }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Monitor style={{ width: 20, height: 20, color: C.amber }} />
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Desktop Companion</h3>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.accent, border: `1px solid ${C.accent}40`, borderRadius: 4, padding: "2px 6px" }}>v{APP_VERSION}</span>
      </div>

      <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.6, marginBottom: 14 }}>
        Silent menubar app that monitors what you read, watch, and listen to. Extracts claims automatically.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((d) => (
          <a
            key={d.file}
            href={`https://github.com/${GITHUB_REPO}/releases/latest/download/${d.file}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", borderRadius: 8,
              border: `1px solid ${d.os === primaryOs ? C.accent + "50" : C.border}`,
              background: d.os === primaryOs ? `${C.accent}08` : "transparent",
              textDecoration: "none", color: "inherit",
              cursor: "pointer", transition: "border-color 0.2s",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{d.label}</span>
            <Download style={{ width: 14, height: 14, color: d.os === primaryOs ? C.accent : C.muted }} />
          </a>
        ))}
      </div>

      <p style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>
        {platform === "mac" ? "Mac (Apple Silicon & Intel)" : "Available for Mac, Windows & Linux"}.
        Free, no account needed to start.
      </p>
    </div>
  );
}

function PwaFeature({ icon: Icon, label }: { icon: React.ComponentType<{ style?: React.CSSProperties }>; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${C.accent}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon style={{ width: 16, height: 16, color: C.accent }} />
      </div>
      <span style={{ fontSize: 10, color: C.muted }}>{label}</span>
    </div>
  );
}
