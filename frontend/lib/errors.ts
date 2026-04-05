/**
 * Centralized API error handler.
 * - Never exposes raw server details or stack traces to the UI.
 * - Logs to console only in development.
 *
 * Usage:
 *   import { apiError } from "@/lib/errors";
 *   catch (e) { setError(apiError(e)); }
 */

const isDev = process.env.NODE_ENV === "development";

function devLog(...args: unknown[]): void {
  if (isDev) console.error(...args);
}

export function apiError(err: unknown): string | null {
  // Network / fetch failure (no response at all)
  if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
    devLog("[LearnFlow] Network error:", err.message);
    return "Unable to connect. Check your internet connection and try again.";
  }

  if (err instanceof ApiError) {
    return friendlyMessage(err.status, err.detail);
  }

  if (err instanceof Error) {
    const match = err.message.match(/^HTTP (\d+):/);
    if (match) {
      const status = parseInt(match[1], 10);
      const detail = err.message.replace(/^HTTP \d+:\s*/, "");
      return friendlyMessage(status, detail);
    }
    devLog("[LearnFlow] Unexpected error:", err.message);
    return "Something went wrong. Please try again.";
  }

  devLog("[LearnFlow] Unknown error:", err);
  return "An unexpected error occurred. Please try again.";
}

function friendlyMessage(status: number, detail: string): string | null {
  switch (status) {
    case 400:
      devLog("[LearnFlow] Bad request (400):", detail);
      return "Invalid request. Please check your input and try again.";
    case 401:
      devLog("[LearnFlow] Unauthorized (401):", detail);
      return "Your session has expired. Please sign in again.";
    case 403:
      devLog("[LearnFlow] Forbidden (403):", detail);
      return "You don't have permission to perform this action.";
    case 404:
      devLog("[LearnFlow] Not found (404):", detail);
      return null; // Expected for new users — no error shown
    case 409:
      return "An account with this email already exists.";
    case 422:
      devLog("[LearnFlow] Validation error (422):", detail);
      return null; // Bad input — suppress from UI
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 500:
    case 502:
    case 503:
    case 504:
      devLog(`[LearnFlow] Server error ${status}:`, detail);
      return "Something went wrong on our end. Please try again shortly.";
    default:
      devLog(`[LearnFlow] API error ${status}:`, detail);
      return "Something went wrong. Please try again.";
  }
}

/** Structured error class for explicit API throws */
export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(`HTTP ${status}: ${detail}`);
    this.name = "ApiError";
  }
}
