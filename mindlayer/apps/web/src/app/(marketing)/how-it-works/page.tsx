import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "How Mindlayer Works | Map your thinking",
  description:
    "Learn how Mindlayer captures what you read, extracts claims, and builds a living map of your beliefs.",
};

const C = {
  bg: "#0f0e0c", surface: "#1a1916", border: "#2a2825",
  text: "#e8e4dc", textSoft: "#c4bfb4", muted: "#7a7469",
  accent: "#52b788", amber: "#d4915a", blue: "#6b9fc4",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: `${C.bg}dd`, backdropFilter: "blur(12px)" }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.04em", textDecoration: "none", color: C.text }}>
            Mind<span style={{ color: C.accent, fontStyle: "italic", fontWeight: 500 }}>layer</span>
          </Link>
          <Link href="/login">
            <Button size="sm" variant="gradient">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header className="py-16 px-6 text-center" style={{ borderBottom: `1px solid ${C.border}` }}>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>
          How Mindlayer Works
        </h1>
        <p style={{ fontSize: 17, color: C.textSoft, maxWidth: 520, margin: "0 auto" }}>
          Two layers — real-time and ambient. Nothing meaningful falls through.
        </p>
      </header>

      {/* Layer 1 */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.accent, border: `1px solid ${C.accent}40`, borderRadius: 6, padding: "4px 10px" }}>Layer 1</span>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Real-Time Capture</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <Step n={1} title="Silent Monitoring" description="Desktop app tracks browsers, apps, audio. Measures dwell time, scroll depth, completion. Skims ignored." color={C.accent} />
            <Step n={2} title="Completion Detection" description="When you finish, AI extracts the core claims in the background." color={C.accent} />
            <Step n={3} title="Prompt Appears" description="A small card shows the claim with reaction options. For debates, pick which view resonates." color={C.accent} />
            <Step n={4} title="Graph Updates" description="Your reaction embeds into the belief graph. Skip? It goes to the digest." color={C.accent} />
          </div>
        </div>
      </section>

      {/* Layer 2 */}
      <section className="py-16 px-6" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.amber, border: `1px solid ${C.amber}40`, borderRadius: 6, padding: "4px 10px" }}>Layer 2</span>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Twice-Daily Digest</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <Step n={5} title="Digest Notification" description="Morning and evening. Catches dismissed items and mobile content shared via the PWA." color={C.amber} />
            <Step n={6} title="Card Swipe" description="One claim per card, four options. Swipe to react. 4–5 items, under 2 minutes." color={C.amber} />
            <Step n={7} title="Curiosity Hook" description={`Contains a counterpoint? You'll see: "including one that challenges a view you hold."`} color={C.amber} />
            <Step n={8} title="Loop Closes" description="Digest reactions update the same graph. Tomorrow only shows new content." color={C.amber} />
          </div>
        </div>
      </section>

      {/* Downstream */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.blue, border: `1px solid ${C.blue}40`, borderRadius: 6, padding: "4px 10px" }}>Downstream</span>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>What the Graph Does</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <InfoCard title="Echo Detection" description="Same direction 5–6 times without counterpoint? Flagged. Primes the nudge engine." color={C.accent} />
            <InfoCard title="Gentle Nudges" description={`"This take on X is worth a look." One counter-angle. Engage or don't.`} color={C.amber} />
            <InfoCard title="Living Map" description="Topic clusters by engagement. Timeline scrubber to watch thinking evolve." color={C.blue} />
          </div>
        </div>
      </section>

      {/* Three never-dos */}
      <section className="py-16 px-6" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 32 }}>Three things it never does</h2>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <NeverDo title="Never tells you you're wrong" description="It maps and suggests. What you do is yours." />
            <NeverDo title="Never reinforces your views" description="Nudges point to the window you haven't looked through." />
            <NeverDo title="Never demands effort" description="Desktop: silent. Mobile: share to add. Only action: optional one-tap reaction." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.4rem)", fontWeight: 700, marginBottom: 12 }}>
            Ready to map your thinking?
          </h2>
          <p style={{ color: C.textSoft, fontSize: 15, marginBottom: 32 }}>
            Free to use. Import from Readwise or Pocket to seed your map.
          </p>
          <Link href="/login">
            <Button size="lg" variant="gradient">
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4" style={{ fontSize: 13, color: C.muted }}>
            <p>&copy; 2026 Mindlayer. All rights reserved.</p>
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

function Step({ n, title, description, color }: { n: number; title: string; description: string; color: string }) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{
        flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
        border: `1px solid ${color}40`, color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 600,
      }}>{n}</div>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{title}</h3>
        <p style={{ fontSize: 14, color: "#c4bfb4", lineHeight: 1.6 }}>{description}</p>
      </div>
    </div>
  );
}

function InfoCard({ title, description, color }: { title: string; description: string; color: string }) {
  return (
    <div style={{ padding: 24, borderRadius: 12, border: "1px solid #2a2825", background: "#1a1916" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginBottom: 14 }} />
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: 14, color: "#c4bfb4", lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}

function NeverDo({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#d4915a20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#d4915a" }}>✕</div>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>{title}</h3>
      </div>
      <p style={{ fontSize: 14, color: "#7a7469", lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}
