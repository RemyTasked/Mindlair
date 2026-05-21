"use client";

import { useState, useEffect, useRef } from "react";

interface VisualViewportState {
  keyboardOffset: number;
  viewportHeight: number;
}

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>({
    keyboardOffset: 0,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : 0,
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      return;
    }

    const update = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        const offset = Math.max(0, window.innerHeight - vv.height);
        setState({
          keyboardOffset: offset,
          viewportHeight: vv.height,
        });
        rafRef.current = null;
      });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return state;
}
