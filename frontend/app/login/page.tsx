"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { AuthCard }    from "@/components/auth/AuthCard";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { SocialButton } from "@/components/auth/SocialButton";
import PasswordInput   from "@/components/auth/PasswordInput";
import Input           from "@/components/ui/Input";
import Button          from "@/components/ui/Button";
import { useAuth }     from "@/lib/auth";

const ease = [0.0, 0.0, 0.2, 1] as const;

export default function LoginPage() {
  const { login } = useAuth();
  const router    = useRouter();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!email.trim())    errs.email    = "Email is required";
    if (!password.trim()) errs.password = "Password is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/svc/auth/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const raw = data.detail;
        const msg = Array.isArray(raw)
          ? "Invalid email or password"
          : typeof raw === "string"
          ? raw
          : "Invalid email or password";
        setErrors({ password: msg });
        return;
      }
      // Persist JWT for API calls
      try { localStorage.setItem("learnflow_token", data.token); } catch { /* ignore */ }
      login({
        id:        data.user.id,
        name:      data.user.name,
        email:     data.user.email,
        avatarUrl: data.user.avatarUrl ?? undefined,
      });
      router.push("/dashboard");
    } catch {
      setErrors({ password: "Network error — please try again" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-dvh flex items-center justify-center px-4 py-16 overflow-hidden">
      {/* Background orb */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[500px] h-[400px] rounded-full bg-brand/8 blur-[120px]" />
      </div>

      <AuthCard title="Welcome back" subtitle="Sign in to continue learning">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35, ease }}
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

          {/* Password */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35, ease }}
          >
            <PasswordInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
              required
              disabled={loading}
              error={errors.password}
            />
          </motion.div>

          {/* Remember me + Forgot password */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="flex items-center justify-between"
          >
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <div className="w-4 h-4 rounded border border-surface-border bg-surface-base
                                peer-checked:bg-brand peer-checked:border-brand
                                transition-all duration-200 flex items-center justify-center">
                  {remember && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-white">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-ink-tertiary group-hover:text-ink-secondary transition-colors">
                Remember me
              </span>
            </label>
            <Link
              href="#"
              className="text-xs text-brand-300 hover:text-brand-200 transition-colors font-medium"
            >
              Forgot password?
            </Link>
          </motion.div>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.35, ease }}
          >
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </motion.div>
        </form>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.35 }}
        >
          <AuthDivider />
        </motion.div>

        {/* Social buttons */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35, ease }}
          className="flex gap-3"
        >
          <SocialButton provider="google" />
          <SocialButton provider="github" />
        </motion.div>

        {/* Switch to signup */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.35 }}
          className="text-center text-xs text-ink-disabled mt-5"
        >
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-brand-300 hover:text-brand-200 font-medium transition-colors">
            Sign up free
          </Link>
        </motion.p>
      </AuthCard>
    </main>
  );
}
