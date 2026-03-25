import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check } from "lucide-react";

export const metadata = {
  title: "How Mindlayer Works | Map your thinking",
  description:
    "Learn how Mindlayer captures what you read, extracts claims, and builds a living map of your beliefs.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Navigation */}
      <nav className="border-b border-zinc-100 dark:border-zinc-900">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Mindlayer
          </Link>
          <Link href="/install">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header className="py-16 px-6 text-center border-b border-zinc-100 dark:border-zinc-900">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          How Mindlayer Works
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Two layers — real-time and ambient. Nothing meaningful falls through.
        </p>
      </header>

      {/* Layer 1 */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Badge className="bg-rose-500">Layer 1</Badge>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Real-Time Capture
            </h2>
          </div>

          <div className="space-y-8">
            <Step
              number={1}
              title="Silent Monitoring"
              description="Desktop app tracks browsers, apps, audio. Measures dwell time, scroll depth, completion. Skims ignored."
            />
            <Step
              number={2}
              title="Completion Detection"
              description="When you finish, AI extracts the core claims in the background."
            />
            <Step
              number={3}
              title="Prompt Appears"
              description="A small card shows the claim with reaction options. For debates, pick which view resonates."
            />
            <Step
              number={4}
              title="Graph Updates"
              description="Your reaction embeds into the belief graph. Skip? It goes to the digest."
            />
          </div>
        </div>
      </section>

      {/* Layer 2 */}
      <section className="py-16 px-6 bg-zinc-50 dark:bg-zinc-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Badge className="bg-amber-500">Layer 2</Badge>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Twice-Daily Digest
            </h2>
          </div>

          <div className="space-y-8">
            <Step
              number={5}
              title="Digest Notification"
              description="Morning and evening. Catches dismissed items and mobile content shared via the PWA."
            />
            <Step
              number={6}
              title="Card Swipe"
              description="One claim per card, four options. Swipe to react. 4-5 items, under 2 minutes."
            />
            <Step
              number={7}
              title="Curiosity Hook"
              description='Contains a counterpoint? You&apos;ll see: "including one that challenges a view you hold."'
            />
            <Step
              number={8}
              title="Loop Closes"
              description="Digest reactions update the same graph. Tomorrow only shows new content."
            />
          </div>
        </div>
      </section>

      {/* Downstream */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Badge variant="outline">Downstream</Badge>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              What the Graph Does
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <DownstreamCard
              title="Echo Detection"
              description="Same direction 5-6 times without counterpoint? Flagged. Primes the nudge engine."
            />
            <DownstreamCard
              title="Gentle Nudges"
              description={`"This take on X is worth a look." One counter-angle. Engage or don't.`}
            />
            <DownstreamCard
              title="Living Map"
              description="Topic clusters by engagement. Timeline scrubber to watch thinking evolve."
            />
          </div>
        </div>
      </section>

      {/* Three never-dos */}
      <section className="py-16 px-6 bg-zinc-900 dark:bg-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">Three things it never does</h2>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <NeverDo
              title="Never tells you you're wrong"
              description="It maps and suggests. What you do is yours."
            />
            <NeverDo
              title="Never reinforces your views"
              description="Nudges point to the window you haven't looked through."
            />
            <NeverDo
              title="Never demands effort"
              description="Desktop: silent. Mobile: share to add. Only action: optional one-tap reaction."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Ready to map your thinking?
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            Free to use. Import from Readwise or Pocket to seed your map.
          </p>
          <Link href="/install">
            <Button size="lg" variant="gradient">
              Get Mindlayer Free
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 dark:border-zinc-900">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
            <p>&copy; 2026 Mindlayer. All rights reserved.</p>
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Privacy
              </Link>
              <Link
                href="/security"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Security
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-semibold text-zinc-600 dark:text-zinc-400">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
          {title}
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

function DownstreamCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
        {title}
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
    </div>
  );
}

function NeverDo({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
          <Check className="w-3 h-3 text-red-400" />
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-zinc-400">{description}</p>
    </div>
  );
}
