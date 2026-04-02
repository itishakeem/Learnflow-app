export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-surface-border" />
      <span className="text-2xs text-ink-disabled uppercase tracking-widest font-medium whitespace-nowrap">
        or continue with
      </span>
      <div className="flex-1 h-px bg-surface-border" />
    </div>
  );
}
