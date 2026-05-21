import { Suspense } from "react";
import FingerprintDashboard from "@/components/fingerprint-dashboard";

export default function FingerprintPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 48, textAlign: "center", color: "#7a7469" }}>Loading…</div>
      }
    >
      <FingerprintDashboard />
    </Suspense>
  );
}
