"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, User } from "lucide-react";
import { AuthCard }    from "@/components/auth/AuthCard";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { SocialButton } from "@/components/auth/SocialButton";
import PasswordInput   from "@/components/auth/PasswordInput";
import Input           from "@/components/ui/Input";
import Button          from "@/components/ui/Button";
import { useAuth }     from "@/lib/auth";

const ease = [0.0, 0.0, 0.2, 1] as const;

function StrengthBar({ password }: { password: string }) {
  const score =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);

  const colors  = ["bg-danger", "bg-warning", "bg-warning-light", "bg-success"];
  const labels  = ["Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score - 1] : "bg-surface-border"
            }`}
          />
        ))}
      </div>
      <span className="text-2xs text-ink-tertiary">{labels[score - 1] ?? ""}</span>
    </div>
  );
}

function validatePassword(pw: string): string | null {
  if (pw.length < 8)           return "Password must be at least 8 characters";
  if (!/[a-zA-Z]/.test(pw))   return "Password must include at least one letter";
  if (!/[0-9]/.test(pw))      return "Password must include at least one number";
  return null;
}

export default function SignupPage() {
  const { login } = useAuth();
  const router    = useRouter();

  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [agreed, setAgreed]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  const canSubmit = name.trim() && email.trim() && password && confirm && agreed;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim())  errs.name = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    if (password !== confirm) errs.confirm = "Passwords do not match";
    if (!agreed) errs.agreed = "You must accept the terms";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/svc/auth/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name:     name.trim(),
          email:    email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setErrors({ email: "An account with this email already exists" });
        } else {
          const raw = data.detail;
          setErrors({ email: Array.isArray(raw) || typeof raw !== "string" ? "Sign up failed — please try again" : raw });
        }
        return;
      }
      try { localStorage.setItem("learnflow_token", data.token); } catch { /* ignore */ }
      login({
        id:        data.user.id,
        name:      data.user.name,
        email:     data.user.email,
        avatarUrl: data.user.avatarUrl ?? undefined,
      }, true); // isNewUser = true
      router.push("/dashboard");
    } catch {
      setErrors({ email: "Network error — please try again" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-dvh flex items-center justify-center px-4 py-16 overflow-hidden">
      {/* Background orb */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[500px] h-[400px] rounded-full bg-accent/6 blur-[130px]" />
      </div>

      <AuthCard title="Create account" subtitle="Start learning Python with AI">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35, ease }}
          >
            <Input
              label="Name"
              placeholder="Your full name"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
              required
              disabled={loading}
              leftIcon={<User size={15} />}
              error={errors.name}
            />
          </motion.div>

          {/* Email */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35, ease }}
          >
            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
              required
              disabled={loading}
              leftIcon={<Mail size={15} />}
              error={errors.email}
            />
          </motion.div>

          {/* Password + strength */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35, ease }}
          >
            <PasswordInput
              label="Password"
              placeholder="Min. 8 characters, letters & numbers"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
              required
              disabled={loading}
              error={errors.password}
            />
            <StrengthBar password={password} />
          </motion.div>

          {/* Confirm Password */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.35, ease }}
          >
            <PasswordInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: "" })); }}
              required
              disabled={loading}
              error={errors.confirm}
            />
          </motion.div>

          {/* Terms checkbox */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.35 }}
          >
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={agreed}
                  onChange={(e) => { setAgreed(e.target.checked); setErrors((p) => ({ ...p, agreed: "" })); }}
                />
                <div className="w-4 h-4 rounded border border-surface-border bg-surface-base
                                peer-checked:bg-brand peer-checked:border-brand
                                transition-all duration-200 flex items-center justify-center">
                  {agreed && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-white">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <span className="text-xs text-ink-tertiary leading-relaxed group-hover:text-ink-secondary transition-colors">
                  I agree to the{" "}
                  <Link href="#" className="text-brand-300 hover:text-brand-200 font-medium transition-colors">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="text-brand-300 hover:text-brand-200 font-medium transition-colors">
                    Privacy Policy
                  </Link>
                </span>
                {errors.agreed && (
                  <p className="text-xs text-danger-light mt-1">{errors.agreed}</p>
                )}
              </div>
            </label>
          </motion.div>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35, ease }}
          >
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={!canSubmit}
            >
              {loading ? "Creating account…" : "Create Account"}
            </Button>
          </motion.div>
        </form>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.35 }}
        >
          <AuthDivider />
        </motion.div>

        {/* Social buttons */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.35, ease }}
          className="flex gap-3"
        >
          <SocialButton provider="google" />
          <SocialButton provider="github" />
        </motion.div>

        {/* Switch to login */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.35 }}
          className="text-center text-xs text-ink-disabled mt-5"
        >
          Already have an account?{" "}
          <Link href="/login" className="text-brand-300 hover:text-brand-200 font-medium transition-colors">
            Sign in
          </Link>
        </motion.p>
      </AuthCard>
    </main>
  );
}
