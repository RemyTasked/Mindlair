import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Lock,
  Key,
  Monitor,
  Server,
  AlertTriangle,
  Fingerprint,
  Check,
} from "lucide-react";

export const metadata = {
  title: "Security | Mindlair",
  description: "How Mindlair protects your data and beliefs",
};

const C = {
  bg: "#0f0e0c", surface: "#1a1916", border: "#2a2825",
  text: "#e8e4dc", textSoft: "#c4bfb4", muted: "#7a7469",
  accent: "#d4915a", blue: "#6b9fc4",
};

export default function SecurityPage() {
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
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
          color: C.accent, border: `1px solid ${C.accent}40`, borderRadius: 6,
          padding: "4px 12px", marginBottom: 20,
        }}>
          <Shield style={{ width: 14, height: 14 }} />
          Security
        </div>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>
          Security Practices
        </h1>
        <p style={{ fontSize: 15, color: C.muted, maxWidth: 460, margin: "0 auto" }}>
          Your beliefs are personal. Here&apos;s how we protect them at every layer.
        </p>
      </header>

      {/* Encryption */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            icon={<Lock style={{ width: 20, height: 20 }} />}
            title="Encryption"
            subtitle="Data protected at every layer"
            color={C.accent}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SecurityItem title="In Transit (TLS 1.3)" description="All connections use modern encryption with perfect forward secrecy." />
            <SecurityItem title="At Rest (AES-256)" description="Database encrypted with industry-standard encryption." />
            <SecurityItem title="API Keys (SHA-256)" description="Keys are hashed before storage — we can't see your full key." />
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className="py-16 px-6" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            icon={<Fingerprint style={{ width: 20, height: 20 }} />}
            title="Authentication"
            subtitle="Passwordless by design"
            color={C.blue}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SecurityItem title="Magic Links" description="No passwords to leak or forget. Single-use links sent to your email." />
            <SecurityItem title="Time-Limited Tokens" description="Magic links expire in 15 minutes and can only be used once." />
            <SecurityItem title="Secure Sessions" description="HTTP-only cookies prevent JavaScript access to session tokens." />
            <SecurityItem title="Rate Limiting" description="Protection against brute force and abuse." />
          </div>
        </div>
      </section>

      {/* API Key Security */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            icon={<Key style={{ width: 20, height: 20 }} />}
            title="API Key Security"
            subtitle="For desktop and mobile apps"
            color={C.accent}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SecurityItem title="Secure Storage" description="Desktop app stores keys in your system keychain (macOS Keychain, Windows Credential Manager)." />
            <SecurityItem title="Revocable" description="Revoke any API key instantly from your settings." />
            <SecurityItem title="Usage Tracking" description="See when each key was last used to detect unauthorized access." />
          </div>
        </div>
      </section>

      {/* Desktop App Architecture */}
      <section className="py-16 px-6" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            icon={<Monitor style={{ width: 20, height: 20 }} />}
            title="Desktop App Architecture"
            subtitle="Local-first design"
            color={C.blue}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SecurityItem title="Local Storage First" description="Captures are stored locally before syncing — works offline." />
            <SecurityItem title="User-Controlled Capture" description="Toggle URL monitoring, audio capture, and screen OCR independently." />
            <SecurityItem title="Signed Builds" description="macOS notarized and code-signed for integrity verification." />
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            icon={<Server style={{ width: 20, height: 20 }} />}
            title="Infrastructure"
            subtitle="Enterprise-grade hosting"
            color={C.accent}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SecurityItem title="SOC 2 Compliant Hosting" description="Infrastructure runs on providers with security certifications." />
            <SecurityItem title="Regular Backups" description="Automated encrypted backups with point-in-time recovery." />
            <SecurityItem title="Access Controls" description="Principle of least privilege for all system access." />
          </div>
        </div>
      </section>

      {/* Vulnerability Reporting */}
      <section className="py-16 px-6" style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-3xl mx-auto">
          <div style={{
            padding: 28, borderRadius: 12,
            border: `1px solid #c0525240`, background: C.bg,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "#c0525215", color: "#c05252",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <AlertTriangle style={{ width: 20, height: 20 }} />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Report a Vulnerability</h3>
                <p style={{ fontSize: 13, color: C.muted }}>Responsible disclosure</p>
              </div>
            </div>
            <p style={{ fontSize: 14, color: C.textSoft, lineHeight: 1.7, marginBottom: 12 }}>
              Found a security issue? We take all reports seriously and will respond within 24 hours.
            </p>
            <p style={{ fontSize: 14, color: C.textSoft }}>
              Email:{" "}
              <a href="mailto:security@mindlair.app" style={{ color: C.accent, textDecoration: "none" }}>
                security@mindlair.app
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4" style={{ fontSize: 13, color: C.muted }}>
            <p>&copy; 2026 Mindlair. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>Privacy</Link>
              <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Home</Link>
              <Link href="/login" style={{ color: "inherit", textDecoration: "none" }}>Sign In</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, color }: { icon: React.ReactNode; title: string; subtitle: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: `${color}15`, color,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>{title}</h2>
        <p style={{ fontSize: 13, color: C.muted }}>{subtitle}</p>
      </div>
    </div>
  );
}

function SecurityItem({ title, description }: { title: string; description: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "start", gap: 14,
      padding: "16px 20px", borderRadius: 10,
      border: `1px solid ${C.border}`, background: C.surface,
    }}>
      <div style={{
        flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
        background: `${C.accent}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: 1,
      }}>
        <Check style={{ width: 13, height: 13, color: C.accent }} />
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{title}</p>
        <p style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.6 }}>{description}</p>
      </div>
    </div>
  );
}
