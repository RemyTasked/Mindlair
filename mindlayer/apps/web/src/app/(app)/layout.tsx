import Link from "next/link";
import { Brain, Inbox, Map, Lightbulb, Settings, Menu } from "lucide-react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-semibold">
            Mindlayer
          </Link>
          <button className="p-2 text-zinc-600 dark:text-zinc-400">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white dark:bg-zinc-950 border-r border-zinc-100 dark:border-zinc-900 fixed">
          <div className="p-6">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              Mindlayer
            </Link>
          </div>

          <nav className="flex-1 px-3">
            <NavLink href="/inbox" icon={Inbox}>
              Inbox
            </NavLink>
            <NavLink href="/map" icon={Map}>
              Map
            </NavLink>
            <NavLink href="/timeline" icon={Brain}>
              Timeline
            </NavLink>
            <NavLink href="/nudges" icon={Lightbulb}>
              Nudges
            </NavLink>
          </nav>

          <div className="p-3 border-t border-zinc-100 dark:border-zinc-900">
            <NavLink href="/settings" icon={Settings}>
              Settings
            </NavLink>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-64">
          <div className="max-w-5xl mx-auto px-4 py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center justify-around py-2">
          <MobileNavLink href="/inbox" icon={Inbox} label="Inbox" />
          <MobileNavLink href="/map" icon={Map} label="Map" />
          <MobileNavLink href="/timeline" icon={Brain} label="Timeline" />
          <MobileNavLink href="/nudges" icon={Lightbulb} label="Nudges" />
          <MobileNavLink href="/settings" icon={Settings} label="Settings" />
        </div>
      </nav>
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
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-colors"
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
      className="flex flex-col items-center gap-1 px-3 py-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs">{label}</span>
    </Link>
  );
}
