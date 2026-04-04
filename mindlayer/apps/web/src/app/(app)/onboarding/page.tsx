"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Bookmark,
  FileText,
  Music,
  Youtube,
  Monitor,
  Smartphone,
  Globe,
  Download,
  Check,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Upload,
  Loader2,
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
  youtube: { imported: boolean; sourceCount: number };
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
  const [uploadingYoutube, setUploadingYoutube] = useState(false);
  const [youtubeResult, setYoutubeResult] = useState<{ imported: number } | null>(null);
  const [completing, setCompleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (params.get("spotify") === "connected" || params.get("pocket") === "connected") {
      fetchData();
      window.history.replaceState({}, "", "/onboarding");
    }
  }, [fetchData]);

  const getIntegration = (provider: string) =>
    data?.integrations.find((i) => i.provider === provider);

  const totalConnected = (data?.integrations.filter((i) => i.connected).length || 0) +
    (data?.youtube.imported ? 1 : 0);

  const totalSources = (data?.integrations.reduce((sum, i) => sum + i.sourceCount, 0) || 0) +
    (data?.youtube.sourceCount || 0);

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

  const connectPocket = async () => {
    try {
      const res = await fetch("/api/integrations/pocket", { method: "POST" });
      if (res.ok) {
        const { authUrl } = await res.json();
        window.location.href = authUrl;
      }
    } catch {
      alert("Failed to connect Pocket");
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
        body: JSON.stringify({ returnTo: "/onboarding" }),
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

  const handleYoutubeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingYoutube(true);
    setYoutubeResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/integrations/youtube", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const result = await res.json();
        setYoutubeResult({ imported: result.imported });
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to import YouTube history");
      }
    } catch {
      alert("Failed to upload file");
    } finally {
      setUploadingYoutube(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
              name="Pocket"
              description="Saved articles & videos"
              icon={<Bookmark className="w-5 h-5" style={{ color: C.rose }} />}
              connected={!!getIntegration("pocket")?.connected}
              sourceCount={getIntegration("pocket")?.sourceCount || 0}
              syncing={syncing === "pocket"}
              onConnect={connectPocket}
              onSync={() => syncIntegration("pocket")}
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

            {/* YouTube upload */}
            <div
              className="rounded-xl p-4 flex items-center justify-between"
              style={{ border: `1px solid ${C.border}`, background: C.surface }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${C.border}80` }}
                >
                  <Youtube className="w-5 h-5" style={{ color: "#ff0000" }} />
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: C.text }}>
                    YouTube
                  </p>
                  <p className="text-xs" style={{ color: C.muted }}>
                    Upload watch history from Google Takeout
                  </p>
                  {(data?.youtube.sourceCount || 0) > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: C.accent }}>
                      {data?.youtube.sourceCount} videos imported
                    </p>
                  )}
                  {youtubeResult && (
                    <p className="text-xs mt-0.5" style={{ color: C.accent }}>
                      {youtubeResult.imported} new videos imported
                    </p>
                  )}
                </div>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.html"
                  onChange={handleYoutubeUpload}
                  className="hidden"
                  id="youtube-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingYoutube}
                  style={{ borderColor: C.border, color: C.textSoft }}
                >
                  {uploadingYoutube ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-1" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>

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
                      file={`Mindlayer_${APP_VERSION}_aarch64.dmg`}
                      primary
                    />
                    <DownloadLink
                      label="macOS (Intel)"
                      file={`Mindlayer_${APP_VERSION}_x64.dmg`}
                    />
                  </>
                )}
                {platform === "windows" && (
                  <DownloadLink
                    label="Windows"
                    file={`Mindlayer_${APP_VERSION}_x64-setup.exe`}
                    primary
                  />
                )}
                {platform === "linux" && (
                  <DownloadLink
                    label="Linux (AppImage)"
                    file={`mindlayer_${APP_VERSION}_amd64.AppImage`}
                    primary
                  />
                )}
                {platform !== "mac" && platform !== "windows" && platform !== "linux" && (
                  <>
                    <DownloadLink
                      label="macOS (Apple Silicon)"
                      file={`Mindlayer_${APP_VERSION}_aarch64.dmg`}
                    />
                    <DownloadLink
                      label="Windows"
                      file={`Mindlayer_${APP_VERSION}_x64-setup.exe`}
                    />
                    <DownloadLink
                      label="Linux (AppImage)"
                      file={`mindlayer_${APP_VERSION}_amd64.AppImage`}
                    />
                  </>
                )}
              </div>
            </CaptureCard>

            {/* Browser extension */}
            <CaptureCard
              icon={<Globe className="w-5 h-5" style={{ color: C.accent }} />}
              title="Browser Extension"
              description="Tracks articles and videos you read in your browser. Works alongside the desktop app or as a standalone capture tool."
              recommended={platform === "ios" || platform === "android"}
            >
              <div className="flex flex-wrap gap-2 mt-3">
                <ExtensionLink browser="Chrome" />
                <ExtensionLink browser="Firefox" />
                <ExtensionLink browser="Safari" />
                <ExtensionLink browser="Edge" />
              </div>
            </CaptureCard>

            {/* Mobile */}
            <CaptureCard
              icon={<Smartphone className="w-5 h-5" style={{ color: "#c4bfb4" }} />}
              title="Mobile App"
              description="Share articles, podcasts, and videos from any app directly into Mindlayer using your phone\u2019s share sheet."
            >
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  style={{ borderColor: C.border, color: C.textSoft }}
                  onClick={() => window.open("https://apps.apple.com", "_blank")}
                >
                  App Store
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  style={{ borderColor: C.border, color: C.textSoft }}
                  onClick={() => window.open("https://play.google.com", "_blank")}
                >
                  Play Store
                </Button>
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
  const urls: Record<string, string> = {
    Chrome: "https://chrome.google.com/webstore",
    Firefox: "https://addons.mozilla.org",
    Safari: "https://apps.apple.com",
    Edge: "https://microsoftedge.microsoft.com/addons",
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.open(urls[browser], "_blank")}
      style={{ borderColor: C.border, color: C.textSoft }}
    >
      {browser}
    </Button>
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
