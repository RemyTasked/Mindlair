"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const C = {
  bg: "#0f0e0c", surface: "#1a1916", border: "#2a2825",
  text: "#e8e4dc", textSoft: "#c4bfb4", muted: "#7a7469",
  accent: "#52b788",
};

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) return;

    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const daysSinceDismissed = (Date.now() - new Date(dismissed).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 5000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    if (isIOSDevice && !isStandaloneMode) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div style={{
      position: "fixed", bottom: 16, left: 16, right: 16,
      maxWidth: 380, marginLeft: "auto",
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: 16, zIndex: 50,
      boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <button onClick={handleDismiss} style={{
        position: "absolute", top: 10, right: 10, background: "none",
        border: "none", color: C.muted, cursor: "pointer", padding: 4,
      }}>
        <X style={{ width: 16, height: 16 }} />
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          padding: 10, borderRadius: 12,
          background: `${C.accent}18`,
          flexShrink: 0,
        }}>
          <Smartphone style={{ width: 22, height: 22, color: C.accent }} />
        </div>
        <div style={{ flex: 1, paddingRight: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            Add Mindlayer to Home Screen
          </h3>
          <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            Install for quick access, offline support, and push notifications.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {isIOS ? (
          <div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, color: C.textSoft,
              background: C.bg, padding: "10px 12px", borderRadius: 8,
              border: `1px solid ${C.border}`,
            }}>
              <Share style={{ width: 16, height: 16, color: C.accent, flexShrink: 0 }} />
              <span>
                Tap <strong>Share</strong>, then <strong>&quot;Add to Home Screen&quot;</strong>
              </span>
            </div>
            <button onClick={handleDismiss} style={{
              width: "100%", marginTop: 10, padding: "8px 0",
              background: "none", border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.textSoft, fontSize: 13,
              cursor: "pointer", fontWeight: 500,
            }}>
              Got it
            </button>
          </div>
        ) : (
          <Button variant="gradient" className="w-full" onClick={handleInstall}>
            <Download className="w-4 h-4 mr-2" />
            Install App
          </Button>
        )}
      </div>

      <div style={{
        marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center",
        gap: 16, fontSize: 11, color: C.muted,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.accent }} />
          Works offline
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#d4915a" }} />
          Push notifications
        </span>
      </div>
    </div>
  );
}
