import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vitalis — AI-Powered Health Insights",
  description:
    "Your wearables collect data. Vitalis tells you what it means. AI-powered health insights from Apple Watch & WHOOP.",
};

function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-5 text-white"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">Vitalis</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link
            href="/dashboard"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/sleep"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Sleep Lab
          </Link>
          <Link
            href="/mood"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Mood
          </Link>
          <Link
            href="/insights"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Insights
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex h-8 items-center rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}

function MedicalDisclaimer() {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-3.5 text-amber-500"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            Vitalis is a wellness tool, not a medical device. It is not
            intended to diagnose, treat, cure, or prevent any disease.
          </p>
          <p>
            Always consult your healthcare provider before making changes to
            your health routine.
          </p>
          <p className="mt-2 text-muted-foreground/60">
            &copy; {new Date().getFullYear()} Vitalis. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <MedicalDisclaimer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
