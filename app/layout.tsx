import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deca — NEAR Intents, on the evidence",
  description: "An independent evidence and reconciliation dashboard for NEAR ecosystem metrics.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
