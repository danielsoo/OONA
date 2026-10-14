import type { Metadata } from "next";
import CreditsHome from "@/components/credits/CreditsHome";

export const metadata: Metadata = {
  title: "Credits — OONA",
  description: "Stay for the credits: the people behind every film on OONA.",
};

/** A second home for comparing with "/" in interviews: the credits come first. */
export default function CreditsPage() {
  return <CreditsHome />;
}
