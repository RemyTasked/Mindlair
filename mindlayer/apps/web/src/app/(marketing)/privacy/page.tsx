import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, Database, Lock, UserX, Mail, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Mindlayer",
  description: "How Mindlayer handles and protects your data",
};

const C = {
  bg: "#0f0e0c", surface: "#1a1916", border: "#2a2825",
  text: "#e8e4dc", textSoft: "#c4bfb4", muted: "#7a7469",
  accent: "#d4915a", blue: "#6b9fc4",
};

export default function PrivacyPage() {
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
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
          color: C.accent, border: `1px solid ${C.accent}40`, borderRadius: 6,
          padding: "4px 12px", marginBottom: 20,
        }}>
          <Shield style={{ width: 14, height: 14 }} />
          Privacy
        </div>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 15, color: C.muted, maxWidth: 460, margin: "0 auto" }}>
          Your beliefs are personal. Here&apos;s exactly what we collect and why.
        </p>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>Last updated: March 2026</p>
      </header>

      {/* What We Collect */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <SectionHeader icon={<Database style={{ width: 20, height: 20 }} />} title="What We Collect" color={C.accent} />
          <p style={{ fontSize: 15, color: C.textSoft, marginBottom: 20, lineHeight: 1.7 }}>
            Mindlayer collects only what&apos;s necessary to build your belief map:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <DataItem label="URLs" description="Web pages you visit (captured from the desktop app when enabled)" />
            <DataItem label="Content" description="Article titles, excerpts, and claims extracted from your reading" />
            <DataItem label="Reactions" description="Your agree/disagree/complicated responses to claims" />
            <DataItem label="Engagement" description="Time spent, scroll depth, and visit frequency (to distinguish skims from deep reads)" />
            <DataItem label="Email" description="Your email address for authentication and account recovery" />
          </div>
        </div>
      </section>

      {/* How We Store It */}
      <section className="py-16 px-6" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-3xl mx-auto">
          <SectionHeader icon={<Lock style={{ width: 20, height: 20 }} />} title="How We Store It" color={C.blue} />
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoCard title="Encryption" description="All data encrypted in transit (TLS 1.3) and at rest (AES-256)." />
            <InfoCard title="User-owned" description="Your belief map belongs to you. Export or delete it anytime." />
            <InfoCard title="No tracking" description="No analytics trackers, ad networks, or third-party cookies." />
            <InfoCard title="Minimal retention" description="Session tokens expire after 30 days of inactivity." />
          </div>
        </div>
      </section>

      {/* What We Don't Do */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <SectionHeader icon={<UserX style={{ width: 20, height: 20 }} />} title="What We Don't Do" color={C.accent} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <NeverItem title="Sell your data" description="Never. Your beliefs are not for sale." />
            <NeverItem title="Share with advertisers" description="We have no advertising relationships." />
            <NeverItem title="Train AI on your data" description="Your belief map is used only to serve you." />
            <NeverItem title="Profile you for targeting" description="Nudges are based solely on your own graph." />
            <NeverItem title="Store passwords" description="We use magic links — no passwords to leak." />
          </div>
        </div>
      </section>

      {/* Your Rights */}
      <section className="py-16 px-6" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-3xl mx-auto">
          <SectionHeader icon={<Shield style={{ width: 20, height: 20 }} />} title="Your Rights" color={C.blue} />
          <div className="grid sm:grid-cols-2 gap-4">
            <InfoCard title="Access" description="View all data we have about you at any time in your settings." />
            <InfoCard title="Export" description="Download your complete belief map in standard formats." />
            <InfoCard title="Delete" description="Permanently delete your account and all associated data." />
            <InfoCard title="Correct" description="Edit or remove any captured content or recorded position." />
          </div>
        </div>
      </section>

      {/* Third-Party & Contact */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div style={{ padding: 28, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, marginBottom: 24 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>Third-Party Services</h3>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.7, marginBottom: 12 }}>
              When you connect optional integrations (Readwise, Pocket, Instapaper, Spotify), we access
              those services on your behalf using your credentials. We only fetch data to import
              into your map and never share your Mindlayer data with them.
            </p>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.7 }}>
              Our infrastructure runs on secure cloud providers with SOC 2 certification. We use
              industry-standard security practices including encryption, access controls, and
              regular security audits.
            </p>
          </div>

          <div style={{ padding: 28, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Mail style={{ width: 18, height: 18, color: C.muted }} />
              <h3 style={{ fontSize: 17, fontWeight: 600 }}>Contact Us</h3>
            </div>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.7 }}>
              Questions about your privacy? Reach us at{" "}
              <a href="mailto:privacy@mindlayer.app" style={{ color: C.accent, textDecoration: "none" }}>
                privacy@mindlayer.app
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4" style={{ fontSize: 13, color: C.muted }}>
            <p>&copy; 2026 Mindlayer. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/security" style={{ color: "inherit", textDecoration: "none" }}>Security</Link>
              <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Home</Link>
              <Link href="/login" style={{ color: "inherit", textDecoration: "none" }}>Sign In</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ icon, title, color }: { icon: React.ReactNode; title: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: `${color}15`, color,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>{title}</h2>
    </div>
  );
}

function DataItem({ label, description }: { label: string; description: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "start", gap: 14,
      padding: "14px 18px", borderRadius: 10,
      border: `1px solid ${C.border}`, background: C.surface,
    }}>
      <span style={{
        flexShrink: 0, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
        textTransform: "uppercase", color: C.accent,
        background: `${C.accent}12`, borderRadius: 4, padding: "3px 8px",
        marginTop: 1,
      }}>{label}</span>
      <span style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.6 }}>{description}</span>
    </div>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ padding: 22, borderRadius: 12, border: `1px solid ${C.border}`, background: `${C.bg}` }}>
      <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{title}</h4>
      <p style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.65 }}>{description}</p>
    </div>
  );
}

function NeverItem({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
      <div style={{
        flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
        background: "#c0525215", color: "#c05252",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, marginTop: 1,
      }}>✕</div>
      <div>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: 14, color: C.muted, marginLeft: 8 }}>{description}</span>
      </div>
    </div>
  );
}
