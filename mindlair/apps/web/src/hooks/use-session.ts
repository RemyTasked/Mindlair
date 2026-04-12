"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
}

interface SessionState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  error: string | null;
}

const LAST_AUTH_KEY = "mindlair_last_auth";
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export function useSession() {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<SessionState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    error: null,
  });

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", {
        credentials: "include",
      });
      
      const data = await response.json();

      if (data.authenticated && data.user) {
        setState({
          isLoading: false,
          isAuthenticated: true,
          user: data.user,
          error: null,
        });
        
        // Store last successful auth time
        localStorage.setItem(LAST_AUTH_KEY, Date.now().toString());
      } else {
        const lastAuth = localStorage.getItem(LAST_AUTH_KEY);
        const wasRecentlyAuthenticated = lastAuth && 
          Date.now() - parseInt(lastAuth) < 24 * 60 * 60 * 1000; // Within 24 hours

        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: wasRecentlyAuthenticated 
            ? "Your session has expired. Please sign in again."
            : null,
        });

        // Clear the last auth if session is invalid
        if (lastAuth) {
          localStorage.removeItem(LAST_AUTH_KEY);
        }
      }
    } catch (error) {
      console.error("Session check failed:", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: "Unable to verify session. Please check your connection.",
      }));
    }
  }, []);

  // Initial session check
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Periodic session refresh
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const interval = setInterval(checkSession, SESSION_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [state.isAuthenticated, checkSession]);

  // Listen for visibility changes to check session when app becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && state.isAuthenticated) {
        checkSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [state.isAuthenticated, checkSession]);

  const logout = useCallback(async (allDevices = false) => {
    try {
      await fetch(`/api/auth/session${allDevices ? "?all=true" : ""}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem(LAST_AUTH_KEY);
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: null,
      });
      router.push("/login");
    }
  }, [router]);

  return {
    ...state,
    checkSession,
    logout,
  };
}
