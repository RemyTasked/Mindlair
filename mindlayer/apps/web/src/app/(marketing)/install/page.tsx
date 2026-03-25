import { InstallHub } from "@/components/install-hub";
import Link from "next/link";

export const metadata = {
  title: "Download Mindlayer | Map how you think",
  description:
    "Get the Mindlayer desktop app for Mac, Windows, or Linux. Capture what you read, watch, and listen to — build a living map of your beliefs.",
};

export default function InstallPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Navigation */}
      <nav className="border-b border-zinc-100 dark:border-zinc-900">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Mindlayer
          </Link>
          <Link
            href="/how-it-works"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            How it works
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-6 py-16">
        <InstallHub />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 dark:border-zinc-900 mt-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
            <p>&copy; 2026 Mindlayer. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Privacy
              </Link>
              <Link href="/security" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Security
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
