// All requests go through the Next.js proxy at /api/svc/<service>/<endpoint>
const BASE = "/api/svc";

import { ApiError } from "@/lib/errors";

// ── Shared helper ────────────────────────────────────────────────────────────

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      const rawDetail = body?.detail ?? body?.error ?? body;
      if (typeof rawDetail === "string") {
        detail = rawDetail;
      } else if (Array.isArray(rawDetail)) {
        // FastAPI 422 validation errors: [{type, loc, msg, input, ctx}, ...]
        detail = rawDetail.map((e: { msg?: string }) => e.msg ?? JSON.stringify(e)).join("; ");
      } else {
        detail = JSON.stringify(rawDetail);
      }
    } catch {
      detail = await res.text().catch(() => res.statusText);
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

function post<T>(url: string, body: unknown): Promise<T> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => json<T>(res));
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface TriageResponse {
  status: string;
  service: string;
  session_id: string;
}

export interface ConceptResponse {
  status: string;
  service: string;
  session_id: string;
  concept: string;
  explanation: string;
}

export interface ExerciseData {
  title: string;
  description: string;
  starter_code: string;
  hints: string[];
  expected_output: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  solution?: string;
}

export interface ExerciseResponse {
  status: string;
  service: string;
  session_id: string;
  topic: string;
  exercise: ExerciseData;
}

export interface DebugAnalysis {
  root_cause: string;
  explanation: string;
  fix: string;
  corrected_code: string;
  key_concepts: string[];
}

export interface DebugResponse {
  status: string;
  service: string;
  session_id: string;
  language: string;
  analysis: DebugAnalysis;
}

export interface ProgressSummary {
  concepts_viewed: number;
  exercises_completed: number;
  last_active: string | null;
}

export interface RecentConcept {
  concept: string;
  level: string;
  at: string;
}

export interface RecentExercise {
  topic: string;
  level: string;
  score: number | null;
  at: string;
}

export interface ProgressResponse {
  status: string;
  service: string;
  user_id: string;
  summary: ProgressSummary;
  recent_concepts: RecentConcept[];
  recent_exercises: RecentExercise[];
}

// ── Triage ───────────────────────────────────────────────────────────────────

export function submitCode(params: {
  user_id: string;
  session_id: string;
  code: string;
  question?: string;
}): Promise<TriageResponse> {
  return post(`${BASE}/triage/invoke`, params);
}

// ── Concepts ─────────────────────────────────────────────────────────────────

export function explainConcept(params: {
  concept: string;
  user_id: string;
  session_id: string;
  level?: string;
  context?: string;
}): Promise<ConceptResponse> {
  return post(`${BASE}/concepts/explain`, params);
}

/**
 * Streaming version of explainConcept.
 * Calls onChunk for each text chunk received, then onDone with final metadata.
 * Calls onError if anything goes wrong.
 */
export async function explainConceptStream(
  params: { concept: string; user_id: string; session_id: string; level?: string; context?: string },
  onChunk: (text: string) => void,
  onDone: (meta: { session_id: string; concept: string }) => void,
  onError: (msg: string) => void,
): Promise<void> {
  const res = await fetch(`${BASE}/concepts/explain/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => res.statusText);
    onError(`HTTP ${res.status}: ${text}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";   // keep incomplete line

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const payload = JSON.parse(line.slice(6)) as {
          chunk?: string;
          done?: boolean;
          error?: string;
          session_id?: string;
          concept?: string;
        };
        if (payload.error) {
          onError(payload.error);
          return;
        }
        if (payload.chunk) {
          onChunk(payload.chunk);
        }
        if (payload.done) {
          onDone({ session_id: payload.session_id ?? "", concept: payload.concept ?? "" });
          return;
        }
      } catch {
        // malformed SSE line — skip
      }
    }
  }
}

// ── Exercise ─────────────────────────────────────────────────────────────────

export function generateExercise(params: {
  topic: string;
  user_id: string;
  session_id: string;
  level?: string;
  context?: string;
}): Promise<ExerciseResponse> {
  return post(`${BASE}/exercise/generate`, params);
}

// ── Debug ─────────────────────────────────────────────────────────────────────

export function debugCode(params: {
  code: string;
  error: string;
  user_id: string;
  session_id: string;
  language?: string;
}): Promise<DebugResponse> {
  return post(`${BASE}/debug/debug`, params);
}

// ── Progress ──────────────────────────────────────────────────────────────────

export function getProgress(user_id: string): Promise<ProgressResponse> {
  return fetch(`${BASE}/progress/progress?user_id=${encodeURIComponent(user_id)}`).then((res) => json<ProgressResponse>(res));
}

// ── Run Python code ───────────────────────────────────────────────────────────

export interface RunResponse {
  status:    string;
  service:   string;
  stdout:    string;
  stderr:    string;
  exit_code: number;
  timed_out: boolean;
}

export function runCode(code: string): Promise<RunResponse> {
  return post(`${BASE}/exercise/run`, { code });
}
