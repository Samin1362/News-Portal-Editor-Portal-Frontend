import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  meta?: ReactNode;
  accent?: boolean;
  spark?: ReactNode;
  className?: string;
}

/**
 * KPI tile. Label (Kalam, upper, muted) → value (serif, 38px) → meta row →
 * optional sparkline anchored top-right. `accent` swaps the border to red
 * and the label to red (used for the "Awaiting review" tile on the Editor
 * Today page).
 */
export function KpiCard({
  label,
  value,
  delta,
  meta,
  accent,
  spark,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 rounded-sm border-[1.5px] bg-paper px-[18px] py-4 overflow-hidden",
        accent ? "border-accent" : "border-ink",
        "card-hov",
        className,
      )}
    >
      <div
        className={cn(
          "font-hand text-[11px] tracking-[0.1em] uppercase",
          accent ? "text-accent" : "text-muted",
        )}
      >
        {label}
      </div>
      <div className="font-serif font-extrabold tracking-[-0.03em] text-[38px] leading-none">
        {value}
      </div>
      <div className="flex items-center gap-2 font-hand text-[11.5px] text-muted">
        {delta && <span>{delta}</span>}
        {meta && <span>{meta}</span>}
      </div>
      {spark}
    </div>
  );
}

interface DeltaProps {
  direction?: "up" | "down" | "flat";
  children: ReactNode;
  className?: string;
}

export function Delta({ direction = "up", children, className }: DeltaProps) {
  return (
    <span
      className={cn(
        "font-hand text-[12px]",
        direction === "up" && "text-accent-2",
        direction === "down" && "text-accent",
        direction === "flat" && "text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
