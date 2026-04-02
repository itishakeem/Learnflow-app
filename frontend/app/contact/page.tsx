"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mail, MessageSquare } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { SocialLinks } from "@/components/marketing/SocialLinks";
import { Footer } from "@/components/marketing/Footer";

const ease = [0.0, 0.0, 0.2, 1] as const;

type FormState = { name: string; email: string; message: string };
type Status    = "idle" | "submitting" | "success" | "error";

export default function ContactPage() {
  const [form, setForm]     = useState<FormState>({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<Status>("idle");

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setStatus("submitting");
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1200));
    setStatus("success");
  }

  const isDisabled = status === "submitting" || status === "success";

  return (
    <>
      {/* ── Page Hero ───────────────────────────────────── */}
      <section className="relative py-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px]
                          bg-accent/8 blur-[100px] rounded-full" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease }}
          className="relative max-w-xl mx-auto"
        >
          <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-4">Get In Touch</p>
          <h1 className="text-5xl font-bold mb-5">
            We'd love to{" "}
            <span className="text-gradient">hear from you</span>
          </h1>
          <p className="text-ink-secondary text-lg leading-relaxed">
            Have a question, suggestion, or just want to say hi? Send us a message and we'll get back to you.
          </p>
        </motion.div>
      </section>

      {/* ── Main content ───────────────────────────────── */}
      <section className="px-6 pb-28">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Contact form — wider column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease }}
            className="lg:col-span-3"
          >
            <div className="bg-surface-raised border border-surface-border rounded-2xl p-7 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
                  <MessageSquare size={18} className="text-brand-300" />
                </div>
                <h2 className="text-lg font-semibold text-ink-primary">Send a message</h2>
              </div>

              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35 }}
                  >
                    <Alert variant="success">
                      <p className="font-semibold mb-1">Message sent!</p>
                      <p className="text-xs opacity-80">
                        Thanks for reaching out — we'll get back to you shortly.
                      </p>
                    </Alert>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="space-y-4"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Name"
                        placeholder="Your name"
                        value={form.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                        disabled={isDisabled}
                      />
                      <Input
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        required
                        disabled={isDisabled}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-ink-secondary uppercase tracking-wider">
                        Message
                      </label>
                      <textarea
                        rows={6}
                        placeholder="Your message…"
                        value={form.message}
                        onChange={(e) => handleChange("message", e.target.value)}
                        required
                        disabled={isDisabled}
                        className="input-base w-full resize-none leading-relaxed"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={status === "submitting"}
                      disabled={isDisabled}
                    >
                      <Send size={15} />
                      {status === "submitting" ? "Sending…" : "Send Message"}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Info sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Email card */}
            <div className="bg-surface-raised border border-surface-border rounded-2xl p-6 shadow-card">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <Mail size={18} className="text-accent-light" />
              </div>
              <h3 className="text-sm font-semibold text-ink-primary mb-1">Email us directly</h3>
              <p className="text-xs text-ink-secondary leading-relaxed mb-3">
                For partnerships, feedback, or general inquiries — we read every message.
              </p>
              <a
                href="mailto:hello@learnflow.ai"
                className="text-sm text-brand-300 hover:text-brand-200 transition-colors font-medium"
              >
                hello@learnflow.ai
              </a>
            </div>

            {/* Social card */}
            <div className="bg-surface-raised border border-surface-border rounded-2xl p-6 shadow-card">
              <h3 className="text-sm font-semibold text-ink-primary mb-1">Follow us</h3>
              <p className="text-xs text-ink-secondary leading-relaxed mb-4">
                Stay updated with the latest features, tips, and Python content.
              </p>
              <SocialLinks />
            </div>

            {/* Response time card */}
            <div className="bg-brand/5 border border-brand/15 rounded-2xl p-5">
              <p className="text-xs text-brand-300 font-semibold uppercase tracking-widest mb-2">
                Response Time
              </p>
              <p className="text-sm text-ink-secondary leading-relaxed">
                We typically reply within <span className="text-ink-primary font-medium">24 hours</span> on business days.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  );
}
