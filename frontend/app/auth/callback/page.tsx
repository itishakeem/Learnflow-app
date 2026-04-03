"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

/**
 * /auth/callback
 *
 * The auth service redirects here after a successful OAuth flow:
 *   GET /auth/callback?token=<JWT>&provider=google|github
 *
 * This page:
 *  1. Reads `?token` from the URL
 *  2. Decodes the JWT payload (without verifying — trust is established by
 *     the auth service; the token itself is verified on every API call)
 *  3. Calls login() to hydrate the auth context and persist to localStorage
 *  4. Redirects to /dashboard
 *
 * On error it redirects to /login?error=<reason>
 */
export default function AuthCallbackPage() {
  const { login }      = useAuth();
  const router         = useRouter();
  const searchParams   = useSearchParams();
  const processed      = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token    = searchParams.get("token");
    const provider = searchParams.get("provider") ?? "oauth";
    const isNew    = searchParams.get("new") === "1";

    if (!token) {
      router.replace("/login?error=missing_token");
      return;
    }

    try {
      // Decode JWT payload (base64url, middle segment)
      const [, payloadB64] = token.split(".");
      // base64url → base64 → JSON
      const padded  = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
      const json    = atob(padded);
      const payload = JSON.parse(json) as {
        sub:    string;
        email:  string;
        name:   string;
        avatar?: string;
      };

      if (!payload.sub || !payload.email) throw new Error("invalid payload");

      login({
        id:        payload.sub,
        name:      payload.name || payload.email.split("@")[0],
        email:     payload.email,
        avatarUrl: payload.avatar ?? undefined,
      }, isNew);

      // Store the JWT for use in authenticated API requests
      try { localStorage.setItem("learnflow_token", token); } catch { /* ignore */ }

      router.replace("/dashboard");
    } catch {
      console.error("OAuth callback: failed to decode token");
      router.replace(`/login?error=invalid_token&provider=${provider}`);
    }
  }, [login, router, searchParams]);

  return (
    <main className="min-h-dvh flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="w-10 h-10 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
        <p className="text-sm text-ink-tertiary">Signing you in…</p>
      </div>
    </main>
  );
}
