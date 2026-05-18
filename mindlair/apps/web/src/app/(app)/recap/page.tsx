"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  TrendingUp,
  MessageSquare,
  Users,
  BookOpen,
  Flame,
  Trophy,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Star,
  Sparkles,
} from "lucide-react";

const C = {
  bg: "#0a0a0a",
  surface: "#141414",
  surfaceHover: "#1a1a1a",
  border: "#262626",
  text: "#f5f5f5",
  textSoft: "#a3a3a3",
  textMuted: "#737373",
  accent: "#d4915a",
  accentSoft: "rgba(212, 145, 90, 0.15)",
  green: "#22c55e",
  greenSoft: "rgba(34, 197, 94, 0.15)",
  purple: "#a855f7",
  purpleSoft: "rgba(168, 85, 247, 0.15)",
};

interface WeeklyStats {
  positionsTaken: number;
  claimsEngaged: number;
  postsPublished: number;
  subscriptionsGained: number;
  subscriptionsMade: number;
  conceptsExplored: number;
  streakDays: number;
}

interface CardAward {
  id: string;
  card: {
    id: string;
    slug: string;
    name: string;
    description: string;
    tier: string;
    category: string | null;
  };
  awardedAt: string;
}

interface RecapData {
  recap: {
    id: string;
    weekStart: string;
    stats: WeeklyStats;
    deliveredAt: string | null;
    viewedAt: string | null;
  } | null;
  awards: CardAward[];
}

interface HistoryItem {
  id: string;
  weekStart: string;
  stats: WeeklyStats;
  cardCount: number;
  viewedAt: string | null;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  color = C.textSoft,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
        textAlign: "center",
      }}
    >
      <Icon size={24} style={{ color, marginBottom: 8 }} />
      <p
        style={{
          color: C.text,
          fontSize: 24,
          fontWeight: 700,
          margin: "0 0 4px 0",
        }}
      >
        {value}
      </p>
      <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>{label}</p>
    </div>
  );
}

function AwardCard({ award }: { award: CardAward }) {
  const isRare = award.card.tier === "rare";
  const color = isRare ? C.purple : C.textSoft;
  const bg = isRare ? C.purpleSoft : C.surface;

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${color}`,
        borderRadius: 12,
        padding: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isRare ? (
          <Sparkles size={24} style={{ color }} />
        ) : (
          <Star size={24} style={{ color }} />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ color: C.text, fontWeight: 600, margin: "0 0 4px 0", fontSize: 14 }}>
          {award.card.name}
        </p>
        <p style={{ color: C.textSoft, fontSize: 12, margin: 0 }}>
          {award.card.description}
        </p>
      </div>
      <Badge
        style={{
          background: bg,
          color,
          border: `1px solid ${color}`,
          fontSize: 10,
        }}
      >
        {isRare ? "Rare" : "Common"}
      </Badge>
    </div>
  );
}

function EmptyRecap() {
  return (
    <Card style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <CardContent style={{ padding: 32, textAlign: "center" }}>
        <Calendar size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
        <h3 style={{ color: C.text, fontSize: 18, fontWeight: 600, margin: "0 0 8px 0" }}>
          No Recap Yet
        </h3>
        <p style={{ color: C.textMuted, fontSize: 14, margin: 0 }}>
          Engage with content throughout the week to generate your first recap.
        </p>
      </CardContent>
    </Card>
  );
}

export default function RecapPage() {
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const fetchRecap = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/recap");
      if (!res.ok) throw new Error("Failed to fetch recap");
      const data = await res.json();
      setRecap(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/recap?history=true");
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistory(data.recaps || []);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchRecap();
    fetchHistory();
  }, [fetchRecap, fetchHistory]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RefreshCw size={24} style={{ color: C.textSoft, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const stats = recap?.recap?.stats;
  const awards = recap?.awards || [];

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Calendar size={28} style={{ color: C.accent }} />
            <h1 style={{ color: C.text, fontSize: 24, fontWeight: 600, margin: 0 }}>
              Weekly Recap
            </h1>
          </div>
          {recap?.recap && (
            <p style={{ color: C.textSoft, fontSize: 14, margin: 0 }}>
              {formatWeekRange(recap.recap.weekStart)}
            </p>
          )}
        </div>

        {!recap?.recap ? (
          <EmptyRecap />
        ) : (
          <>
            {/* Stats Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <StatCard
                icon={MessageSquare}
                label="Positions"
                value={stats?.positionsTaken || 0}
              />
              <StatCard
                icon={BookOpen}
                label="Claims"
                value={stats?.claimsEngaged || 0}
              />
              <StatCard
                icon={TrendingUp}
                label="Posts"
                value={stats?.postsPublished || 0}
              />
              <StatCard
                icon={Users}
                label="New Followers"
                value={stats?.subscriptionsGained || 0}
                color={C.green}
              />
              <StatCard
                icon={BookOpen}
                label="Concepts"
                value={stats?.conceptsExplored || 0}
              />
              <StatCard
                icon={Flame}
                label="Streak"
                value={stats?.streakDays || 0}
                color={stats?.streakDays && stats.streakDays >= 7 ? C.accent : C.textSoft}
              />
            </div>

            {/* Cards Earned */}
            {awards.length > 0 && (
              <Card style={{ background: C.surface, border: `1px solid ${C.border}`, marginBottom: 24 }}>
                <CardHeader>
                  <CardTitle style={{ color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
                    <Trophy size={20} style={{ color: C.accent }} />
                    Cards Earned This Week
                  </CardTitle>
                  <CardDescription style={{ color: C.textSoft }}>
                    {awards.length} new card{awards.length !== 1 ? "s" : ""} added to your collection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {awards.map((award) => (
                      <AwardCard key={award.id} award={award} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* View Collection Button */}
            <Button
              onClick={() => window.location.href = "/cards"}
              style={{
                width: "100%",
                background: C.accent,
                color: "#000",
                marginBottom: 24,
              }}
            >
              <Trophy size={16} />
              View Full Collection
            </Button>
          </>
        )}

        {/* History Section */}
        {history.length > 1 && (
          <Card style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <CardHeader>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <CardTitle style={{ color: C.text }}>Past Recaps</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                  style={{ color: C.textSoft }}
                >
                  {showHistory ? "Hide" : "Show"}
                  {showHistory ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </Button>
              </div>
            </CardHeader>
            {showHistory && (
              <CardContent>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {history.slice(1).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => window.location.href = `/recap/${item.id}`}
                      style={{
                        background: C.bg,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        padding: 12,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p style={{ color: C.text, fontWeight: 500, margin: 0, fontSize: 14 }}>
                          {formatWeekRange(item.weekStart)}
                        </p>
                        <p style={{ color: C.textMuted, fontSize: 12, margin: "4px 0 0 0" }}>
                          {item.stats.positionsTaken} positions • {item.cardCount} cards
                        </p>
                      </div>
                      <ChevronRight size={16} style={{ color: C.textMuted }} />
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>

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
