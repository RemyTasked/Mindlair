import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Share2,
  Mic,
  BookmarkPlus,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const metadata = {
  title: "How Mindlair Works | Map your thinking",
  description:
    "Share, speak, or save for later — Mindlair captures what you think, extracts the claims that matter, and builds a living map of your beliefs.",
};

const C = {
  bg: "#0f0e0c", surface: "#1a1916", border: "#2a2825",
  text: "#e8e4dc", textSoft: "#c4bfb4", muted: "#7a7469",
  accent: "#d4915a", amber: "#d4915a", blue: "#6b9fc4", green: "#a3c47a",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: `${C.bg}dd`, backdropFilter: "blur(12px)" }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.04em", textDecoration: "none", color: C.text }}>
            Mind<span style={{ color: C.accent, fontStyle: "italic", fontWeight: 500 }}>lair</span>
          </Link>
          <Link href="/login">
            <Button size="sm" variant="gradient">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header className="py-16 px-6 text-center" style={{ borderBottom: `1px solid ${C.border}` }}>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>
          How Mindlair Works
        </h1>
        <p style={{ fontSize: 17, color: C.textSoft, maxWidth: 560, margin: "0 auto" }}>
          Four ways in — one-tap capture, ambient capture, the digest, and posting.
          Nothing meaningful falls through.
        </p>

        {/* Capture-modality badges */}
        <div className="flex items-center justify-center flex-wrap gap-2 mt-7" style={{ maxWidth: 560, margin: "28px auto 0" }}>
          <ModalityBadge icon={Share2} label="Share sheet" color={C.green} />
          <ModalityBadge icon={Mic} label="Voice note" color={C.blue} />
          <ModalityBadge icon={BookmarkPlus} label="React later" color={C.amber} />
          <ModalityBadge icon={Sparkles} label="Ambient capture" color={C.accent} />
        </div>
      </header>

      {/* Layer 1 — One-tap capture (NEW) */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.green, border: `1px solid ${C.green}40`, borderRadius: 6, padding: "4px 10px" }}>Layer 1</span>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>One-Tap Capture</h2>
          </div>
          <p style={{ fontSize: 15, color: C.textSoft, marginBottom: 28, maxWidth: 600 }}>
            Three low-friction surfaces feed the same pipeline. Share an article, talk through a thought, or save it for later — Mindlair turns the input into claims and asks you to confirm before anything lands on the map.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <Step
              n={1}
              icon={Share2}
              title="Share sheet (web + mobile)"
              description="Hit Share from any app or browser, drop a sentence about what struck you, and Mindlair extracts the claims in seconds. Or save the reference and react later."
              color={C.green}
            />
            <Step
              n={2}
              icon={Mic}
              title="Voice note"
              description="Tap the mic, talk for 30 seconds. Whisper transcribes, the spoken-mode extractor cleans up filler and self-corrections, and your phrasing becomes claims."
              color={C.blue}
            />
            <Step
              n={3}
              icon={BookmarkPlus}
              title="React later"
              description="Bare shares with no reaction land in your React-later inbox. Type a sentence whenever you have a moment — same extraction, same confirmation."
              color={C.amber}
            />
            <Step
              n={4}
              icon={Sparkles}
              title="Confirm in chips"
              description="One chip per extracted claim. Drop it, edit it, or flip stance. Voice waits for explicit save; share-sheet auto-commits with undo so you stay in flow."
              color={C.accent}
            />
          </div>
        </div>
      </section>

      {/* Layer 2 — Ambient capture (was Layer 1) */}
      <section className="py-16 px-6" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.accent, border: `1px solid ${C.accent}40`, borderRadius: 6, padding: "4px 10px" }}>Layer 2</span>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Ambient Capture</h2>
          </div>
          <p style={{ fontSize: 15, color: C.textSoft, marginBottom: 28, maxWidth: 600 }}>
            For everything you don&apos;t intentionally share. Runs in the background while you read.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <Step n={5} title="Silent Monitoring" description="Desktop app tracks browsers, apps, audio. Measures dwell time, scroll depth, completion. Skims ignored." color={C.accent} />
            <Step n={6} title="Completion Detection" description="When you finish, AI extracts the core claims in the background." color={C.accent} />
            <Step n={7} title="Prompt Appears" description="A small card shows the claim with reaction options. For debates, pick which view resonates." color={C.accent} />
            <Step n={8} title="Graph Updates" description="Your reaction embeds into the belief graph. Skip? It goes to the digest." color={C.accent} />
          </div>
        </div>
      </section>

      {/* Layer 3 — Digest (was Layer 2) */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.amber, border: `1px solid ${C.amber}40`, borderRadius: 6, padding: "4px 10px" }}>Layer 3</span>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Twice-Daily Digest</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <Step n={9} title="Digest Notification" description="Morning and evening. Catches dismissed items, voice captures awaiting review, and anything saved for react-later." color={C.amber} />
            <Step n={10} title="Card Swipe" description="One claim per card, four options. Swipe to react. 4–5 items, under 2 minutes." color={C.amber} />
            <Step n={11} title="Curiosity Hook" description={`Contains a counterpoint? You'll see: "including one that challenges a view you hold."`} color={C.amber} />
            <Step n={12} title="Loop Closes" description="Digest reactions update the same graph. Tomorrow only shows new content." color={C.amber} />
          </div>
        </div>
      </section>

      {/* Layer 4 — Posting (was Layer 3) */}
      <section className="py-16 px-6" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.blue, border: `1px solid ${C.blue}40`, borderRadius: 6, padding: "4px 10px" }}>Layer 4</span>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Posting Lair</h2>
          </div>
          <p style={{ fontSize: 15, color: C.textSoft, marginBottom: 28, maxWidth: 600 }}>
            Writing isn&apos;t separate from mapping — it&apos;s the highest-confidence signal. When you post, your content feeds the same pipeline as everything else you read or say.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <Step n={13} title="Claim-Based Posting" description="Write a specific, falsifiable position — not a topic. Add your argument (500-1500 words). Signal your stance: Arguing, Exploring, or Steelmanning." color={C.blue} />
            <Step n={14} title="AI Extracts & Links" description="Same claim extraction pipeline. Your headline becomes a claim. Topics auto-tagged. Concepts link to your existing map clusters." color={C.blue} />
            <Step n={15} title="Readers React" description="Others see your claim, react with Agree/Disagree/Complicated. Their reaction updates their map. Your map sees the response patterns." color={C.blue} />
            <Step n={16} title="Similar Claims Cluster" description="Posts on the same topic or with semantically similar claims appear in the same map cluster. The social layer compounds the mapping layer." color={C.blue} />
          </div>
        </div>
      </section>

      {/* Downstream */}
      <section className="py-16 px-6" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#a3c47a", border: `1px solid #a3c47a40`, borderRadius: 6, padding: "4px 10px" }}>Downstream</span>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>What the Graph Does</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            <InfoCard title="Echo Detection" description="Same direction 5–6 times without counterpoint? Flagged. Primes the nudge engine." color={C.accent} />
            <InfoCard title="Gentle Nudges" description={`"This take on X is worth a look." One counter-angle. Engage or don't.`} color={C.amber} />
            <InfoCard title="Living Map" description="Topic clusters by engagement. Timeline scrubber to watch thinking evolve." color={C.blue} />
            <InfoCard title="Posting Compounds" description="Your posts are strongest signals. Read, react, write — all feed the same map." color="#a3c47a" />
          </div>
        </div>
      </section>

      {/* Three never-dos */}
      <section className="py-16 px-6" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 32 }}>Three things it never does</h2>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <NeverDo title="Never tells you you're wrong" description="It maps and suggests. What you do is yours." />
            <NeverDo title="Never reinforces your views" description="Reinforce badges flag claims you&apos;ve made before. Nudges still point to the window you haven&apos;t looked through." />
            <NeverDo title="Never demands effort" description="Desktop: silent. Mobile: share, speak, or save for later. Only action: optional one-tap reaction." />
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
            Free to use. Install the browser extension to start building your map.
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

function Step({
  n,
  title,
  description,
  color,
  icon: Icon,
}: {
  n: number;
  title: string;
  description: string;
  color: string;
  icon?: LucideIcon;
}) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{
        flexShrink: 0, width: 36, height: 36, borderRadius: "50%",
        border: `1px solid ${color}40`, color,
        background: Icon ? `${color}10` : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 600,
      }}>
        {Icon ? <Icon className="w-4 h-4" /> : n}
      </div>
      <div>
        {Icon && (
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
            textTransform: "uppercase", color, marginBottom: 4, opacity: 0.85,
          }}>
            Step {n}
          </div>
        )}
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{title}</h3>
        <p style={{ fontSize: 14, color: "#c4bfb4", lineHeight: 1.6 }}>{description}</p>
      </div>
    </div>
  );
}

function ModalityBadge({
  icon: Icon,
  label,
  color,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${color}40`,
        background: `${color}10`,
        color,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.01em",
      }}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
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
