type Variant = "brand" | "success" | "warning" | "danger" | "neutral";
type Size    = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  brand:   "bg-brand/12 text-brand-300  border-brand/20",
  success: "bg-success/10 text-success-light border-success/18",
  warning: "bg-warning/10 text-warning-light border-warning/18",
  danger:  "bg-danger/10  text-danger-light  border-danger/18",
  neutral: "bg-surface-hover text-ink-secondary border-surface-border",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-2xs px-2 py-0.5 leading-tight",
  md: "text-xs px-2.5 py-1",
};

interface BadgeProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

export default function Badge({ variant = "neutral", size = "md", className = "", children }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center font-medium rounded-full border capitalize whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
