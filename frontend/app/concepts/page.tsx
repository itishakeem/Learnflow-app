"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Brain, Send, RotateCcw, Copy, Check } from "lucide-react";
import { explainConceptStream, type ConceptResponse } from "@/lib/api";
import { apiError } from "@/lib/errors";
import { useAuth, GUEST_LIMITS } from "@/lib/auth";
import { GuestUsageBadge, UpgradeModal } from "@/components/auth/GuestGate";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { useGamification, XP_RULES } from "@/lib/gamification";

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
type Level = (typeof LEVELS)[number];

const levelMeta: Record<Level, { variant: "success" | "warning" | "danger"; label: string; active: string }> = {
  beginner:     { variant: "success", label: "Beginner",     active: "bg-success/15 text-success-light border-success/30"  },
  intermediate: { variant: "warning", label: "Intermediate", active: "bg-warning/15 text-warning-light border-warning/30"  },
  advanced:     { variant: "danger",  label: "Advanced",     active: "bg-danger/15  text-danger-light  border-danger/30"   },
};

const USER_ID = "demo-user";
let sessionCounter = 0;
function newSessionId() { return `session-${Date.now()}-${++sessionCounter}`; }

const ease = [0.0, 0.0, 0.2, 1] as const;

export default function ConceptsPage() {
  const { isGuest, user, consumeGuestUsage, usage } = useAuth();
  const { awardXP } = useGamification();

  const [concept, setConcept] = useState("");
  const [level, setLevel]     = useState<Level>("beginner");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<ConceptResponse | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied]   = useState(false);

  const limitReached = isGuest && usage.concepts >= GUEST_LIMITS.concepts;

  async function handleExplain() {
    const trimmed = concept.trim();
    if (!trimmed) return;

    if (!consumeGuestUsage("concepts")) {
      setShowModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    // Show skeleton immediately with empty result so the card appears right away
    setResult({ status: "streaming", service: "concepts-agent", session_id: "", concept: trimmed, explanation: "" });

    const userId = user?.id ?? USER_ID;
    let xpAwarded = false;

    await explainConceptStream(
      { concept: trimmed, user_id: userId, session_id: newSessionId(), level, context: context.trim() || undefined },
      // onChunk — append each token as it arrives
      (chunk) => {
        setResult((prev) => prev
          ? { ...prev, explanation: prev.explanation + chunk }
          : null
        );
      },
      // onDone — finalise metadata
      (meta) => {
        setResult((prev) => prev ? { ...prev, status: "ok", session_id: meta.session_id } : null);
        setLoading(false);
        if (!xpAwarded) {
          xpAwarded = true;
          awardXP(XP_RULES.conceptExplained, "Concept learned", "concept");
        }
      },
      // onError
      (msg) => {
        const errMsg = apiError(new Error(msg)); if (errMsg) setError(errMsg);
        setResult(null);
        setLoading(false);
      },
    );
  }

  function handleReset() {
    setConcept("");
    setContext("");
    setResult(null);
    setError(null);
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-10 overflow-hidden">
      {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}

      {/* ── Background orbs ─────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 w-[420px] h-[420px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)",
          filter: "blur(120px)",
          opacity: 0.07,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 w-[380px] h-[380px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)",
          filter: "blur(120px)",
          opacity: 0.05,
        }}
      />

      {/* ── Page header ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="mb-10"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="section-label text-brand-300 mb-2">AI-Powered</p>
            <h1 className="text-3xl font-bold text-ink-primary tracking-tight mb-2">Concept Explainer</h1>
            <p className="text-sm text-ink-tertiary">
              Type any Python concept and get a clear, level-appropriate explanation instantly.
            </p>
          </div>
          {/* Guest usage counter */}
          <GuestUsageBadge feature="concepts" />
        </div>

        {/* Guest limit warning banner */}
        {isGuest && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 overflow-hidden"
          >
            <div className="bg-brand/8 border border-brand/20 rounded-xl px-4 py-3 text-xs text-brand-300 leading-relaxed">
              <span className="font-semibold">Guest mode</span> — you have{" "}
              {GUEST_LIMITS.concepts - usage.concepts} of {GUEST_LIMITS.concepts} free explanations remaining.{" "}
              <a href="/signup" className="underline hover:text-brand-200 transition-colors">
                Sign up free
              </a>{" "}
              for unlimited access.
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ── Input card ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease }}
        className="bg-surface-raised border border-surface-border rounded-2xl p-6 shadow-card mb-6 space-y-4"
      >
        {/* Level selector */}
        <div>
          <p className="section-label text-ink-disabled mb-3">Difficulty level</p>
          <div className="flex gap-2">
            {LEVELS.map((l) => {
              const meta = levelMeta[l];
              const isActive = level === l;
              return (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={[
                    "px-4 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 capitalize border",
                    isActive
                      ? meta.active
                      : "bg-transparent text-ink-tertiary border-surface-border hover:bg-surface-hover hover:text-ink-secondary",
                  ].join(" ")}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Concept"
          placeholder="e.g. recursion, decorators, async/await…"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleExplain()}
          leftIcon={<Brain size={15} />}
          disabled={loading || limitReached}
        />

        <Input
          label="Context (optional)"
          placeholder="e.g. in the context of web scraping, building APIs…"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          disabled={loading || limitReached}
        />

        <div className="flex gap-3">
          <Button
            variant={limitReached ? "secondary" : "primary"}
            size="lg"
            fullWidth
            onClick={limitReached ? () => setShowModal(true) : handleExplain}
            disabled={loading || (!limitReached && !concept.trim())}
            loading={loading}
          >
            {loading ? "Generating…" : limitReached ? "🔒 Limit reached — Sign up" : (
              <span className="flex items-center gap-2"><Send size={14} /> Explain</span>
            )}
          </Button>
          {(result || error) && (
            <Button variant="ghost" size="lg" onClick={handleReset}>
              <RotateCcw size={15} />
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── Error ─────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <Alert variant="error">{error}</Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Skeleton — shown only while loading AND no text yet ── */}
      <AnimatePresence>
        {loading && !result?.explanation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-surface-raised border border-surface-border rounded-2xl p-6 shadow-card"
          >
            <LoadingSkeleton lines={8} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result (visible while streaming AND after) ─────────── */}
      <AnimatePresence>
        {result && result.explanation && (
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
          >
            {/* Result header with Brain icon, concept name, badge, and Regenerate button */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                <Brain size={15} className="text-brand-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="section-label text-ink-disabled">Explanation</p>
                <h2 className="text-base font-semibold text-ink-primary capitalize leading-tight">
                  {result.concept}
                </h2>
              </div>
              <Badge variant={levelMeta[level].variant}>{levelMeta[level].label}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExplain}
              >
                <span className="flex items-center gap-1.5">
                  <RotateCcw size={13} />
                  Regenerate
                </span>
              </Button>
            </div>

            {/* Result card with glow */}
            <div
              className="relative bg-surface-raised border border-surface-border rounded-2xl p-6 overflow-hidden"
              style={{
                boxShadow: "0 0 60px rgba(139,92,246,0.08), 0 2px 16px rgba(0,0,0,0.35)",
              }}
            >
              {/* Top gradient accent line */}
              <div aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-brand opacity-40" />

              {/* Faint purple glow behind card content */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{ boxShadow: "inset 0 0 60px rgba(139,92,246,0.08)" }}
              />

              {/* Copy button */}
              <button
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy explanation"}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-surface-hover hover:bg-surface-border text-ink-disabled hover:text-ink-secondary transition-all duration-200"
              >
                {copied
                  ? <Check size={14} className="text-green-400" />
                  : <Copy size={14} />
                }
              </button>

              {/* Explanation text — streams in token by token */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="pr-8"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-base font-bold text-ink-primary mb-3 mt-0 pb-2 border-b border-surface-border">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-2 mt-4">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xs font-semibold text-ink-secondary mb-1.5 mt-3">{children}</h3>,
                    // div instead of p to safely contain block-level children (e.g. pre)
                    p:  ({ children }) => <div className="text-sm text-ink-secondary leading-relaxed mb-2">{children}</div>,
                    ul: ({ children }) => <ul className="space-y-1 mb-3 pl-3">{children}</ul>,
                    ol: ({ children }) => <ol className="space-y-1 mb-3 pl-3 list-decimal">{children}</ol>,
                    li: ({ children }) => <li className="text-sm text-ink-secondary leading-relaxed flex gap-1.5"><span className="text-brand-400 shrink-0 mt-0.5">•</span><span>{children}</span></li>,
                    // Handle block code via pre — never nest pre inside p
                    pre: ({ children }) => (
                      <pre className="bg-surface-base border border-surface-border rounded-xl p-4 text-xs font-mono text-ink-secondary overflow-x-auto whitespace-pre-wrap leading-relaxed my-3" style={{ background: "rgba(15,15,24,0.95)", borderColor: "rgba(139,92,246,0.2)" }}>{children}</pre>
                    ),
                    code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
                      inline
                        ? <code className="bg-surface-base border border-surface-border rounded px-1 py-0.5 text-xs font-mono text-brand-300">{children}</code>
                        : <code>{children}</code>,
                    strong: ({ children }) => <strong className="font-semibold text-ink-primary">{children}</strong>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-brand/40 pl-3 my-2 text-ink-tertiary italic text-xs">{children}</blockquote>,
                  }}
                >
                  {result.explanation}
                </ReactMarkdown>
                {/* Blinking cursor while streaming */}
                {loading && (
                  <span
                    className="inline-block w-0.5 h-4 ml-0.5 bg-brand-300 align-middle"
                    style={{ animation: "blink 0.8s step-end infinite" }}
                  />
                )}
              </motion.div>
            </div>
          </motion.article>
        )}
      </AnimatePresence>
    </div>
  );
}
