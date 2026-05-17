import { cn } from "@/lib/utils/cn";

export type BarTone = "default" | "red" | "green" | "warn";

interface BarTrackProps {
  /** 0–100 percentage fill. Clamped server-side. */
  value: number;
  tone?: BarTone;
  className?: string;
  /** Default 10px (inline workload bars); 14px for the bar-chart variant. */
  height?: 10 | 14;
}

const TONE: Record<BarTone, string> = {
  default: "bg-ink",
  red: "bg-accent",
  green: "bg-accent-2",
  warn: "bg-warn",
};

/**
 * Slim horizontal progress track — used both inline (10px tall, reporter
 * workload rows) and as a "barchart" bar (14px tall). Fill animates from 0
 * to value via CSS transition so the bar "draws in" on mount.
 */
export function BarTrack({
  value,
  tone = "default",
  className,
  height = 10,
}: BarTrackProps) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "relative w-full rounded-[2px] border-[1.2px] border-ink overflow-hidden bg-paper-2",
        height === 10 ? "h-[10px]" : "h-[14px]",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(safe)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full transition-[width] duration-[1200ms]", TONE[tone])}
        style={{
          width: `${safe}%`,
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent 0 6px, rgba(255,255,255,0.10) 6px 7px)",
        }}
      />
    </div>
  );
}
