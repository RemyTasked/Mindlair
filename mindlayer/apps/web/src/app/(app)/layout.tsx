"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, Inbox, Map, Lightbulb, Settings, Rss, PenSquare, Fingerprint } from "lucide-react";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { PushNotificationBanner } from "@/components/push-notifications";
import { cn } from "@/lib/utils";

const C = {
  bg: "#0f0e0c", surface: "#1a1916", border: "#2a2825",
  text: "#e8e4dc", muted: "#7a7469", accent: "#d4915a",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const isMap = pathname === "/map";
  const isFeed = pathname === "/feed";

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ minHeight: "100dvh", background: C.bg, color: C.text }}
    >
      {/* Mobile header - just logo */}
      <header className="lg:hidden sticky top-0 z-50" style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: `${C.bg}ee`, backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div className="flex items-center justify-center px-4 py-3">
          <Link href="/map" style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.04em", textDecoration: "none", color: C.text }}>
            Mind<span style={{ color: C.accent, fontStyle: "italic", fontWeight: 500 }}>lair</span>
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 min-h-screen fixed" style={{
          background: C.surface, borderRight: `1px solid ${C.border}`,
        }}>
          <div className="p-6">
            <Link href="/map" style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.04em", textDecoration: "none", color: C.text }}>
              Mind<span style={{ color: C.accent, fontStyle: "italic", fontWeight: 500 }}>lair</span>
            </Link>
          </div>

          <nav className="flex-1 px-3">
            <NavLink href="/feed" icon={Rss}>Feed</NavLink>
            <NavLink href="/publish" icon={PenSquare}>Post</NavLink>
            <NavLink href="/inbox" icon={Inbox}>Inbox</NavLink>
            <NavLink href="/map" icon={Map}>Map</NavLink>
            <NavLink href="/fingerprint" icon={Fingerprint}>Fingerprint</NavLink>
            <NavLink href="/timeline" icon={Brain}>Timeline</NavLink>
            <NavLink href="/nudges" icon={Lightbulb}>Nudges</NavLink>
          </nav>

          <div className="p-3" style={{ borderTop: `1px solid ${C.border}` }}>
            <NavLink href="/settings" icon={Settings}>Settings</NavLink>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 lg:ml-64">
          <div
            className={cn(
              isMap && "w-full max-w-none px-0 pt-0",
              isFeed &&
                !isMap &&
                "w-full max-w-none px-0 pt-4 sm:px-4 lg:mx-auto lg:max-w-5xl lg:px-8 lg:pt-8",
              !isMap && !isFeed && "max-w-5xl mx-auto px-4 pt-8 lg:px-8",
            )}
            style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50" style={{
        background: `${C.surface}f0`, backdropFilter: "blur(12px)",
        borderTop: `1px solid ${C.border}`,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        <div className="flex items-center justify-around py-2">
          <MobileNavLink href="/feed" icon={Rss} label="Feed" />
          <MobileNavLink href="/map" icon={Map} label="Map" />
          <MobileNavLink href="/inbox" icon={Inbox} label="Inbox" />
          <MobileNavLink href="/nudges" icon={Lightbulb} label="Nudges" />
          <MobileNavLink href="/settings" icon={Settings} label="Settings" />
        </div>
      </nav>

      <PWAInstallPrompt />
      <PushNotificationBanner />
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
      style={{ color: "#c4bfb4", textDecoration: "none" }}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{children}</span>
    </Link>
  );
}

function MobileNavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 px-3 py-1 transition-colors"
      style={{ color: "#7a7469", textDecoration: "none" }}
    >
      <Icon className="w-5 h-5" />
      <span style={{ fontSize: 10 }}>{label}</span>
    </Link>
  );
}

