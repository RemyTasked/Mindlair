"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { useVisualViewport } from "@/hooks/use-visual-viewport";

const C = {
  bg: "#0f0e0c",
  surface: "#1a1916",
  border: "#2a2825",
  text: "#e8e4dc",
  muted: "#7a7469",
};

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  variant: "side" | "bottom" | "modal";
  snapPoints?: number[];
  dismissible?: boolean;
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
}

export function Sheet({
  open,
  onClose,
  variant,
  snapPoints,
  dismissible = true,
  children,
  header,
  footer,
}: SheetProps) {
  const { keyboardOffset } = useVisualViewport();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [currentSnap, setCurrentSnap] = useState(0);

  const effectiveSnapPoints = snapPoints || [0.92];
  const initialSnapFraction = effectiveSnapPoints[effectiveSnapPoints.length - 1];

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.setAttribute("data-sheet-open", "true");

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && dismissible) {
          onClose();
        }
      };
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.body.style.overflow = "";
        document.body.removeAttribute("data-sheet-open");
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [open, onClose, dismissible]);

  useEffect(() => {
    if (open && sheetRef.current) {
      const focusableElements = sheetRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }, [open]);

  useEffect(() => {
    const updateHeight = () => {
      setSheetHeight(window.innerHeight);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!dismissible) return;

      const threshold = sheetHeight * 0.25;
      const velocityThreshold = 500;

      if (info.velocity.y > velocityThreshold || info.offset.y > threshold) {
        onClose();
      } else if (snapPoints && snapPoints.length > 1) {
        const currentY = info.offset.y;
        const snapHeights = snapPoints.map((p) => sheetHeight * (1 - p));
        let closestSnap = 0;
        let minDistance = Infinity;

        snapHeights.forEach((snapHeight, index) => {
          const distance = Math.abs(currentY - (sheetHeight * initialSnapFraction - snapHeight));
          if (distance < minDistance) {
            minDistance = distance;
            closestSnap = index;
          }
        });

        setCurrentSnap(closestSnap);
      }
    },
    [dismissible, onClose, sheetHeight, snapPoints, initialSnapFraction]
  );

  const getSheetStyles = () => {
    const baseStyles = {
      background: C.surface,
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
    };

    switch (variant) {
      case "side":
        return {
          ...baseStyles,
          position: "fixed" as const,
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: 420,
          borderLeft: `1px solid ${C.border}`,
          zIndex: 1002,
        };
      case "bottom":
        const snapHeight = sheetHeight * effectiveSnapPoints[currentSnap];
        return {
          ...baseStyles,
          position: "fixed" as const,
          left: 0,
          right: 0,
          bottom: 0,
          height: snapHeight,
          maxHeight: `calc(100dvh - 44px)`,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          zIndex: 1002,
        };
      case "modal":
        return {
          ...baseStyles,
          position: "relative" as const,
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          borderRadius: 16,
          border: `1px solid ${C.border}`,
        };
      default:
        return baseStyles;
    }
  };

  const getInitialAnimation = () => {
    switch (variant) {
      case "side":
        return { x: "100%" };
      case "bottom":
        return { y: "100%" };
      case "modal":
        return { opacity: 0, y: 20, scale: 0.95 };
    }
  };

  const getAnimateState = () => {
    switch (variant) {
      case "side":
        return { x: 0 };
      case "bottom":
        return { y: 0 };
      case "modal":
        return { opacity: 1, y: 0, scale: 1 };
    }
  };

  const getExitAnimation = () => {
    switch (variant) {
      case "side":
        return { x: "100%" };
      case "bottom":
        return { y: "100%" };
      case "modal":
        return { opacity: 0, y: 20, scale: 0.95 };
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 1001,
            }}
            onClick={dismissible ? onClose : undefined}
            aria-hidden="true"
          />

          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            initial={getInitialAnimation()}
            animate={getAnimateState()}
            exit={getExitAnimation()}
            transition={
              variant === "modal"
                ? { duration: 0.2 }
                : { type: "spring", damping: 25, stiffness: 200 }
            }
            drag={variant === "bottom" && dismissible ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragEnd={variant === "bottom" ? handleDragEnd : undefined}
            style={{
              ...getSheetStyles(),
              ...(variant === "modal" && {
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 1002,
              }),
            }}
          >
            {variant === "bottom" && dismissible && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "12px 0 8px",
                  cursor: "grab",
                  touchAction: "none",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    background: C.muted,
                  }}
                />
              </div>
            )}

            {header && (
              <div
                style={{
                  padding: variant === "bottom" ? "0 20px 16px" : 20,
                  borderBottom: `1px solid ${C.border}`,
                  flexShrink: 0,
                }}
              >
                {header}
              </div>
            )}

            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: 20,
                minHeight: 0,
              }}
            >
              {children}
            </div>

            {footer && (
              <div
                style={{
                  padding: 16,
                  paddingBottom: `max(env(safe-area-inset-bottom, 12px), 16px)`,
                  borderTop: `1px solid ${C.border}`,
                  background: C.bg,
                  flexShrink: 0,
                  transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : undefined,
                  transition: "transform 0.15s ease-out",
                }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
