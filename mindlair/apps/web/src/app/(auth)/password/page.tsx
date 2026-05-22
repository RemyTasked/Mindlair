"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, Loader2, AlertCircle } from "lucide-react";

const C = {
  bg: "#0f0e0c", surface: "#1a1916", border: "#2a2825",
  text: "#e8e4dc", textSoft: "#c4bfb4", muted: "#7a7469",
  accent: "#d4915a", danger: "#c05252",
};

export default function PasswordGatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirect = searchParams.get("redirect") || "/";

  useEffect(() => {
    if (searchParams.get("error") === "wrong") {
      setError("Incorrect password. Please try again.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/site-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, redirect }),
      });

      if (res.ok) {
        const { redirectTo } = await res.json();
        router.push(redirectTo);
      } else {
        setError("Incorrect password. Please try again.");
        setPassword("");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.04em" }}>
            Mind<span style={{ color: C.accent, fontStyle: "italic", fontWeight: 500 }}>lair</span>
          </span>
        </div>

        {/* Card */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "32px 28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Lock size={18} color={C.accent} />
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Private access</h1>
          </div>
          <p style={{ color: C.textSoft, fontSize: 14, marginBottom: 28, marginTop: 0 }}>
            Enter the access password to continue.
          </p>

          {error && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: `${C.danger}18`, border: `1px solid ${C.danger}40`,
                borderRadius: 8, padding: "10px 12px", marginBottom: 20,
              }}
            >
              <AlertCircle size={15} color={C.danger} />
              <span style={{ fontSize: 13, color: C.danger }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              required
              style={{
                width: "100%", boxSizing: "border-box",
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "10px 14px",
                color: C.text, fontSize: 15, outline: "none",
                marginBottom: 16,
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !password}
              style={{
                width: "100%", padding: "11px 0",
                background: isLoading || !password ? C.border : C.accent,
                border: "none", borderRadius: 8,
                color: isLoading || !password ? C.muted : "#fff",
                fontSize: 15, fontWeight: 600, cursor: isLoading || !password ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background 0.15s",
              }}
            >
              {isLoading && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
              {isLoading ? "Verifying…" : "Continue"}
            </button>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
