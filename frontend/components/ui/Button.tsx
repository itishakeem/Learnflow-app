"use client";

import { motion } from "framer-motion";
import { forwardRef, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "warning";
type Size    = "xs" | "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:   "bg-brand hover:bg-brand-400 active:bg-brand-600 text-white shadow-glow-sm hover:shadow-glow-brand",
  secondary: "bg-surface-raised hover:bg-surface-hover active:bg-surface-border border border-surface-border text-ink-primary hover:border-brand/30",
  ghost:     "bg-transparent hover:bg-surface-raised active:bg-surface-border text-ink-secondary hover:text-ink-primary",
  danger:    "bg-danger/10 hover:bg-danger/18 active:bg-danger/25 border border-danger/25 text-danger-light hover:border-danger/50",
  warning:   "bg-warning/10 hover:bg-warning/18 active:bg-warning/25 border border-warning/25 text-warning-light hover:border-warning/50",
};

const sizeClasses: Record<Size, string> = {
  xs: "px-2.5 py-1 text-2xs rounded-lg",
  sm: "px-3.5 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-sm rounded-xl",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, fullWidth, className = "", children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
        transition={{ duration: 0.08 }}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center gap-2 font-semibold",
          "transition-all duration-200",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? "w-full" : "",
          className,
        ].join(" ")}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {loading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

export default Button;
