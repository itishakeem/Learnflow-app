"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PasswordInput from "@/components/auth/PasswordInput";
import AvatarUpload from "./AvatarUpload";

interface Props {
  onDone: () => void;
}

function validatePassword(pw: string): string | null {
  if (!pw) return null; // blank = keep current, no error
  if (pw.length < 8)           return "Password must be at least 8 characters";
  if (!/[a-zA-Z]/.test(pw))   return "Password must include at least one letter";
  if (!/[0-9]/.test(pw))      return "Password must include at least one number";
  return null;
}

export default function EditProfileForm({ onDone }: Props) {
  const { user, login } = useAuth();

  const [name, setName]         = useState(user?.name ?? "");
  const [email, setEmail]       = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim())  errs.name  = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    if (password && password !== confirm) errs.confirm = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !user) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    login({
      ...user,
      name: name.trim(),
      email: email.trim(),
      ...(avatarPreview ? { avatarUrl: avatarPreview } : {}),
    } as typeof user & { avatarUrl?: string });
    setSaving(false);
    onDone();
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSave}
      className="rounded-2xl p-6 space-y-5"
      style={{
        background: "rgba(15,15,24,0.98)",
        border: "1px solid rgba(139,92,246,0.15)",
      }}
    >
      <h3 className="text-sm font-semibold text-ink-primary">Edit Profile</h3>

      {/* Avatar upload */}
      <div className="flex justify-center">
        <AvatarUpload preview={avatarPreview} onSelect={setAvatarPreview} />
      </div>

      {/* Name */}
      <Input
        label="Name"
        placeholder="Your full name"
        value={name}
        onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
        leftIcon={<User size={15} />}
        error={errors.name}
        disabled={saving}
      />

      {/* Email */}
      <Input
        type="email"
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
        leftIcon={<Mail size={15} />}
        error={errors.email}
        disabled={saving}
      />

      {/* New password (optional) */}
      <PasswordInput
        label="New Password (leave blank to keep current)"
        placeholder="Min. 8 characters, letters & numbers"
        value={password}
        onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
        disabled={saving}
        error={errors.password}
      />

      {/* Confirm password */}
      {password && (
        <PasswordInput
          label="Confirm New Password"
          placeholder="Re-enter new password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: "" })); }}
          disabled={saving}
          error={errors.confirm}
        />
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button type="submit" variant="primary" size="md" loading={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
        <Button type="button" variant="secondary" size="md" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
      </div>
    </motion.form>
  );
}
