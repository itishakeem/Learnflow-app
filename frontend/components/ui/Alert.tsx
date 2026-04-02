type Variant = "error" | "success" | "warning" | "info";

const styles: Record<Variant, { wrap: string; dot: string }> = {
  error:   { wrap: "bg-danger/8 border-danger/25 text-danger-light",   dot: "bg-danger-light" },
  success: { wrap: "bg-success/8 border-success/25 text-success-light", dot: "bg-success-light" },
  warning: { wrap: "bg-warning/8 border-warning/25 text-warning-light", dot: "bg-warning-light" },
  info:    { wrap: "bg-brand/8 border-brand/25 text-brand-300",         dot: "bg-brand-300" },
};

interface AlertProps {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}

export default function Alert({ variant = "error", className = "", children }: AlertProps) {
  const { wrap, dot } = styles[variant];
  return (
    <div className={`flex gap-3 border rounded-xl p-4 text-sm leading-relaxed ${wrap} ${className}`}>
      <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
