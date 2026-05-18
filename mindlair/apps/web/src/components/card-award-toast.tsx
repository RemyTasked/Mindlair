"use client";

import { useState, useEffect } from "react";
import { Star, Sparkles, Crown, X } from "lucide-react";

const C = {
  bg: "#0a0a0a",
  surface: "#141414",
  text: "#f5f5f5",
  textSoft: "#a3a3a3",
  accent: "#d4915a",
  purple: "#a855f7",
  gold: "#eab308",
  border: "#262626",
};

export interface AwardedCard {
  cardId: string;
  slug: string;
  name: string;
  tier: string;
  evidence: Record<string, unknown>;
}

interface CardAwardToastProps {
  card: AwardedCard;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

function getTierConfig(tier: string) {
  switch (tier) {
    case "common":
      return {
        icon: Star,
        color: C.textSoft,
        gradient: `linear-gradient(135deg, ${C.surface} 0%, #1a1a1a 100%)`,
        label: "Common",
      };
    case "rare":
      return {
        icon: Sparkles,
        color: C.purple,
        gradient: `linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, ${C.surface} 100%)`,
        label: "Rare",
      };
    case "legendary":
      return {
        icon: Crown,
        color: C.gold,
        gradient: `linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, ${C.surface} 100%)`,
        label: "Legendary",
      };
    default:
      return {
        icon: Star,
        color: C.textSoft,
        gradient: C.surface,
        label: "Unknown",
      };
  }
}

export function CardAwardToast({
  card,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
}: CardAwardToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const tierConfig = getTierConfig(card.tier);
  const TierIcon = tierConfig.icon;

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));

    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        transform: isVisible && !isExiting ? "translateY(0)" : "translateY(100px)",
        opacity: isVisible && !isExiting ? 1 : 0,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        style={{
          background: tierConfig.gradient,
          borderRadius: 16,
          padding: 16,
          border: `1px solid ${tierConfig.color}`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 16px ${tierConfig.color}40`,
          minWidth: 280,
          maxWidth: 340,
        }}
      >
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} style={{ color: C.textSoft }} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: `${tierConfig.color}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${tierConfig.color}`,
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            <TierIcon size={28} style={{ color: tierConfig.color }} />
          </div>

          <div style={{ flex: 1 }}>
            <p
              style={{
                color: tierConfig.color,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1,
                margin: "0 0 4px 0",
              }}
            >
              {tierConfig.label} Card Earned!
            </p>
            <h3
              style={{
                color: C.text,
                fontSize: 16,
                fontWeight: 600,
                margin: "0 0 4px 0",
              }}
            >
              {card.name}
            </h3>
            <p
              style={{
                color: C.textSoft,
                fontSize: 12,
                margin: 0,
              }}
            >
              View in your collection
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 ${tierConfig.color}40;
          }
          50% {
            box-shadow: 0 0 0 8px ${tierConfig.color}00;
          }
        }
      `}</style>
    </div>
  );
}

interface CardAwardQueueProps {
  awards: AwardedCard[];
  onDismiss: (cardId: string) => void;
}

export function CardAwardQueue({ awards, onDismiss }: CardAwardQueueProps) {
  if (awards.length === 0) return null;

  const currentAward = awards[0];

  return (
    <CardAwardToast
      key={currentAward.cardId}
      card={currentAward}
      onClose={() => onDismiss(currentAward.cardId)}
      autoCloseDelay={4000}
    />
  );
}
