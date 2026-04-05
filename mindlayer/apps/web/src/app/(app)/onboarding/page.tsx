"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  Music,
  Monitor,
  Smartphone,
  Globe,
  Download,
  Check,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Loader2,
  X,
  ExternalLink,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#d4915a",
  amber: "#d4915a",
  rose: "#e06070",
};

const STEPS = ["connect", "capture", "done"] as const;
type Step = (typeof STEPS)[number];

interface Integration {
  provider: string;
  connected: boolean;
  lastSyncAt: string | null;
  connectedAt: string | null;
  sourceCount: number;
}

interface IntegrationsData {
  integrations: Integration[];
}

type PlatformType = "windows" | "mac" | "linux" | "ios" | "android" | "other";

const GITHUB_REPO = "clodel-MeetCute/meet-cute";
const APP_VERSION = "0.1.0";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("connect");
  const [data, setData] = useState<IntegrationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<PlatformType>("other");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("iphone") || ua.includes("ipad")) setPlatform("ios");
    else if (ua.includes("android")) setPlatform("android");
    else if (ua.includes("mac")) setPlatform("mac");
    else if (ua.includes("win")) setPlatform("windows");
    else if (ua.includes("linux")) setPlatform("linux");
  }, [fetchData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("spotify") === "connected") {
      fetchData();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchData]);

  const getIntegration = (provider: string) =>
    data?.integrations.find((i) => i.provider === provider);

  const totalConnected = data?.integrations.filter((i) => i.connected).length || 0;

  const totalSources = data?.integrations.reduce((sum, i) => sum + i.sourceCount, 0) || 0;

  const connectReadwise = async () => {
    const token = prompt("Enter your Readwise Access Token\n(from readwise.io/access_token):");
    if (!token) return;
    try {
      const res = await fetch("/api/integrations/readwise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        await fetchData();
        syncIntegration("readwise");
      } else {
        const err = await res.json();
        alert(err.message || "Failed to connect Readwise");
      }
    } catch {
      alert("Failed to connect Readwise");
    }
  };

  const connectInstapaper = async () => {
    const email = prompt("Enter your Instapaper email:");
    if (!email) return;
    const password = prompt("Enter your Instapaper password:");
    if (!password) return;
    try {
      const res = await fetch("/api/integrations/instapaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        await fetchData();
        syncIntegration("instapaper");
      } else {
        const err = await res.json();
        alert(err.message || "Failed to connect Instapaper");
      }
    } catch {
      alert("Failed to connect Instapaper");
    }
  };

  const connectSpotify = async () => {
    try {
      const res = await fetch("/api/integrations/spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: "/map" }),
      });
      if (res.ok) {
        const { authUrl } = await res.json();
        window.location.href = authUrl;
      }
    } catch {
      alert("Failed to connect Spotify");
    }
  };

  const syncIntegration = async (provider: string) => {
    setSyncing(provider);
    try {
      const res = await fetch(`/api/integrations/${provider}/sync`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchData();
      }
    } catch {
      // silent
    } finally {
      setSyncing(null);
    }
  };

  const completeOnboarding = async () => {
    setCompleting(true);
    try {
      await fetch("/api/onboarding", { method: "POST" });
      router.push("/map");
    } catch {
      router.push("/map");
    }
  };

  const stepIndex = STEPS.indexOf(step);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.accent }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h1
          className="text-3xl font-bold mb-3"
          style={{ color: C.text, letterSpacing: "-0.03em" }}
        >
          {step === "connect" && "Seed your map"}
          {step === "capture" && "Capture going forward"}
          {step === "done" && "You\u2019re all set"}
        </h1>
        <p className="text-base" style={{ color: C.muted, maxWidth: 460, margin: "0 auto" }}>
          {step === "connect" &&
            "Connect services you already use to backfill your belief map with everything you\u2019ve read, watched, and listened to."}
          {step === "capture" &&
            "Install the tools that passively capture what you consume \u2014 no extra effort needed."}
          {step === "done" &&
            "Your map is ready to grow. Everything you consume will be captured and mapped automatically."}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8 px-4">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className="flex-1 h-1 rounded-full transition-colors duration-300"
            style={{
              background: i <= stepIndex ? C.accent : C.border,
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="space-y-4">
        {step === "connect" && (
          <>
            <IntegrationRow
              name="Readwise"
              description="Articles, highlights & podcasts"
              icon={<BookOpen className="w-5 h-5" style={{ color: "#f0c040" }} />}
              connected={!!getIntegration("readwise")?.connected}
              sourceCount={getIntegration("readwise")?.sourceCount || 0}
              syncing={syncing === "readwise"}
              onConnect={connectReadwise}
              onSync={() => syncIntegration("readwise")}
            />
            <IntegrationRow
              name="Instapaper"
              description="Your reading list"
              icon={<FileText className="w-5 h-5" style={{ color: C.textSoft }} />}
              connected={!!getIntegration("instapaper")?.connected}
              sourceCount={getIntegration("instapaper")?.sourceCount || 0}
              syncing={syncing === "instapaper"}
              onConnect={connectInstapaper}
              onSync={() => syncIntegration("instapaper")}
            />
            <IntegrationRow
              name="Spotify"
              description="Podcast episodes you\u2019ve listened to"
              icon={<Music className="w-5 h-5" style={{ color: "#d4915a" }} />}
              connected={!!getIntegration("spotify")?.connected}
              sourceCount={getIntegration("spotify")?.sourceCount || 0}
              syncing={syncing === "spotify"}
              onConnect={connectSpotify}
              onSync={() => syncIntegration("spotify")}
            />

            {totalSources > 0 && (
              <div
                className="rounded-lg p-3 text-center text-sm font-medium"
                style={{ background: `${C.accent}12`, color: C.accent }}
              >
                {totalSources} sources in your map so far
              </div>
            )}
          </>
        )}

        {step === "capture" && (
          <>
            {/* Desktop app */}
            <CaptureCard
              icon={<Monitor className="w-5 h-5" style={{ color: C.amber }} />}
              title="Desktop Companion"
              description="Silent menubar app that monitors what you read, watch, and listen to. Captures URLs, audio transcripts, and screen content automatically."
              recommended={platform === "mac" || platform === "windows" || platform === "linux"}
            >
              <div className="flex flex-col gap-2 mt-3">
                {platform === "mac" && (
                  <>
                    <DownloadLink
                      label="macOS (Apple Silicon)"
                      file={`Mindlair_${APP_VERSION}_aarch64.dmg`}
                      primary
                    />
                    <DownloadLink
                      label="macOS (Intel)"
                      file={`Mindlair_${APP_VERSION}_x64.dmg`}
                    />
                  </>
                )}
                {platform === "windows" && (
                  <DownloadLink
                    label="Windows"
                    file={`Mindlair_${APP_VERSION}_x64-setup.exe`}
                    primary
                  />
                )}
                {platform === "linux" && (
                  <DownloadLink
                    label="Linux (AppImage)"
                    file={`mindlair_${APP_VERSION}_amd64.AppImage`}
                    primary
                  />
                )}
                {platform !== "mac" && platform !== "windows" && platform !== "linux" && (
                  <>
                    <DownloadLink
                      label="macOS (Apple Silicon)"
                      file={`Mindlair_${APP_VERSION}_aarch64.dmg`}
                    />
                    <DownloadLink
                      label="Windows"
                      file={`Mindlair_${APP_VERSION}_x64-setup.exe`}
                    />
                    <DownloadLink
                      label="Linux (AppImage)"
                      file={`mindlair_${APP_VERSION}_amd64.AppImage`}
                    />
                  </>
                )}
              </div>
            </CaptureCard>

            {/* Browser extension */}
            <CaptureCard
              icon={<Globe className="w-5 h-5" style={{ color: C.accent }} />}
              title="Browser Extension"
              description="Tracks articles and videos you read in your browser. Works alongside the desktop app or as a standalone capture tool. Store versions coming soon — click a browser below for manual install instructions."
              recommended={platform === "ios" || platform === "android"}
            >
              <div className="flex flex-wrap gap-2 mt-3">
                <ExtensionLink browser="Chrome" />
                <ExtensionLink browser="Firefox" />
                <ExtensionLink browser="Safari" />
                <ExtensionLink browser="Edge" />
              </div>
            </CaptureCard>

            {/* Mobile - Add to Home Screen */}
            <CaptureCard
              icon={<Smartphone className="w-5 h-5" style={{ color: "#c4bfb4" }} />}
              title="Add to Home Screen"
              description="Add Mindlair to your home screen for quick access and push notifications."
            >
              <div className="mt-3 space-y-2">
                <div
                  style={{
                    padding: "12px 16px",
                    background: C.surface,
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <p style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.6 }}>
                    <strong>iOS Safari:</strong> Tap Share → Add to Home Screen
                    <br />
                    <strong>Android Chrome:</strong> Tap Menu (⋮) → Add to Home screen
                  </p>
                </div>
              </div>
            </CaptureCard>
          </>
        )}

        {step === "done" && (
          <div className="text-center py-8">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{ background: `${C.accent}20` }}
            >
              <Check className="w-8 h-8" style={{ color: C.accent }} />
            </div>

            <div className="space-y-3 mb-8">
              {totalConnected > 0 && (
                <SummaryRow label="Services connected" value={totalConnected} />
              )}
              {totalSources > 0 && (
                <SummaryRow label="Sources in your map" value={totalSources} />
              )}
              {totalConnected === 0 && totalSources === 0 && (
                <p className="text-sm" style={{ color: C.muted }}>
                  You skipped the integrations for now. You can always connect them later in Settings.
                </p>
              )}
            </div>

            <Button
              size="lg"
              onClick={completeOnboarding}
              disabled={completing}
              style={{
                background: C.accent,
                color: C.bg,
                fontWeight: 600,
              }}
            >
              {completing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Go to your map
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      {step !== "done" && (
        <div className="flex items-center justify-between mt-10 pt-6" style={{ borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={() => {
              if (stepIndex === 0) {
                setStep("done");
              } else {
                setStep(STEPS[stepIndex - 1]);
              }
            }}
            className="text-sm font-medium transition-colors"
            style={{ color: C.muted }}
          >
            {stepIndex === 0 ? "Skip setup" : "Back"}
          </button>

          <Button
            onClick={() => setStep(STEPS[stepIndex + 1])}
            style={{
              background: C.accent,
              color: C.bg,
              fontWeight: 600,
            }}
          >
            {stepIndex === STEPS.length - 2 ? "Finish" : "Continue"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

function IntegrationRow({
  name,
  description,
  icon,
  connected,
  sourceCount,
  syncing,
  onConnect,
  onSync,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  sourceCount: number;
  syncing: boolean;
  onConnect: () => void;
  onSync: () => void;
}) {
  return (
    <div
      className="rounded-xl p-4 flex items-center justify-between"
      style={{ border: `1px solid ${connected ? `${C.accent}40` : C.border}`, background: C.surface }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${C.border}80` }}
        >
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm" style={{ color: C.text }}>
              {name}
            </p>
            {connected && (
              <Check className="w-3.5 h-3.5" style={{ color: C.accent }} />
            )}
          </div>
          <p className="text-xs" style={{ color: C.muted }}>
            {description}
          </p>
          {connected && sourceCount > 0 && (
            <p className="text-xs mt-0.5" style={{ color: C.accent }}>
              {sourceCount} sources imported
            </p>
          )}
        </div>
      </div>
      {connected ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onSync}
          disabled={syncing}
          style={{ borderColor: C.border, color: C.textSoft }}
        >
          {syncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-1" />
              Sync
            </>
          )}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onConnect}
          style={{ borderColor: C.border, color: C.textSoft }}
        >
          Connect
        </Button>
      )}
    </div>
  );
}

function CaptureCard({
  icon,
  title,
  description,
  recommended,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  recommended?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        border: `1px solid ${recommended ? `${C.accent}40` : C.border}`,
        background: C.surface,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${C.border}80` }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium" style={{ color: C.text }}>
              {title}
            </p>
            {recommended && (
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: `${C.accent}20`, color: C.accent }}
              >
                Recommended
              </span>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: C.muted, lineHeight: 1.5 }}>
            {description}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}

function DownloadLink({
  label,
  file,
  primary,
}: {
  label: string;
  file: string;
  primary?: boolean;
}) {
  return (
    <a
      href={`https://github.com/${GITHUB_REPO}/releases/latest/download/${file}`}
      className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors"
      style={{
        border: `1px solid ${primary ? `${C.accent}50` : C.border}`,
        background: primary ? `${C.accent}08` : "transparent",
        color: C.text,
        textDecoration: "none",
      }}
    >
      <span>{label}</span>
      <Download className="w-4 h-4" style={{ color: primary ? C.accent : C.muted }} />
    </a>
  );
}

function ExtensionLink({ browser }: { browser: string }) {
  const [showModal, setShowModal] = useState(false);
  
  const instructions: Record<string, { steps: string[]; note: string }> = {
    Chrome: {
      steps: [
        "Download the extension from GitHub releases",
        "Open chrome://extensions in Chrome",
        "Enable 'Developer mode' in the top right",
        "Click 'Load unpacked' and select the extension folder",
      ],
      note: "Chrome Web Store version coming soon!",
    },
    Firefox: {
      steps: [
        "Download the extension from GitHub releases",
        "Open about:debugging in Firefox",
        "Click 'This Firefox' → 'Load Temporary Add-on'",
        "Select any file in the extension folder",
      ],
      note: "Firefox Add-ons version coming soon!",
    },
    Safari: {
      steps: [
        "Download the Safari extension project from GitHub",
        "Open in Xcode and build the project",
        "Enable the extension in Safari preferences",
      ],
      note: "App Store version coming soon!",
    },
    Edge: {
      steps: [
        "Download the extension from GitHub releases",
        "Open edge://extensions in Edge",
        "Enable 'Developer mode' in the bottom left",
        "Click 'Load unpacked' and select the extension folder",
      ],
      note: "Edge Add-ons version coming soon!",
    },
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
        style={{ borderColor: C.border, color: C.textSoft }}
      >
        {browser}
      </Button>
      
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: C.surface,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              maxWidth: 420,
              width: "100%",
              padding: 24,
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "none",
                border: "none",
                color: C.muted,
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>
              Install {browser} Extension
            </h3>
            
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: `${C.accent}15`,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <Info className="w-4 h-4" style={{ color: C.accent, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: C.accent }}>
                {instructions[browser].note}
              </span>
            </div>
            
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              For now, you can load the extension manually:
            </p>
            
            <ol style={{ margin: 0, padding: "0 0 0 20px", listStyleType: "decimal" }}>
              {instructions[browser].steps.map((step, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 13,
                    color: C.textSoft,
                    marginBottom: 10,
                    lineHeight: 1.5,
                  }}
                >
                  {step}
                </li>
              ))}
            </ol>
            
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <a
                href="https://github.com/RemyTasked/Mindlair/releases"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "10px 16px",
                  background: C.accent,
                  color: C.bg,
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <Download className="w-4 h-4" />
                Download from GitHub
              </a>
            </div>
            
            <p style={{ fontSize: 11, color: C.muted, marginTop: 16, textAlign: "center" }}>
              Subscribe to get notified when the {browser} store version is available
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-lg"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      <span className="text-sm" style={{ color: C.textSoft }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: C.accent }}>
        {value}
      </span>
    </div>
  );
}
