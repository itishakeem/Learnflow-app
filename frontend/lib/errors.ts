/**
 * Centralized API error handler.
 *
 * Usage:
 *   import { apiError } from "@/lib/errors";
 *   catch (e) { setError(apiError(e)); }
 */

export function apiError(err: unknown): string | null {
  // Network / fetch failure (no response at all)
  if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
    return "Unable to connect. Check your internet connection and try again.";
  }

  if (err instanceof ApiError) {
    return friendlyMessage(err.status, err.detail);
  }

  if (err instanceof Error) {
    // Errors thrown by our json() helper: "HTTP 404: ..."
    const match = err.message.match(/^HTTP (\d+):/);
    if (match) {
      const status = parseInt(match[1], 10);
      const detail = err.message.replace(/^HTTP \d+:\s*/, "");
      return friendlyMessage(status, detail);
    }
    console.error("[LearnFlow]", err.message);
    return "Something went wrong. Please try again.";
  }

  console.error("[LearnFlow] Unknown error:", err);
  return "An unexpected error occurred. Please try again.";
}

function friendlyMessage(status: number, detail: string): string | null {
  switch (status) {
    case 400: return "Invalid request. Please check your input and try again.";
    case 401: return "Your session has expired. Please sign in again.";
    case 403: return "You don't have permission to perform this action.";
    case 404: return "Progress data not found. Start learning to track your progress!";
    case 409: return "An account with this email already exists.";
    case 422:
      // Validation errors are caused by bad input — silently log, never surface to UI
      console.error("[LearnFlow] Validation error (422):", detail);
      return null;
    case 429: return "Too many requests. Please wait a moment and try again.";
    case 500:
    case 502:
    case 503:
    case 504:
      console.error(`[LearnFlow] Server error ${status}:`, detail);
      return "Something went wrong on our end. Please try again shortly.";
    default:
      console.error(`[LearnFlow] API error ${status}:`, detail);
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
