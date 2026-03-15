import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LearnFlow",
  description: "AI-powered Python tutoring platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
