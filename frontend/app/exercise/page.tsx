"use client";

import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Bug, CheckCircle2, BookOpen, Palette, Eye, EyeOff, Play, ChevronDown } from "lucide-react";
import type { Monaco } from "@monaco-editor/react";
import {
  generateExercise, explainConceptStream, submitCode, debugCode, runCode,
  type ExerciseData, type DebugAnalysis, type RunResponse,
} from "@/lib/api";
import { apiError as formatApiError } from "@/lib/errors";
import { useAuth, GUEST_LIMITS } from "@/lib/auth";
import { GuestUsageBadge, UpgradeModal } from "@/components/auth/GuestGate";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import { useGamification, XP_RULES } from "@/lib/gamification";
import ConfettiReward from "@/components/gamification/ConfettiReward";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

// ── Editor theme definitions ──────────────────────────────────────────────────

type EditorTheme = "vs-dark" | "dracula" | "monokai" | "light";

const EDITOR_THEMES: { id: EditorTheme; label: string; bg: string }[] = [
  { id: "vs-dark",  label: "Dark",    bg: "#1e1e1e" },
  { id: "dracula",  label: "Dracula", bg: "#282a36" },
  { id: "monokai",  label: "Monokai", bg: "#272822" },
  { id: "light",    label: "Light",   bg: "#fffffe" },
];

function defineCustomThemes(monaco: Monaco) {
  monaco.editor.defineTheme("dracula", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",           foreground: "6272a4", fontStyle: "italic" },
      { token: "keyword",           foreground: "ff79c6" },
      { token: "string",            foreground: "f1fa8c" },
      { token: "number",            foreground: "bd93f9" },
      { token: "type",              foreground: "8be9fd", fontStyle: "italic" },
      { token: "function",          foreground: "50fa7b" },
      { token: "variable",          foreground: "f8f8f2" },
      { token: "operator",          foreground: "ff79c6" },
      { token: "delimiter",         foreground: "f8f8f2" },
      { token: "identifier",        foreground: "f8f8f2" },
    ],
    colors: {
      "editor.background":              "#282a36",
      "editor.foreground":              "#f8f8f2",
      "editor.lineHighlightBackground": "#44475a55",
      "editor.selectionBackground":     "#44475a",
      "editorCursor.foreground":        "#f8f8f0",
      "editorLineNumber.foreground":    "#6272a4",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editor.inactiveSelectionBackground": "#44475a88",
      "editorIndentGuide.background1":   "#3d3f4e",
      "scrollbar.shadow":               "#000000",
      "scrollbarSlider.background":     "#44475a88",
      "scrollbarSlider.hoverBackground":"#44475aaa",
    },
  });

  monaco.editor.defineTheme("monokai", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",    foreground: "75715e", fontStyle: "italic" },
      { token: "keyword",    foreground: "f92672" },
      { token: "string",     foreground: "e6db74" },
      { token: "number",     foreground: "ae81ff" },
      { token: "type",       foreground: "66d9e8" },
      { token: "function",   foreground: "a6e22e" },
      { token: "variable",   foreground: "f8f8f2" },
      { token: "operator",   foreground: "f92672" },
      { token: "delimiter",  foreground: "f8f8f2" },
      { token: "identifier", foreground: "f8f8f2" },
    ],
    colors: {
      "editor.background":              "#272822",
      "editor.foreground":              "#f8f8f2",
      "editor.lineHighlightBackground": "#3e3d3255",
      "editor.selectionBackground":     "#49483e",
      "editorCursor.foreground":        "#f8f8f0",
      "editorLineNumber.foreground":    "#75715e",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editor.inactiveSelectionBackground": "#49483e88",
      "editorIndentGuide.background1":   "#3b3a32",
      "scrollbarSlider.background":     "#49483e88",
      "scrollbarSlider.hoverBackground":"#49483eaa",
    },
  });
}

const THEME_STORAGE_KEY = "learnflow_editor_theme";

// ── Constants ─────────────────────────────────────────────────────────────────

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const USER_ID = "demo-user";
function newSessionId() { return `session-${Date.now()}`; }

type SidePanel = "exercise" | "concept" | "debug" | "result" | "output";

const levelVariant = (d: string): "success" | "warning" | "danger" => {
  if (d === "beginner") return "success";
  if (d === "intermediate") return "warning";
  return "danger";
};

const PANEL_ICONS: Record<SidePanel, React.ReactNode> = {
  exercise: <Zap size={13} />,
  concept:  <BookOpen size={13} />,
  debug:    <Bug size={13} />,
  result:   <CheckCircle2 size={13} />,
  output:   <Play size={13} />,
};

// ── Markdown renderer ─────────────────────────────────────────────────────────

const CODE_BLOCK_CLS =
  "bg-surface-base border border-surface-border rounded-xl p-4 text-xs font-mono " +
  "text-ink-secondary overflow-x-auto whitespace-pre-wrap leading-relaxed my-3";
const CODE_BLOCK_STYLE = { background: "rgba(15,15,24,0.95)", borderColor: "rgba(139,92,246,0.2)" };

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose-learnflow text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-ink-primary mb-3 mt-0 pb-2 border-b border-surface-border">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-2 mt-4">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-ink-secondary mb-1.5 mt-3">{children}</h3>
          ),
          // Use div instead of p to safely contain block-level children (e.g. pre)
          p: ({ children }) => (
            <div className="text-xs text-ink-secondary leading-relaxed mb-2">{children}</div>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1 mb-3 pl-3">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1 mb-3 pl-3 list-decimal">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-xs text-ink-secondary leading-relaxed flex gap-1.5">
              <span className="text-brand-400 shrink-0 mt-0.5">•</span>
              <span>{children}</span>
            </li>
          ),
          // Handle block code via pre — never nest pre inside p
          pre: ({ children }) => (
            <pre className={CODE_BLOCK_CLS} style={CODE_BLOCK_STYLE}>
              {children}
            </pre>
          ),
          code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
            inline ? (
              <code className="bg-surface-base border border-surface-border rounded px-1 py-0.5 text-xs font-mono text-brand-300">
                {children}
              </code>
            ) : (
              // Block code — rendered inside the pre above, just pass children
              <code>{children}</code>
            ),
          strong: ({ children }) => (
            <strong className="font-semibold text-ink-primary">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-brand/40 pl-3 my-2 text-ink-tertiary italic text-xs">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExercisePage() {
  const { isGuest, user, consumeGuestUsage, usage } = useAuth();
  const { awardXP } = useGamification();

  const [topicInput, setTopicInput]     = useState("");
  const [topicError, setTopicError]     = useState("");
  const [difficulty, setDifficulty]     = useState<Difficulty>("beginner");
  const [exercise, setExercise]         = useState<ExerciseData | null>(null);
  const [conceptText, setConceptText]   = useState("");
  const [code, setCode]                 = useState("# Write your solution here\n");
  const [generating, setGenerating]     = useState(false);
  const [explaining, setExplaining]     = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [debugging, setDebugging]       = useState(false);
  const [errorMsg, setErrorMsg]         = useState("");
  const [panel, setPanel]               = useState<SidePanel>("exercise");
  const [submitResult, setSubmitResult] = useState<{ status: string; session_id: string } | null>(null);
  const [debugResult, setDebugResult]   = useState<DebugAnalysis | null>(null);
  const [apiError, setApiError]         = useState<string | null>(null);
  const [runResult, setRunResult]       = useState<RunResponse | null>(null);
  const [running, setRunning]           = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showSolution, setShowSolution]       = useState(false);
  const [editorTheme, setEditorTheme]   = useState<EditorTheme>("vs-dark");
  const [showConfetti, setShowConfetti] = useState(false);
  const sessionId = useRef(newSessionId());

  const limitReached = isGuest && usage.exercises >= GUEST_LIMITS.exercises;

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as EditorTheme | null;
    if (saved && EDITOR_THEMES.some((t) => t.id === saved)) setEditorTheme(saved);
  }, []);

  function handleThemeChange(id: EditorTheme) {
    setEditorTheme(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
    setShowThemePicker(false);
  }

  const currentThemeMeta = EDITOR_THEMES.find((t) => t.id === editorTheme)!;

  function validateTopic(): boolean {
    if (!topicInput.trim()) {
      setTopicError("Please enter a topic");
      return false;
    }
    setTopicError("");
    return true;
  }

  async function handleGenerate() {
    if (!validateTopic()) return;
    if (!consumeGuestUsage("exercises")) {
      setShowModal(true);
      return;
    }
    setGenerating(true);
    setApiError(null);
    setSubmitResult(null);
    setDebugResult(null);
    setShowSolution(false);
    try {
      const userId = user?.id ?? USER_ID;
      const res = await generateExercise({
        topic: topicInput.trim(),
        user_id: userId,
        session_id: sessionId.current,
        level: difficulty,
      });
      setExercise(res.exercise);
      setCode(res.exercise.starter_code ?? "# Write your solution here\n");
      sessionId.current = newSessionId();
      setPanel("exercise");
      awardXP(XP_RULES.exerciseGenerated, "Exercise generated", "exercise");
    } catch (e: unknown) {
      const msg = formatApiError(e); if (msg) setApiError(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function handleExplain() {
    if (!validateTopic()) return;
    setExplaining(true);
    setApiError(null);
    setConceptText("");
    setPanel("concept");
    const userId = user?.id ?? USER_ID;
    await explainConceptStream(
      { concept: topicInput.trim(), user_id: userId, session_id: sessionId.current, level: difficulty },
      (chunk) => setConceptText((prev) => prev + chunk),
      () => { setExplaining(false); },
      (err) => { setApiError(err); setExplaining(false); },
    );
  }

  async function handleSubmit() {
    if (!code.trim() || !exercise) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const userId = user?.id ?? USER_ID;
      const res = await submitCode({
        user_id: userId, session_id: sessionId.current,
        code, question: exercise.description,
      });
      setSubmitResult(res);
      setPanel("result");
      awardXP(XP_RULES.exerciseSubmitted, "Exercise submitted", "exercise");
      setShowConfetti(true);
    } catch (e: unknown) {
      const msg = formatApiError(e); if (msg) setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDebug() {
    if (!code.trim() || !errorMsg.trim()) return;
    setDebugging(true);
    setApiError(null);
    try {
      const userId = user?.id ?? USER_ID;
      const res = await debugCode({
        code, error: errorMsg, user_id: userId,
        session_id: sessionId.current, language: "python",
      });
      setDebugResult(res.analysis);
      setPanel("debug");
    } catch (e: unknown) {
      const msg = formatApiError(e); if (msg) setApiError(msg);
    } finally {
      setDebugging(false);
    }
  }

  async function handleRun() {
    if (!code.trim()) return;
    setRunning(true);
    setApiError(null);
    setRunResult(null);
    setPanel("output");
    try {
      const res = await runCode(code);
      setRunResult(res);
    } catch (e: unknown) {
      const msg = formatApiError(e); if (msg) setApiError(msg);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      {showModal && <UpgradeModal onClose={() => setShowModal(false)} />}
      <ConfettiReward active={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-surface-raised border-b border-surface-border px-4 py-3 shrink-0"
      >
        {/* Topic input row */}
        <div className="flex items-center gap-2 flex-wrap mb-2.5">
          <div className="flex-1 min-w-[240px] relative">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => { setTopicInput(e.target.value); if (topicError) setTopicError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="Enter a topic (e.g., Recursion, Binary Trees, SQL Joins)"
              className={[
                "w-full bg-surface-base border rounded-lg px-3 py-2 text-sm text-ink-primary",
                "placeholder:text-ink-disabled focus:outline-none transition-all duration-200",
                topicError
                  ? "border-danger/60 focus:border-danger focus:ring-1 focus:ring-danger/20"
                  : "border-surface-border focus:border-brand/60 focus:ring-1 focus:ring-brand/20",
              ].join(" ")}
            />
            {topicError && (
              <p className="absolute -bottom-5 left-0 text-xs text-danger-light">{topicError}</p>
            )}
          </div>

          {/* Difficulty select */}
          <div className="relative">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              aria-label="Difficulty"
              className="appearance-none bg-surface-base border border-surface-border rounded-lg
                         pl-3 pr-7 py-2 text-xs text-ink-primary font-medium
                         focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/20
                         hover:border-surface-border/80 transition-all duration-200 cursor-pointer"
            >
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-disabled pointer-events-none" />
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2 flex-wrap mt-5">
          <Button
            variant="primary"
            size="sm"
            onClick={limitReached ? () => setShowModal(true) : handleGenerate}
            loading={generating}
          >
            {generating ? "Generating…" : limitReached ? "🔒 Limit reached" : (
              <span className="flex items-center gap-1.5"><Zap size={12} />Generate Exercise</span>
            )}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExplain}
            loading={explaining}
          >
            {explaining ? "Explaining…" : (
              <span className="flex items-center gap-1.5"><BookOpen size={12} />Explain Concept</span>
            )}
          </Button>

          <GuestUsageBadge feature="exercises" />

          {/* Theme picker */}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowThemePicker((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                         bg-surface-base border border-surface-border text-ink-tertiary
                         hover:text-ink-secondary hover:border-brand/30 transition-all duration-200"
              title="Editor theme"
            >
              <Palette size={12} />
              <span className="hidden sm:inline">{currentThemeMeta.label}</span>
              <span
                className="w-2.5 h-2.5 rounded-full border border-surface-border shrink-0"
                style={{ background: currentThemeMeta.bg }}
              />
            </button>

            <AnimatePresence>
              {showThemePicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1.5 z-30 bg-surface-raised border border-surface-border
                             rounded-xl shadow-card-hover overflow-hidden min-w-[140px]"
                >
                  {EDITOR_THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleThemeChange(t.id)}
                      className={[
                        "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors duration-150",
                        editorTheme === t.id
                          ? "bg-brand/10 text-brand-300"
                          : "text-ink-secondary hover:bg-surface-hover hover:text-ink-primary",
                      ].join(" ")}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-surface-border shrink-0"
                        style={{ background: t.bg }}
                      />
                      {t.label}
                      {editorTheme === t.id && <span className="ml-auto text-brand-400">✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRun}
            disabled={!code.trim()}
            loading={running}
          >
            {running ? "Running…" : (
              <span className="flex items-center gap-1.5"><Play size={12} />Run</span>
            )}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!exercise}
            loading={submitting}
          >
            {submitting ? "Submitting…" : (
              <span className="flex items-center gap-1.5"><CheckCircle2 size={12} />Submit</span>
            )}
          </Button>
        </div>
      </motion.div>

      {/* ── Main split ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Editor column */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Monaco */}
          <div
            className="flex-1 overflow-hidden transition-colors duration-300"
            style={{ background: currentThemeMeta.bg }}
          >
            <MonacoEditor
              height="100%"
              language="python"
              theme={editorTheme}
              value={code}
              onChange={(v) => setCode(v ?? "")}
              beforeMount={defineCustomThemes}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                wordWrap: "on",
                automaticLayout: true,
                padding: { top: 20 },
                lineDecorationsWidth: 0,
                glyphMargin: false,
                renderLineHighlight: "line",
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
              }}
            />
          </div>

          {/* Debug bar */}
          <div className="bg-surface-raised border-t border-surface-border px-4 py-2.5
                          flex items-center gap-3 shrink-0">
            <input
              type="text"
              placeholder="Paste error message here to debug…"
              value={errorMsg}
              onChange={(e) => setErrorMsg(e.target.value)}
              className="input-base flex-1"
            />
            <Button
              variant="warning"
              size="sm"
              onClick={handleDebug}
              disabled={!errorMsg.trim() || !code.trim()}
              loading={debugging}
            >
              {debugging ? "Analyzing…" : (
                <span className="flex items-center gap-1.5"><Bug size={12} />Debug</span>
              )}
            </Button>
          </div>
        </div>

        {/* ── Side panel ────────────────────────────────────── */}
        <aside className="w-72 md:w-80 lg:w-96 shrink-0 bg-surface-raised border-l border-surface-border
                          flex-col overflow-hidden hidden sm:flex">

          {/* Tab bar */}
          <div className="flex border-b border-surface-border shrink-0 overflow-x-auto">
            {(["exercise", "concept", "output", "debug", "result"] as SidePanel[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setPanel(tab)}
                className={[
                  "flex-1 py-2.5 text-xs font-medium capitalize transition-all duration-200",
                  "flex items-center justify-center gap-1 shrink-0",
                  panel === tab ? "tab-active" : "tab-inactive",
                ].join(" ")}
              >
                {PANEL_ICONS[tab]}
                <span className="hidden md:inline">{tab}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* API error */}
            {apiError && <Alert variant="error">{apiError}</Alert>}

            <AnimatePresence mode="wait">

              {/* ── Exercise tab ── */}
              {panel === "exercise" && (
                <motion.div
                  key="exercise"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {!exercise && !generating && (
                    <div className="text-center mt-16">
                      <div
                        className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4"
                        style={{ boxShadow: "0 0 20px rgba(139,92,246,0.2)" }}
                      >
                        <Zap size={20} className="text-brand-300" />
                      </div>
                      <p className="text-sm text-ink-tertiary mb-1">No exercise yet</p>
                      <p className="text-xs text-ink-disabled">Enter a topic and click Generate Exercise</p>
                    </div>
                  )}
                  {generating && (
                    <div className="mt-8 space-y-3">
                      <div className="h-4 rounded-lg skeleton w-2/3" />
                      <div className="h-3 rounded-lg skeleton w-full" />
                      <div className="h-3 rounded-lg skeleton w-5/6" />
                      <div className="h-3 rounded-lg skeleton w-full" />
                      <div className="h-3 rounded-lg skeleton w-3/4" />
                      <div className="h-3 rounded-lg skeleton w-full" />
                    </div>
                  )}
                  {exercise && !generating && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-start gap-2 mb-4">
                        <h2 className="font-semibold text-sm leading-snug flex-1 text-ink-primary">
                          {exercise.title}
                        </h2>
                        <Badge variant={levelVariant(exercise.difficulty)} size="sm">
                          {exercise.difficulty}
                        </Badge>
                      </div>

                      {/* Render description as markdown */}
                      <MarkdownContent content={exercise.description} />

                      {exercise.hints?.length > 0 && (
                        <div className="mt-4">
                          <p className="section-label text-ink-disabled mb-3">Hints</p>
                          <ol className="space-y-2">
                            {exercise.hints.map((h, i) => (
                              <li key={i} className="text-xs text-ink-tertiary leading-relaxed
                                                     bg-surface-base border border-surface-border
                                                     rounded-xl px-3 py-2">
                                <span className="text-brand-400 font-semibold mr-1.5">{i + 1}.</span>
                                {h}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Show Solution toggle */}
                      {exercise.solution && (
                        <div className="mt-4">
                          <button
                            onClick={() => setShowSolution((v) => !v)}
                            className="flex items-center gap-2 text-xs font-medium text-ink-disabled
                                       hover:text-ink-secondary transition-colors duration-150 mb-3"
                          >
                            {showSolution ? <EyeOff size={12} /> : <Eye size={12} />}
                            {showSolution ? "Hide solution" : "Show solution"}
                          </button>
                          <AnimatePresence>
                            {showSolution && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <pre className="bg-surface-base border border-success/20 rounded-xl p-4
                                                text-xs text-success-light font-mono overflow-x-auto
                                                whitespace-pre-wrap leading-relaxed"
                                  style={{ boxShadow: "0 0 16px rgba(52,211,153,0.06)" }}
                                >
                                  {exercise.solution}
                                </pre>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* ── Concept tab ── */}
              {panel === "concept" && (
                <motion.div
                  key="concept"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {!conceptText && !explaining && (
                    <div className="text-center mt-16">
                      <div
                        className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4"
                        style={{ boxShadow: "0 0 20px rgba(139,92,246,0.2)" }}
                      >
                        <BookOpen size={20} className="text-brand-300" />
                      </div>
                      <p className="text-sm text-ink-tertiary mb-1">No explanation yet</p>
                      <p className="text-xs text-ink-disabled">Enter a topic and click Explain Concept</p>
                    </div>
                  )}
                  {explaining && !conceptText && (
                    <div className="mt-8 space-y-3">
                      <div className="h-4 rounded-lg skeleton w-2/3" />
                      <div className="h-3 rounded-lg skeleton w-full" />
                      <div className="h-3 rounded-lg skeleton w-5/6" />
                      <div className="h-3 rounded-lg skeleton w-full" />
                    </div>
                  )}
                  {conceptText && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <MarkdownContent content={conceptText} />
                      {explaining && (
                        <div className="flex items-center gap-2 mt-3 text-xs text-ink-disabled">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                          Generating…
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* ── Debug tab ── */}
              {panel === "debug" && (
                <motion.div
                  key="debug"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {!debugResult && (
                    <div className="text-center mt-16">
                      <div
                        className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4"
                        style={{ boxShadow: "0 0 20px rgba(245,158,11,0.2)" }}
                      >
                        <Bug size={20} className="text-warning-light" />
                      </div>
                      <p className="text-sm text-ink-tertiary mb-1">No debug result yet</p>
                      <p className="text-xs text-ink-disabled">Paste an error below and click Debug</p>
                    </div>
                  )}
                  {debugResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-5 text-sm"
                    >
                      {[
                        { label: "Root Cause",  content: debugResult.root_cause,  color: "text-danger-light" },
                        { label: "Explanation", content: debugResult.explanation, color: "text-warning-light" },
                        { label: "Fix",         content: debugResult.fix,         color: "text-success-light" },
                      ].map(({ label, content, color }) => (
                        <div key={label}>
                          <p className={`section-label ${color} mb-2`}>{label}</p>
                          <p className="text-ink-secondary leading-relaxed text-xs">{content}</p>
                        </div>
                      ))}
                      <div>
                        <p className="section-label text-brand-300 mb-2">Corrected Code</p>
                        <pre className="bg-surface-base rounded-xl p-4 text-xs text-ink-secondary
                                        font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed
                                        border border-surface-border">
                          {debugResult.corrected_code}
                        </pre>
                      </div>
                      {debugResult.key_concepts?.length > 0 && (
                        <div>
                          <p className="section-label text-ink-disabled mb-3">Review Concepts</p>
                          <div className="flex flex-wrap gap-2">
                            {debugResult.key_concepts.map((c) => (
                              <Badge key={c} variant="neutral" size="sm">{c}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* ── Result tab ── */}
              {panel === "result" && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {!submitResult && (
                    <div className="text-center mt-16">
                      <div
                        className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4"
                        style={{ boxShadow: "0 0 20px rgba(52,211,153,0.2)" }}
                      >
                        <CheckCircle2 size={20} className="text-success-light" />
                      </div>
                      <p className="text-sm text-ink-tertiary mb-1">Not submitted yet</p>
                      <p className="text-xs text-ink-disabled">Click Submit to evaluate your solution</p>
                    </div>
                  )}
                  {submitResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="rounded-2xl p-5 text-center"
                        style={{
                          background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(34,211,238,0.08) 100%)",
                          border: "1px solid rgba(139,92,246,0.3)",
                          boxShadow: "0 0 32px rgba(139,92,246,0.12)",
                        }}
                      >
                        <div className="text-3xl mb-2">✨</div>
                        <p className="text-2xl font-extrabold text-brand-300">+{XP_RULES.exerciseSubmitted} XP</p>
                        <p className="text-xs text-ink-tertiary mt-1">Exercise completed!</p>
                      </motion.div>

                      <Alert variant="success">
                        <p className="font-semibold mb-1.5">Submitted successfully</p>
                        <p className="text-xs opacity-80">Status: {submitResult.status}</p>
                        <p className="text-xs opacity-60 break-all mt-1">Session: {submitResult.session_id}</p>
                      </Alert>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* ── Output tab ── */}
              {panel === "output" && (
                <motion.div
                  key="output"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {running && (
                    <div className="mt-8 space-y-3">
                      <div className="h-3 rounded-lg skeleton w-1/2" />
                      <div className="h-3 rounded-lg skeleton w-3/4" />
                      <div className="h-3 rounded-lg skeleton w-2/3" />
                    </div>
                  )}
                  {!running && !runResult && (
                    <div className="text-center mt-16">
                      <div
                        className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4"
                        style={{ boxShadow: "0 0 20px rgba(52,211,153,0.15)" }}
                      >
                        <Play size={20} className="text-success-light" />
                      </div>
                      <p className="text-sm text-ink-tertiary mb-1">No output yet</p>
                      <p className="text-xs text-ink-disabled">Click Run to execute your code</p>
                    </div>
                  )}
                  {!running && runResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: runResult.exit_code === 0 ? "#34d399" : "#f87171" }}
                        />
                        <span className="text-xs font-semibold"
                          style={{ color: runResult.exit_code === 0 ? "#34d399" : "#f87171" }}
                        >
                          {runResult.timed_out
                            ? "Timed out"
                            : runResult.exit_code === 0
                            ? "Exited successfully"
                            : `Exited with code ${runResult.exit_code}`}
                        </span>
                      </div>

                      {runResult.stdout && (
                        <div>
                          <p className="section-label text-ink-disabled mb-2">Output</p>
                          <pre
                            className="rounded-xl p-4 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-words"
                            style={{
                              background: "rgba(15,15,24,0.95)",
                              border: "1px solid rgba(52,211,153,0.2)",
                              color: "#d1fae5",
                            }}
                          >
                            {runResult.stdout}
                          </pre>
                        </div>
                      )}

                      {runResult.stderr && (
                        <div>
                          <p className="section-label text-danger-light mb-2">Errors</p>
                          <pre
                            className="rounded-xl p-4 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-words"
                            style={{
                              background: "rgba(239,68,68,0.05)",
                              border: "1px solid rgba(239,68,68,0.2)",
                              color: "#fca5a5",
                            }}
                          >
                            {runResult.stderr}
                          </pre>
                        </div>
                      )}

                      {!runResult.stdout && !runResult.stderr && (
                        <p className="text-xs text-ink-disabled italic">(no output)</p>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </div>
  );
}
