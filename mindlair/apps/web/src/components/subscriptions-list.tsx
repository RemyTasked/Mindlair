"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2, UserPlus, UserMinus, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface ListedUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  memberSince: string;
  postCount: number;
  subscriberCount: number;
  subscribedSince: string;
  isSubscribedByViewer: boolean;
  isSelf: boolean;
}

type ListType = "subscriptions" | "subscribers";

interface SubscriptionsListProps {
  userId: string;
  initialType?: ListType;
  showTabs?: boolean;
}

export function SubscriptionsList({
  userId,
  initialType = "subscriptions",
  showTabs = true,
}: SubscriptionsListProps) {
  const [type, setType] = useState<ListType>(initialType);
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/subscriptions?type=${type}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load list");
      }
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [userId, type]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const toggleSubscription = async (target: ListedUser) => {
    setPendingId(target.id);
    try {
      const method = target.isSubscribedByViewer ? "DELETE" : "POST";
      const res = await fetch(`/api/users/${target.id}/subscribe`, {
        method,
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to update subscription");
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id
            ? { ...u, isSubscribedByViewer: !u.isSubscribedByViewer }
            : u
        )
      );
    } catch (err) {
      console.error("Toggle subscription error:", err);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div>
      {showTabs && (
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 24,
            borderBottom: `1px solid ${C.border}`,
            paddingBottom: 12,
          }}
        >
          {(
            [
              { id: "subscriptions" as ListType, label: "Subscriptions" },
              { id: "subscribers" as ListType, label: "Subscribers" },
            ]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setType(tab.id)}
              style={{
                padding: "8px 14px",
                background: type === tab.id ? `${C.accent}20` : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                color: type === tab.id ? C.accent : C.textSoft,
                fontSize: 14,
                fontWeight: type === tab.id ? 600 : 400,
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
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
      ) : error ? (
        <div
          style={{
            padding: "20px",
            background: `${C.surface}`,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            color: C.muted,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      ) : users.length === 0 ? (
        <div
          style={{
            padding: "60px 20px",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <Users size={32} style={{ color: C.muted, margin: "0 auto 12px" }} />
          <p style={{ color: C.textSoft, fontSize: 15, marginBottom: 6 }}>
            {type === "subscriptions"
              ? "Not subscribed to anyone yet"
              : "No subscribers yet"}
          </p>
          <p style={{ color: C.muted, fontSize: 13 }}>
            {type === "subscriptions"
              ? "Find people to subscribe to from the Feed or Discover."
              : "When others subscribe, they'll show up here."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {users.map((u) => (
            <div
              key={u.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
              }}
            >
              <Link
                href={`/profile/${u.id}`}
                style={{
                  flexShrink: 0,
                  textDecoration: "none",
                }}
              >
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.avatarUrl}
                    alt={formatPublicName(u.name)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: `${C.accent}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: C.accent,
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {formatPublicName(u.name).charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>

              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  href={`/profile/${u.id}`}
                  style={{
                    color: C.text,
                    fontSize: 15,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  {formatPublicName(u.name)}
                </Link>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    color: C.muted,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  <span>
                    <strong style={{ color: C.textSoft }}>{u.postCount}</strong>{" "}
                    posts
                  </span>
                  <span>
                    <strong style={{ color: C.textSoft }}>
                      {u.subscriberCount}
                    </strong>{" "}
                    subscribers
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Calendar size={11} />
                    {new Date(u.subscribedSince).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {!u.isSelf && (
                <Button
                  onClick={() => toggleSubscription(u)}
                  disabled={pendingId === u.id}
                  style={{
                    background: u.isSubscribedByViewer ? "transparent" : C.accent,
                    border: `1px solid ${
                      u.isSubscribedByViewer ? C.border : C.accent
                    }`,
                    color: u.isSubscribedByViewer ? C.textSoft : "#fff",
                    fontSize: 13,
                    padding: "6px 12px",
                  }}
                >
                  {pendingId === u.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : u.isSubscribedByViewer ? (
                    <>
                      <UserMinus size={14} />
                      <span style={{ marginLeft: 6 }}>Unsubscribe</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span style={{ marginLeft: 6 }}>Subscribe</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
