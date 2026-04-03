"use client";

import { motion } from "framer-motion";
import { useGamification } from "@/lib/gamification";

interface StreakBadgeProps {
  size?: "sm" | "md" | "lg";
}

export default function StreakBadge({ size = "md" }: StreakBadgeProps) {
  const { state } = useGamification();
  const streak = state.streak;

  const isHot = streak >= 3;
  const isOnFire = streak >= 7;

  if (size === "sm") {
    return (
      <div
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold"
        style={{
          background: isHot ? "rgba(249,115,22,0.15)" : "rgba(99,102,241,0.12)",
          border: `1px solid ${isHot ? "rgba(249,115,22,0.35)" : "rgba(99,102,241,0.25)"}`,
          color: isHot ? "#fb923c" : "#a78bfa",
        }}
      >
        {isOnFire ? "🔥" : "⚡"}
        <span>{streak}</span>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="flex items-center gap-3 rounded-2xl p-4 cursor-default select-none"
      style={{
        background: isHot
          ? "linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(234,88,12,0.06) 100%)"
          : "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.04) 100%)",
        border: `1px solid ${isHot ? "rgba(249,115,22,0.25)" : "rgba(99,102,241,0.2)"}`,
        boxShadow: isHot
          ? "0 0 24px rgba(249,115,22,0.12)"
          : "0 0 16px rgba(99,102,241,0.08)",
      }}
    >
      <motion.div
        animate={isOnFire ? { scale: [1, 1.15, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        className="text-2xl leading-none shrink-0"
      >
        {isOnFire ? "🔥" : streak > 0 ? "⚡" : "💤"}
      </motion.div>

      <div className="min-w-0">
        <p
          className="text-2xl font-extrabold tabular-nums leading-none"
          style={{ color: isHot ? "#fb923c" : "#a78bfa" }}
        >
          {streak}
        </p>
        <p className="text-xs text-ink-tertiary mt-0.5">
          {streak === 1 ? "day streak" : "day streak"}
        </p>
      </div>

      {size === "lg" && streak >= 3 && (
        <div className="ml-auto text-right">
          <p className="text-xs font-semibold" style={{ color: isHot ? "#fb923c" : "#a78bfa" }}>
            {isOnFire ? "On fire! 🔥" : "Keep it up!"}
          </p>
          <p className="text-2xs text-ink-disabled">Don&apos;t break it</p>
        </div>
      )}
    </motion.div>
  );
}
