"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const C = {
  bg: "#0f0e0c", surface: "#1a1916", border: "#2a2825",
  text: "#e8e4dc", textSoft: "#c4bfb4", muted: "#7a7469",
  accent: "#d4915a", danger: "#c05252",
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      const errorMessages: Record<string, string> = {
        missing_token: "Invalid sign-in link. Please request a new one.",
        invalid_token: "This sign-in link has expired or already been used.",
        verification_failed: "Something went wrong. Please try again.",
      };
      setError(errorMessages[urlError] || "An error occurred. Please try again.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send magic link");
      }

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" style={{ textDecoration: "none" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.04em", color: C.text }}>
              Mind<span style={{ color: C.accent, fontStyle: "italic", fontWeight: 500 }}>layer</span>
            </h1>
          </Link>
          <p style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>Map your thinking, not just your time</p>
        </div>

        {/* Card */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, background: C.surface }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 20 }}>
            {isSuccess ? "Check your email" : "Sign in"}
          </h2>

          {isSuccess ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: `${C.accent}18`,
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
              }}>
                <CheckCircle style={{ width: 28, height: 28, color: C.accent }} />
              </div>
              <p style={{ fontSize: 14, color: C.textSoft, marginBottom: 6 }}>
                We sent a sign-in link to <strong style={{ color: C.text }}>{email}</strong>
              </p>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
                Click the link in your email to sign in. It expires in 15 minutes.
              </p>
              <button
                onClick={() => { setIsSuccess(false); setEmail(""); }}
                style={{ fontSize: 13, color: C.accent, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "10px 12px", borderRadius: 10,
                  background: `${C.danger}12`, border: `1px solid ${C.danger}30`, marginBottom: 16,
                }}>
                  <AlertCircle style={{ width: 18, height: 18, color: C.danger, flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: C.danger }}>{error}</p>
                </div>
              )}

              <label htmlFor="email" style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSoft, marginBottom: 6 }}>
                Email address
              </label>
              <div style={{ position: "relative", marginBottom: 16 }}>
                <Mail style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, color: C.muted }} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: "100%", paddingLeft: 40, paddingRight: 14, paddingTop: 10, paddingBottom: 10,
                    borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text,
                    fontSize: 14, outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>

              <Button
                type="submit"
                variant="gradient"
                className="w-full"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  "Continue with email"
                )}
              </Button>

              <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
                By continuing, you agree to our{" "}
                <Link href="/privacy" style={{ color: C.accent }}>Privacy Policy</Link>{" "}
                and{" "}
                <Link href="/security" style={{ color: C.accent }}>Security practices</Link>
              </p>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: C.muted, marginTop: 20 }}>
          No password required. We&apos;ll send you a magic link.
        </p>
      </div>
    </div>
  );
}
