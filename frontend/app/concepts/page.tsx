"use client";

import { useState } from "react";
import { explainConcept, type ConceptResponse } from "@/lib/api";

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
type Level = (typeof LEVELS)[number];

const LEVEL_BADGE: Record<Level, string> = {
  beginner:     "text-green-400 bg-green-900/30",
  intermediate: "text-yellow-400 bg-yellow-900/30",
  advanced:     "text-red-400 bg-red-900/30",
};

const USER_ID = "demo-user";
let sessionCounter = 0;
function newSessionId() { return `session-${Date.now()}-${++sessionCounter}`; }

export default function ConceptsPage() {
  const [concept, setConcept]   = useState("");
  const [level, setLevel]       = useState<Level>("beginner");
  const [context, setContext]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<ConceptResponse | null>(null);
  const [error, setError]       = useState<string | null>(null);

  async function handleExplain() {
    const trimmed = concept.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await explainConcept({
        concept: trimmed,
        user_id: USER_ID,
        session_id: newSessionId(),
        level,
        context: context.trim() || undefined,
      });
      setResult(res);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">Concept Explainer</h1>
      <p className="text-gray-400 text-sm mb-8">
        Type any programming concept and get a tailored explanation.
      </p>

      {/* Input form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8 space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. recursion, closures, async/await…"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleExplain()}
            className="flex-1 bg-gray-800 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize
                  ${level === l
                    ? `${LEVEL_BADGE[l]} ring-1 ring-current`
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          placeholder="Optional context (e.g. 'in the context of React hooks')"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />

        <button
          onClick={handleExplain}
          disabled={loading || !concept.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Generating explanation…" : "Explain"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-gray-800 rounded w-3/4" />
          <div className="h-4 bg-gray-800 rounded w-full" />
          <div className="h-4 bg-gray-800 rounded w-5/6" />
          <div className="h-4 bg-gray-800 rounded w-full" />
          <div className="h-4 bg-gray-800 rounded w-2/3" />
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <article className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold capitalize">{result.concept}</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${LEVEL_BADGE[result.explanation ? level : "beginner"]}`}>
              {level}
            </span>
          </div>
          <div className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
            {result.explanation}
          </div>
        </article>
      )}
    </div>
  );
}
