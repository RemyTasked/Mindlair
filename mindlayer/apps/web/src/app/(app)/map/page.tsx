"use client";

import { useState, useEffect } from "react";
import MindlayerMap from "@/components/mindlayer-map";
import OnboardingOverlay from "@/components/onboarding-overlay";

export default function MapPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const res = await fetch("/api/onboarding/status");
        if (res.ok) {
          const data = await res.json();
          setShowOnboarding(!data.onboardingComplete);
        }
      } catch {
        // If we can't check, don't show the overlay
      } finally {
        setLoading(false);
      }
    }
    checkOnboarding();
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f0e0c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#d4915a",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <MindlayerMap />
      {showOnboarding && <OnboardingOverlay onComplete={handleOnboardingComplete} />}
    </>
  );
}
