"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const COLORS = [
  "#22c55e",
  "#86efac",
  "#fbbf24",
  "#f472b6",
  "#60a5fa",
  "#a78bfa",
  "#fb923c",
  "#ef4444",
  "#facc15",
];

export const COUPON_APPLIED_EVENT = "lastore:coupon-applied";

export function announceCouponApplied() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COUPON_APPLIED_EVENT));
}

type Piece = {
  id: number;
  x: number;
  color: string;
  width: number;
  height: number;
  drift: number;
  duration: number;
  delay: number;
  rotate: number;
};

function makePieces(count = 48): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
    width: 7 + Math.floor(Math.random() * 8),
    height: 4 + Math.floor(Math.random() * 5),
    drift: (Math.random() - 0.5) * 120,
    duration: 1.5 + Math.random() * 1.2,
    delay: Math.random() * 0.35,
    rotate: 360 + Math.random() * 720,
  }));
}

/**
 * Confetti clipped inside a relatively positioned parent (order summary / cart totals).
 */
export function CouponConfetti({ burstId = 0 }: { burstId?: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pieces, setPieces] = useState<Piece[] | null>(null);
  const [localBurst, setLocalBurst] = useState(0);
  const [fall, setFall] = useState(480);
  const burst = burstId + localBurst;

  useEffect(() => {
    const onApplied = () => setLocalBurst((n) => n + 1);
    window.addEventListener(COUPON_APPLIED_EVENT, onApplied);
    return () => window.removeEventListener(COUPON_APPLIED_EVENT, onApplied);
  }, []);

  useEffect(() => {
    if (!burst) return;
    const h = rootRef.current?.clientHeight ?? 480;
    setFall(Math.max(h + 32, 320));
    setPieces(makePieces());
    const clear = window.setTimeout(() => setPieces(null), 3200);
    return () => window.clearTimeout(clear);
  }, [burst]);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-[inherit]"
    >
      <AnimatePresence>
        {pieces?.map((p) => (
          <motion.span
            key={`${burst}-${p.id}`}
            initial={{ x: 0, y: -6, opacity: 1, rotate: 0 }}
            animate={{
              x: p.drift,
              y: fall,
              opacity: [1, 1, 0],
              rotate: p.rotate,
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: "linear",
            }}
            style={{
              position: "absolute",
              top: 0,
              left: `${p.x}%`,
              width: p.width,
              height: p.height,
              backgroundColor: p.color,
              borderRadius: 1,
              display: "block",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
