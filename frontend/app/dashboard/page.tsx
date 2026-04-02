"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, Clock, ArrowRight, Zap, Sparkles } from "lucide-react";
import { getProgress, type ProgressResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LockedOverlay, UpgradeModal } from "@/components/auth/GuestGate";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";

const USER_ID = "demo-user";

const ease = [0.0, 0.0, 0.2, 1] as const;

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.07 } } },
  item: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
  },
};

const levelVariant = (level: string): "success" | "warning" | "danger" => {
  if (level === "beginner") return "success";
  if (level === "intermediate") return "warning";
  return "danger";
};

// Demo data shown to guests
const DEMO_PROGRESS: ProgressResponse = {
  status: "ok",
  service: "progress-agent",
  user_id: "demo",
  summary: { concepts_viewed: 12, exercises_completed: 5, last_active: new Date().toISOString() },
  recent_concepts: [
    { concept: "decorators", level: "intermediate", at: new Date(Date.now() - 86400000).toISOString() },
    { concept: "async/await", level: "advanced", at: new Date(Date.now() - 172800000).toISOString() },
    { concept: "list comprehension", level: "beginner", at: new Date(Date.now() - 259200000).toISOString() },
  ],
  recent_exercises: [
    { topic: "functions", level: "beginner", score: 85, at: new Date(Date.now() - 86400000).toISOString() },
    { topic: "loops", level: "beginner", score: 72, at: new Date(Date.now() - 259200000).toISOString() },
  ],
};

// ── useCountUp hook ──────────────────────────────────────────────────────────
// Counts from 0 to `target` over `duration` ms using an easeOut curve.
function useCountUp(target: number, duration = 1200): number {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

    let startTime: number | null = null;

    const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(easeOut(progress) * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return count;
}

export default function DashboardPage() {
  const { isGuest, user } = useAuth();

  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isGuest) {
      // Show demo data for guests without hitting the API
      setProgress(DEMO_PROGRESS);
      setLoading(false);
      return;
    }
    const userId = user?.id ?? USER_ID;
    getProgress(userId)
      .then(setProgress)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isGuest, user]);

  // Animated counters — only active once progress is loaded
  const conceptsCount = useCountUp(progress?.summary.concepts_viewed ?? 0);
  const exercisesCount = useCountUp(progress?.summary.exercises_completed ?? 0);

  return (
    // ── Page background wrapper with radial glow orb ──────────────────────
    <div className="relative">
      {/* Decorative background glow orb */}
      <div
        aria-hidden="true"
        className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)",
          filter: "blur(120px)",
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 relative">
        {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}

        {/* ── Guest demo banner ────────────────────────────────── */}
        {isGuest && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6 overflow-hidden"
          >
            <div className="bg-brand/8 border border-brand/20 rounded-xl px-4 py-3 flex items-center gap-3">
              <Sparkles size={14} className="text-brand-300 shrink-0" />
              <p className="text-xs text-brand-300 leading-relaxed flex-1">
                <span className="font-semibold">Demo mode</span> — this is sample data. Sign up free to track your real progress.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="shrink-0 text-xs font-semibold text-white bg-brand hover:bg-brand-400
                           px-3 py-1.5 rounded-lg transition-colors duration-150"
              >
                Sign up
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Page header ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"
        >
          <div>
            <p className="section-label text-brand-300 mb-2">Overview</p>
            <h1 className="text-3xl font-bold text-ink-primary tracking-tight">Dashboard</h1>
            <p className="text-sm text-ink-tertiary mt-1.5">Track your Python learning journey</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link
              href="/concepts"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium
                         rounded-xl bg-surface-raised hover:bg-surface-hover border border-surface-border
                         text-ink-primary hover:border-brand/30 transition-all duration-200"
            >
              Explore Concepts
            </Link>
            <Link
              href="/exercise"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold
                         rounded-xl bg-brand hover:bg-brand-400 active:bg-brand-600 text-white
                         shadow-glow-sm hover:shadow-glow-brand transition-all duration-200 group"
            >
              Start Exercise
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </motion.div>

        {/* ── Loading skeletons ────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-raised rounded-2xl p-6 h-32 skeleton" />
            ))}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────── */}
        {error && (
          <Alert variant="error" className="mb-6">
            Could not load progress data: {error}
          </Alert>
        )}

        {progress && (
          <>
            {/* ── Stat cards ──────────────────────────────────── */}
            <motion.div
              variants={stagger.container}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
            >
              {/* Concepts viewed — brand tint */}
              <motion.div variants={stagger.item}>
                <div
                  className="group bg-gradient-to-br from-brand/8 to-brand/3 backdrop-blur-sm
                              border-0 rounded-2xl p-6 transition-all duration-300
                              hover:scale-[1.02]"
                  style={{
                    boxShadow:
                      "inset 0 0 0 1px rgba(139,92,246,0.2), 0 0 30px rgba(139,92,246,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "inset 0 0 0 1px rgba(139,92,246,0.35), 0 0 40px rgba(139,92,246,0.14)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "inset 0 0 0 1px rgba(139,92,246,0.2), 0 0 30px rgba(139,92,246,0.06)";
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center"
                      style={{ boxShadow: "0 0 20px rgba(139,92,246,0.3)" }}
                    >
                      <BookOpen size={18} className="text-brand-300" />
                    </div>
                    <span className="text-2xs text-ink-disabled font-medium uppercase tracking-widest">Total</span>
                  </div>
                  <p className="text-4xl font-bold text-gradient tabular-nums mb-1">
                    {conceptsCount}
                  </p>
                  <p className="text-xs text-ink-tertiary">Concepts explored</p>
                </div>
              </motion.div>

              {/* Exercises completed — success tint */}
              <motion.div variants={stagger.item}>
                <div
                  className="group bg-gradient-to-br from-success/8 to-success/3 backdrop-blur-sm
                              border-0 rounded-2xl p-6 transition-all duration-300
                              hover:scale-[1.02]"
                  style={{
                    boxShadow:
                      "inset 0 0 0 1px rgba(52,211,153,0.2), 0 0 30px rgba(52,211,153,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "inset 0 0 0 1px rgba(52,211,153,0.35), 0 0 40px rgba(52,211,153,0.14)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "inset 0 0 0 1px rgba(52,211,153,0.2), 0 0 30px rgba(52,211,153,0.06)";
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"
                      style={{ boxShadow: "0 0 20px rgba(52,211,153,0.3)" }}
                    >
                      <CheckCircle2 size={18} className="text-success-light" />
                    </div>
                    <span className="text-2xs text-ink-disabled font-medium uppercase tracking-widest">Total</span>
                  </div>
                  <p className="text-4xl font-bold text-success-light tabular-nums mb-1">
                    {exercisesCount}
                  </p>
                  <p className="text-xs text-ink-tertiary">Exercises completed</p>
                </div>
              </motion.div>

              {/* Last active — accent tint */}
              <motion.div variants={stagger.item}>
                <div
                  className="group bg-gradient-to-br from-accent/8 to-accent/3 backdrop-blur-sm
                              border-0 rounded-2xl p-6 transition-all duration-300
                              hover:scale-[1.02]"
                  style={{
                    boxShadow:
                      "inset 0 0 0 1px rgba(34,211,238,0.2), 0 0 30px rgba(34,211,238,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "inset 0 0 0 1px rgba(34,211,238,0.35), 0 0 40px rgba(34,211,238,0.14)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      "inset 0 0 0 1px rgba(34,211,238,0.2), 0 0 30px rgba(34,211,238,0.06)";
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"
                      style={{ boxShadow: "0 0 20px rgba(34,211,238,0.3)" }}
                    >
                      <Clock size={18} className="text-accent" />
                    </div>
                    <span className="text-2xs text-ink-disabled font-medium uppercase tracking-widest">Recent</span>
                  </div>
                  <p className="text-sm font-semibold text-ink-primary mb-1 leading-snug">
                    {progress.summary.last_active
                      ? new Date(progress.summary.last_active).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", year: "numeric",
                        })
                      : "—"}
                  </p>
                  <p className="text-xs text-ink-tertiary">Last activity</p>
                </div>
              </motion.div>
            </motion.div>

            {/* ── Quick actions ─────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4, ease }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10"
            >
              <Link
                href="/concepts"
                className="group flex items-center gap-4 bg-surface-raised border border-surface-border
                           rounded-2xl p-5 hover:border-brand/30 hover:shadow-card-hover transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0
                                transition-transform duration-300 group-hover:scale-105">
                  <BookOpen size={18} className="text-brand-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-primary mb-0.5">Concept Explainer</p>
                  <p className="text-xs text-ink-tertiary">Ask about any Python concept</p>
                </div>
                <ArrowRight
                  size={15}
                  className="text-ink-disabled group-hover:text-brand-300 transition-all duration-300
                             group-hover:translate-x-1 group-hover:-translate-y-1 shrink-0"
                />
              </Link>
              <Link
                href="/exercise"
                className="group flex items-center gap-4 bg-surface-raised border border-surface-border
                           rounded-2xl p-5 hover:border-accent/30 hover:shadow-card-hover transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0
                                transition-transform duration-300 group-hover:scale-105">
                  <Zap size={18} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-primary mb-0.5">Exercise Generator</p>
                  <p className="text-xs text-ink-tertiary">Practice with AI-generated challenges</p>
                </div>
                <ArrowRight
                  size={15}
                  className="text-ink-disabled group-hover:text-accent transition-all duration-300
                             group-hover:translate-x-1 group-hover:-translate-y-1 shrink-0"
                />
              </Link>
            </motion.div>

            {/* ── Section divider ───────────────────────────────── */}
            <div
              className="h-px mb-8"
              style={{
                background:
                  "linear-gradient(to right, transparent, var(--color-surface-border, rgba(255,255,255,0.08)), transparent)",
              }}
              aria-hidden="true"
            />

            {/* ── Recent activity ───────────────────────────────── */}
            <LockedOverlay
              title="Sign up to see your real activity"
              onUnlock={() => setShowModal(true)}
              locked={isGuest}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent concepts */}
                <motion.section
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4, ease }}
                >
                  <p className="section-label text-ink-disabled mb-4">Recent Concepts</p>
                  {progress.recent_concepts.length === 0 ? (
                    <div className="bg-surface-raised border border-surface-border rounded-2xl px-5 py-10 text-center">
                      <BookOpen size={24} className="text-ink-disabled mx-auto mb-3" />
                      <p className="text-sm text-ink-disabled">No concepts explored yet.</p>
                      <Link href="/concepts" className="text-xs text-brand-300 hover:text-brand-200 font-medium mt-2 inline-block transition-colors">
                        Explore now →
                      </Link>
                    </div>
                  ) : (
                    <motion.ul
                      variants={stagger.container}
                      initial="initial"
                      animate="animate"
                      className="space-y-2"
                    >
                      {progress.recent_concepts.map((c, i) => (
                        <motion.li
                          key={i}
                          variants={stagger.item}
                          className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3
                                     flex justify-between items-center hover:border-brand/20 transition-colors duration-200"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-medium text-sm text-ink-primary capitalize truncate">{c.concept}</span>
                            <Badge variant={levelVariant(c.level)} size="sm">{c.level}</Badge>
                          </div>
                          <span className="text-2xs text-ink-disabled shrink-0 ml-2">
                            {new Date(c.at).toLocaleDateString()}
                          </span>
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </motion.section>

                {/* Recent exercises */}
                <motion.section
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4, ease }}
                >
                  <p className="section-label text-ink-disabled mb-4">Recent Exercises</p>
                  {progress.recent_exercises.length === 0 ? (
                    <div className="bg-surface-raised border border-surface-border rounded-2xl px-5 py-10 text-center">
                      <Zap size={24} className="text-ink-disabled mx-auto mb-3" />
                      <p className="text-sm text-ink-disabled">No exercises completed yet.</p>
                      <Link href="/exercise" className="text-xs text-brand-300 hover:text-brand-200 font-medium mt-2 inline-block transition-colors">
                        Start one →
                      </Link>
                    </div>
                  ) : (
                    <motion.ul
                      variants={stagger.container}
                      initial="initial"
                      animate="animate"
                      className="space-y-2"
                    >
                      {progress.recent_exercises.map((e, i) => (
                        <motion.li
                          key={i}
                          variants={stagger.item}
                          className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3
                                     flex justify-between items-center hover:border-brand/20 transition-colors duration-200"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-medium text-sm text-ink-primary capitalize truncate">{e.topic}</span>
                            <Badge variant={levelVariant(e.level)} size="sm">{e.level}</Badge>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {e.score !== null && (
                              <Badge variant="brand" size="sm">{e.score}pts</Badge>
                            )}
                            <span className="text-2xs text-ink-disabled">
                              {new Date(e.at).toLocaleDateString()}
                            </span>
                          </div>
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </motion.section>
              </div>
            </LockedOverlay>
          </>
        )}

        {/* ── Empty state (no data + no error) ─────────────────── */}
        {!loading && !error && !progress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <p className="text-ink-tertiary mb-4">No progress data yet.</p>
            <Link
              href="/exercise"
              className="inline-flex items-center gap-2 text-brand-300 hover:text-brand-200 transition-colors text-sm font-medium"
            >
              Start your first exercise <ArrowRight size={14} />
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
