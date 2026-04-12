"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Quote,
  Loader2,
  CheckCircle2,
  Trash2,
  PenLine,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { AnnotationData } from './annotation-composer';

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

const STANCES = [
  { value: 'agree', label: 'Agree', color: C.green },
  { value: 'disagree', label: 'Disagree', color: C.rose },
  { value: 'complicated', label: 'Complicated', color: C.blue },
] as const;

interface CommentData {
  id: string;
  author: { id: string; name: string | null; avatarUrl: string | null };
  stance: string;
  body: string;
  isHiddenByAuthor: boolean;
  isOwnComment: boolean;
  canHide: boolean;
  reactionCounts: { agree: number; disagree: number; complicated: number };
  userReaction: string | null;
  createdAt: string;
}

interface AnnotationSidebarProps {
  annotation: AnnotationData;
  postId: string;
  onClose: () => void;
  onAnnotationUpdated: (annotation: AnnotationData) => void;
  onAnnotationDeleted: (id: string) => void;
}

export function AnnotationSidebar({
  annotation,
  postId,
  onClose,
  onAnnotationUpdated,
  onAnnotationDeleted,
}: AnnotationSidebarProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPostAuthor, setIsPostAuthor] = useState(false);

  const [newStance, setNewStance] = useState<'agree' | 'disagree' | 'complicated'>('complicated');
  const [newBody, setNewBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAnnotationDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/annotations/${annotation.id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch annotation');
      }

      const data = await res.json();
      setComments(data.annotation.comments || []);
      setIsPostAuthor(data.annotation.isPostAuthor || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [annotation.id]);

  useEffect(() => {
    fetchAnnotationDetails();
  }, [fetchAnnotationDetails]);

  const handleAddComment = async () => {
    if (!newBody.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stance: newStance,
          body: newBody.trim(),
          annotationId: annotation.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to add comment');
      }

      const { comment } = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewBody('');

      onAnnotationUpdated({
        ...annotation,
        commentCount: annotation.commentCount + 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    try {
      const res = await fetch(`/api/annotations/${annotation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved: !annotation.isResolved }),
      });

      if (!res.ok) {
        throw new Error('Failed to update annotation');
      }

      onAnnotationUpdated({
        ...annotation,
        isResolved: !annotation.isResolved,
      });
    } catch (err) {
      console.error('Failed to resolve annotation:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this annotation? This will also remove all comments on it.')) {
      return;
    }

    try {
      const res = await fetch(`/api/annotations/${annotation.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete annotation');
      }

      onAnnotationDeleted(annotation.id);
    } catch (err) {
      console.error('Failed to delete annotation:', err);
    }
  };

  const truncatedText = annotation.selectedText.length > 200
    ? annotation.selectedText.slice(0, 200) + '...'
    : annotation.selectedText;

  const getStanceColor = (stance: string) => {
    const found = STANCES.find((s) => s.value === stance);
    return found?.color || C.muted;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 1001,
        }}
        onClick={onClose}
      />

      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 420,
          background: C.surface,
          borderLeft: `1px solid ${C.border}`,
          zIndex: 1002,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: 20,
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: 0 }}>
            Annotation
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} style={{ color: C.muted }} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <div
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${C.accent}`,
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Quote size={16} style={{ color: C.accent, flexShrink: 0, marginTop: 2 }} />
              <p
                style={{
                  color: C.textSoft,
                  fontSize: 14,
                  lineHeight: 1.6,
                  margin: 0,
                  fontStyle: 'italic',
                }}
              >
                "{truncatedText}"
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 20,
              flexWrap: 'wrap',
            }}
          >
            {(annotation.isOwnAnnotation || isPostAuthor) && (
              <button
                onClick={handleResolve}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  background: annotation.isResolved ? `${C.green}20` : C.bg,
                  border: `1px solid ${annotation.isResolved ? C.green : C.border}`,
                  borderRadius: 6,
                  color: annotation.isResolved ? C.green : C.textSoft,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <CheckCircle2 size={14} />
                {annotation.isResolved ? 'Resolved' : 'Mark Resolved'}
              </button>
            )}

            <Link
              href={`/publish?referencedPostId=${postId}&referencedAnnotationId=${annotation.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.textSoft,
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              <PenLine size={14} />
              Write Response
            </Link>

            {annotation.isOwnAnnotation && (
              <button
                onClick={handleDelete}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  color: C.rose,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4
              style={{
                color: C.text,
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <MessageSquare size={16} />
              Comments ({comments.length})
            </h4>

            {isLoading ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: 24,
                }}
              >
                <Loader2 size={24} className="animate-spin" style={{ color: C.muted }} />
              </div>
            ) : error ? (
              <div
                style={{
                  padding: 16,
                  background: `${C.rose}15`,
                  borderRadius: 8,
                  color: C.rose,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            ) : comments.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  background: C.bg,
                  borderRadius: 8,
                  color: C.muted,
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                No comments yet. Be the first to share your thoughts!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: C.surface,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: C.textSoft,
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {comment.author.avatarUrl ? (
                            <img
                              src={comment.author.avatarUrl}
                              alt=""
                              style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                            />
                          ) : (
                            (comment.author.name || 'A')[0].toUpperCase()
                          )}
                        </div>
                        <span style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>
                          {comment.author.name || 'Anonymous'}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: getStanceColor(comment.stance),
                            fontWeight: 500,
                          }}
                        >
                          {comment.stance}
                        </span>
                      </div>
                      <span style={{ color: C.muted, fontSize: 11 }}>
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p
                      style={{
                        color: C.textSoft,
                        fontSize: 13,
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {comment.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderTop: `1px solid ${C.border}`,
            background: C.bg,
          }}
        >
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {STANCES.map((s) => (
              <button
                key={s.value}
                onClick={() => setNewStance(s.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: newStance === s.value ? `${s.color}20` : 'transparent',
                  border: `1px solid ${newStance === s.value ? s.color : C.border}`,
                  borderRadius: 6,
                  color: newStance === s.value ? s.color : C.textSoft,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Add your comment..."
              maxLength={1000}
              style={{
                flex: 1,
                padding: 10,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.text,
                fontSize: 13,
                resize: 'none',
                minHeight: 60,
                outline: 'none',
              }}
            />
            <button
              onClick={handleAddComment}
              disabled={isSubmitting || !newBody.trim()}
              style={{
                padding: '10px 16px',
                background: C.accent,
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: isSubmitting || !newBody.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !newBody.trim() ? 0.6 : 1,
                alignSelf: 'flex-end',
              }}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Send'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
