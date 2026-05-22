"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { SubscriptionsList } from "@/components/subscriptions-list";
import { formatPublicName } from "@/lib/display-name-policy";

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#d4915a",
};

export default function ProfileSubscriptionsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.id as string;
  const initialType =
    searchParams.get("type") === "subscribers" ? "subscribers" : "subscriptions";

  const [name, setName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/users/${userId}`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setName(data.user?.name ?? null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px",
          color: C.muted,
        }}
      >
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link
          href={`/profile/${userId}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: C.muted,
            fontSize: 13,
            textDecoration: "none",
            marginBottom: 12,
          }}
        >
          <ArrowLeft size={14} />
          Back to profile
        </Link>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: C.text,
            letterSpacing: "-0.02em",
          }}
        >
          {formatPublicName(name)}&apos;s network
        </h1>
      </div>

      <SubscriptionsList userId={userId} initialType={initialType} />
    </div>
  );
}
