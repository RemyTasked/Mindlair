"use client";

import { useState, useEffect } from "react";
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
  Home,
  Sparkles,
  Bell,
  Brain,
  TrendingUp,
  Layers,
  Share2,
  Mic,
  BookmarkPlus,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_VERSION, GITHUB_REPO } from "@/lib/app-config";
import { QuickThoughtModal } from "@/components/quick-thought-modal";

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
  green: "#a3c47a",
  blue: "#6b9fc4",
};

const STEPS = ["welcome", "captureAnywhere", "install", "firstThought", "done"] as const;
type Step = (typeof STEPS)[number];

type PlatformType = "windows" | "mac" | "linux" | "ios" | "android" | "other";

interface OnboardingOverlayProps {
  onComplete: () => void;
}

export default function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [platform, setPlatform] = useState<PlatformType>("other");
  const [completing, setCompleting] = useState(false);
  const [thoughtModalOpen, setThoughtModalOpen] = useState(false);
  const [firstThoughtCaptured, setFirstThoughtCaptured] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("iphone") || ua.includes("ipad")) setPlatform("ios");
    else if (ua.includes("android")) setPlatform("android");
    else if (ua.includes("mac")) setPlatform("mac");
    else if (ua.includes("win")) setPlatform("windows");
    else if (ua.includes("linux")) setPlatform("linux");
  }, []);

  const isDesktop = platform === "mac" || platform === "windows" || platform === "linux";
  const isMobile = platform === "ios" || platform === "android";

  const completeOnboarding = async () => {
    setCompleting(true);
    try {
      await fetch("/api/onboarding", { method: "POST" });
      onComplete();
    } catch {
      onComplete();
    }
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 14, 12, 0.92)",
        backdropFilter: "blur(12px)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "16px 16px 100px 16px" : 16,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: C.bg,
          borderRadius: 20,
          border: `1px solid ${C.border}`,
          maxWidth: 560,
          width: "100%",
          maxHeight: isMobile ? "calc(90vh - 80px)" : "90vh",
          overflowY: "auto",
          padding: "32px 28px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `${C.accent}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            {step === "welcome" && <Brain className="w-6 h-6" style={{ color: C.accent }} />}
            {step === "captureAnywhere" && <Share2 className="w-6 h-6" style={{ color: C.accent }} />}
            {step === "install" && <Download className="w-6 h-6" style={{ color: C.accent }} />}
            {step === "firstThought" && <Sparkles className="w-6 h-6" style={{ color: C.accent }} />}
            {step === "done" && <Sparkles className="w-6 h-6" style={{ color: C.accent }} />}
          </div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: C.text, letterSpacing: "-0.03em" }}
          >
            {step === "welcome" && "Welcome to Mindlair"}
            {step === "captureAnywhere" && "Capture anywhere"}
            {step === "install" && "Optional: ambient capture"}
            {step === "firstThought" && "Plant your first seed"}
            {step === "done" && "You're ready!"}
          </h1>
          <p className="text-sm" style={{ color: C.muted, maxWidth: 400, margin: "0 auto" }}>
            {step === "welcome" &&
              "Map your intellectual journey. See how your thinking evolves over time."}
            {step === "captureAnywhere" &&
              "Three low-friction surfaces feed the same pipeline. Use whichever fits the moment."}
            {step === "install" &&
              "Want Mindlair to also read what you don't intentionally share? Install one or both of these."}
            {step === "firstThought" &&
              "Add one quick thought before you go. It's saved right away and starts your belief graph — the habit, not the full map view, comes first."}
            {step === "done" &&
              "You're set up. Keep capturing and reacting — your own map view will take shape as you go."}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-6 px-2">
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
        <div className="space-y-3">
          {step === "welcome" && (
            <div className="space-y-4">
              {/* What Mindlair does */}
              <div
                style={{
                  background: C.surface,
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  padding: 20,
                }}
              >
                <div className="space-y-4">
                  <WelcomeFeature
                    icon={<Layers className="w-5 h-5" />}
                    title="Capture every thought worth keeping"
                    description="Share, speak, save for later, or let it run silently — whatever fits the moment lands on your map."
                  />
                  <WelcomeFeature
                    icon={<Brain className="w-5 h-5" />}
                    title="Build your belief map"
                    description="See your positions as an interactive map. Watch clusters form around topics you care about."
                  />
                  <WelcomeFeature
                    icon={<TrendingUp className="w-5 h-5" />}
                    title="Track how you evolve"
                    description="Your map changes over time. Revisit past versions to see how your thinking has shifted."
                  />
                </div>
              </div>

              {/* How to get the most */}
              <div
                style={{
                  background: `${C.accent}08`,
                  borderRadius: 12,
                  border: `1px solid ${C.accent}20`,
                  padding: "16px 20px",
                }}
              >
                <p style={{ fontSize: 13, color: C.textSoft, marginBottom: 12, fontWeight: 500 }}>
                  Get the most out of Mindlair:
                </p>
                <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 13, color: C.muted, lineHeight: 1.8 }}>
                  <li>Share articles with a quick reaction — claims land instantly</li>
                  <li>Tap the mic to capture a thought on the go</li>
                  <li>Check back weekly to see your map evolve</li>
                </ul>
              </div>
            </div>
          )}

          {step === "captureAnywhere" && (
            <div className="space-y-3">
              <ModalityCard
                icon={<Share2 className="w-5 h-5" />}
                title="Share sheet"
                description="Hit Share from any app, drop a quick reaction — your claims land on the map. No reaction? It saves to React-later."
                color={C.green}
              />
              <ModalityCard
                icon={<Mic className="w-5 h-5" />}
                title="Voice note"
                description={
                  isMobile
                    ? "Tap the mic to record up to 30 seconds. Whisper transcribes, spoken-mode extraction cleans up filler. Add to Shortcuts for one-tap access from your lock screen."
                    : "Tap the mic to record up to 30 seconds. Whisper transcribes, spoken-mode extraction cleans up filler."
                }
                color={C.blue}
              />
              <ModalityCard
                icon={<BookmarkPlus className="w-5 h-5" />}
                title="React later"
                description="Items saved without a reaction queue up in your inbox. Type whenever you have a moment — same extraction, same confirmation."
                color={C.amber}
              >
                <Link
                  href="/inbox/react-later"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    color: C.accent,
                    marginTop: 8,
                    textDecoration: "none",
                  }}
                >
                  Open React-later
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </ModalityCard>
            </div>
          )}

          {step === "install" && (
            <>
              {isMobile ? (
                <>
                  {/* Mobile: Add to Home Screen */}
                  <CaptureCard
                    icon={<Home className="w-5 h-5" style={{ color: C.accent }} />}
                    title="Add to Home Screen"
                    description="Get quick access to Mindlair, push notifications for your daily digest, and offline support."
                  >
                    <div className="mt-3 space-y-2">
                      {platform === "ios" ? (
                        <div
                          style={{
                            padding: "12px 16px",
                            background: C.surface,
                            borderRadius: 8,
                            border: `1px solid ${C.border}`,
                          }}
                        >
                          <p style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.6 }}>
                            1. Tap the <strong>Share</strong> button in Safari
                            <br />
                            2. Scroll down and tap <strong>Add to Home Screen</strong>
                            <br />
                            3. Tap <strong>Add</strong> in the top right
                          </p>
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: "12px 16px",
                            background: C.surface,
                            borderRadius: 8,
                            border: `1px solid ${C.border}`,
                          }}
                        >
                          <p style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.6 }}>
                            1. Tap the <strong>menu</strong> (⋮) in Chrome
                            <br />
                            2. Tap <strong>Add to Home screen</strong>
                            <br />
                            3. Tap <strong>Add</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  </CaptureCard>

                  {/* Android: Native App */}
                  {platform === "android" && (
                    <CaptureCard
                      icon={<Download className="w-5 h-5" style={{ color: C.accent }} />}
                      title="Android App"
                      description="Native app with passive capture. Automatically tracks what you watch and listen to."
                    >
                      <div className="mt-3 space-y-3">
                        <a
                          href={`https://github.com/${GITHUB_REPO}/releases/download/android-v${APP_VERSION}/mindlair-${APP_VERSION}-debug.apk`}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            padding: "10px 14px", borderRadius: 8,
                            background: C.accent, color: "#fff",
                            textDecoration: "none", fontWeight: 600, fontSize: 13,
                          }}
                        >
                          <Download className="w-4 h-4" />
                          Download APK
                        </a>
                        <p style={{ fontSize: 11, color: C.muted }}>
                          After downloading, tap the file to install. Enable &quot;Install from unknown sources&quot; if prompted.
                        </p>
                      </div>
                    </CaptureCard>
                  )}

                  {/* Mobile: Share extension info */}
                  <CaptureCard
                    icon={<Smartphone className="w-5 h-5" style={{ color: C.textSoft }} />}
                    title="Share from any app"
                    description="Use your phone's share sheet to send articles, podcasts, and videos directly to Mindlair."
                  >
                    <div className="mt-2">
                      <p style={{ fontSize: 12, color: C.muted }}>
                        After adding to home screen, you can share content to Mindlair from any app.
                      </p>
                    </div>
                  </CaptureCard>

                  {/* Mobile: Enable Push Notifications */}
                  <CaptureCard
                    icon={<Bell className="w-5 h-5" style={{ color: C.accent }} />}
                    title="Enable Notifications"
                    description="Get notified when your daily digest is ready."
                  >
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if ("Notification" in window && Notification.permission !== "granted") {
                            await Notification.requestPermission();
                          }
                        }}
                        style={{ borderColor: C.border, color: C.textSoft }}
                      >
                        <Bell className="w-4 h-4 mr-1" />
                        Enable notifications
                      </Button>
                    </div>
                  </CaptureCard>
                </>
              ) : (
                <>
                  {/* Desktop app */}
                  <CaptureCard
                    icon={<Monitor className="w-5 h-5" style={{ color: C.amber }} />}
                    title="Desktop Companion"
                    description="Silent menubar app that monitors what you read, watch, and listen to."
                    recommended={isDesktop}
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
                      {!isDesktop && (
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

                  {/* Browser extension */}
                  <CaptureCard
                    icon={<Globe className="w-5 h-5" style={{ color: C.accent }} />}
                    title="Browser Extension"
                    description="Tracks articles and videos in your browser. Click a browser for install instructions."
                  >
                    <div className="flex flex-wrap gap-2 mt-3">
                      <ExtensionLink browser="Chrome" />
                      <ExtensionLink browser="Firefox" />
                      <ExtensionLink browser="Safari" />
                      <ExtensionLink browser="Edge" />
                    </div>
                  </CaptureCard>
                </>
              )}
            </>
          )}

          {step === "firstThought" && (
            <div className="space-y-4">
              <div
                style={{
                  background: C.surface,
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  padding: "20px 18px",
                }}
              >
                <div className="flex gap-3 items-start">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${C.accent}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: C.accent,
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: C.text,
                        marginBottom: 4,
                      }}
                    >
                      Why now?
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: C.muted,
                        lineHeight: 1.5,
                      }}
                    >
                      Maps start at the first claim. Type or speak something
                      you believe — a view on a news story, a frustration, a
                      half-formed opinion. The AI sharpens it into a claim you
                      can keep, edit, flip, or drop.
                    </p>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: `${C.accent}08`,
                  borderRadius: 10,
                  border: `1px solid ${C.accent}25`,
                  padding: "12px 14px",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <Info className="w-4 h-4 shrink-0" style={{ color: C.accent, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.55, margin: 0 }}>
                  Your thought is stored immediately. The map screen still shows
                  a sample layout at first — it switches to your own graph once
                  you&apos;ve added a bit more activity (more quick thoughts,
                  reactions, or digests).
                </p>
              </div>

              {firstThoughtCaptured ? (
                <div
                  style={{
                    background: `${C.green}10`,
                    border: `1px solid ${C.green}40`,
                    borderRadius: 12,
                    padding: "16px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: `${C.green}25`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Check className="w-4 h-4" style={{ color: C.green }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: C.text,
                        marginBottom: 2,
                      }}
                    >
                      First thought captured
                    </p>
                    <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                      It&apos;s saved. Your personal map view will appear as you
                      add more — tap continue when you&apos;re ready.
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={() => setThoughtModalOpen(true)}
                  style={{
                    background: C.accent,
                    color: C.bg,
                    fontWeight: 600,
                    width: "100%",
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Add your first thought
                </Button>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-6">
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
                <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.6, marginBottom: 10 }}>
                  Share, speak, or save for later — every input feeds the same
                  pipeline and builds toward your graph.
                </p>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, margin: 0 }}>
                  When you open the map, you&apos;ll still see a sample layout at
                  first. Your first thought is already saved; keep capturing and
                  your own map will replace it.
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
                  width: "100%",
                  maxWidth: 280,
                }}
              >
                {completing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Explore your map
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Navigation */}
        {step !== "done" && (
          <div
            className="flex items-center justify-between mt-8 pt-5"
            style={{ borderTop: `1px solid ${C.border}` }}
          >
            <button
              onClick={() => {
                if (stepIndex > 0) {
                  setStep(STEPS[stepIndex - 1]);
                }
              }}
              className="text-sm font-medium transition-colors"
              style={{ color: C.muted, visibility: stepIndex === 0 ? "hidden" : "visible" }}
            >
              Back
            </button>

            <Button
              onClick={() => setStep(STEPS[stepIndex + 1])}
              disabled={step === "firstThought" && !firstThoughtCaptured}
              style={{
                background:
                  step === "firstThought" && !firstThoughtCaptured
                    ? C.border
                    : C.accent,
                color:
                  step === "firstThought" && !firstThoughtCaptured
                    ? C.muted
                    : C.bg,
                fontWeight: 600,
                cursor:
                  step === "firstThought" && !firstThoughtCaptured
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {step === "welcome" && "Get Started"}
              {step === "captureAnywhere" && "Continue"}
              {step === "install" && "Continue"}
              {step === "firstThought" &&
                (firstThoughtCaptured ? "Continue" : "Add a thought first")}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      <QuickThoughtModal
        open={thoughtModalOpen}
        onClose={() => setThoughtModalOpen(false)}
        onSuccess={() => setFirstThoughtCaptured(true)}
      />
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

function WelcomeFeature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${C.accent}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: C.accent,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
          {title}
        </p>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
    </div>
  );
}

function ModalityCard({
  icon,
  title,
  description,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        border: `1px solid ${color}30`,
        background: `${color}08`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20`, color }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-medium" style={{ color: C.text }}>
            {title}
          </p>
          <p className="text-sm mt-1" style={{ color: C.muted, lineHeight: 1.5 }}>
            {description}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}
