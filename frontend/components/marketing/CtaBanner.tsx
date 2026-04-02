"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="py-24 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative max-w-3xl mx-auto"
      >
        {/* Outer glow — needs to bleed outside, so no overflow-hidden here */}
        <div aria-hidden
             className="absolute inset-0 -z-10 scale-110
                        bg-gradient-brand opacity-8 blur-3xl rounded-3xl pointer-events-none" />

        <div className="relative bg-surface-raised border border-surface-border
                        rounded-3xl px-6 sm:px-12 py-14 sm:py-16 text-center
                        shadow-card overflow-hidden">
          {/* Top accent line */}
          <div aria-hidden
               className="absolute top-0 left-1/2 -translate-x-1/2
                          w-48 h-px bg-gradient-brand opacity-50" />

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance">
            Ready to level up?
          </h2>
          <p className="text-ink-secondary text-base mb-10 max-w-md mx-auto leading-relaxed">
            Start learning Python with an AI tutor that adapts to your pace.
            No setup required — just open the app and start coding.
          </p>

          <div className="flex flex-col xs:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl
                         bg-brand hover:bg-brand-400 active:bg-brand-600 text-white font-semibold text-sm
                         shadow-glow-sm hover:shadow-glow-brand transition-all duration-200 group"
            >
              Start for Free
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl
                         bg-transparent hover:bg-surface-hover border border-surface-border
                         text-ink-primary font-semibold text-sm
                         transition-all duration-200 hover:border-brand/30"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
