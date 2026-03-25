"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        console.log("[SW] Registered:", registration.scope);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[SW] New version available");
                if (window.confirm("A new version is available. Reload to update?")) {
                  window.location.reload();
                }
              }
            });
          }
        });

        if ("periodicSync" in registration) {
          try {
            await (registration as ServiceWorkerRegistration & {
              periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> };
            }).periodicSync.register("daily-digest", {
              minInterval: 24 * 60 * 60 * 1000,
            });
            console.log("[SW] Periodic sync registered");
          } catch {
            console.log("[SW] Periodic sync not supported");
          }
        }
      } catch (error) {
        console.error("[SW] Registration failed:", error);
      }
    };

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
      return () => window.removeEventListener("load", registerSW);
    }
  }, []);

  return null;
}
