"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { apiError } from "@/lib/errors";

const REASONS = [
  "Not useful for my needs",
  "Found a better platform",
  "Too many bugs or issues",
  "Privacy concerns",
  "Just testing — no longer needed",
  "Other",
] as const;

interface Props {
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export default function DeleteAccountModal({ onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<string>("");
  const [other, setOther]       = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const reason = selected === "Other" ? other.trim() : selected;
  const canDelete = confirmed && selected !== "" && (selected !== "Other" || other.trim() !== "");

  async function handleDelete() {
    if (!canDelete) return;
    setLoading(true);
    setError("");
    try {
      await onConfirm(reason);
    } catch (e: unknown) {
      setError(apiError(e) ?? "Failed to delete account. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
        onClick={onClose}
      >
        {/* Modal */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
          style={{
            background: "linear-gradient(135deg, rgba(15,15,24,0.99) 0%, rgba(10,10,18,0.99) 100%)",
            border: "1px solid rgba(239,68,68,0.25)",
            boxShadow: "0 0 60px rgba(239,68,68,0.08), 0 4px 32px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger/10 border border-danger/25 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-danger-light" />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink-primary">Delete Account</h2>
                <p className="text-xs text-ink-disabled mt-0.5">This action is permanent and cannot be undone</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-disabled hover:text-ink-secondary hover:bg-surface-raised transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Warning box */}
          <div className="rounded-xl p-3.5 text-xs text-danger-light leading-relaxed"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            Deleting your account will permanently remove your profile, progress history, and all learning data.
            You will not be able to recover this data.
          </div>

          {/* Reason selection */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-ink-secondary">Why are you leaving?</p>
            <div className="flex flex-col gap-1.5">
              {REASONS.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150"
                  style={{
                    background: selected === r ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selected === r ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={selected === r}
                    onChange={() => setSelected(r)}
                    className="sr-only"
                  />
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                    style={{
                      borderColor: selected === r ? "rgba(239,68,68,0.8)" : "rgba(255,255,255,0.2)",
                    }}>
                    {selected === r && (
                      <div className="w-2 h-2 rounded-full bg-danger-light" />
                    )}
                  </div>
                  <span className="text-xs text-ink-secondary">{r}</span>
                </label>
              ))}
            </div>

            {/* "Other" text input */}
            <AnimatePresence>
              {selected === "Other" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <textarea
                    value={other}
                    onChange={(e) => setOther(e.target.value)}
                    placeholder="Please tell us more…"
                    rows={2}
                    className="w-full mt-1 px-3 py-2 rounded-xl text-xs text-ink-primary placeholder:text-ink-disabled resize-none focus:outline-none focus:ring-1 focus:ring-danger/40"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <div className="w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center"
                style={{
                  background: confirmed ? "rgba(239,68,68,0.8)" : "transparent",
                  borderColor: confirmed ? "rgba(239,68,68,0.8)" : "rgba(255,255,255,0.2)",
                }}>
                {confirmed && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-white">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-ink-tertiary leading-relaxed">
              I understand this action is <span className="text-danger-light font-semibold">permanent and irreversible</span>. All my data will be deleted.
            </span>
          </label>

          {/* Error */}
          {error && (
            <p className="text-xs text-danger-light px-1">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" size="md" className="flex-1" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              disabled={!canDelete}
              loading={loading}
              onClick={handleDelete}
            >
              {loading ? "Deleting…" : "Delete My Account"}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
