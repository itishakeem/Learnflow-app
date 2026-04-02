"use client";

import {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
}

interface GuestUsage {
  concepts: number;   // calls used this session
  exercises: number;
}

interface AuthState {
  user: User | null;
  isGuest: boolean;       // true when no user is logged in
  usage: GuestUsage;      // only relevant for guests
  loading: boolean;
  // actions
  login:  (user: User) => void;
  logout: () => void;
  /** Call before a gated action. Returns true if allowed, false if limit hit. */
  consumeGuestUsage: (feature: "concepts" | "exercises") => boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const GUEST_LIMITS: Record<keyof GuestUsage, number> = {
  concepts:  2,
  exercises: 2,
};

const STORAGE_KEY = "learnflow_user";

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage]   = useState<GuestUsage>({ concepts: 0, exercises: 0 });

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as User);
    } catch {
      /* ignore corrupt storage */
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((u: User) => {
    setUser(u);
    setUsage({ concepts: 0, exercises: 0 }); // reset usage on sign-in
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch { /* ignore */ }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setUsage({ concepts: 0, exercises: 0 });
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const consumeGuestUsage = useCallback((feature: keyof GuestUsage): boolean => {
    if (user) return true; // authenticated users are never limited
    if (usage[feature] >= GUEST_LIMITS[feature]) return false; // limit hit
    setUsage((prev) => ({ ...prev, [feature]: prev[feature] + 1 }));
    return true;
  }, [user, usage]);

  return (
    <AuthContext.Provider value={{
      user,
      isGuest: !user,
      usage,
      loading,
      login,
      logout,
      consumeGuestUsage,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
