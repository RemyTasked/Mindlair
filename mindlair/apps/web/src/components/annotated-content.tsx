"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTextSelection, TextSelection } from '@/hooks/use-text-selection';
import { AnnotationToolbar } from './annotation-toolbar';
import { AnnotationComposer, AnnotationData } from './annotation-composer';
import { AnnotationSidebar } from './annotation-sidebar';
import { Sheet } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useToast } from '@/hooks/use-toast';

const C = {
  accent: "#d4915a",
  highlightBg: "rgba(212, 145, 90, 0.15)",
  highlightBorder: "rgba(212, 145, 90, 0.4)",
  muted: "#7a7469",
  text: "#e8e4dc",
  surface: "#1a1916",
  border: "#2a2825",
};

interface AnnotatedContentProps {
  postId: string;
  html: string;
  annotations: AnnotationData[];
  onAnnotationsChange?: (annotations: AnnotationData[]) => void;
  hasReacted: boolean;
  className?: string;
  style?: React.CSSProperties;
  highlightsHidden?: boolean;
}

interface GroupedAnnotations {
  paragraph: Element;
  annotations: AnnotationData[];
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

function getContainingParagraph(node: Node): Element | null {
  let current: Node | null = node;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element;
      const tagName = el.tagName.toLowerCase();
      if (['p', 'div', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        return el;
      }
    }
    current = current.parentNode;
  }
  return null;
}

export function AnnotatedContent({
  postId,
  html,
  annotations: initialAnnotations,
  onAnnotationsChange,
  hasReacted,
  className,
  style,
  highlightsHidden = false,
}: AnnotatedContentProps) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const { selection, clearSelection } = useTextSelection(contentRef);
  const isNarrow = useMediaQuery('(max-width: 640px)');
  const { toast } = useToast();

  const [annotations, setAnnotations] = useState<AnnotationData[]>(initialAnnotations);
  const [showComposer, setShowComposer] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<TextSelection | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationData | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showMorePicker, setShowMorePicker] = useState(false);
  const [moreAnnotations, setMoreAnnotations] = useState<AnnotationData[]>([]);

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

    contentRef.current.querySelectorAll('[data-more-chip]').forEach((el) => {
      el.remove();
    });

    if (highlightsHidden) return;

    const annotationParagraphs = new Map<Element, AnnotationData[]>();

    for (const annotation of annotations) {
      const position = findTextPosition(
        contentRef.current,
        annotation.selectedText,
        annotation.contextBefore,
        annotation.contextAfter,
        annotation.startOffset
      );

      if (!position) continue;

      const paragraph = getContainingParagraph(position.startNode);
      if (paragraph) {
        const existing = annotationParagraphs.get(paragraph) || [];
        existing.push(annotation);
        annotationParagraphs.set(paragraph, existing);
      }
    }

    for (const annotation of annotations) {
      const position = findTextPosition(
        contentRef.current!,
        annotation.selectedText,
        annotation.contextBefore,
        annotation.contextAfter,
        annotation.startOffset
      );

      if (!position) continue;

      const paragraph = getContainingParagraph(position.startNode);
      const groupAnnotations = paragraph ? annotationParagraphs.get(paragraph) : null;
      const isFirst = groupAnnotations ? groupAnnotations[0].id === annotation.id : true;
      const shouldShowMoreChip = isNarrow && groupAnnotations && groupAnnotations.length >= 3 && isFirst;
      const shouldHide = isNarrow && groupAnnotations && groupAnnotations.length >= 3 && !isFirst;

      if (shouldHide) continue;

      try {
        const range = document.createRange();
        range.setStart(position.startNode, position.startOffset);
        range.setEnd(position.endNode, position.endOffset);

        const mark = document.createElement('mark');
        mark.setAttribute('data-annotation-id', annotation.id);
        mark.style.cssText = `
          background: ${C.highlightBg};
          border-bottom: 2px solid ${C.highlightBorder};
          padding: ${isNarrow ? '0 1px' : '2px 0'};
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

        if (shouldShowMoreChip && groupAnnotations) {
          const moreCount = groupAnnotations.length - 1;
          const chip = document.createElement('span');
          chip.setAttribute('data-more-chip', 'true');
          chip.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: ${C.surface};
            border: 1px solid ${C.border};
            color: ${C.muted};
            font-size: 11px;
            font-weight: 500;
            padding: 2px 8px;
            border-radius: 10px;
            margin-left: 6px;
            vertical-align: middle;
            cursor: pointer;
          `;
          chip.textContent = `+${moreCount} more`;
          chip.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setMoreAnnotations(groupAnnotations.slice(1));
            setShowMorePicker(true);
          });
          mark.insertAdjacentElement('afterend', chip);
        }
      } catch (err) {
        console.warn('Failed to highlight annotation:', annotation.id, err);
      }
    }
  }, [annotations, html, highlightsHidden, isNarrow]);

  const handleAnnotate = useCallback(() => {
    if (!selection) return;
    if (!hasReacted) {
      toast.info('Please react to the post first to add annotations');
      return;
    }
    setPendingSelection(selection);
    setShowComposer(true);
    clearSelection();
  }, [selection, hasReacted, clearSelection, toast]);

  const handleWriteResponse = useCallback(() => {
    if (!selection) return;
    if (!hasReacted) {
      toast.info('Please react to the post first to write a response');
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
  }, [selection, hasReacted, clearSelection, postId, router, toast]);

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
        data-highlights={highlightsHidden ? 'off' : 'on'}
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

      {/* More annotations picker sheet */}
      <Sheet
        open={showMorePicker}
        onClose={() => setShowMorePicker(false)}
        variant="bottom"
        snapPoints={[0.4]}
        header={
          <h3 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: 0 }}>
            More annotations
          </h3>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {moreAnnotations.map((ann) => (
            <button
              key={ann.id}
              onClick={() => {
                setShowMorePicker(false);
                setSelectedAnnotation(ann);
                setShowSidebar(true);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: 12,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <p
                style={{
                  color: C.text,
                  fontSize: 14,
                  lineHeight: 1.5,
                  margin: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                &quot;{ann.selectedText}&quot;
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 8,
                  color: C.muted,
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: C.accent,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 600,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    padding: '0 4px',
                  }}
                >
                  {ann.commentCount || 1}
                </span>
                <span>{ann.commentCount === 1 ? 'comment' : 'comments'}</span>
              </div>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
