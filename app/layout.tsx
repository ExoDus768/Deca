import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://deca-dashboard.vercel.app"),
  title: { default: "Deca — NEAR Intents, on the evidence", template: "%s | Deca" },
  description: "An independent evidence and reconciliation dashboard for NEAR ecosystem metrics. Inspect sources, methodology, coverage and reproducible data.",
  applicationName: "Deca",
  keywords: ["NEAR", "NEAR Intents", "crypto analytics", "on-chain data", "data reconciliation"],
  openGraph: {
    title: "Deca — NEAR Intents, on the evidence",
    description: "Numbers are easy. Trust is the work. Explore source-aware NEAR ecosystem metrics.",
    url: "https://deca-dashboard.vercel.app",
    siteName: "Deca",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deca — NEAR Intents, on the evidence",
    description: "Independent evidence and reconciliation for NEAR ecosystem metrics.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
