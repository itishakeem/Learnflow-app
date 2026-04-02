"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    step: "01",
    title: "Choose a topic & level",
    description: "Pick a Python topic — variables, loops, async/await — and set your difficulty: beginner, intermediate, or advanced.",
  },
  {
    step: "02",
    title: "Get a tailored exercise",
    description: "LearnFlow generates a unique coding exercise just for you, complete with hints and a starter code template.",
  },
  {
    step: "03",
    title: "Write code in the editor",
    description: "Use the embedded Monaco editor with Python syntax highlighting to craft your solution.",
  },
  {
    step: "04",
    title: "Debug & submit",
    description: "Hit a snag? Paste the error — the AI debugger pinpoints the root cause and shows the fix instantly.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-surface-base/50 section-divider border-b border-surface-border">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <p className="section-label text-accent mb-3">How It Works</p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          From zero to coding in{" "}
          <span className="text-gradient">four steps</span>
        </h2>
      </motion.div>

      <div className="relative max-w-2xl mx-auto">
        {/* Connecting line — vertically centered on step circles */}
        <div className="absolute top-8 bottom-8 left-[1.875rem] w-px bg-surface-border hidden sm:block" />

        <div className="space-y-8">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex gap-5 items-start relative"
            >
              {/* Step bubble */}
              <div className="shrink-0 w-[3.75rem] h-[3.75rem] rounded-2xl
                              bg-surface-raised border border-surface-border
                              flex items-center justify-center z-10
                              shadow-card">
                <span className="text-xs font-bold text-gradient tabular-nums">{s.step}</span>
              </div>

              <div className="pt-3 pb-2">
                <h3 className="text-sm font-semibold text-ink-primary mb-1.5">{s.title}</h3>
                <p className="text-sm text-ink-tertiary leading-relaxed">{s.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
