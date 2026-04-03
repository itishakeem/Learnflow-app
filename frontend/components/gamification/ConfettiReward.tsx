"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

interface ConfettiRewardProps {
  active: boolean;
  onDone?: () => void;
}

const COLORS = ["#8b5cf6", "#22d3ee", "#f59e0b", "#34d399", "#f472b6", "#60a5fa"];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function ConfettiReward({ active, onDone }: ConfettiRewardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: randomBetween(canvas.width * 0.3, canvas.width * 0.7),
      y: canvas.height * 0.45,
      vx: randomBetween(-6, 6),
      vy: randomBetween(-14, -4),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: randomBetween(5, 10),
      rotation: randomBetween(0, 360),
      rotationSpeed: randomBetween(-6, 6),
      opacity: 1,
    }));

    const startTime = performance.now();

    function draw(now: number) {
      if (!canvas || !ctx) return;
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.vy += 0.35; // gravity
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, 1 - elapsed / 1800);

        if (p.opacity > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      }

      if (alive) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onDone?.();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, onDone]);

  return (
    <AnimatePresence>
      {active && (
        <motion.canvas
          ref={canvasRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] pointer-events-none"
        />
      )}
    </AnimatePresence>
  );
}
