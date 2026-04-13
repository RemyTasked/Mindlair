"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

export interface TextSelection {
  text: string;
  startOffset: number;
  endOffset: number;
  contextBefore: string;
  contextAfter: string;
  rect: DOMRect | null;
}

export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const isSelectingRef = useRef(false);

  const getPlainTextContent = useCallback((element: HTMLElement): string => {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('script, style').forEach(el => el.remove());
    return clone.textContent || '';
  }, []);

  const getTextOffsetInContainer = useCallback((
    container: HTMLElement,
    targetNode: Node,
    targetOffset: number
  ): number => {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let offset = 0;
    let node: Node | null;

    while ((node = walker.nextNode())) {
      if (node === targetNode) {
        return offset + targetOffset;
      }
      offset += node.textContent?.length || 0;
    }

    return offset;
  }, []);

  const handleSelectionChange = useCallback(() => {
    if (!containerRef.current) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      if (!isSelectingRef.current) {
        setSelection(null);
      }
      return;
    }

    const range = sel.getRangeAt(0);
    const container = containerRef.current;

    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
      setSelection(null);
      return;
    }

    const selectedText = sel.toString().trim();
    if (!selectedText || selectedText.length < 3) {
      setSelection(null);
      return;
    }

    const plainText = getPlainTextContent(container);
    const startOffset = getTextOffsetInContainer(container, range.startContainer, range.startOffset);
    const endOffset = getTextOffsetInContainer(container, range.endContainer, range.endOffset);

    const contextStart = Math.max(0, startOffset - 50);
    const contextEnd = Math.min(plainText.length, endOffset + 50);

    const contextBefore = plainText.slice(contextStart, startOffset);
    const contextAfter = plainText.slice(endOffset, contextEnd);

    const rect = range.getBoundingClientRect();

    setSelection({
      text: selectedText,
      startOffset,
      endOffset,
      contextBefore,
      contextAfter,
      rect,
    });
  }, [containerRef, getPlainTextContent, getTextOffsetInContainer]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    const handleSelectionStart = () => {
      isSelectingRef.current = true;
    };

    const handleSelectionEnd = () => {
      isSelectingRef.current = false;
      // Longer delay for mobile to let the selection finalize
      setTimeout(handleSelectionChange, 50);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        handleSelectionChange();
      }
    };

    // Also listen for the native selectionchange event (works well on mobile)
    const handleNativeSelectionChange = () => {
      if (!isSelectingRef.current) {
        // Debounce to avoid rapid updates during selection
        setTimeout(handleSelectionChange, 100);
      }
    };

    // Mouse events (desktop)
    document.addEventListener('mousedown', handleSelectionStart);
    document.addEventListener('mouseup', handleSelectionEnd);
    
    // Touch events (mobile)
    document.addEventListener('touchstart', handleSelectionStart);
    document.addEventListener('touchend', handleSelectionEnd);
    
    // Native selection change (helps catch mobile text selection via long-press)
    document.addEventListener('selectionchange', handleNativeSelectionChange);
    
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('mousedown', handleSelectionStart);
      document.removeEventListener('mouseup', handleSelectionEnd);
      document.removeEventListener('touchstart', handleSelectionStart);
      document.removeEventListener('touchend', handleSelectionEnd);
      document.removeEventListener('selectionchange', handleNativeSelectionChange);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleSelectionChange]);

  return { selection, clearSelection };
}
