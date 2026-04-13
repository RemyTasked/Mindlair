"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, PenLine } from 'lucide-react';
import { TextSelection } from '@/hooks/use-text-selection';

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  textSoft: "#c4bfb4",
  accent: "#d4915a",
};

interface AnnotationToolbarProps {
  selection: TextSelection | null;
  onAnnotate: () => void;
  onWriteResponse: () => void;
  containerRef: React.RefObject<HTMLElement | null>;
}

export function AnnotationToolbar({
  selection,
  onAnnotate,
  onWriteResponse,
  containerRef,
}: AnnotationToolbarProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selection?.rect || !containerRef.current) {
      setPosition(null);
      return;
    }

    const toolbarWidth = 200;
    const toolbarHeight = 48;

    let left = selection.rect.left + (selection.rect.width / 2) - (toolbarWidth / 2);
    let top = selection.rect.top - toolbarHeight - 12;

    // Ensure toolbar stays within viewport
    left = Math.max(12, Math.min(left, window.innerWidth - toolbarWidth - 12));

    // If toolbar would be above viewport (or overlap mobile browser UI), show below selection
    if (top < 60) {
      top = selection.rect.bottom + 12;
    }

    // On very small screens, center horizontally
    if (window.innerWidth < 400) {
      left = (window.innerWidth - toolbarWidth) / 2;
    }

    setPosition({ top, left });
  }, [selection, containerRef]);

  if (!selection || !position) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 1000,
          display: 'flex',
          gap: 4,
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAnnotate();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAnnotate();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 14px',
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            color: C.text,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s',
            minHeight: 44,
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Add a comment on this selection"
        >
          <MessageSquarePlus size={18} style={{ color: C.accent }} />
          Annotate
        </button>

        <div style={{ width: 1, background: C.border, margin: '6px 0' }} />

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onWriteResponse();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onWriteResponse();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 14px',
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            color: C.text,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s',
            minHeight: 44,
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Write a full post responding to this passage"
        >
          <PenLine size={18} style={{ color: C.textSoft }} />
          Respond
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
