"use client";

import { motion } from "framer-motion";
import { Brain, Bug, BarChart3, Zap, BookOpen, Code2 } from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "AI Concept Explainer",
    description: "Type any Python concept and get a crystal-clear, level-appropriate explanation in seconds.",
    accent: { icon: "text-brand-300",    bg: "bg-brand/10",   border: "group-hover:border-brand/30"   },
  },
  {
    icon: Zap,
    title: "Smart Exercise Generator",
    description: "Auto-generated coding exercises tailored to your chosen topic and difficulty level.",
    accent: { icon: "text-accent",       bg: "bg-accent/10",  border: "group-hover:border-accent/30"  },
  },
  {
    icon: Bug,
    title: "Intelligent Debugger",
    description: "Paste any error message and get instant root cause analysis with a corrected code snippet.",
    accent: { icon: "text-warning-light", bg: "bg-warning/10", border: "group-hover:border-warning/30" },
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "See every concept explored and every exercise completed in one clean dashboard.",
    accent: { icon: "text-success-light", bg: "bg-success/10", border: "group-hover:border-success/30" },
  },
  {
    icon: BookOpen,
    title: "Beginner to Advanced",
    description: "From variables to decorators and async/await — LearnFlow grows with your skill level.",
    accent: { icon: "text-brand-200",    bg: "bg-brand/8",    border: "group-hover:border-brand/20"   },
  },
  {
    icon: Code2,
    title: "Monaco Code Editor",
    description: "Write and edit Python in a VS Code-powered editor with full syntax highlighting.",
    accent: { icon: "text-accent-light", bg: "bg-accent/8",   border: "group-hover:border-accent/20"  },
  },
];

export function Features() {
  return (
    <section className="py-24 px-4 sm:px-6 section-divider">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14 max-w-2xl mx-auto"
      >
        <p className="section-label text-brand-300 mb-3">Platform Features</p>
        <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
          Everything you need to{" "}
          <span className="text-gradient">master Python</span>
        </h2>
        <p className="text-ink-secondary text-base leading-relaxed">
          A complete AI-powered toolkit — from zero to advanced, all in one place.
        </p>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className={[
                "group bg-surface-raised border border-surface-border rounded-2xl p-6",
                "transition-all duration-300 shadow-card hover:shadow-card-hover",
                f.accent.border,
              ].join(" ")}
            >
              <div className={`w-10 h-10 rounded-xl ${f.accent.bg} flex items-center justify-center mb-5`}>
                <Icon size={19} className={f.accent.icon} />
              </div>
              <h3 className="text-sm font-semibold text-ink-primary mb-2 leading-snug">{f.title}</h3>
              <p className="text-sm text-ink-tertiary leading-relaxed">{f.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
