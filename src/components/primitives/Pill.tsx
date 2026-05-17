import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type PillVariant =
  | "default"
  | "solid"
  | "red"
  | "green"
  | "warn"
  | "ghost";

interface PillProps {
  children: ReactNode;
  variant?: PillVariant;
  dot?: boolean;
  dotStatic?: boolean;
  className?: string;
}

const VARIANTS: Record<PillVariant, string> = {
  default: "border-ink bg-paper text-ink",
  solid: "border-ink bg-ink text-paper",
  red: "border-accent bg-accent text-white",
  green: "border-accent-2 bg-accent-2 text-white",
  warn: "border-warn bg-warn text-ink",
  ghost: "border-ink/25 bg-transparent text-muted",
};

/**
 * Editorial pill — 1.5px border, 999px radius, Kalam font, 11px.
 * `dot` adds a pulsing inline dot (the .live-dot helper).
 */
export function Pill({
  children,
  variant = "default",
  dot,
  dotStatic,
  className,
}: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-[9px] py-[2px]",
        "font-hand text-[11px] leading-[1.4] whitespace-nowrap",
        VARIANTS[variant],
        dot && "live-dot",
        dot && dotStatic && "static",
        className,
      )}
    >
      {children}
    </span>
  );
}
