"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const LOGO_VIEW_BOX = "0 0 1027 1027";

/** Outer silhouette of the pinwheel mark — continuous route for the animated stroke. */
const TRACE_PATH =
  "M501.9 104.0L455.7 202.8L423.6 287.6L410.8 342.8L409.5 406.9L419.8 460.9L440.3 519.9L472.4 585.4L503.2 634.2L500.7 636.7L251.6 636.7L166.9 828.0L419.8 828.0L496.8 648.3L499.4 644.4L507.1 643.2L567.4 721.5L594.4 748.4L629.0 776.7L663.7 798.5L697.1 813.9L731.7 824.2L769.0 829.3L857.5 828.0L938.4 638.0L507.1 638.0L503.2 635.5L557.1 504.5L639.3 287.6L713.8 104.0L503.2 104.0Z";

/** Original filled petals from the Black Pinwheel Logo Mark SVG. */
const FILL_PATHS = [
  "M502.342 103.35L715.018 103.436C707.171 123.984 698.485 144.41 690.276 164.872L637.331 298.352L557.343 506.7C540.133 549.982 522.486 593.088 504.403 636.013L503.31 634.529L502.593 634.855C501.303 633.992 491.866 618.286 490.472 616.025C457.5 562.538 426.283 497.904 414.044 436.001C407.464 402.252 406.982 367.597 412.623 333.678C417.896 302.039 431.251 265.759 443.015 235.939C460.722 190.846 480.52 146.601 502.342 103.35Z",
  "M502.593 634.854L503.31 634.528L504.404 636.013L504.414 636.96C509.132 637.903 519.558 636.579 523.85 637.377L940.533 637.432C912.711 701.629 885.221 765.967 858.052 830.446L802.459 830.486C787.24 830.466 768.45 830.797 753.476 828.856C687.564 820.321 630.216 784.376 583.665 738.512C554.149 709.437 531.282 679.119 508.661 644.763C506.239 645.902 504.875 644.979 501.711 646.288L500.159 645.676C501.201 643.189 503.717 638.806 502.333 636.529L502.593 634.854Z",
  "M251.269 636.815L431.241 636.78C446.085 636.665 460.929 636.67 475.772 636.795C482.896 636.835 495.55 637.231 502.332 636.529C503.716 638.806 501.201 643.189 500.159 645.676L447.991 765.707C438.833 786.939 429.018 808.547 420.189 829.879C386.998 830.32 352.713 829.834 319.445 829.819L165.833 829.814C184.876 785.805 204.289 741.957 224.071 698.28L240.909 660.544C244.325 652.942 248.462 644.518 251.269 636.815Z",
] as const;

type LoaderPhase = "loop" | "closingOutline" | "fadingFill" | "done";

export type LogoTraceLoaderProps = {
  loading?: boolean;
  isComplete?: boolean;
  size?: number;
  strokeWidth?: number;
  loopDurationSeconds?: number;
  fillFadeSeconds?: number;
  className?: string;
  ariaLabel?: string;
  onDone?: () => void;
};

const CLOSE_OUTLINE_SECONDS = 0.55;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LogoTraceLoader({
  loading = true,
  isComplete = false,
  size = 64,
  strokeWidth = 28,
  loopDurationSeconds = 1.4,
  fillFadeSeconds = 0.45,
  className,
  ariaLabel = "Loading",
  onDone,
}: LogoTraceLoaderProps) {
  const shouldResolve = isComplete || !loading;
  const [phase, setPhase] = useState<LoaderPhase>("loop");
  const [fillOpacity, setFillOpacity] = useState(0);
  const doneCalledRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const callDoneOnce = () => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    onDoneRef.current?.();
  };

  // Reduced motion or already complete: jump to filled mark.
  useEffect(() => {
    if (prefersReducedMotion() || shouldResolve) {
      if (prefersReducedMotion()) {
        setPhase("done");
        setFillOpacity(1);
        callDoneOnce();
        return;
      }
      setPhase((current) => (current === "loop" ? "closingOutline" : current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldResolve]);

  // closingOutline → fadingFill (animation + timeout fallback)
  useEffect(() => {
    if (phase !== "closingOutline") return;
    const ms = CLOSE_OUTLINE_SECONDS * 1000 + 80;
    const id = window.setTimeout(() => {
      setPhase("fadingFill");
      requestAnimationFrame(() => setFillOpacity(1));
    }, ms);
    return () => window.clearTimeout(id);
  }, [phase]);

  // fadingFill → done
  useEffect(() => {
    if (phase !== "fadingFill") return;
    const ms = fillFadeSeconds * 1000 + 80;
    const id = window.setTimeout(() => {
      setPhase("done");
      setFillOpacity(1);
      callDoneOnce();
    }, ms);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, fillFadeSeconds]);

  useEffect(() => {
    if (phase === "done") callDoneOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const ghostStroke = Math.max(1, strokeWidth / 2);
  const showLoop = phase === "loop";
  const showClosing = phase === "closingOutline";
  const showFill = phase === "fadingFill" || phase === "done";

  return (
    <svg
      role="status"
      aria-label={ariaLabel}
      aria-busy={phase !== "done"}
      viewBox={LOGO_VIEW_BOX}
      width={size}
      height={size}
      className={cn("block shrink-0 text-foreground", className)}
      style={{ width: size, height: size }}
    >
      <g opacity={showFill && phase === "done" ? 0 : 0.18}>
        <path
          d={TRACE_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={ghostStroke}
          strokeLinejoin="round"
        />
      </g>

      {showLoop ? (
        <path
          d={TRACE_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="0.16 0.84"
          style={{
            animation: `logo-trace-loader-loop ${loopDurationSeconds}s linear infinite`,
          }}
        />
      ) : null}

      {showClosing ? (
        <path
          d={TRACE_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          style={{
            animation: `logo-trace-loader-close ${CLOSE_OUTLINE_SECONDS}s ease-out forwards`,
          }}
        />
      ) : null}

      {showFill
        ? FILL_PATHS.map((path) => (
            <path
              key={path}
              d={path}
              fill="currentColor"
              style={{
                opacity: fillOpacity,
                transition: `opacity ${fillFadeSeconds}s ease-out`,
              }}
            />
          ))
        : null}
    </svg>
  );
}
