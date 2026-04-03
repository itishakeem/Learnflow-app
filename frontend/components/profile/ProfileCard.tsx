"use client";

import { motion } from "framer-motion";
import { User } from "lucide-react";
import { getLevelInfo } from "@/lib/gamification";

interface Props {
  name: string;
  email: string;
  avatarUrl?: string | null;
  totalXP: number;
}

export default function ProfileCard({ name, email, avatarUrl, totalXP }: Props) {
  const levelInfo = getLevelInfo(totalXP);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl p-6 flex items-start gap-5"
      style={{
        background: "linear-gradient(135deg, rgba(15,15,24,0.98) 0%, rgba(10,10,18,0.98) 100%)",
        border: "1px solid rgba(139,92,246,0.2)",
        boxShadow: "0 0 40px rgba(139,92,246,0.08), 0 2px 16px rgba(0,0,0,0.3)",
      }}
    >
      {/* Avatar */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
        style={{
          background: "rgba(139,92,246,0.1)",
          border: "1px solid rgba(139,92,246,0.25)",
          boxShadow: "0 0 20px rgba(139,92,246,0.15)",
        }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          : <User size={32} className="text-brand-300" />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-ink-primary truncate mb-0.5">{name}</h2>
        <p className="text-sm text-ink-tertiary mb-4 truncate">{email}</p>

        {/* Level badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl mb-3"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(34,211,238,0.08) 100%)",
            border: "1px solid rgba(139,92,246,0.3)",
          }}
        >
          <span className="text-sm font-bold text-brand-300">Level {levelInfo.level}</span>
          <span className="text-xs text-ink-disabled">·</span>
          <span className="text-xs text-ink-secondary">{levelInfo.title}</span>
        </div>

        {/* XP progress bar */}
        <div className="h-1.5 bg-surface-border rounded-full overflow-hidden mb-1">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #8b5cf6, #22d3ee)" }}
            initial={{ width: 0 }}
            animate={{ width: `${levelInfo.progress}%` }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
          />
        </div>
        <div className="flex justify-between">
          <p className="text-2xs text-ink-disabled">{totalXP} XP total</p>
          {levelInfo.xpToNext > 0 && (
            <p className="text-2xs text-ink-disabled">{levelInfo.xpToNext} to next level</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
