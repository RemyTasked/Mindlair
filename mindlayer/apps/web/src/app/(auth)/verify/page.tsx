"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      const errorMessages: Record<string, string> = {
        missing_token: "The sign-in link is invalid.",
        invalid_token: "This link has expired or already been used.",
        verification_failed: "Something went wrong during verification.",
      };
      setErrorMessage(errorMessages[error] || "An error occurred.");
      return;
    }

    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token found.");
      return;
    }

    // Hand off to the API route which validates the token,
    // creates the user/session, sets the cookie, and redirects to /map.
    window.location.href = `/api/auth/verify?token=${encodeURIComponent(token)}`;
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              Mindlair
            </h1>
          </Link>
        </div>

        <Card>
          <CardContent className="py-12">
            {status === "verifying" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-4"
              >
                <Loader2 className="w-12 h-12 mx-auto text-rose-500 animate-spin" />
                <p className="text-zinc-600 dark:text-zinc-400">Verifying your sign-in link...</p>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  You&apos;re signed in!
                </h2>
                <p className="text-zinc-500">Redirecting you to your belief map...</p>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Verification failed
                </h2>
                <p className="text-zinc-500">{errorMessage}</p>
                <Button asChild variant="gradient" className="mt-4">
                  <Link href="/login">Request a new link</Link>
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
