"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Quote, Loader2 } from 'lucide-react';
import { TextSelection } from '@/hooks/use-text-selection';

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

interface AnnotationComposerProps {
  isOpen: boolean;
  onClose: () => void;
  selection: TextSelection;
  postId: string;
  onAnnotationCreated: (annotation: AnnotationData) => void;
}

export interface AnnotationData {
  id: string;
  postId: string;
  author: { id: string; name: string | null; avatarUrl: string | null };
  selectedText: string;
  textHash: string;
  startOffset: number | null;
  endOffset: number | null;
  contextBefore: string | null;
  contextAfter: string | null;
  isResolved: boolean;
  commentCount: number;
  responsePostCount: number;
  isOwnAnnotation: boolean;
  createdAt: string;
}

export function AnnotationComposer({
  isOpen,
  onClose,
  selection,
  postId,
  onAnnotationCreated,
}: AnnotationComposerProps) {
  const [stance, setStance] = useState<'agree' | 'disagree' | 'complicated'>('complicated');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!body.trim()) {
      setError('Please add a comment');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const annotationRes = await fetch(`/api/posts/${postId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedText: selection.text,
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
          contextBefore: selection.contextBefore,
          contextAfter: selection.contextAfter,
        }),
      });

      if (!annotationRes.ok) {
        const data = await annotationRes.json();
        throw new Error(data.message || 'Failed to create annotation');
      }

      const { annotation } = await annotationRes.json();

      const commentRes = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stance,
          body: body.trim(),
          annotationId: annotation.id,
        }),
      });

      if (!commentRes.ok) {
        const data = await commentRes.json();
        throw new Error(data.message || 'Failed to create comment');
      }

      onAnnotationCreated({
        ...annotation,
        commentCount: 1,
      });

      setBody('');
      setStance('complicated');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const truncatedText = selection.text.length > 150
    ? selection.text.slice(0, 150) + '...'
    : selection.text;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          padding: 16,
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 480,
            maxHeight: '90vh',
            overflow: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ color: C.text, fontSize: 18, fontWeight: 600, margin: 0 }}>
              Add Annotation
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
              <p style={{ color: C.textSoft, fontSize: 14, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                "{truncatedText}"
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: C.textSoft, fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>
              Your stance on this passage
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {STANCES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStance(s.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: stance === s.value ? `${s.color}20` : C.bg,
                    border: `1px solid ${stance === s.value ? s.color : C.border}`,
                    borderRadius: 8,
                    color: stance === s.value ? s.color : C.textSoft,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: C.textSoft, fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>
              Your comment
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's your thought on this passage?"
              maxLength={1000}
              style={{
                width: '100%',
                minHeight: 100,
                padding: 12,
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.text,
                fontSize: 14,
                lineHeight: 1.6,
                resize: 'vertical',
                outline: 'none',
              }}
            />
            <div style={{ textAlign: 'right', color: C.muted, fontSize: 12, marginTop: 4 }}>
              {body.length}/1000
            </div>
          </div>

          {error && (
            <div
              style={{
                background: `${C.rose}15`,
                border: `1px solid ${C.rose}30`,
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                color: C.rose,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.textSoft,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !body.trim()}
              style={{
                padding: '10px 20px',
                background: C.accent,
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: isSubmitting || !body.trim() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !body.trim() ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Add Annotation
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
