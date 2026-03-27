// All requests go through the Next.js proxy at /api/svc/<service>/<endpoint>
const BASE = "/api/svc";

// ── Shared helper ────────────────────────────────────────────────────────────

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${text}`);
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
