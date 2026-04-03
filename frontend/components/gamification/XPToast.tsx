"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useGamification } from "@/lib/gamification";

export default function XPToast() {
  const { state, clearToast, clearLevelUp } = useGamification();
  const toast = state.pendingToast;
  const levelUp = state.levelUpPending;

  // Auto-dismiss toast after 2.5s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 2500);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  // Auto-dismiss level-up after 3.5s
  useEffect(() => {
    if (!levelUp) return;
    const t = setTimeout(clearLevelUp, 3500);
    return () => clearTimeout(t);
  }, [levelUp, clearLevelUp]);

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
      {/* Level-up banner */}
      <AnimatePresence>
        {levelUp && (
          <motion.div
            key="levelup"
            initial={{ opacity: 0, y: -20, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%)",
              boxShadow: "0 0 32px rgba(139,92,246,0.55), 0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            <span className="text-xl">🎉</span>
            <span>Level Up!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP gain toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={`toast-${toast.label}-${toast.xp}`}
            initial={{ opacity: 0, x: 40, scale: 0.88 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.88 }}
            transition={{ type: "spring", stiffness: 450, damping: 24 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: "rgba(139,92,246,0.18)",
              border: "1px solid rgba(139,92,246,0.4)",
              boxShadow: "0 0 20px rgba(139,92,246,0.25), 0 4px 12px rgba(0,0,0,0.35)",
              backdropFilter: "blur(12px)",
              color: "#c4b5fd",
            }}
          >
            <Sparkles size={14} className="text-brand-300 shrink-0" />
            <span>+{toast.xp} XP</span>
            <span className="text-xs font-normal opacity-70 ml-0.5">{toast.label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
