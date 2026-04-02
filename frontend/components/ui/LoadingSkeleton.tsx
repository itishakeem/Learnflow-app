interface SkeletonProps {
  lines?: number;
  className?: string;
}

export default function LoadingSkeleton({ lines = 5, className = "" }: SkeletonProps) {
  const widths = ["75%", "100%", "83%", "100%", "66%", "90%", "70%"];
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true" aria-label="Loading…">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3.5 rounded-full skeleton"
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  );
}
