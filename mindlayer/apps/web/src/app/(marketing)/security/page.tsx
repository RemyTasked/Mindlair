import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Lock, 
  Key, 
  Monitor, 
  Server, 
  AlertTriangle,
  CheckCircle,
  Fingerprint
} from "lucide-react";

export const metadata = {
  title: "Security | Mindlayer",
  description: "How Mindlayer protects your data and beliefs",
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="mb-12">
          <Link href="/">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 bg-clip-text text-transparent inline-block mb-4">
              Mindlayer
            </h1>
          </Link>
          <h2 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Security Practices
          </h2>
          <p className="text-zinc-500">
            Your beliefs are personal. Here&apos;s how we protect them.
          </p>
        </div>

        <div className="space-y-12">
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <Lock className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Encryption
                </h3>
                <p className="text-zinc-500">Data protected at every layer</p>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 space-y-4 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">In Transit (TLS 1.3)</p>
                  <p className="text-sm text-zinc-500">All connections use modern encryption with perfect forward secrecy</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">At Rest (AES-256)</p>
                  <p className="text-sm text-zinc-500">Database encrypted with industry-standard encryption</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">API Keys (SHA-256)</p>
                  <p className="text-sm text-zinc-500">Keys are hashed before storage—we can&apos;t see your full key</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Fingerprint className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Authentication
                </h3>
                <p className="text-zinc-500">Passwordless by design</p>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 space-y-4 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">Magic Links</p>
                  <p className="text-sm text-zinc-500">No passwords to leak or forget. Single-use links sent to your email.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">Time-Limited Tokens</p>
                  <p className="text-sm text-zinc-500">Magic links expire in 15 minutes and can only be used once</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">Secure Sessions</p>
                  <p className="text-sm text-zinc-500">HTTP-only cookies prevent JavaScript access to session tokens</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">Rate Limiting</p>
                  <p className="text-sm text-zinc-500">Protection against brute force and abuse</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Key className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  API Key Security
                </h3>
                <p className="text-zinc-500">For desktop and mobile apps</p>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 space-y-4 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">Secure Storage</p>
                  <p className="text-sm text-zinc-500">Desktop app stores keys in your system keychain (macOS Keychain, Windows Credential Manager)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">Revocable</p>
                  <p className="text-sm text-zinc-500">Revoke any API key instantly from your settings</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">Usage Tracking</p>
                  <p className="text-sm text-zinc-500">See when each key was last used to detect unauthorized access</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Desktop App Architecture
                </h3>
                <p className="text-zinc-500">Local-first design</p>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 space-y-4 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">Local Storage First</p>
                  <p className="text-sm text-zinc-500">Captures are stored locally before syncing—works offline</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">User-Controlled Capture</p>
                  <p className="text-sm text-zinc-500">Toggle URL monitoring, audio capture, and screen OCR independently</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">Signed Builds</p>
                  <p className="text-sm text-zinc-500">macOS notarized and code-signed for integrity verification</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Server className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Infrastructure
                </h3>
                <p className="text-zinc-500">Enterprise-grade hosting</p>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 space-y-4 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">SOC 2 Compliant Hosting</p>
                  <p className="text-sm text-zinc-500">Infrastructure runs on providers with security certifications</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">Regular Backups</p>
                  <p className="text-sm text-zinc-500">Automated encrypted backups with point-in-time recovery</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">Access Controls</p>
                  <p className="text-sm text-zinc-500">Principle of least privilege for all system access</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Report a Vulnerability
                </h3>
                <p className="text-zinc-500">Responsible disclosure</p>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                Found a security issue? We take all reports seriously and will respond within 24 hours.
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                Email:{" "}
                <a href="mailto:security@mindlayer.app" className="text-rose-600 hover:underline">
                  security@mindlayer.app
                </a>
              </p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Home
            </Link>
            <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
