"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Check, AlertCircle, Loader2 } from "lucide-react";

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
    if (!("Notification" in window)) {
      setPermission("unsupported");
      setIsLoading(false);
      return;
    }

    if (!("serviceWorker" in navigator)) {
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
      console.error("Error checking subscription");
    } finally {
      setIsLoading(false);
    }
  }, [onSubscriptionChange]);

  useEffect(() => {
    checkPermission();
    if (permission !== "unsupported") {
      checkSubscription();
    }
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
      if (!vapidResponse.ok) {
        throw new Error("Failed to get VAPID key");
      }
      const { publicKey } = await vapidResponse.json();

      const keyArray = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyArray.buffer.slice(keyArray.byteOffset, keyArray.byteOffset + keyArray.byteLength) as ArrayBuffer,
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          deviceName: getDeviceName(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription");
      }

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
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <AlertCircle className="w-4 h-4" />
        <span>Push notifications are not supported on this device</span>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <BellOff className="w-4 h-4" />
        <span>Notifications blocked. Enable in browser settings.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <Bell className="w-5 h-5 text-rose-500" />
          ) : (
            <BellOff className="w-5 h-5 text-zinc-400" />
          )}
          <span className="font-medium">
            {isSubscribed ? "Notifications enabled" : "Enable notifications"}
          </span>
        </div>

        <Button
          variant={isSubscribed ? "outline" : "default"}
          size="sm"
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSubscribed ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              Enabled
            </>
          ) : (
            "Enable"
          )}
        </Button>
      </div>

      {isSubscribed && (
        <div className="text-sm text-zinc-500">
          <p>You&apos;ll receive:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Daily digest notifications</li>
            <li>New perspective nudges</li>
            <li>Tension alerts when contradictions are detected</li>
          </ul>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs"
            onClick={sendTestNotification}
          >
            Send test notification
          </Button>
        </div>
      )}

      {error && (
        <div className="text-sm text-rose-500 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) {
    if (/Mobile/.test(ua)) return "Android Phone";
    return "Android Tablet";
  }
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Linux/.test(ua)) return "Linux";
  
  return "Unknown Device";
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

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      return;
    }

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
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
          <Bell className="w-5 h-5 text-rose-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Stay updated</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Get notified about your daily digest and new perspective nudges.
          </p>
          <div className="flex gap-2 mt-3">
            <PushNotifications 
              onSubscriptionChange={(subscribed) => {
                if (subscribed) handleDismiss();
              }} 
            />
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          <span className="sr-only">Dismiss</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
