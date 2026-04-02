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

export default function SignupPage() {
  const { login } = useAuth();
  const router    = useRouter();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed]     = useState(false);
  const [loading, setLoading]   = useState(false);

  const canSubmit = name.trim() && email.trim() && password.length >= 6 && agreed;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    login({ id: `user-${Date.now()}`, name: name.trim(), email: email.trim() });
    router.push("/dashboard");
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
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              leftIcon={<User size={15} />}
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
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              leftIcon={<Mail size={15} />}
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
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <StrengthBar password={password} />
          </motion.div>

          {/* Terms checkbox */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.35 }}
          >
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
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
