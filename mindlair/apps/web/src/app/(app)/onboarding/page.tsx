"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Monitor,
  Smartphone,
  Globe,
  Download,
  Check,
  ChevronRight,
  ArrowRight,
  Loader2,
  X,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_VERSION, GITHUB_REPO } from "@/lib/app-config";

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

const STEPS = ["capture", "done"] as const;
type Step = (typeof STEPS)[number];

type PlatformType = "windows" | "mac" | "linux" | "ios" | "android" | "other";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("capture");
  const [platform, setPlatform] = useState<PlatformType>("other");
  const [isMobile, setIsMobile] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const mobile = /iphone|ipad|ipod|android/.test(ua);
    setIsMobile(mobile);
    
    if (ua.includes("iphone") || ua.includes("ipad")) setPlatform("ios");
    else if (ua.includes("android")) setPlatform("android");
    else if (ua.includes("mac")) setPlatform("mac");
    else if (ua.includes("win")) setPlatform("windows");
    else if (ua.includes("linux")) setPlatform("linux");
  }, []);

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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h1
          className="text-3xl font-bold mb-3"
          style={{ color: C.text, letterSpacing: "-0.03em" }}
        >
          {step === "capture" && "Install capture tools"}
          {step === "done" && "You're all set"}
        </h1>
        <p className="text-base" style={{ color: C.muted, maxWidth: 460, margin: "0 auto" }}>
          {step === "capture" &&
            "Install the browser extension to passively capture what you consume — no extra effort needed."}
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
        {step === "capture" && (
          <>
            {/* Mobile: Add to Home Screen - shown first and prominently */}
            {isMobile && (
              <CaptureCard
                icon={<Smartphone className="w-5 h-5" style={{ color: C.amber }} />}
                title="Add to Home Screen"
                description="Get the full app experience with notifications, offline support, and quick access from your home screen."
                recommended
              >
                <div className="mt-3 space-y-3">
                  <div
                    style={{
                      padding: "14px 18px",
                      background: `${C.accent}12`,
                      borderRadius: 10,
                      border: `1px solid ${C.accent}30`,
                    }}
                  >
                    {platform === "ios" ? (
                      <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>
                        <strong>In Safari:</strong> Tap the <span style={{ color: C.accent }}>Share</span> button → <strong>Add to Home Screen</strong>
                      </p>
                    ) : (
                      <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>
                        <strong>In Chrome:</strong> Tap <span style={{ color: C.accent }}>⋮</span> menu → <strong>Add to Home screen</strong>
                      </p>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: C.muted }}>
                    {platform === "ios" 
                      ? "Works best in Safari. You'll get push notifications and a native app feel."
                      : "No download required. The app will install instantly."}
                  </p>
                </div>
              </CaptureCard>
            )}

            {/* Android: APK download option */}
            {platform === "android" && (
              <CaptureCard
                icon={<Download className="w-5 h-5" style={{ color: "#4ade80" }} />}
                title="Android App (APK)"
                description="Native app with passive capture for podcasts and videos. Automatically tracks what you listen to across apps."
              >
                <div className="mt-3">
                  <a
                    href={`https://github.com/${GITHUB_REPO}/releases/download/android-v${APP_VERSION}/mindlair-${APP_VERSION}-debug.apk`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px 20px",
                      borderRadius: 10,
                      background: C.accent,
                      color: C.bg,
                      fontWeight: 600,
                      fontSize: 14,
                      textDecoration: "none",
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Download APK
                  </a>
                  <p style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>
                    Requires Android 8.0+. Enable &quot;Install from unknown sources&quot; when prompted.
                  </p>
                </div>
              </CaptureCard>
            )}

            {/* Desktop: Desktop app - only show on non-mobile */}
            {!isMobile && (
              <CaptureCard
                icon={<Monitor className="w-5 h-5" style={{ color: C.amber }} />}
                title="Desktop Companion"
                description="Silent menubar app that monitors what you read, watch, and listen to. Captures URLs, audio transcripts, and screen content automatically."
                recommended={platform === "mac" || platform === "windows" || platform === "linux"}
              >
                <div className="flex flex-col gap-2 mt-3">
                  {platform === "mac" && (
                    <DownloadLink
                      label="macOS (Apple Silicon)"
                      file={`Mindlair_${APP_VERSION}_aarch64.dmg`}
                      primary
                    />
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
                      file={`Mindlair_${APP_VERSION}_amd64.AppImage`}
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
                        file={`Mindlair_${APP_VERSION}_amd64.AppImage`}
                      />
                    </>
                  )}
                </div>
              </CaptureCard>
            )}

            {/* Desktop: Browser extension - only show on non-mobile */}
            {!isMobile && (
              <CaptureCard
                icon={<Globe className="w-5 h-5" style={{ color: C.accent }} />}
                title="Browser Extension"
                description="Tracks articles and videos you read in your browser. Works alongside the desktop app or as a standalone capture tool. Store versions coming soon — click a browser below for manual install instructions."
              >
                <div className="flex flex-wrap gap-2 mt-3">
                  <ExtensionLink browser="Chrome" />
                  <ExtensionLink browser="Firefox" />
                  <ExtensionLink browser="Safari" />
                  <ExtensionLink browser="Edge" />
                </div>
              </CaptureCard>
            )}
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

            <div
              style={{
                padding: "16px",
                background: C.surface,
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                marginBottom: 24,
              }}
            >
              <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.6 }}>
                Your map will grow as you browse. Make sure you have the browser
                extension installed so Mindlair can passively capture what you read.
              </p>
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
            onClick={() => setStep("done")}
            className="text-sm font-medium transition-colors"
            style={{ color: C.muted }}
          >
            Skip setup
          </button>

          <Button
            onClick={() => setStep(STEPS[stepIndex + 1])}
            style={{
              background: C.accent,
              color: C.bg,
              fontWeight: 600,
            }}
          >
            Finish
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
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
  
  const instructions: Record<string, { steps: string[]; note: string; downloadFile: string }> = {
    Chrome: {
      steps: [
        "Download and extract the ZIP file",
        "Open chrome://extensions in Chrome",
        "Enable 'Developer mode' in the top right",
        "Click 'Load unpacked' and select the extracted folder",
      ],
      note: "Chrome Web Store version coming soon!",
      downloadFile: `mindlair-chrome-${APP_VERSION}.zip`,
    },
    Firefox: {
      steps: [
        "Download and extract the ZIP file",
        "Open about:debugging in Firefox",
        "Click 'This Firefox' → 'Load Temporary Add-on'",
        "Select the manifest.json in the extracted folder",
      ],
      note: "Firefox Add-ons version coming soon!",
      downloadFile: `mindlair-firefox-${APP_VERSION}.zip`,
    },
    Safari: {
      steps: [
        "Safari extension requires building from source",
        "Clone the GitHub repository",
        "Open the Safari extension project in Xcode",
        "Build and enable in Safari preferences",
      ],
      note: "App Store version coming soon!",
      downloadFile: "",
    },
    Edge: {
      steps: [
        "Download and extract the ZIP file",
        "Open edge://extensions in Edge",
        "Enable 'Developer mode' in the bottom left",
        "Click 'Load unpacked' and select the extracted folder",
      ],
      note: "Edge Add-ons version coming soon!",
      downloadFile: `mindlair-edge-${APP_VERSION}.zip`,
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
              {instructions[browser].steps.map((stepItem, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 13,
                    color: C.textSoft,
                    marginBottom: 10,
                    lineHeight: 1.5,
                  }}
                >
                  {stepItem}
                </li>
              ))}
            </ol>
            
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <a
                href={instructions[browser].downloadFile 
                  ? `https://github.com/${GITHUB_REPO}/releases/download/ext-v${APP_VERSION}/${instructions[browser].downloadFile}`
                  : `https://github.com/${GITHUB_REPO}/releases`
                }
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
