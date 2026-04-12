"use client";

import { useState, useEffect, useCallback } from "react";
import { DigestSession } from "@/components/digest-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox, Clock, Sparkles, RefreshCw } from "lucide-react";

interface DigestClaim {
  id: string;
  text: string;
  claimType: string;
  confidenceScore: number;
  source: {
    id: string;
    url: string;
    title?: string;
    outlet?: string;
  };
  claimConcepts: Array<{
    concept: {
      id: string;
      label: string;
    };
  }>;
  positions: Array<{
    stance: string;
    createdAt: string;
  }>;
}

interface DigestData {
  digest: {
    id: string;
    window: string;
    status: string;
    generatedAt: string;
    expiresAt: string;
    claimCount?: number;
  };
  claims?: DigestClaim[];
}

type Stance = "agree" | "disagree" | "complicated" | "skip";

export default function InboxPage() {
  const [digestData, setDigestData] = useState<DigestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const fetchDigest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/digest");
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error("Failed to fetch digest");
      }
      const data = await response.json();
      setDigestData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDigest();
  }, [fetchDigest]);

  const handleStartSession = async () => {
    if (!digestData?.digest?.id) return;

    try {
      await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          digestId: digestData.digest.id,
          action: "open",
        }),
      });
      setIsSessionActive(true);
    } catch (err) {
      console.error("Failed to open digest:", err);
    }
  };

  const handleCompleteSession = async (
    reactions: Array<{ claimId: string; stance: Stance }>,
    durationMs: number
  ) => {
    if (!digestData?.digest?.id) return;

    try {
      for (const reaction of reactions) {
        await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            claimId: reaction.claimId,
            stance: reaction.stance,
            context: "digest",
          }),
        });
      }

      await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          digestId: digestData.digest.id,
          action: "complete",
        }),
      });

      setIsSessionActive(false);
      fetchDigest();
    } catch (err) {
      console.error("Failed to complete digest:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchDigest}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  const claims = digestData?.claims || [];
  const unreactedClaims = claims.filter(c => c.positions.length === 0);
  const digestItems = unreactedClaims.map(claim => ({
    claimId: claim.id,
    claimText: claim.text,
    claimType: claim.claimType as "factual" | "opinion" | "prediction" | "policy",
    sourceUrl: claim.source.url,
    sourceTitle: claim.source.title || claim.source.url,
    sourceOutlet: claim.source.outlet,
    concepts: claim.claimConcepts.map(cc => cc.concept.label),
    hasCounterAngle: false,
    priority: claim.confidenceScore,
  }));

  if (isSessionActive && digestItems.length > 0) {
    return (
      <DigestSession
        digestId={digestData?.digest?.id || ""}
        items={digestItems}
        onComplete={handleCompleteSession}
      />
    );
  }

  const hasItems = digestItems.length > 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Inbox
        </h1>
        <p className="text-zinc-500">
          React to content you&apos;ve consumed to build your belief map.
        </p>
      </div>

      {hasItems ? (
        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
              <Inbox className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-2xl">
              {digestItems.length} claims to react to
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                ~{Math.ceil(digestItems.length * 0.4)} min
              </Badge>
              <Badge variant="secondary">
                <Sparkles className="w-3 h-3 mr-1" />
                From {claims.length} sources
              </Badge>
            </div>
            
            <p className="text-sm text-zinc-500 text-center">
              Swipe or tap to react. Your map updates in real time.
            </p>
            
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
              onClick={handleStartSession}
            >
              Start session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Inbox className="w-8 h-8 text-zinc-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              All caught up
            </h2>
            <p className="text-zinc-500 mb-4">
              No new claims to react to. Keep reading and your next digest will be
              ready soon.
            </p>
            <Button variant="outline" onClick={fetchDigest}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Check again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
