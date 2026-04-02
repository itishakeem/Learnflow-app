"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.0, 0.0, 0.2, 1] }}
      className="w-full max-w-md"
    >
      {/* Brand mark */}
      <div className="flex justify-center mb-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center
                           text-white font-bold text-sm shadow-glow-brand">
            LF
          </span>
          <span className="font-bold text-lg text-gradient tracking-tight">LearnFlow</span>
        </Link>
      </div>

      {/* Card */}
      <div className="relative bg-surface-raised border border-surface-border rounded-2xl p-8 shadow-card overflow-hidden">
        {/* Top accent line */}
        <div aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-brand opacity-60" />
        {/* Header */}
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-ink-primary">{title}</h1>
          {subtitle && (
            <p className="text-sm text-ink-tertiary mt-1.5">{subtitle}</p>
          )}
        </div>

        {children}
      </div>
    </motion.div>
  );
}
