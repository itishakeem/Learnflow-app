"use client";

/**
 * BubbleBackground — Dashboard-only luxury animated background.
 *
 * Implementation notes:
 * - Pure CSS animations (bubble-rise + bubble-drift keyframes in globals.css)
 * - Only transform + opacity animated → GPU composited, zero layout thrashing
 * - will-change: transform on each bubble to hint the browser
 * - aria-hidden so screen readers skip it entirely
 * - pointer-events: none so it never blocks interaction
 */

interface Bubble {
  size: number;       // px diameter
  left: number;       // % from left
  delay: number;      // animation delay (s)
  duration: number;   // rise duration (s)
  driftDuration: number;
  color: string;      // rgba
}

// Seeded list — deterministic so SSR and client render identically (no hydration mismatch)
const BUBBLES: Bubble[] = [
  { size: 80,  left: 8,  delay: 0,    duration: 18, driftDuration: 6,  color: "rgba(139,92,246,0.12)"  },
  { size: 50,  left: 18, delay: 3,    duration: 22, driftDuration: 8,  color: "rgba(34,211,238,0.10)"  },
  { size: 120, left: 30, delay: 6,    duration: 26, driftDuration: 10, color: "rgba(139,92,246,0.08)"  },
  { size: 40,  left: 45, delay: 1.5,  duration: 20, driftDuration: 7,  color: "rgba(99,102,241,0.12)"  },
  { size: 90,  left: 60, delay: 8,    duration: 24, driftDuration: 9,  color: "rgba(34,211,238,0.08)"  },
  { size: 60,  left: 72, delay: 4,    duration: 19, driftDuration: 7,  color: "rgba(139,92,246,0.10)"  },
  { size: 35,  left: 82, delay: 10,   duration: 21, driftDuration: 6,  color: "rgba(167,139,250,0.10)" },
  { size: 100, left: 92, delay: 2,    duration: 28, driftDuration: 11, color: "rgba(99,102,241,0.07)"  },
  { size: 55,  left: 25, delay: 12,   duration: 23, driftDuration: 8,  color: "rgba(34,211,238,0.09)"  },
  { size: 75,  left: 55, delay: 7,    duration: 17, driftDuration: 6,  color: "rgba(139,92,246,0.09)"  },
  { size: 45,  left: 38, delay: 15,   duration: 25, driftDuration: 9,  color: "rgba(167,139,250,0.08)" },
  { size: 65,  left: 68, delay: 5,    duration: 20, driftDuration: 7,  color: "rgba(99,102,241,0.10)"  },
];

export default function BubbleBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      style={{ isolation: "isolate" }}
    >
      {/* Large static gradient orbs — give depth without motion cost */}
      <div
        className="absolute"
        style={{
          top: "-10%",
          right: "-5%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: "5%",
          left: "-8%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Animated rising bubbles */}
      {BUBBLES.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            bottom: "-120px",
            left: `${b.left}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, ${b.color}, transparent 70%)`,
            border: `1px solid ${b.color.replace(/[\d.]+\)$/, "0.3)")}`,
            backdropFilter: "blur(1px)",
            willChange: "transform, opacity",
            animation: [
              `bubble-rise ${b.duration}s ${b.delay}s ease-in-out infinite`,
              `bubble-drift ${b.driftDuration}s ${b.delay}s ease-in-out infinite`,
            ].join(", "),
          }}
        />
      ))}
    </div>
  );
}
