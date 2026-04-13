import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { GetStartedHub } from "@/components/install-hub";

export const metadata = {
  title: "Get Started with Mindlair | Map how you think",
  description:
    "Sign in to Mindlair and install the app on your device. Access your belief map from any browser, install the PWA on mobile, or download the desktop companion.",
};

const C = {
  bg: "#0f0e0c", surface: "#1a1916", border: "#2a2825",
  text: "#e8e4dc", textSoft: "#c4bfb4", muted: "#7a7469",
  accent: "#d4915a",
};

export default function InstallPage() {
  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: `${C.bg}dd`, backdropFilter: "blur(12px)" }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.04em", textDecoration: "none", color: C.text }}>
            Mind<span style={{ color: C.accent, fontStyle: "italic", fontWeight: 500 }}>lair</span>
          </Link>
          <Link href="/how-it-works" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}>
            How it works
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header className="pt-16 pb-8 px-6 text-center">
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.6rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>
          Get Started
        </h1>
        <p style={{ fontSize: 15, color: C.textSoft, maxWidth: 440, margin: "0 auto" }}>
          Sign in to start building your belief map. Works in any browser — install on mobile for push notifications and offline access.
        </p>
        <p style={{ fontSize: 13, color: C.muted, maxWidth: 480, margin: "14px auto 0", lineHeight: 1.5 }}>
          Stay signed in: use the same site address for Safari and your home-screen app, and open magic links in the browser you use for Mindlair.
        </p>
      </header>

      {/* Sign In CTA */}
      <section className="px-6 pb-10">
        <div className="max-w-md mx-auto text-center">
          <Link href="/login">
            <Button size="xl" variant="gradient" className="w-full max-w-sm">
              Sign In with Email
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
            Free to use. No credit card. Magic link — no password needed.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="px-6">
        <div className="max-w-md mx-auto" style={{ borderTop: `1px solid ${C.border}` }} />
      </div>

      {/* Install Options */}
      <main className="max-w-2xl mx-auto px-6 py-10">
        <GetStartedHub />
      </main>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}`, marginTop: "auto" }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4" style={{ fontSize: 13, color: C.muted }}>
            <p>&copy; 2026 Mindlair. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>Privacy</Link>
              <Link href="/security" style={{ color: "inherit", textDecoration: "none" }}>Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
