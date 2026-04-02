"use client";

import { motion, HTMLMotionProps } from "framer-motion";

interface CardProps extends HTMLMotionProps<"div"> {
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddings = {
  none: "",
  sm:   "p-4",
  md:   "p-5",
  lg:   "p-6",
};

export default function Card({
  interactive = false,
  padding = "md",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1] }}
      className={[
        "bg-surface-raised border border-surface-border rounded-2xl shadow-card",
        interactive ? "card-interactive" : "",
        paddings[padding],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </motion.div>
  );
}
