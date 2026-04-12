"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Check, AlertCircle, Loader2, X } from "lucide-react";

const C = {
  bg: "#0f0e0c", surface: "#1a1916", border: "#2a2825",
  text: "#e8e4dc", textSoft: "#c4bfb4", muted: "#7a7469",
  accent: "#d4915a", amber: "#d4915a", danger: "#c05252",
};

interface PushNotificationsProps {
  onSubscriptionChange?: (isSubscribed: boolean) => void;
}

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotifications({ onSubscriptionChange }: PushNotificationsProps) {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkPermission = useCallback(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      setIsLoading(false);
      return;
    }
    setPermission(Notification.permission as PermissionState);
  }, []);

  const checkSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
      onSubscriptionChange?.(!!subscription);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [onSubscriptionChange]);

  useEffect(() => {
    checkPermission();
    if (permission !== "unsupported") checkSubscription();
  }, [checkPermission, checkSubscription, permission]);

  const subscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult as PermissionState);

      if (permissionResult !== "granted") {
        setError("Permission denied");
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidResponse = await fetch("/api/push/vapid-key");
      if (!vapidResponse.ok) throw new Error("Failed to get VAPID key");
      const { publicKey } = await vapidResponse.json();

      const keyArray = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyArray.buffer.slice(keyArray.byteOffset, keyArray.byteOffset + keyArray.byteLength) as ArrayBuffer,
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), deviceName: getDeviceName() }),
      });

      if (!response.ok) throw new Error("Failed to save subscription");

      setIsSubscribed(true);
      onSubscriptionChange?.(true);
    } catch (err) {
      console.error("Subscribe error:", err);
      setError("Failed to enable notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setIsSubscribed(false);
      onSubscriptionChange?.(false);
    } catch (err) {
      console.error("Unsubscribe error:", err);
      setError("Failed to disable notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "test" }),
      });
    } catch (err) {
      console.error("Test notification error:", err);
    }
  };

  if (permission === "unsupported") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.muted }}>
        <AlertCircle style={{ width: 16, height: 16 }} />
        <span>Push notifications are not supported on this device</span>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.muted }}>
        <BellOff style={{ width: 16, height: 16 }} />
        <span>Notifications blocked. Enable in browser settings.</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isSubscribed
            ? <Bell style={{ width: 18, height: 18, color: C.accent }} />
            : <BellOff style={{ width: 18, height: 18, color: C.muted }} />
          }
          <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
            {isSubscribed ? "Notifications enabled" : "Enable notifications"}
          </span>
        </div>

        <Button
          variant={isSubscribed ? "outline" : "default"}
          size="sm"
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
          style={isSubscribed ? { borderColor: C.border, color: C.textSoft, background: "transparent" } : {}}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSubscribed ? (
            <><Check className="w-4 h-4 mr-1" /> Enabled</>
          ) : (
            "Enable"
          )}
        </Button>
      </div>

      {isSubscribed && (
        <div style={{ fontSize: 13, color: C.muted }}>
          <p>You&apos;ll receive:</p>
          <ul style={{ listStyle: "disc", paddingLeft: 20, marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
            <li>Daily digest notifications</li>
            <li>New perspective nudges</li>
            <li>Tension alerts when contradictions are detected</li>
          </ul>
          <button onClick={sendTestNotification} style={{
            marginTop: 8, fontSize: 12, color: C.accent,
            background: "none", border: "none", cursor: "pointer",
            textDecoration: "underline", padding: 0,
          }}>
            Send test notification
          </button>
        </div>
      )}

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.danger }}>
          <AlertCircle style={{ width: 16, height: 16 }} />
          {error}
        </div>
      )}
    </div>
  );
}

export function PushNotificationBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasDismissed = localStorage.getItem("push-banner-dismissed");
    if (hasDismissed) {
      setDismissed(true);
      return;
    }

    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    if (Notification.permission === "default") {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("push-banner-dismissed", "true");
  };

  if (dismissed || !show) return null;

  return (
    <div style={{
      position: "fixed", bottom: 16, left: 16, right: 16,
      maxWidth: 380, marginLeft: "auto",
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: 16, zIndex: 50,
      boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ padding: 8, background: `${C.accent}18`, borderRadius: 10, flexShrink: 0 }}>
          <Bell style={{ width: 20, height: 20, color: C.accent }} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Stay updated</h3>
          <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            Get notified about your daily digest and new perspective nudges.
          </p>
          <div style={{ marginTop: 10 }}>
            <PushNotifications onSubscriptionChange={(subscribed) => { if (subscribed) handleDismiss(); }} />
          </div>
        </div>
        <button onClick={handleDismiss} style={{
          background: "none", border: "none", color: C.muted,
          cursor: "pointer", padding: 2,
        }}>
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? "Android Phone" : "Android Tablet";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown Device";
}
