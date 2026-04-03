"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useGamification } from "@/lib/gamification";
import { ApiError } from "@/lib/errors";
import ProfileCard from "@/components/profile/ProfileCard";
import EditProfileForm from "@/components/profile/EditProfileForm";
import DeleteAccountModal from "@/components/profile/DeleteAccountModal";
import Button from "@/components/ui/Button";

const ease = [0.0, 0.0, 0.2, 1] as const;

export default function ProfilePage() {
  const { user, isGuest, logout } = useAuth();
  const { state, resetGamification } = useGamification();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Redirect guests to login
  useEffect(() => {
    if (isGuest) router.push("/login");
  }, [isGuest, router]);

  if (isGuest) return null;

  async function handleDeleteAccount(reason: string) {
    const token = localStorage.getItem("learnflow_token");
    const res = await fetch("/api/svc/auth/auth/delete-account", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body?.detail ?? res.statusText);
    }

    // Success: wipe all local data, log out, redirect
    setShowDelete(false);
    setDeleteSuccess(true);
    resetGamification();
    logout();
    setTimeout(() => router.push("/"), 2500);
  }

  if (deleteSuccess) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-success/10 border border-success/25 flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success-light">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-ink-primary mb-2">Account Deleted</h2>
          <p className="text-sm text-ink-tertiary">Your account has been successfully deleted. Redirecting you home…</p>
        </motion.div>
      </main>
    );
  }

  return (
    <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-10">
      {/* Background orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 w-[400px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="mb-8"
      >
        <p className="section-label text-brand-300 mb-2">Account</p>
        <h1 className="text-3xl font-bold text-ink-primary tracking-tight">Your Profile</h1>
        <p className="text-sm text-ink-tertiary mt-1.5">Manage your account details and preferences</p>
      </motion.div>

      {/* Profile card */}
      <div className="mb-6">
        <ProfileCard
          name={user!.name}
          email={user!.email}
          avatarUrl={user!.avatarUrl}
          totalXP={state.totalXP}
        />
      </div>

      {/* Edit / Form toggle */}
      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease }}
          >
            <EditProfileForm onDone={() => setEditing(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Button variant="secondary" size="md" onClick={() => setEditing(true)}>
              <span className="flex items-center gap-2">
                <Edit2 size={14} />
                Edit Profile
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease }}
        className="grid grid-cols-3 gap-4 mt-8"
      >
        {[
          { label: "Total XP",    value: state.totalXP.toLocaleString(), unit: "XP"   },
          { label: "Day Streak",  value: state.streak,                   unit: "days" },
          { label: "Daily Goals", value: `${Math.min(state.dailyGoals.conceptsDone + state.dailyGoals.exercisesDone, state.dailyGoals.conceptsTarget + state.dailyGoals.exercisesTarget)}/${state.dailyGoals.conceptsTarget + state.dailyGoals.exercisesTarget}`, unit: "done" },
        ].map(({ label, value, unit }) => (
          <div
            key={label}
            className="rounded-2xl p-4 text-center"
            style={{
              background: "rgba(15,15,24,0.95)",
              border: "1px solid rgba(139,92,246,0.12)",
            }}
          >
            <p className="text-xl font-bold text-brand-300 tabular-nums">{value}</p>
            <p className="text-2xs text-ink-disabled mt-0.5">{unit}</p>
            <p className="text-xs text-ink-tertiary mt-1">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Danger zone */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25, ease }}
        className="mt-10 rounded-2xl p-5"
        style={{
          background: "rgba(239,68,68,0.03)",
          border: "1px solid rgba(239,68,68,0.15)",
        }}
      >
        <h3 className="text-sm font-semibold text-danger-light mb-1">Danger Zone</h3>
        <p className="text-xs text-ink-disabled mb-4 leading-relaxed">
          Once you delete your account, there is no going back. All your progress, data, and history will be permanently erased.
        </p>
        {deleteError && (
          <p className="text-xs text-danger-light mb-3">{deleteError}</p>
        )}
        <Button
          variant="danger"
          size="sm"
          onClick={() => { setDeleteError(""); setShowDelete(true); }}
        >
          <Trash2 size={13} />
          Delete Account
        </Button>
      </motion.div>

      {/* Delete confirmation modal */}
      {showDelete && (
        <DeleteAccountModal
          onClose={() => setShowDelete(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </div>
  );
}
