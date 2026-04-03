"use client";

import { createContext, useContext, useEffect, useReducer, useCallback, useRef } from "react";

// ── XP rules ─────────────────────────────────────────────────────────────────
export const XP_RULES = {
  dailyLogin: 5,
  conceptExplained: 8,
  exerciseGenerated: 3,
  exerciseSubmitted: 10,
  correctAnswer: 5,
} as const;

// ── Level thresholds ─────────────────────────────────────────────────────────
const LEVELS = [
  { level: 1,  minXP: 0,    maxXP: 100,  title: "Novice"      },
  { level: 2,  minXP: 100,  maxXP: 250,  title: "Apprentice"  },
  { level: 3,  minXP: 250,  maxXP: 450,  title: "Explorer"    },
  { level: 4,  minXP: 450,  maxXP: 700,  title: "Developer"   },
  { level: 5,  minXP: 700,  maxXP: 1000, title: "Engineer"    },
  { level: 6,  minXP: 1000, maxXP: 1400, title: "Architect"   },
  { level: 7,  minXP: 1400, maxXP: 1900, title: "Master"      },
  { level: 8,  minXP: 1900, maxXP: 2500, title: "Wizard"      },
  { level: 9,  minXP: 2500, maxXP: 3200, title: "Legend"      },
  { level: 10, minXP: 3200, maxXP: 9999, title: "Grandmaster" },
];

export function getLevelInfo(totalXP: number) {
  const info = LEVELS.find((l) => totalXP >= l.minXP && totalXP < l.maxXP) ?? LEVELS[LEVELS.length - 1];
  const progress = ((totalXP - info.minXP) / (info.maxXP - info.minXP)) * 100;
  return { ...info, progress: Math.min(progress, 100), xpToNext: Math.max(info.maxXP - totalXP, 0) };
}

// ── Daily goals ───────────────────────────────────────────────────────────────
export interface DailyGoals {
  conceptsTarget: number;
  exercisesTarget: number;
  conceptsDone: number;
  exercisesDone: number;
  date: string; // YYYY-MM-DD
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ── State ─────────────────────────────────────────────────────────────────────
export interface GamificationState {
  totalXP: number;
  streak: number;
  lastActiveDate: string | null;
  dailyGoals: DailyGoals;
  pendingToast: { xp: number; label: string } | null;
  levelUpPending: boolean;
}

const STORAGE_KEY = "learnflow_gamification";

function loadState(): GamificationState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return JSON.parse(raw) as GamificationState;
  } catch {
    return defaultState();
  }
}

function defaultState(): GamificationState {
  return {
    totalXP: 0,
    streak: 0,
    lastActiveDate: null,
    dailyGoals: {
      conceptsTarget: 3,
      exercisesTarget: 3,
      conceptsDone: 0,
      exercisesDone: 0,
      date: todayStr(),
    },
    pendingToast: null,
    levelUpPending: false,
  };
}

function saveState(s: GamificationState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

// ── Reducer ───────────────────────────────────────────────────────────────────
type Action =
  | { type: "AWARD_XP"; xp: number; label: string; category?: "concept" | "exercise" }
  | { type: "CLEAR_TOAST" }
  | { type: "CLEAR_LEVEL_UP" }
  | { type: "TICK_STREAK" }
  | { type: "RESTORE"; state: GamificationState }
  | { type: "RESET" };

function getStreakState(state: GamificationState): { streak: number } {
  const today = todayStr();
  const last = state.lastActiveDate;
  if (!last) return { streak: 1 };
  if (last === today) return { streak: state.streak };

  const dayDiff = (new Date(today).getTime() - new Date(last).getTime()) / 86_400_000;
  if (dayDiff <= 1) return { streak: state.streak + 1 };
  return { streak: 1 }; // reset
}

function reducer(state: GamificationState, action: Action): GamificationState {
  switch (action.type) {
    case "TICK_STREAK": {
      const today = todayStr();
      if (state.lastActiveDate === today) return state; // already ticked today
      const { streak } = getStreakState(state);
      const next = { ...state, streak, lastActiveDate: today };
      saveState(next);
      return next;
    }

    case "AWARD_XP": {
      const prevLevel = getLevelInfo(state.totalXP).level;
      const newXP = state.totalXP + action.xp;
      const newLevel = getLevelInfo(newXP).level;
      const levelUpPending = newLevel > prevLevel;

      // Reset daily goals if new day
      const today = todayStr();
      let goals = state.dailyGoals;
      if (goals.date !== today) {
        goals = { ...goals, conceptsDone: 0, exercisesDone: 0, date: today };
      }
      if (action.category === "concept") goals = { ...goals, conceptsDone: goals.conceptsDone + 1 };
      if (action.category === "exercise") goals = { ...goals, exercisesDone: goals.exercisesDone + 1 };

      const next: GamificationState = {
        ...state,
        totalXP: newXP,
        dailyGoals: goals,
        pendingToast: { xp: action.xp, label: action.label },
        levelUpPending,
      };
      saveState(next);
      return next;
    }

    case "CLEAR_TOAST":
      return { ...state, pendingToast: null };

    case "CLEAR_LEVEL_UP":
      return { ...state, levelUpPending: false };

    case "RESTORE":
      return action.state;

    case "RESET": {
      const fresh = defaultState();
      saveState(fresh);
      return fresh;
    }

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
interface GamificationCtx {
  state: GamificationState;
  awardXP: (xp: number, label: string, category?: "concept" | "exercise") => void;
  clearToast: () => void;
  clearLevelUp: () => void;
  resetGamification: () => void;
  levelInfo: ReturnType<typeof getLevelInfo>;
}

const Ctx = createContext<GamificationCtx | null>(null);

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  // Always start with defaultState() so server and client render identically,
  // then rehydrate from localStorage after mount to avoid hydration mismatch.
  const [state, dispatch] = useReducer(reducer, undefined, defaultState);
  const tickedRef = useRef(false);

  // After mount, rehydrate from localStorage. This runs only on the client,
  // keeping server and initial client render identical (no hydration mismatch).
  useEffect(() => {
    const saved = loadState();
    dispatch({ type: "RESTORE", state: saved });
  }, []);

  // Tick streak once on mount (daily login)
  useEffect(() => {
    if (tickedRef.current) return;
    tickedRef.current = true;
    dispatch({ type: "TICK_STREAK" });
  }, []);

  const awardXP = useCallback((xp: number, label: string, category?: "concept" | "exercise") => {
    dispatch({ type: "AWARD_XP", xp, label, category });
  }, []);

  const clearToast = useCallback(() => dispatch({ type: "CLEAR_TOAST" }), []);
  const clearLevelUp = useCallback(() => dispatch({ type: "CLEAR_LEVEL_UP" }), []);
  const resetGamification = useCallback(() => dispatch({ type: "RESET" }), []);

  const levelInfo = getLevelInfo(state.totalXP);

  return (
    <Ctx.Provider value={{ state, awardXP, clearToast, clearLevelUp, resetGamification, levelInfo }}>
      {children}
    </Ctx.Provider>
  );
}

export function useGamification() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGamification must be inside GamificationProvider");
  return ctx;
}
