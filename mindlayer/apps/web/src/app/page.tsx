import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Brain, Layers, Lightbulb, Shield, MonitorSmartphone, Sparkles, TrendingUp, Play } from "lucide-react";
import { DemoPreview } from "@/components/demo-preview";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-white to-amber-50/30 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 -left-32 w-96 h-96 bg-gradient-to-br from-rose-200/40 to-orange-200/30 dark:from-rose-900/20 dark:to-orange-900/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-60 -right-32 w-80 h-80 bg-gradient-to-br from-amber-200/40 to-rose-200/30 dark:from-amber-900/20 dark:to-rose-900/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute bottom-40 left-1/4 w-64 h-64 bg-gradient-to-br from-orange-200/30 to-amber-200/40 dark:from-orange-900/10 dark:to-amber-900/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
        {/* Additional orbs for richer background */}
        <div className="absolute top-[60%] right-1/4 w-72 h-72 bg-gradient-to-br from-rose-100/30 to-orange-100/20 dark:from-rose-900/10 dark:to-orange-900/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -left-20 w-60 h-60 bg-gradient-to-br from-amber-100/40 to-rose-100/30 dark:from-amber-900/10 dark:to-rose-900/10 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-100/80 dark:border-zinc-900/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Mindlayer
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/how-it-works"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hidden sm:block"
            >
              How it works
            </Link>
            <Link href="/install">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-12 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <Badge variant="secondary" className="mb-6">
                Now in private beta
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-6">
                A living map of
                <br />
                <span className="bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                  how you think
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mb-10">
                Mindlayer captures what you read and watch, maps your beliefs over time,
                and gently surfaces perspectives you haven&apos;t encountered yet.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                <Link href="/install">
                  <Button size="lg" variant="gradient">
                    Get Mindlayer Free
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link href="/how-it-works">
                  <Button size="lg" variant="outline">
                    See how it works
                  </Button>
                </Link>
              </div>
            </div>

            {/* Belief Map Visualization */}
            <div className="relative hidden lg:block">
              <BeliefMapVisualization />
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-14 px-6 bg-zinc-50 dark:bg-zinc-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Not a read-later app. A thinking app.
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Three things Mindlayer never does: tells you you&apos;re wrong, reinforces
              what you already think, or demands effort to feed it.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Brain}
              title="Captures silently"
              description="Runs in the background on your desktop. No buttons to click, no articles to save."
            />
            <FeatureCard
              icon={Layers}
              title="Maps your beliefs"
              description="Your reactions become a living map. Watch it evolve over time."
            />
            <FeatureCard
              icon={Lightbulb}
              title="Opens windows"
              description="Surfaces perspectives you haven't seen. Curiosity, not correction."
            />
          </div>
        </div>
      </section>

      {/* Visual Flow Diagram */}
      <section className="py-12 px-6 relative bg-gradient-to-br from-rose-50/80 via-orange-50/50 to-amber-50/80 dark:from-zinc-900/50 dark:via-zinc-900/30 dark:to-zinc-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4 items-center">
            <FlowStep 
              number={1}
              icon={MonitorSmartphone}
              title="Capture"
              description="Desktop captures passively. Mobile via share."
              color="rose"
            />
            <FlowArrow />
            <FlowStep 
              number={2}
              icon={Sparkles}
              title="Extract"
              description="AI finds the core claims automatically."
              color="orange"
            />
            <div className="hidden md:block" />
            <FlowArrow className="md:rotate-90 rotate-0" />
            <div className="hidden md:block" />
            <FlowStep 
              number={4}
              icon={Lightbulb}
              title="Nudge"
              description="Surfaces the side you haven't seen."
              color="amber"
            />
            <FlowArrow className="rotate-180" />
            <FlowStep 
              number={3}
              icon={TrendingUp}
              title="Map"
              description="Reactions build your belief graph."
              color="rose"
            />
          </div>
        </div>
      </section>

      {/* How it works preview */}
      <section className="py-14 px-6 bg-zinc-50/80 dark:bg-zinc-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Two layers, nothing missed
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Real-time prompts when you finish. Twice-daily digests for the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Layer 1 */}
            <div className="relative p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <div className="absolute -top-3 left-6">
                <Badge>Layer 1</Badge>
              </div>
              <h3 className="text-lg font-semibold mt-2 mb-2">Real-time prompt</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Finish reading, see the core claim, react. One tap while it&apos;s fresh.
              </p>
              
              {/* Mock prompt UI */}
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2">THE ATLANTIC · JUST FINISHED</p>
                <p className="text-sm font-medium mb-3 leading-relaxed">
                  &quot;Central banks are losing the battle against structural inflation. The combination of deglobalization and energy transition costs creates persistent price pressures that monetary policy alone cannot address.&quot;
                </p>
                <div className="flex gap-2 flex-wrap">
                  <MiniButton>Agree</MiniButton>
                  <MiniButton>Disagree</MiniButton>
                  <MiniButton>Complicated</MiniButton>
                  <MiniButton variant="ghost">Skip</MiniButton>
                </div>
              </div>
            </div>

            {/* Layer 2 */}
            <div className="relative p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <div className="absolute -top-3 left-6">
                <Badge>Layer 2</Badge>
              </div>
              <h3 className="text-lg font-semibold mt-2 mb-2">Twice-daily digest</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Morning and evening. Swipe through what slipped through. 90 seconds.
              </p>
              
              {/* Mock digest notification */}
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 mb-1">EVENING · 7:42PM</p>
                <p className="text-sm font-medium mb-1">
                  4 reads from today worth mapping.
                </p>
                <p className="text-xs text-zinc-500">
                  Including one that pushes back on a view you hold.
                </p>
              </div>
            </div>
          </div>

          {/* Debate/Multi-perspective UI */}
          <div className="relative p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 max-w-xl mx-auto">
            <div className="absolute -top-3 left-6">
              <Badge className="bg-amber-500 text-white">Debates</Badge>
            </div>
            <h3 className="text-lg font-semibold mt-2 mb-2">Multi-perspective content</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              For debates, pick which view resonates most.
            </p>
            
            {/* Mock debate UI */}
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 mb-3">THE ARGUMENT PODCAST · JUST FINISHED</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">This episode presented multiple perspectives:</p>
              <div className="space-y-2 mb-4">
                <DebateOption>&quot;AI will create more jobs than it destroys through new industries and roles we can&apos;t yet imagine.&quot;</DebateOption>
                <DebateOption>&quot;AI displacement will outpace job creation, requiring fundamental changes to our economic system.&quot;</DebateOption>
                <DebateOption>&quot;The impact will vary dramatically by sector — some will thrive, others will be decimated.&quot;</DebateOption>
              </div>
              <p className="text-xs text-zinc-500 text-center">Which view resonates most with you?</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="py-14 px-6 relative bg-gradient-to-br from-orange-50/70 via-rose-50/50 to-amber-50/70 dark:from-zinc-900/50 dark:via-zinc-900/30 dark:to-zinc-900/50 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 right-10 w-32 h-32 bg-rose-200/30 dark:bg-rose-900/10 rounded-full blur-2xl" />
          <div className="absolute bottom-10 left-10 w-40 h-40 bg-amber-200/30 dark:bg-amber-900/10 rounded-full blur-2xl" />
        </div>
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-rose-500 text-white">
              <Play className="w-3 h-3 mr-1" />
              Try it now
            </Badge>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              See your dashboard in action
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Explore what Mindlayer looks like once you&apos;ve started mapping. Topic clusters,
              timeline evolution, AI queries, and more — all powered by your reading.
            </p>
          </div>
          
          <DemoPreview />
          
          <div className="text-center mt-8">
            <Link href="/install">
              <Button variant="gradient" size="lg">
                Start mapping for free
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="py-20 px-6 bg-zinc-900 dark:bg-zinc-950 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <Shield className="w-12 h-12 mx-auto mb-6 text-zinc-400" />
          <h2 className="text-3xl font-bold mb-4">Your mind, your data</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto mb-8">
            Your belief map is yours alone. We never sell data, never train on your positions.
            Export or delete everything, any time.
          </p>
          <div className="flex justify-center gap-6 text-sm text-zinc-500">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/security" className="hover:text-white transition-colors">
              Security
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-14 px-6 relative bg-gradient-to-br from-amber-50/60 via-rose-50/40 to-orange-50/60 dark:from-zinc-900/30 dark:via-zinc-900/20 dark:to-zinc-900/30">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-10 left-1/4 w-48 h-48 bg-rose-100/40 dark:bg-rose-900/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 right-1/4 w-56 h-56 bg-amber-100/40 dark:bg-amber-900/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Start mapping today
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            Free. No account needed. Import from Readwise or Pocket to seed your map.
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
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
            <p>&copy; 2026 Mindlayer. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Privacy
              </Link>
              <Link href="/security" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Security
              </Link>
              <Link href="/install" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Download
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/10 to-amber-500/10 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-rose-600 dark:text-rose-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
        {title}
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
    </div>
  );
}

function MiniButton({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "ghost";
}) {
  return (
    <span
      className={`text-xs px-3 py-1.5 rounded-md font-medium ${
        variant === "ghost"
          ? "text-zinc-500"
          : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
      }`}
    >
      {children}
    </span>
  );
}

function DebateOption({ children }: { children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 cursor-pointer transition-colors">
      <span className="w-4 h-4 mt-0.5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 flex-shrink-0" />
      <span className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{children}</span>
    </label>
  );
}

function BeliefMapVisualization() {
  return (
    <div className="relative w-full max-w-xl mx-auto">
      {/* Main visualization */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-50/80 to-zinc-100/50 dark:from-zinc-800/50 dark:to-zinc-900/30 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 overflow-hidden">
        <svg viewBox="0 0 400 300" className="w-full h-full">
          <defs>
            <linearGradient id="nodeGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="nodeGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.65" />
            </linearGradient>
            <linearGradient id="nodeGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
            </linearGradient>
            <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="0.5" fill="#71717a" opacity="0.15" />
            </pattern>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background grid */}
          <rect width="400" height="300" fill="url(#gridPattern)" />
          
          {/* Connection lines */}
          <g className="opacity-70">
            <line x1="200" y1="80" x2="100" y2="140" stroke="url(#lineGradient)" strokeWidth="2" />
            <line x1="200" y1="80" x2="300" y2="120" stroke="url(#lineGradient)" strokeWidth="2" />
            <line x1="200" y1="80" x2="200" y2="170" stroke="url(#lineGradient)" strokeWidth="2" />
            <line x1="100" y1="140" x2="70" y2="220" stroke="url(#lineGradient)" strokeWidth="1.5" />
            <line x1="100" y1="140" x2="150" y2="220" stroke="url(#lineGradient)" strokeWidth="1.5" />
            <line x1="300" y1="120" x2="330" y2="200" stroke="url(#lineGradient)" strokeWidth="1.5" />
            <line x1="300" y1="120" x2="260" y2="200" stroke="url(#lineGradient)" strokeWidth="1.5" />
            <line x1="200" y1="170" x2="200" y2="240" stroke="url(#lineGradient)" strokeWidth="1.5" />
          </g>
          
          {/* Main cluster nodes with engagement indicators */}
          <g filter="url(#glow)">
            {/* Economics - largest, high engagement */}
            <circle cx="200" cy="80" r="32" fill="url(#nodeGradient1)" />
            <text x="200" y="76" textAnchor="middle" className="text-[10px] fill-white font-semibold">Economics</text>
            <text x="200" y="88" textAnchor="middle" className="text-[8px] fill-white/80">47 claims</text>
            
            {/* Policy - medium */}
            <circle cx="100" cy="140" r="26" fill="url(#nodeGradient2)" />
            <text x="100" y="137" textAnchor="middle" className="text-[9px] fill-white font-semibold">Policy</text>
            <text x="100" y="148" textAnchor="middle" className="text-[7px] fill-white/80">28 claims</text>
            
            {/* Tech - medium-high */}
            <circle cx="300" cy="120" r="28" fill="url(#nodeGradient1)" />
            <text x="300" y="117" textAnchor="middle" className="text-[9px] fill-white font-semibold">AI & Tech</text>
            <text x="300" y="128" textAnchor="middle" className="text-[7px] fill-white/80">35 claims</text>
            
            {/* Ethics - smaller */}
            <circle cx="200" cy="170" r="20" fill="url(#nodeGradient3)" />
            <text x="200" y="168" textAnchor="middle" className="text-[8px] fill-white font-semibold">Ethics</text>
            <text x="200" y="178" textAnchor="middle" className="text-[6px] fill-white/80">15 claims</text>
          </g>
          
          {/* Secondary nodes */}
          <g opacity="0.85">
            <circle cx="70" cy="220" r="16" fill="url(#nodeGradient2)" />
            <text x="70" y="223" textAnchor="middle" className="text-[7px] fill-white font-medium">Tax</text>
            
            <circle cx="150" cy="220" r="14" fill="url(#nodeGradient3)" />
            <text x="150" y="223" textAnchor="middle" className="text-[7px] fill-white font-medium">Healthcare</text>
            
            <circle cx="200" cy="240" r="15" fill="url(#nodeGradient2)" />
            <text x="200" y="243" textAnchor="middle" className="text-[7px] fill-white font-medium">Privacy</text>
            
            <circle cx="260" cy="200" r="16" fill="url(#nodeGradient1)" />
            <text x="260" y="203" textAnchor="middle" className="text-[7px] fill-white font-medium">AI Safety</text>
            
            <circle cx="330" cy="200" r="13" fill="url(#nodeGradient3)" />
            <text x="330" y="203" textAnchor="middle" className="text-[7px] fill-white font-medium">Automation</text>
          </g>
          
          {/* Tertiary nodes */}
          <g opacity="0.6">
            <circle cx="50" cy="270" r="8" fill="url(#nodeGradient3)" />
            <circle cx="120" cy="265" r="9" fill="url(#nodeGradient2)" />
            <circle cx="280" cy="250" r="10" fill="url(#nodeGradient1)" />
            <circle cx="350" cy="250" r="7" fill="url(#nodeGradient3)" />
          </g>
        </svg>
        
        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-rose-400/40 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-orange-400/40 rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
          <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-amber-400/40 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-rose-500 to-orange-500" />
          <span className="text-zinc-600 dark:text-zinc-400">High engagement</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-orange-500 to-amber-500" />
          <span className="text-zinc-600 dark:text-zinc-400">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500" />
          <span className="text-zinc-600 dark:text-zinc-400">Emerging</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-gradient-to-r from-rose-400 to-amber-400 rounded" />
          <span className="text-zinc-600 dark:text-zinc-400">Related concepts</span>
        </div>
      </div>
    </div>
  );
}

function FlowStep({
  number,
  icon: Icon,
  title,
  description,
  color,
}: {
  number: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: "rose" | "orange" | "amber";
}) {
  const colorClasses = {
    rose: "from-rose-500/10 to-rose-500/5 border-rose-200 dark:border-rose-900/50",
    orange: "from-orange-500/10 to-orange-500/5 border-orange-200 dark:border-orange-900/50",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-200 dark:border-amber-900/50",
  };
  const iconColors = {
    rose: "text-rose-600 dark:text-rose-400",
    orange: "text-orange-600 dark:text-orange-400",
    amber: "text-amber-600 dark:text-amber-400",
  };
  
  return (
    <div className={`relative p-5 rounded-xl bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-sm`}>
      <div className="absolute -top-2 -left-2 w-6 h-6 bg-zinc-900 dark:bg-zinc-100 rounded-full flex items-center justify-center text-xs font-bold text-white dark:text-zinc-900">
        {number}
      </div>
      <Icon className={`w-8 h-8 ${iconColors[color]} mb-3`} />
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">{title}</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
    </div>
  );
}

function FlowArrow({ className = "" }: { className?: string }) {
  return (
    <div className={`hidden md:flex items-center justify-center ${className}`}>
      <svg width="40" height="20" viewBox="0 0 40 20" className="text-zinc-300 dark:text-zinc-700">
        <path
          d="M0 10 L30 10 M25 5 L30 10 L25 15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
