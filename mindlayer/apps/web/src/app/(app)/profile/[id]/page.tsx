"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  User,
  UserPlus,
  UserMinus,
  Ban,
  Calendar,
  PenSquare,
  MessageSquare,
  Eye,
  Lightbulb,
  Loader2,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  muted: "#7a7469",
  accent: "#d4915a",
  green: "#a3c47a",
  rose: "#e57373",
  blue: "#4a9eff",
  purple: "#b399ff",
};

interface BeliefNode {
  conceptId: string;
  label: string;
  direction: string;
  strength: number;
  stability: number;
  positionCount: number;
}

interface Post {
  id: string;
  headlineClaim: string;
  authorStance: string;
  publishedAt: string;
  topicTags: string[];
  reactionCount: number;
}

interface ProfileData {
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    memberSince: string;
    postCount: number;
    followerCount: number;
    followingCount: number;
  };
  relationship: {
    following: boolean;
    followedBy: boolean;
    blocking: boolean;
    blockedBy: boolean;
  } | null;
  beliefMap: BeliefNode[];
  recentPosts: Post[];
}

const stanceIcons = {
  arguing: MessageSquare,
  exploring: Eye,
  steelmanning: Lightbulb,
};

const stanceColors = {
  arguing: C.green,
  exploring: C.accent,
  steelmanning: C.blue,
};

const directionColors = {
  positive: C.green,
  negative: C.rose,
  mixed: C.purple,
};

export default function ProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActioning, setIsActioning] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("User not found");
          return;
        }
        if (response.status === 403) {
          setError("You cannot view this profile");
          return;
        }
        throw new Error("Failed to load profile");
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFollow = async () => {
    if (!profile) return;
    setIsActioning(true);

    try {
      const isFollowing = profile.relationship?.following;
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });

      if (response.ok) {
        setProfile({
          ...profile,
          relationship: {
            ...profile.relationship!,
            following: !isFollowing,
          },
          user: {
            ...profile.user,
            followerCount: profile.user.followerCount + (isFollowing ? -1 : 1),
          },
        });
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setIsActioning(false);
    }
  };

  const handleBlock = async () => {
    if (!profile) return;
    setIsActioning(true);
    setShowMoreMenu(false);

    try {
      const isBlocking = profile.relationship?.blocking;
      const response = await fetch(`/api/users/${userId}/block`, {
        method: isBlocking ? "DELETE" : "POST",
      });

      if (response.ok) {
        setProfile({
          ...profile,
          relationship: {
            ...profile.relationship!,
            blocking: !isBlocking,
            following: false,
          },
        });
      }
    } catch (err) {
      console.error("Block error:", err);
    } finally {
      setIsActioning(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: C.bg, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <Loader2 size={32} className="animate-spin" style={{ color: C.accent }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        background: C.bg, 
        padding: "48px 16px",
        textAlign: "center",
      }}>
        <AlertTriangle size={48} style={{ color: C.rose, margin: "0 auto 16px" }} />
        <h2 style={{ color: C.text, fontSize: 20, marginBottom: 8 }}>{error}</h2>
        <Link href="/feed">
          <Button style={{ background: C.accent, color: "#fff", border: "none", marginTop: 16 }}>
            Back to Feed
          </Button>
        </Link>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 16px 100px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", gap: 16 }}>
            {/* Avatar */}
            <div style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              background: C.border,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}>
              {profile.user.avatarUrl ? (
                <img 
                  src={profile.user.avatarUrl} 
                  alt="" 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <User size={32} style={{ color: C.muted }} />
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <h1 style={{ 
                color: C.text, 
                fontSize: 24, 
                fontWeight: 600,
                marginBottom: 4,
              }}>
                {profile.user.name || "Anonymous"}
              </h1>
              
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 6, 
                color: C.muted,
                fontSize: 14,
                marginBottom: 12,
              }}>
                <Calendar size={14} />
                Member since {new Date(profile.user.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>

              <div style={{ display: "flex", gap: 16, fontSize: 14 }}>
                <span>
                  <strong style={{ color: C.text }}>{profile.user.postCount}</strong>{" "}
                  <span style={{ color: C.muted }}>posts</span>
                </span>
                <span>
                  <strong style={{ color: C.text }}>{profile.user.followerCount}</strong>{" "}
                  <span style={{ color: C.muted }}>followers</span>
                </span>
                <span>
                  <strong style={{ color: C.text }}>{profile.user.followingCount}</strong>{" "}
                  <span style={{ color: C.muted }}>following</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {profile.relationship && (
            <div style={{ 
              display: "flex", 
              gap: 8, 
              marginTop: 20,
              justifyContent: "flex-end",
              position: "relative",
            }}>
              {!profile.relationship.blocking && (
                <Button
                  onClick={handleFollow}
                  disabled={isActioning}
                  style={{
                    background: profile.relationship.following ? "transparent" : C.accent,
                    border: `1px solid ${profile.relationship.following ? C.border : C.accent}`,
                    color: profile.relationship.following ? C.textSoft : "#fff",
                  }}
                >
                  {isActioning ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : profile.relationship.following ? (
                    <>
                      <UserMinus size={16} />
                      <span style={{ marginLeft: 8 }}>Unfollow</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span style={{ marginLeft: 8 }}>Follow</span>
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                style={{
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  color: C.textSoft,
                  padding: "8px 12px",
                }}
              >
                <MoreHorizontal size={16} />
              </Button>

              <AnimatePresence>
                {showMoreMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: 8,
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: 4,
                      zIndex: 10,
                      minWidth: 150,
                    }}
                  >
                    <button
                      onClick={handleBlock}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "10px 12px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: profile.relationship.blocking ? C.textSoft : C.rose,
                        fontSize: 14,
                        textAlign: "left",
                        borderRadius: 4,
                      }}
                    >
                      <Ban size={16} />
                      {profile.relationship.blocking ? "Unblock" : "Block"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Belief Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2 style={{ 
            color: C.text, 
            fontSize: 18, 
            fontWeight: 600,
            marginBottom: 16,
          }}>
            Belief Landscape
          </h2>

          {profile.beliefMap.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 14, textAlign: "center", padding: 24 }}>
              No belief data yet
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.beliefMap.map((belief) => {
                const color = directionColors[belief.direction as keyof typeof directionColors] || C.muted;
                const size = Math.max(40, Math.min(100, belief.positionCount * 10 + 40));
                
                return (
                  <motion.div
                    key={belief.conceptId}
                    whileHover={{ scale: 1.05 }}
                    style={{
                      padding: "10px 16px",
                      background: `${color}15`,
                      border: `1px solid ${color}40`,
                      borderRadius: 20,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                    title={`${belief.label}: ${belief.direction} (${Math.round(belief.strength * 100)}% strength)`}
                  >
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: color,
                      opacity: belief.strength,
                    }} />
                    <span style={{ color: C.text, fontSize: 13 }}>
                      {belief.label}
                    </span>
                    <span style={{ color: C.muted, fontSize: 11 }}>
                      {belief.positionCount}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}

          <p style={{ 
            color: C.muted, 
            fontSize: 12, 
            marginTop: 16,
            textAlign: "center",
          }}>
            The map is the profile — no follower counts, just how they think.
          </p>
        </motion.div>

        {/* Recent Posts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 style={{ 
            color: C.text, 
            fontSize: 18, 
            fontWeight: 600,
            marginBottom: 16,
          }}>
            Recent Posts
          </h2>

          {profile.recentPosts.length === 0 ? (
            <div style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
            }}>
              <PenSquare size={32} style={{ color: C.muted, margin: "0 auto 12px" }} />
              <p style={{ color: C.muted, fontSize: 14 }}>No posts yet</p>
            </div>
          ) : (
            profile.recentPosts.map((post) => {
              const StanceIcon = stanceIcons[post.authorStance as keyof typeof stanceIcons] || MessageSquare;
              const stanceColor = stanceColors[post.authorStance as keyof typeof stanceColors] || C.muted;

              return (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  style={{ textDecoration: "none", display: "block", marginBottom: 12 }}
                >
                  <motion.article
                    whileHover={{ scale: 1.01 }}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}>
                      <h3 style={{ 
                        color: C.text, 
                        fontSize: 15, 
                        fontWeight: 500,
                        lineHeight: 1.4,
                        flex: 1,
                      }}>
                        {post.headlineClaim}
                      </h3>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 8px",
                        background: `${stanceColor}15`,
                        borderRadius: 4,
                        marginLeft: 12,
                        flexShrink: 0,
                      }}>
                        <StanceIcon size={12} style={{ color: stanceColor }} />
                        <span style={{ color: stanceColor, fontSize: 11 }}>
                          {post.authorStance}
                        </span>
                      </div>
                    </div>

                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "center",
                      color: C.muted,
                      fontSize: 12,
                    }}>
                      <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                      <span>{post.reactionCount} reactions</span>
                    </div>
                  </motion.article>
                </Link>
              );
            })
          )}
        </motion.div>
      </div>
    </div>
  );
}
