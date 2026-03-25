import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Shield, Database, Lock, UserX, Mail } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Mindlayer",
  description: "How Mindlayer handles and protects your data",
};

export default function PrivacyPage() {
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
            Privacy Policy
          </h2>
          <p className="text-zinc-500">Last updated: March 2026</p>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <Database className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-2xl font-semibold m-0">What We Collect</h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Mindlayer collects only what&apos;s necessary to build your belief map:
            </p>
            <ul className="space-y-3 text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-1">URLs</Badge>
                <span>Web pages you visit (captured from the desktop app when enabled)</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-1">Content</Badge>
                <span>Article titles, excerpts, and claims extracted from your reading</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-1">Reactions</Badge>
                <span>Your agree/disagree/complicated responses to claims</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-1">Engagement</Badge>
                <span>Time spent, scroll depth, and visit frequency (to distinguish skims from deep reads)</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-1">Email</Badge>
                <span>Your email address for authentication and account recovery</span>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-2xl font-semibold m-0">How We Store It</h3>
            </div>
            <ul className="space-y-3 text-zinc-600 dark:text-zinc-400">
              <li>
                <strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256)
              </li>
              <li>
                <strong>User-owned:</strong> Your belief map belongs to you. Export or delete it anytime.
              </li>
              <li>
                <strong>No tracking:</strong> We don&apos;t use analytics trackers, ad networks, or third-party cookies
              </li>
              <li>
                <strong>Minimal retention:</strong> Session tokens expire after 30 days of inactivity
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <UserX className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-2xl font-semibold m-0">What We Don&apos;t Do</h3>
            </div>
            <ul className="space-y-3 text-zinc-600 dark:text-zinc-400">
              <li>
                <strong>Sell your data:</strong> Never. Your beliefs are not for sale.
              </li>
              <li>
                <strong>Share with advertisers:</strong> We have no advertising relationships.
              </li>
              <li>
                <strong>Train AI on your data:</strong> Your belief map is used only to serve you.
              </li>
              <li>
                <strong>Profile you for targeting:</strong> Nudges are based solely on your own graph.
              </li>
              <li>
                <strong>Store passwords:</strong> We use magic links—no passwords to leak.
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-2xl font-semibold m-0">Your Rights</h3>
            </div>
            <ul className="space-y-3 text-zinc-600 dark:text-zinc-400">
              <li>
                <strong>Access:</strong> View all data we have about you at any time in your settings
              </li>
              <li>
                <strong>Export:</strong> Download your complete belief map in standard formats
              </li>
              <li>
                <strong>Delete:</strong> Permanently delete your account and all associated data
              </li>
              <li>
                <strong>Correct:</strong> Edit or remove any captured content or recorded position
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Mail className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <h3 className="text-2xl font-semibold m-0">Contact Us</h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400">
              Questions about your privacy? Reach us at{" "}
              <a href="mailto:privacy@mindlayer.app" className="text-rose-600 hover:underline">
                privacy@mindlayer.app
              </a>
            </p>
          </section>

          <section className="border-t border-zinc-200 dark:border-zinc-800 pt-8">
            <h3 className="text-xl font-semibold mb-4">Third-Party Services</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              When you connect optional integrations (Readwise, Pocket, Instapaper), we access
              those services on your behalf using your credentials. We only fetch data to import
              into your map and never share your Mindlayer data with them.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              Our infrastructure runs on secure cloud providers with SOC 2 certification. We use
              industry-standard security practices including encryption, access controls, and
              regular security audits.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
            <Link href="/security" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Security Practices
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
