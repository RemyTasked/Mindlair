"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Info, CheckCircle, AlertCircle } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Toast, ToastType } from "@/hooks/use-toast";

const C = {
  bg: "#0a0a0a",
  surface: "#141414",
  text: "#f5f5f5",
  textSoft: "#a3a3a3",
  border: "#262626",
  accent: "#d4915a",
  green: "#a3c47a",
  rose: "#e57373",
  blue: "#4a9eff",
};

function getTypeConfig(type: ToastType) {
  switch (type) {
    case "success":
      return { icon: CheckCircle, color: C.green };
    case "error":
      return { icon: AlertCircle, color: C.rose };
    case "info":
    default:
      return { icon: Info, color: C.blue };
  }
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const config = getTypeConfig(toast.type);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        minWidth: 280,
        maxWidth: 400,
      }}
    >
      <Icon size={20} style={{ color: config.color, flexShrink: 0 }} />
      <p
        style={{
          flex: 1,
          color: C.text,
          fontSize: 14,
          lineHeight: 1.4,
          margin: 0,
        }}
      >
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: "transparent",
          border: "none",
          padding: 4,
          cursor: "pointer",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={16} style={{ color: C.textSoft }} />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  return (
    <div
      style={{
        position: "fixed",
        top: isMobile ? 60 : 20,
        right: isMobile ? "50%" : 20,
        transform: isMobile ? "translateX(50%)" : undefined,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: "auto" }}>
            <ToastItem toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
