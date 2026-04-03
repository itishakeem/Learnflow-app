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
  avatarUrl?: string;
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
  isNewUser: boolean;     // true immediately after signup (one-time flag)
  // actions
  login:  (user: User, newUser?: boolean) => void;
  logout: () => void;
  clearNewUser: () => void;
  /** Call before a gated action. Returns true if allowed, false if limit hit. */
  consumeGuestUsage: (feature: "concepts" | "exercises") => boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const GUEST_LIMITS: Record<keyof GuestUsage, number> = {
  concepts:  2,
  exercises: 2,
};

const STORAGE_KEY = "learnflow_user";
const NEW_USER_KEY = "learnflow_new_user";

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [loading, setLoading]   = useState(true);
  const [usage, setUsage]       = useState<GuestUsage>({ concepts: 0, exercises: 0 });
  const [isNewUser, setIsNewUser] = useState(false);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as User);
      // Restore one-time new-user flag
      if (localStorage.getItem(NEW_USER_KEY) === "1") setIsNewUser(true);
    } catch {
      /* ignore corrupt storage */
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((u: User, newUser = false) => {
    setUser(u);
    setIsNewUser(newUser);
    setUsage({ concepts: 0, exercises: 0 });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      if (newUser) {
        localStorage.setItem(NEW_USER_KEY, "1");
      } else {
        localStorage.removeItem(NEW_USER_KEY);
      }
    } catch { /* ignore */ }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsNewUser(false);
    setUsage({ concepts: 0, exercises: 0 });
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(NEW_USER_KEY);
      localStorage.removeItem("learnflow_token");
      localStorage.removeItem("learnflow_gamification");
    } catch { /* ignore */ }
  }, []);

  // Call once after the dashboard reads the flag so it doesn't show again on refresh
  const clearNewUser = useCallback(() => {
    setIsNewUser(false);
    try { localStorage.removeItem(NEW_USER_KEY); } catch { /* ignore */ }
  }, []);

  const consumeGuestUsage = useCallback((feature: keyof GuestUsage): boolean => {
    if (user) return true;
    if (usage[feature] >= GUEST_LIMITS[feature]) return false;
    setUsage((prev) => ({ ...prev, [feature]: prev[feature] + 1 }));
    return true;
  }, [user, usage]);

  return (
    <AuthContext.Provider value={{
      user,
      isGuest: !user,
      usage,
      loading,
      isNewUser,
      login,
      logout,
      clearNewUser,
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
