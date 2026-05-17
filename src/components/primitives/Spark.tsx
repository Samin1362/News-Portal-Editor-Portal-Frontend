import { cn } from "@/lib/utils/cn";

interface SparkProps {
  /** Plotted points — values are in the viewBox space (0–70 x, 0–28 y). */
  points: string;
  stroke?: string;
  delayMs?: number;
  className?: string;
}

/**
 * Tiny sparkline used inside KpiCard, top-right corner. SVG path is drawn
 * with the dashIn animation so it sketches itself once on mount.
 */
export function Spark({
  points,
  stroke = "var(--color-ink)",
  delayMs = 0,
  className,
}: SparkProps) {
  return (
    <svg
      className={cn(
        "absolute right-[14px] top-[14px] w-[70px] h-[28px] pointer-events-none",
        className,
      )}
      viewBox="0 0 70 28"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeDasharray={120}
        strokeDashoffset={120}
        style={{
          animation: `dashIn 1s ease-out forwards ${delayMs}ms`,
        }}
      />
    </svg>
  );
}
