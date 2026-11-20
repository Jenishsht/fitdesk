import type { Metadata, Viewport } from "next";
import { Manrope, Geist } from "next/font/google";
// @ts-expect-error CSS imports are handled by Next.js at build time.
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: { default: "FitDesk", template: "%s · FitDesk" },
  description: "Gym management platform for Nepal",
  appleWebApp: { capable: true, title: "FitDesk", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, manrope.variable)}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}