"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import { useGamification } from "@/lib/gamification";

export default function DailyGoalsCard() {
  const { state } = useGamification();
  const { conceptsDone, conceptsTarget, exercisesDone, exercisesTarget } = state.dailyGoals;

  const goals = [
    {
      label: "Explain concepts",
      done: conceptsDone,
      target: conceptsTarget,
      color: "#8b5cf6",
      icon: "🧠",
    },
    {
      label: "Complete exercises",
      done: exercisesDone,
      target: exercisesTarget,
      color: "#22d3ee",
      icon: "⚡",
    },
  ];

  const allDone = goals.every((g) => g.done >= g.target);

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg, rgba(15,15,24,0.95) 0%, rgba(10,10,18,0.95) 100%)",
        border: "1px solid rgba(139,92,246,0.18)",
        boxShadow: allDone ? "0 0 32px rgba(139,92,246,0.15)" : "0 0 16px rgba(0,0,0,0.2)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-2xs text-ink-disabled uppercase tracking-widest font-medium mb-1">Daily Goals</p>
          {allDone ? (
            <p className="text-sm font-semibold text-brand-300">All done! 🎉</p>
          ) : (
            <p className="text-sm font-semibold text-ink-primary">Today&apos;s targets</p>
          )}
        </div>
        <span className="text-2xl">{allDone ? "🏆" : "🎯"}</span>
      </div>

      <div className="space-y-3">
        {goals.map((g) => {
          const pct = Math.min((g.done / g.target) * 100, 100);
          const completed = g.done >= g.target;
          return (
            <div key={g.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {completed ? (
                    <CheckCircle2 size={13} style={{ color: g.color }} />
                  ) : (
                    <Circle size={13} className="text-ink-disabled" />
                  )}
                  <span className="text-xs text-ink-secondary">
                    {g.icon} {g.label}
                  </span>
                </div>
                <span className="text-xs font-semibold tabular-nums" style={{ color: g.color }}>
                  {g.done}/{g.target}
                </span>
              </div>
              <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: g.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
