"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

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
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
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

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-br from-rose-50 to-amber-50 dark:from-zinc-900 dark:to-zinc-800 rounded-xl shadow-xl border border-rose-200 dark:border-zinc-700 p-4 z-50">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-white/50"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl shadow-lg">
          <Smartphone className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Add Mindlayer to Home Screen
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Install the app for quick access, offline support, and push notifications.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {isIOS ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 bg-white/70 dark:bg-zinc-800/70 p-3 rounded-lg">
              <Share className="w-5 h-5 text-rose-500 shrink-0" />
              <span>
                Tap the <strong>Share</strong> button, then{" "}
                <strong>&quot;Add to Home Screen&quot;</strong>
              </span>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleDismiss}
            >
              Got it
            </Button>
          </div>
        ) : (
          <Button
            className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white"
            onClick={handleInstall}
          >
            <Download className="w-4 h-4 mr-2" />
            Install App
          </Button>
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Works offline
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Push notifications
        </span>
      </div>
    </div>
  );
}
