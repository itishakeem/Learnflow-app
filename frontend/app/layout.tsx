import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { AuthProvider } from "@/lib/auth";
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
          <Nav />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
