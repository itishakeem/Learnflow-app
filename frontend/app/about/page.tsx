"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Brain, Zap, BarChart3, ArrowRight, Target, Lightbulb } from "lucide-react";
import { Footer } from "@/components/marketing/Footer";
import { CtaBanner } from "@/components/marketing/CtaBanner";

const PLATFORM_ITEMS = [
  {
    icon: Brain,
    label: "Concept Explainer",
    description: "Ask about any Python topic and receive a clear, level-tailored explanation powered by AI.",
    color: "text-brand-300",
    bg: "bg-brand/10",
  },
  {
    icon: Zap,
    label: "Exercise Generator",
    description: "Generates unique coding exercises per topic and difficulty so you always have something new to practice.",
    color: "text-accent-light",
    bg: "bg-accent/10",
  },
  {
    icon: BarChart3,
    label: "Progress Dashboard",
    description: "A single view of every concept explored and exercise completed, tracking your growth over time.",
    color: "text-success-light",
    bg: "bg-success/10",
  },
];

const VALUES = [
  {
    icon: Target,
    title: "Personalized Learning",
    description: "Every exercise, explanation, and hint is tailored to your level — no generic tutorials.",
  },
  {
    icon: Lightbulb,
    title: "Learning by Doing",
    description: "We believe the fastest path to mastery is writing real code with real feedback.",
  },
  {
    icon: Zap,
    title: "Instant AI Feedback",
    description: "Errors get analyzed, root causes surfaced, and fixes provided — all in seconds.",
  },
];

const ease = [0.0, 0.0, 0.2, 1] as const;

export default function AboutPage() {
  return (
    <>
      {/* ── Page Hero ───────────────────────────────────── */}
      <section className="relative py-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px]
                          bg-brand/8 blur-[120px] rounded-full" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease }}
          className="relative max-w-2xl mx-auto"
        >
          <p className="text-xs font-semibold text-brand-300 uppercase tracking-widest mb-4">About LearnFlow</p>
          <h1 className="text-5xl font-bold mb-5">
            Built to make{" "}
            <span className="text-gradient">learning Python</span>
            {" "}effortless
          </h1>
          <p className="text-ink-secondary text-lg leading-relaxed">
            LearnFlow is an AI-powered tutoring platform that meets you where you are
            — whether you are writing your first loop or mastering async concurrency.
          </p>
        </motion.div>
      </section>

      {/* ── Mission ─────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-surface-border">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
          >
            <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-3">Our Mission</p>
            <h2 className="text-3xl font-bold mb-5">
              Make great programming education{" "}
              <span className="text-gradient">accessible to everyone</span>
            </h2>
            <p className="text-ink-secondary text-base leading-relaxed mb-5">
              Traditional learning resources are static — they can't adapt to your pace, correct your mistakes,
              or generate exercises on demand. LearnFlow replaces all of that with an intelligent AI that
              responds to exactly what you need right now.
            </p>
            <p className="text-ink-secondary text-base leading-relaxed">
              Our goal is simple: eliminate the friction between "I want to learn Python" and
              "I can confidently write Python". We handle the curriculum — you handle the code.
            </p>
          </motion.div>

          {/* Values */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease, delay: 0.1 }}
            className="space-y-4"
          >
            {VALUES.map((v, i) => {
              const Icon = v.icon;
              return (
                <motion.div
                  key={v.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                  className="flex gap-4 p-4 bg-surface-raised border border-surface-border rounded-2xl
                             hover:border-brand/20 transition-colors duration-200"
                >
                  <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-brand-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-ink-primary mb-1">{v.title}</h3>
                    <p className="text-xs text-ink-secondary leading-relaxed">{v.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Platform Overview ────────────────────────────── */}
      <section className="py-24 px-6 bg-surface-base/60 border-y border-surface-border">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold text-brand-300 uppercase tracking-widest mb-3">Platform</p>
          <h2 className="text-4xl font-bold">
            Three tools,{" "}
            <span className="text-gradient">one platform</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {PLATFORM_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.45 }}
                whileHover={{ y: -4 }}
                className="bg-surface-raised border border-surface-border rounded-2xl p-6
                           hover:border-brand/25 transition-all duration-300 shadow-card hover:shadow-card-hover"
              >
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-4`}>
                  <Icon size={20} className={item.color} />
                </div>
                <h3 className="font-semibold text-sm text-ink-primary mb-2">{item.label}</h3>
                <p className="text-xs text-ink-secondary leading-relaxed">{item.description}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex justify-center mt-10"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                       bg-brand hover:bg-brand-400 text-white font-semibold text-sm
                       transition-all duration-200 shadow-glow-brand/30 hover:shadow-glow-brand group"
          >
            Try the platform
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </section>

      <CtaBanner />
      <Footer />
    </>
  );
}
