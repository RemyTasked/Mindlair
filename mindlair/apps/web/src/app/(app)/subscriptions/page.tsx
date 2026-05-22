"use client";

import { useSession } from "@/hooks/use-session";
import { Loader2, Users } from "lucide-react";
import { SubscriptionsList } from "@/components/subscriptions-list";

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#d4915a",
};

export default function SubscriptionsPage() {
  const { user, isLoading } = useSession();

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

  if (!user) {
    return null;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${C.accent}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Users size={18} style={{ color: C.accent }} />
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: C.text,
              letterSpacing: "-0.02em",
            }}
          >
            Your network
          </h1>
        </div>
        <p style={{ color: C.muted, fontSize: 14, marginLeft: 46 }}>
          People you subscribe to and people who subscribe to you.
        </p>
      </div>

      <SubscriptionsList userId={user.id} initialType="subscriptions" />
    </div>
  );
}
