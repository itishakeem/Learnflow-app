"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

const ease = [0.0, 0.0, 0.2, 1] as const;

export function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center
                        px-4 sm:px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 overflow-hidden min-h-[88vh]">
      {/* Radial glow */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2
                        w-[700px] h-[500px] rounded-full
                        bg-gradient-radial opacity-60" />
        <div className="absolute bottom-0 right-1/4
                        w-[300px] h-[300px] rounded-full
                        bg-accent/5 blur-[100px]" />
      </div>

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        className="mb-7"
      >
        <span className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20
                         text-brand-300 text-xs font-semibold px-4 py-1.5 rounded-full
                         shadow-glow-sm">
          <Sparkles size={11} />
          AI-Powered Python Tutor
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.08, ease }}
        className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.1]
                   tracking-tight mb-6 max-w-4xl text-balance"
      >
        Learn Python faster{" "}
        <span className="text-gradient">with AI</span>
        {" "}by your side
      </motion.h1>

      {/* Sub-headline */}
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18, ease }}
        className="text-ink-secondary text-base sm:text-lg max-w-xl mb-10 leading-relaxed text-balance"
      >
        LearnFlow generates personalized exercises, explains concepts in plain English,
        and debugs your errors in real time — so you can focus on learning.
      </motion.p>

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.3, ease }}
        className="flex flex-col xs:flex-row gap-3 w-full xs:w-auto"
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl
                     bg-brand hover:bg-brand-400 active:bg-brand-600 text-white font-semibold text-sm
                     shadow-glow-sm hover:shadow-glow-brand transition-all duration-200 group"
        >
          Get Started Free
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/about"
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl
                     bg-surface-raised hover:bg-surface-hover border border-surface-border
                     text-ink-primary font-semibold text-sm transition-all duration-200
                     hover:border-brand/30"
        >
          Learn More
        </Link>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.55, ease }}
        className="mt-16 flex flex-wrap gap-x-10 gap-y-5 justify-center"
      >
        {[
          { value: "200+",   label: "Concepts explained"  },
          { value: "1 000+", label: "Exercises generated" },
          { value: "500+",   label: "Debug sessions"      },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-2xl font-bold text-gradient tabular-nums">{value}</p>
            <p className="text-xs text-ink-disabled mt-1 font-medium">{label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
