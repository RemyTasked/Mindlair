"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTextSelection, TextSelection } from '@/hooks/use-text-selection';
import { AnnotationToolbar } from './annotation-toolbar';
import { AnnotationComposer, AnnotationData } from './annotation-composer';
import { AnnotationSidebar } from './annotation-sidebar';

const C = {
  accent: "#d4915a",
  highlightBg: "rgba(212, 145, 90, 0.15)",
  highlightBorder: "rgba(212, 145, 90, 0.4)",
};

interface AnnotatedContentProps {
  postId: string;
  html: string;
  annotations: AnnotationData[];
  onAnnotationsChange?: (annotations: AnnotationData[]) => void;
  hasReacted: boolean;
  className?: string;
  style?: React.CSSProperties;
}

function findTextPosition(
  container: HTMLElement,
  searchText: string,
  contextBefore?: string | null,
  contextAfter?: string | null,
  startOffset?: number | null
): { startNode: Node; startOffset: number; endNode: Node; endOffset: number } | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let fullText = '';
  const nodeMap: { node: Node; start: number; end: number }[] = [];

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent || '';
    nodeMap.push({
      node,
      start: fullText.length,
      end: fullText.length + text.length,
    });
    fullText += text;
  }

  let searchStart = 0;
  if (startOffset !== null && startOffset !== undefined && startOffset >= 0) {
    const exactMatch = fullText.slice(startOffset, startOffset + searchText.length);
    if (exactMatch === searchText) {
      searchStart = startOffset;
    }
  }

  if (searchStart === 0) {
    if (contextBefore) {
      const contextIndex = fullText.indexOf(contextBefore);
      if (contextIndex >= 0) {
        searchStart = contextIndex + contextBefore.length;
      }
    }

    const textIndex = fullText.indexOf(searchText, searchStart);
    if (textIndex === -1) return null;
    searchStart = textIndex;
  }

  const textEnd = searchStart + searchText.length;

  let startNodeInfo: { node: Node; start: number; end: number } | null = null;
  let endNodeInfo: { node: Node; start: number; end: number } | null = null;

  for (const info of nodeMap) {
    if (!startNodeInfo && info.end > searchStart) {
      startNodeInfo = info;
    }
    if (info.end >= textEnd) {
      endNodeInfo = info;
      break;
    }
  }

  if (!startNodeInfo || !endNodeInfo) return null;

  return {
    startNode: startNodeInfo.node,
    startOffset: searchStart - startNodeInfo.start,
    endNode: endNodeInfo.node,
    endOffset: textEnd - endNodeInfo.start,
  };
}

export function AnnotatedContent({
  postId,
  html,
  annotations: initialAnnotations,
  onAnnotationsChange,
  hasReacted,
  className,
  style,
}: AnnotatedContentProps) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const { selection, clearSelection } = useTextSelection(contentRef);

  const [annotations, setAnnotations] = useState<AnnotationData[]>(initialAnnotations);
  const [showComposer, setShowComposer] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<TextSelection | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationData | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    setAnnotations(initialAnnotations);
  }, [initialAnnotations]);

  useEffect(() => {
    if (!contentRef.current || annotations.length === 0) return;

    contentRef.current.querySelectorAll('[data-annotation-id]').forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    });

    for (const annotation of annotations) {
      const position = findTextPosition(
        contentRef.current,
        annotation.selectedText,
        annotation.contextBefore,
        annotation.contextAfter,
        annotation.startOffset
      );

      if (!position) continue;

      try {
        const range = document.createRange();
        range.setStart(position.startNode, position.startOffset);
        range.setEnd(position.endNode, position.endOffset);

        const mark = document.createElement('mark');
        mark.setAttribute('data-annotation-id', annotation.id);
        mark.style.cssText = `
          background: ${C.highlightBg};
          border-bottom: 2px solid ${C.highlightBorder};
          padding: 2px 0;
          cursor: pointer;
          border-radius: 2px;
          transition: background 0.15s;
        `;

        mark.addEventListener('mouseenter', () => {
          mark.style.background = 'rgba(212, 145, 90, 0.25)';
        });
        mark.addEventListener('mouseleave', () => {
          mark.style.background = C.highlightBg;
        });
        mark.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelectedAnnotation(annotation);
          setShowSidebar(true);
        });

        range.surroundContents(mark);

        const badge = document.createElement('span');
        badge.style.cssText = `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: ${C.accent};
          color: #fff;
          font-size: 10px;
          font-weight: 600;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          margin-left: 4px;
          padding: 0 4px;
          vertical-align: middle;
          cursor: pointer;
        `;
        badge.textContent = String(annotation.commentCount || 1);
        mark.appendChild(badge);
      } catch (err) {
        console.warn('Failed to highlight annotation:', annotation.id, err);
      }
    }
  }, [annotations, html]);

  const handleAnnotate = useCallback(() => {
    if (!selection) return;
    if (!hasReacted) {
      alert('Please react to the post first to add annotations');
      return;
    }
    setPendingSelection(selection);
    setShowComposer(true);
    clearSelection();
  }, [selection, hasReacted, clearSelection]);

  const handleWriteResponse = useCallback(() => {
    if (!selection) return;
    if (!hasReacted) {
      alert('Please react to the post first to write a response');
      return;
    }
    setPendingSelection(selection);
    clearSelection();

    const params = new URLSearchParams({
      referencedPostId: postId,
      highlightText: selection.text.slice(0, 500),
      highlightStart: String(selection.startOffset),
      highlightEnd: String(selection.endOffset),
    });

    router.push(`/publish?${params.toString()}`);
  }, [selection, hasReacted, clearSelection, postId, router]);

  const handleAnnotationCreated = (newAnnotation: AnnotationData) => {
    const updated = [...annotations, newAnnotation];
    setAnnotations(updated);
    onAnnotationsChange?.(updated);
    setShowComposer(false);
    setPendingSelection(null);
  };

  const handleCloseSidebar = () => {
    setShowSidebar(false);
    setSelectedAnnotation(null);
  };

  return (
    <>
      <div
        ref={contentRef}
        className={className}
        style={style}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {hasReacted && (
        <AnnotationToolbar
          selection={selection}
          onAnnotate={handleAnnotate}
          onWriteResponse={handleWriteResponse}
          containerRef={contentRef}
        />
      )}

      {showComposer && pendingSelection && (
        <AnnotationComposer
          isOpen={showComposer}
          onClose={() => {
            setShowComposer(false);
            setPendingSelection(null);
          }}
          selection={pendingSelection}
          postId={postId}
          onAnnotationCreated={handleAnnotationCreated}
        />
      )}

      {showSidebar && selectedAnnotation && (
        <AnnotationSidebar
          annotation={selectedAnnotation}
          postId={postId}
          onClose={handleCloseSidebar}
          onAnnotationUpdated={(updated) => {
            setAnnotations((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a))
            );
            onAnnotationsChange?.(
              annotations.map((a) => (a.id === updated.id ? updated : a))
            );
          }}
          onAnnotationDeleted={(id) => {
            setAnnotations((prev) => prev.filter((a) => a.id !== id));
            onAnnotationsChange?.(annotations.filter((a) => a.id !== id));
            handleCloseSidebar();
          }}
        />
      )}
    </>
  );
}
