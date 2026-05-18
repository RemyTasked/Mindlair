"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Lock,
  Share2,
  Check,
  Sparkles,
  Star,
  Crown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

const C = {
  bg: "#0a0a0a",
  surface: "#141414",
  surfaceHover: "#1a1a1a",
  border: "#262626",
  borderHover: "#333333",
  text: "#f5f5f5",
  textSoft: "#a3a3a3",
  textMuted: "#737373",
  accent: "#d4915a",
  accentSoft: "rgba(212, 145, 90, 0.15)",
  green: "#22c55e",
  greenSoft: "rgba(34, 197, 94, 0.15)",
  purple: "#a855f7",
  purpleSoft: "rgba(168, 85, 247, 0.15)",
  gold: "#eab308",
  goldSoft: "rgba(234, 179, 8, 0.15)",
};

interface CardData {
  id: string;
  slug: string;
  name: string;
  description: string;
  hint: string;
  tier: "common" | "rare" | "legendary";
  category: string | null;
  sortOrder: number;
  isEarned: boolean;
  awardedAt: string | null;
}

interface CardStats {
  earned: number;
  total: number;
  commonEarned: number;
  commonTotal: number;
  rareEarned: number;
  rareTotal: number;
  legendaryEarned: number;
  legendaryTotal: number;
}

interface CatalogResponse {
  cards: CardData[];
  grouped: {
    common: CardData[];
    rare: CardData[];
    legendary: CardData[];
  };
  stats: CardStats;
}

function getTierConfig(tier: string) {
  switch (tier) {
    case "common":
      return {
        icon: Star,
        color: C.textSoft,
        bg: C.surface,
        border: C.border,
        label: "Common",
      };
    case "rare":
      return {
        icon: Sparkles,
        color: C.purple,
        bg: C.purpleSoft,
        border: C.purple,
        label: "Rare",
      };
    case "legendary":
      return {
        icon: Crown,
        color: C.gold,
        bg: C.goldSoft,
        border: C.gold,
        label: "Legendary",
      };
    default:
      return {
        icon: Star,
        color: C.textSoft,
        bg: C.surface,
        border: C.border,
        label: "Unknown",
      };
  }
}

function CardItem({ card, onSelect }: { card: CardData; onSelect: (card: CardData) => void }) {
  const tierConfig = getTierConfig(card.tier);
  const TierIcon = tierConfig.icon;

  return (
    <div
      onClick={() => onSelect(card)}
      style={{
        background: card.isEarned ? tierConfig.bg : C.surface,
        border: `1px solid ${card.isEarned ? tierConfig.border : C.border}`,
        borderRadius: 12,
        padding: 16,
        cursor: "pointer",
        transition: "all 0.2s ease",
        opacity: card.isEarned ? 1 : 0.7,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = tierConfig.border;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = card.isEarned ? tierConfig.border : C.border;
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            background: card.isEarned ? tierConfig.bg : C.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${card.isEarned ? tierConfig.border : C.border}`,
          }}
        >
          {card.isEarned ? (
            <TierIcon size={24} style={{ color: tierConfig.color }} />
          ) : (
            <Lock size={24} style={{ color: C.textMuted }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                color: card.isEarned ? C.text : C.textSoft,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {card.isEarned ? card.name : "???"}
            </span>
            <Badge
              style={{
                background: tierConfig.bg,
                color: tierConfig.color,
                border: `1px solid ${tierConfig.border}`,
                fontSize: 10,
                padding: "2px 6px",
              }}
            >
              {tierConfig.label}
            </Badge>
          </div>
          <p
            style={{
              color: C.textSoft,
              fontSize: 13,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {card.isEarned ? card.description : card.hint}
          </p>
          {card.isEarned && card.awardedAt && (
            <p
              style={{
                color: C.textMuted,
                fontSize: 11,
                margin: "8px 0 0 0",
              }}
            >
              Earned {new Date(card.awardedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <ChevronRight size={16} style={{ color: C.textMuted, flexShrink: 0 }} />
      </div>
    </div>
  );
}

function CardDetailModal({
  card,
  onClose,
}: {
  card: CardData;
  onClose: () => void;
}) {
  const tierConfig = getTierConfig(card.tier);
  const TierIcon = tierConfig.icon;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.surface,
          borderRadius: 16,
          maxWidth: 400,
          width: "100%",
          padding: 24,
          border: `1px solid ${tierConfig.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 16,
              background: card.isEarned ? tierConfig.bg : C.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              border: `2px solid ${card.isEarned ? tierConfig.border : C.border}`,
            }}
          >
            {card.isEarned ? (
              <TierIcon size={40} style={{ color: tierConfig.color }} />
            ) : (
              <Lock size={40} style={{ color: C.textMuted }} />
            )}
          </div>
          <h2 style={{ color: C.text, fontSize: 20, fontWeight: 600, margin: "0 0 8px 0" }}>
            {card.isEarned ? card.name : "Locked Card"}
          </h2>
          <Badge
            style={{
              background: tierConfig.bg,
              color: tierConfig.color,
              border: `1px solid ${tierConfig.border}`,
            }}
          >
            {tierConfig.label}
          </Badge>
        </div>

        <p
          style={{
            color: C.textSoft,
            fontSize: 14,
            textAlign: "center",
            lineHeight: 1.6,
            margin: "0 0 20px 0",
          }}
        >
          {card.isEarned ? card.description : card.hint}
        </p>

        {card.isEarned && card.awardedAt && (
          <div
            style={{
              background: C.greenSoft,
              borderRadius: 8,
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <Check size={16} style={{ color: C.green }} />
            <span style={{ color: C.green, fontSize: 13 }}>
              Earned on {new Date(card.awardedAt).toLocaleDateString()}
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {card.isEarned && (
            <Button
              variant="outline"
              style={{
                flex: 1,
                background: C.bg,
                borderColor: C.border,
                color: C.textSoft,
              }}
            >
              <Share2 size={16} />
              Share
            </Button>
          )}
          <Button
            onClick={onClose}
            style={{
              flex: 1,
              background: C.accent,
              color: "#000",
            }}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function TierSection({
  title,
  cards,
  earnedCount,
  totalCount,
  onSelectCard,
}: {
  title: string;
  cards: CardData[];
  earnedCount: number;
  totalCount: number;
  onSelectCard: (card: CardData) => void;
}) {
  const tierConfig = getTierConfig(cards[0]?.tier || "common");

  if (cards.length === 0) return null;

  return (
    <Card style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <CardHeader>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <CardTitle style={{ color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
            <tierConfig.icon size={20} style={{ color: tierConfig.color }} />
            {title}
          </CardTitle>
          <Badge
            style={{
              background: tierConfig.bg,
              color: tierConfig.color,
              border: `1px solid ${tierConfig.border}`,
            }}
          >
            {earnedCount} / {totalCount}
          </Badge>
        </div>
        <CardDescription style={{ color: C.textSoft }}>
          {earnedCount === totalCount
            ? "All cards collected!"
            : `${totalCount - earnedCount} more to unlock`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ display: "grid", gap: 12 }}>
          {cards.map((card) => (
            <CardItem key={card.id} card={card} onSelect={onSelectCard} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CardCollection() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cards");
      if (!res.ok) throw new Error("Failed to fetch cards");
      const data = await res.json();
      setCatalog(data);
      setError(null);
    } catch (err) {
      setError("Failed to load card catalog");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RefreshCw size={24} style={{ color: C.textSoft, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div
        style={{
          minHeight: 400,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <p style={{ color: C.textSoft }}>{error || "Something went wrong"}</p>
        <Button onClick={fetchCatalog} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Trophy size={28} style={{ color: C.accent }} />
          <h1 style={{ color: C.text, fontSize: 24, fontWeight: 600, margin: 0 }}>Card Collection</h1>
        </div>
        <p style={{ color: C.textSoft, fontSize: 14, margin: 0 }}>
          Earn cards by engaging with content and building your map.
        </p>
      </div>

      {/* Stats Overview */}
      <Card
        style={{
          background: C.accentSoft,
          border: `1px solid ${C.accent}`,
          marginBottom: 24,
        }}
      >
        <CardContent style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ color: C.accent, fontSize: 12, fontWeight: 500, margin: "0 0 4px 0" }}>
                TOTAL PROGRESS
              </p>
              <p style={{ color: C.text, fontSize: 28, fontWeight: 700, margin: 0 }}>
                {catalog.stats.earned} / {catalog.stats.total}
              </p>
            </div>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                background: C.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trophy size={32} style={{ color: "#000" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <p style={{ color: C.textSoft, fontSize: 11, margin: "0 0 2px 0" }}>Common</p>
              <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0 }}>
                {catalog.stats.commonEarned}/{catalog.stats.commonTotal}
              </p>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <p style={{ color: C.purple, fontSize: 11, margin: "0 0 2px 0" }}>Rare</p>
              <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0 }}>
                {catalog.stats.rareEarned}/{catalog.stats.rareTotal}
              </p>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <p style={{ color: C.gold, fontSize: 11, margin: "0 0 2px 0" }}>Legendary</p>
              <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0 }}>
                {catalog.stats.legendaryEarned}/{catalog.stats.legendaryTotal}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Tiers */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <TierSection
          title="Common Cards"
          cards={catalog.grouped.common}
          earnedCount={catalog.stats.commonEarned}
          totalCount={catalog.stats.commonTotal}
          onSelectCard={setSelectedCard}
        />

        <TierSection
          title="Rare Cards"
          cards={catalog.grouped.rare}
          earnedCount={catalog.stats.rareEarned}
          totalCount={catalog.stats.rareTotal}
          onSelectCard={setSelectedCard}
        />

        {catalog.grouped.legendary.length > 0 && (
          <TierSection
            title="Legendary Cards"
            cards={catalog.grouped.legendary}
            earnedCount={catalog.stats.legendaryEarned}
            totalCount={catalog.stats.legendaryTotal}
            onSelectCard={setSelectedCard}
          />
        )}

        {catalog.grouped.legendary.length === 0 && (
          <Card style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <CardContent style={{ padding: 24, textAlign: "center" }}>
              <Crown size={32} style={{ color: C.gold, marginBottom: 12 }} />
              <h3 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: "0 0 8px 0" }}>
                Legendary Cards
              </h3>
              <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>
                Coming soon. Stay tuned for legendary achievements.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCard && (
        <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
