"use client";

import { motion } from "framer-motion";
import { useGamification } from "@/lib/gamification";

interface LevelBarProps {
  compact?: boolean;
}

export default function LevelBar({ compact = false }: LevelBarProps) {
  const { state, levelInfo } = useGamification();

  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        {/* Level badge */}
        <div
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
          style={{
            background: "linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%)",
            boxShadow: "0 0 12px rgba(139,92,246,0.4)",
          }}
        >
          {levelInfo.level}
        </div>

        {/* Progress bar */}
        <div className="flex-1 min-w-[80px]">
          <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #8b5cf6, #22d3ee)" }}
              initial={{ width: 0 }}
              animate={{ width: `${levelInfo.progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* XP text */}
        <span className="text-2xs text-ink-disabled shrink-0 tabular-nums">
          {state.totalXP} XP
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%)",
              boxShadow: "0 0 16px rgba(139,92,246,0.45)",
            }}
          >
            {levelInfo.level}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-primary leading-tight">{levelInfo.title}</p>
            <p className="text-2xs text-ink-disabled">Level {levelInfo.level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-brand-300 tabular-nums">{state.totalXP.toLocaleString()} XP</p>
          {levelInfo.xpToNext > 0 && (
            <p className="text-2xs text-ink-disabled">{levelInfo.xpToNext} to next level</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-surface-border rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #8b5cf6, #22d3ee)" }}
          initial={{ width: 0 }}
          animate={{ width: `${levelInfo.progress}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
        />
      </div>
    </div>
  );
}
