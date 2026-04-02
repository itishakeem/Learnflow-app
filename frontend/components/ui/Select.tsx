import { forwardRef, SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className = "", children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="section-label text-ink-disabled">{label}</label>
        )}
        <select
          ref={ref}
          className={[
            "bg-surface-raised border border-surface-border rounded-xl px-3 py-2 text-sm text-ink-primary",
            "focus:outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/20",
            "transition-all duration-200 cursor-pointer appearance-none",
            "hover:border-surface-border/80",
            className,
          ].join(" ")}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  }
);
Select.displayName = "Select";

export default Select;
