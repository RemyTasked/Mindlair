"use client";

import { useRouter } from "next/navigation";
import OnboardingOverlay from "@/components/onboarding-overlay";

export default function OnboardingPage() {
  const router = useRouter();
  return <OnboardingOverlay onComplete={() => router.push("/map")} />;
}
