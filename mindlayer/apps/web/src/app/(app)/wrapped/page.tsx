import { redirect } from "next/navigation";

export default function WrappedPage() {
  redirect("/fingerprint?tab=wrapped");
}
