import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { AuthProvider } from "@/lib/auth";
import { GamificationProvider } from "@/lib/gamification";
import XPToast from "@/components/gamification/XPToast";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnFlow — AI Python Tutor",
  description: "AI-powered Python tutoring platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface text-ink-primary min-h-screen antialiased">
        <AuthProvider>
          <GamificationProvider>
            <Nav />
            <XPToast />
            <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          </GamificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
