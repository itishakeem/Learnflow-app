"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { generateExercise, submitCode, debugCode, type ExerciseData, type DebugAnalysis } from "@/lib/api";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const TOPICS = ["variables", "functions", "loops", "classes", "decorators", "async/await"];

const USER_ID = "demo-user";
function newSessionId() { return `session-${Date.now()}`; }

type SidePanel = "exercise" | "debug" | "result";

export default function ExercisePage() {
  const [topic, setTopic]           = useState(TOPICS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [exercise, setExercise]     = useState<ExerciseData | null>(null);
  const [code, setCode]             = useState("# Write your solution here\n");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [debugging, setDebugging]   = useState(false);
  const [errorMsg, setErrorMsg]     = useState("");
  const [panel, setPanel]           = useState<SidePanel>("exercise");
  const [submitResult, setSubmitResult] = useState<{ status: string; session_id: string } | null>(null);
  const [debugResult, setDebugResult]   = useState<DebugAnalysis | null>(null);
  const [apiError, setApiError]         = useState<string | null>(null);
  const sessionId = useRef(newSessionId());

  async function handleGenerate() {
    setGenerating(true);
    setApiError(null);
    setSubmitResult(null);
    setDebugResult(null);
    try {
      const res = await generateExercise({
        topic,
        user_id: USER_ID,
        session_id: sessionId.current,
        level: difficulty,
      });
      setExercise(res.exercise);
      setCode(res.exercise.starter_code ?? "# Write your solution here\n");
      sessionId.current = newSessionId();
      setPanel("exercise");
    } catch (e: unknown) {
      if (e instanceof Error) setApiError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit() {
    if (!code.trim() || !exercise) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const res = await submitCode({
        user_id: USER_ID,
        session_id: sessionId.current,
        code,
        question: exercise.description,
      });
      setSubmitResult(res);
      setPanel("result");
    } catch (e: unknown) {
      if (e instanceof Error) setApiError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDebug() {
    if (!code.trim() || !errorMsg.trim()) return;
    setDebugging(true);
    setApiError(null);
    try {
      const res = await debugCode({
        code,
        error: errorMsg,
        user_id: USER_ID,
        session_id: sessionId.current,
        language: "python",
      });
      setDebugResult(res.analysis);
      setPanel("debug");
    } catch (e: unknown) {
      if (e instanceof Error) setApiError(e.message);
    } finally {
      setDebugging(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">
      {/* Toolbar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-3 flex-wrap">
        <label className="text-xs text-gray-400 uppercase tracking-wider">Topic</label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="bg-gray-800 text-sm rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <label className="text-xs text-gray-400 uppercase tracking-wider ml-2">Difficulty</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="bg-gray-800 text-sm rounded-lg px-3 py-1.5 text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="ml-2 bg-gray-700 hover:bg-gray-600 text-sm px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate Exercise"}
        </button>

        <div className="flex-1" />

        <button
          onClick={handleSubmit}
          disabled={submitting || !exercise}
          className="bg-indigo-600 hover:bg-indigo-500 text-sm px-5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Monaco editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <MonacoEditor
              height="100%"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                wordWrap: "on",
                automaticLayout: true,
                padding: { top: 16 },
              }}
            />
          </div>

          {/* Debug bar */}
          <div className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex items-center gap-3">
            <input
              type="text"
              placeholder="Paste error message here to debug…"
              value={errorMsg}
              onChange={(e) => setErrorMsg(e.target.value)}
              className="flex-1 bg-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={handleDebug}
              disabled={debugging || !errorMsg.trim() || !code.trim()}
              className="bg-amber-600 hover:bg-amber-500 text-sm px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {debugging ? "Analyzing…" : "Debug"}
            </button>
          </div>
        </div>

        {/* Side panel */}
        <aside className="w-96 shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {(["exercise", "debug", "result"] as SidePanel[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setPanel(tab)}
                className={`flex-1 py-2 text-xs font-medium capitalize transition-colors
                  ${panel === tab
                    ? "text-indigo-400 border-b-2 border-indigo-500"
                    : "text-gray-500 hover:text-gray-300"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* API error */}
            {apiError && (
              <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-xs">
                {apiError}
              </div>
            )}

            {/* Exercise tab */}
            {panel === "exercise" && (
              <>
                {!exercise && !generating && (
                  <p className="text-gray-600 text-sm text-center mt-12">
                    Select a topic and click Generate Exercise to begin.
                  </p>
                )}
                {generating && (
                  <p className="text-gray-400 text-sm text-center mt-12">Generating exercise…</p>
                )}
                {exercise && !generating && (
                  <div>
                    <div className="flex items-start gap-2 mb-3">
                      <h2 className="font-semibold text-base leading-snug flex-1">{exercise.title}</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-300 shrink-0">
                        {exercise.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed mb-4">{exercise.description}</p>
                    {exercise.hints?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Hints</p>
                        <ol className="space-y-1">
                          {exercise.hints.map((h, i) => (
                            <li key={i} className="text-xs text-gray-400">
                              {i + 1}. {h}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Debug tab */}
            {panel === "debug" && (
              <>
                {!debugResult && (
                  <p className="text-gray-600 text-sm text-center mt-12">
                    Paste an error in the debug bar below and click Debug.
                  </p>
                )}
                {debugResult && (
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Root Cause</p>
                      <p className="text-gray-300">{debugResult.root_cause}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Explanation</p>
                      <p className="text-gray-300 leading-relaxed">{debugResult.explanation}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Fix</p>
                      <p className="text-gray-300 leading-relaxed">{debugResult.fix}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Corrected Code</p>
                      <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-200 overflow-x-auto font-mono whitespace-pre-wrap">
                        {debugResult.corrected_code}
                      </pre>
                    </div>
                    {debugResult.key_concepts?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Review</p>
                        <div className="flex flex-wrap gap-2">
                          {debugResult.key_concepts.map((c) => (
                            <span key={c} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Result tab */}
            {panel === "result" && (
              <>
                {!submitResult && (
                  <p className="text-gray-600 text-sm text-center mt-12">
                    Submit your solution to see the result.
                  </p>
                )}
                {submitResult && (
                  <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                    <p className="text-green-300 font-semibold text-sm mb-2">Submitted successfully</p>
                    <p className="text-gray-400 text-xs">Status: {submitResult.status}</p>
                    <p className="text-gray-400 text-xs break-all">Session: {submitResult.session_id}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
