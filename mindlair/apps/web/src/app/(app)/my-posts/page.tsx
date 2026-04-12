"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Edit3,
  Trash2,
  Send,
  Loader2,
  AlertTriangle,
  Calendar,
  MessageSquare,
  Eye,
  Lightbulb,
  MoreHorizontal,
  X,
} from "lucide-react";

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
};

type TabType = "draft" | "published";

interface Post {
  id: string;
  headlineClaim: string;
  authorStance: string;
  status: string;
  publishedAt: string | null;
  topicTags: string[];
  thumbnailUrl: string | null;
  reactionCount: number;
  createdAt: string;
  updatedAt: string;
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

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  isLoading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 400,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: C.text, fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}
          >
            <X size={20} style={{ color: C.muted }} />
          </button>
        </div>
        <p style={{ color: C.textSoft, fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>{message}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "10px 20px",
              color: C.textSoft,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              background: C.rose,
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function PostCard({
  post,
  onEdit,
  onDelete,
  onPublish,
}: {
  post: Post;
  onEdit: () => void;
  onDelete: () => void;
  onPublish?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const StanceIcon = stanceIcons[post.authorStance as keyof typeof stanceIcons] || MessageSquare;
  const stanceColor = stanceColors[post.authorStance as keyof typeof stanceColors] || C.muted;
  const isDraft = post.status === "draft";

  const dateStr = isDraft
    ? `Last edited ${new Date(post.updatedAt).toLocaleDateString()}`
    : `Published ${new Date(post.publishedAt || post.createdAt).toLocaleDateString()}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", gap: 12 }}>
        {post.thumbnailUrl && (
          <div
            style={{
              width: 80,
              height: 60,
              borderRadius: 8,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src={post.thumbnailUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 500,
                background: isDraft ? `${C.accent}20` : `${C.green}20`,
                color: isDraft ? C.accent : C.green,
              }}
            >
              {isDraft ? "Draft" : "Published"}
            </span>
            <StanceIcon size={14} style={{ color: stanceColor }} />
          </div>
          
          {isDraft ? (
            <h3
              style={{
                color: C.text,
                fontSize: 16,
                fontWeight: 500,
                margin: 0,
                marginBottom: 6,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {post.headlineClaim}
            </h3>
          ) : (
            <Link
              href={`/post/${post.id}`}
              style={{
                color: C.text,
                fontSize: 16,
                fontWeight: 500,
                margin: 0,
                marginBottom: 6,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                textDecoration: "none",
              }}
            >
              {post.headlineClaim}
            </Link>
          )}
          
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: C.muted, fontSize: 13 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={12} />
              {dateStr}
            </span>
            {!isDraft && post.reactionCount > 0 && (
              <span>{post.reactionCount} reaction{post.reactionCount !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MoreHorizontal size={18} style={{ color: C.muted }} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 4,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 4,
                  minWidth: 140,
                  zIndex: 10,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                }}
              >
                {isDraft && (
                  <>
                    <button
                      onClick={() => { setShowMenu(false); onEdit(); }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        background: "transparent",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        color: C.textSoft,
                        fontSize: 14,
                        textAlign: "left",
                      }}
                    >
                      <Edit3 size={16} />
                      Edit
                    </button>
                    {onPublish && (
                      <button
                        onClick={() => { setShowMenu(false); onPublish(); }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          background: "transparent",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          color: C.green,
                          fontSize: 14,
                          textAlign: "left",
                        }}
                      >
                        <Send size={16} />
                        Publish
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => { setShowMenu(false); onDelete(); }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    color: C.rose,
                    fontSize: 14,
                    textAlign: "left",
                  }}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function MyPostsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("draft");
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [publishTarget, setPublishTarget] = useState<Post | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts?status=${activeTab}`);
      if (!response.ok) throw new Error("Failed to load posts");
      const data = await response.json();
      setPosts(data.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/posts/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete post");
      
      setPosts(posts.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePublish = async () => {
    if (!publishTarget) return;
    setIsPublishing(true);

    try {
      const response = await fetch(`/api/posts/${publishTarget.id}/publish`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to publish post");
      }
      
      fetchPosts();
      setPublishTarget(null);
    } catch (err) {
      console.error("Publish error:", err);
      alert(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "0 0 100px 0" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: C.text, fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
            My Posts
          </h1>
          <p style={{ color: C.textSoft, fontSize: 15 }}>
            Manage your drafts and published posts
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            background: C.surface,
            borderRadius: 12,
            marginBottom: 24,
          }}
        >
          {(["draft", "published"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "12px 16px",
                background: activeTab === tab ? C.bg : "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                color: activeTab === tab ? C.text : C.muted,
                fontSize: 14,
                fontWeight: 500,
                transition: "all 0.2s",
              }}
            >
              {tab === "draft" ? "Drafts" : "Published"}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <Loader2 size={32} className="animate-spin" style={{ color: C.accent, margin: "0 auto" }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <AlertTriangle size={32} style={{ color: C.rose, margin: "0 auto 16px" }} />
            <p style={{ color: C.textSoft }}>{error}</p>
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <FileText size={48} style={{ color: C.muted, margin: "0 auto 16px" }} />
            <p style={{ color: C.textSoft, marginBottom: 16 }}>
              {activeTab === "draft" ? "No drafts yet" : "No published posts yet"}
            </p>
            <Link
              href="/publish"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                background: C.accent,
                color: "#fff",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Create your first post
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onEdit={() => router.push(`/publish?edit=${post.id}`)}
                onDelete={() => setDeleteTarget(post)}
                onPublish={post.status === "draft" ? () => setPublishTarget(post) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmModal
            isOpen={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="Delete Post"
            message={`Are you sure you want to delete "${deleteTarget.headlineClaim}"? This action cannot be undone.`}
            confirmLabel="Delete"
            isLoading={isDeleting}
          />
        )}
      </AnimatePresence>

      {/* Publish Confirmation Modal */}
      <AnimatePresence>
        {publishTarget && (
          <ConfirmModal
            isOpen={!!publishTarget}
            onClose={() => setPublishTarget(null)}
            onConfirm={handlePublish}
            title="Publish Post"
            message={`Are you sure you want to publish "${publishTarget.headlineClaim}"? Once published, it will be visible to everyone.`}
            confirmLabel="Publish"
            isLoading={isPublishing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
