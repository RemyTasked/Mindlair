"use client";

import {
  createContext,
  createElement,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type ToastType = "info" | "success" | "error";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: {
    info: (message: string) => void;
    success: (message: string) => void;
    error: (message: string) => void;
  };
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${++toastIdCounter}`;
    const newToast: Toast = { id, type, message };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    info: (message: string) => addToast("info", message),
    success: (message: string) => addToast("success", message),
    error: (message: string) => addToast("error", message),
  };

  return { toasts, toast, dismiss };
}

export function ToastProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ToastContextValue;
}) {
  return createElement(ToastContext.Provider, { value }, children);
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
