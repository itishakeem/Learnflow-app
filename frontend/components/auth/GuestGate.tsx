"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight, Sparkles, BookOpen, BarChart3, Zap } from "lucide-react";
import { useAuth, GUEST_LIMITS } from "@/lib/auth";

// ── Upgrade Modal ─────────────────────────────────────────────────────────────

export function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-surface-base/80 backdrop-blur-sm" />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{ opacity: 0,  scale: 0.95, y: 16 }}
          transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm bg-surface-raised border border-surface-border
                     rounded-2xl p-8 shadow-card overflow-hidden"
        >
          {/* Top accent */}
          <div aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-brand opacity-60" />

          {/* Lock icon */}
          <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-5">
            <Lock size={20} className="text-brand-300" />
          </div>

          <h2 className="text-xl font-bold text-ink-primary text-center mb-2 tracking-tight">
            Unlock Full Learning Experience
          </h2>
          <p className="text-sm text-ink-tertiary text-center mb-6 leading-relaxed">
            You&apos;ve hit the guest limit. Sign up free to keep learning.
          </p>

          {/* Benefits */}
          <ul className="space-y-2.5 mb-7">
            {[
              { icon: Zap,       text: "Unlimited exercises & concepts" },
              { icon: BarChart3, text: "Track your progress over time" },
              { icon: BookOpen,  text: "Save and revisit your history" },
              { icon: Sparkles,  text: "Personalized AI experience" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-ink-secondary">
                <div className="w-6 h-6 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                  <Icon size={12} className="text-brand-300" />
                </div>
                {text}
              </li>
            ))}
          </ul>

          <Link
            href="/signup"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl
                       bg-brand hover:bg-brand-400 active:bg-brand-600 text-white font-semibold text-sm
                       shadow-glow-sm hover:shadow-glow-brand transition-all duration-200 group"
          >
            Sign Up Free
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/login"
            onClick={onClose}
            className="block text-center text-xs text-ink-disabled hover:text-brand-300 mt-3 transition-colors"
          >
            Already have an account? Log in
          </Link>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Guest Usage Badge ─────────────────────────────────────────────────────────
// Shows remaining uses inline, e.g. "2 / 2 remaining"

interface GuestUsageBadgeProps {
  feature: "concepts" | "exercises";
  onLimitHit?: () => void;
}

export function GuestUsageBadge({ feature }: GuestUsageBadgeProps) {
  const { isGuest, usage } = useAuth();
  if (!isGuest) return null;

  const used      = usage[feature];
  const limit     = GUEST_LIMITS[feature];
  const remaining = limit - used;
  const isExhausted = remaining <= 0;

  return (
    <span className={[
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-medium border",
      isExhausted
        ? "bg-danger/10 text-danger-light border-danger/25"
        : remaining === 1
        ? "bg-warning/10 text-warning-light border-warning/25"
        : "bg-surface-raised text-ink-disabled border-surface-border",
    ].join(" ")}>
      {isExhausted ? (
        <><Lock size={10} /> Limit reached</>
      ) : (
        <><Sparkles size={10} /> {remaining} free {remaining === 1 ? "use" : "uses"} left</>
      )}
    </span>
  );
}

// ── Locked Overlay ────────────────────────────────────────────────────────────
// Wraps any section to blur it and show a lock CTA

interface LockedOverlayProps {
  title?: string;
  onUnlock: () => void;
  children: React.ReactNode;
  locked?: boolean;
}

export function LockedOverlay({ title = "Sign up to unlock", onUnlock, children, locked = true }: LockedOverlayProps) {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Blurred content */}
      <div className="pointer-events-none select-none blur-sm opacity-40">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3
                      bg-surface-base/60 backdrop-blur-[2px]">
        <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
          <Lock size={18} className="text-brand-300" />
        </div>
        <p className="text-sm font-semibold text-ink-primary">{title}</p>
        <button
          onClick={onUnlock}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
                     bg-brand hover:bg-brand-400 text-white text-xs font-semibold
                     shadow-glow-sm transition-all duration-200"
        >
          Sign up free <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
