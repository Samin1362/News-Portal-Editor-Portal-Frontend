import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type BtnVariant = "default" | "primary" | "ghost" | "solid";
export type BtnSize = "md" | "sm" | "icon";

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  children: ReactNode;
}

const VARIANTS: Record<BtnVariant, string> = {
  default: "border-ink bg-paper text-ink hover:bg-paper-2",
  primary: "border-accent bg-accent text-white hover:bg-accent/90",
  ghost: "border-ink bg-transparent text-ink hover:bg-paper-2",
  solid: "border-ink bg-ink text-paper hover:bg-ink/90",
};

const SIZES: Record<BtnSize, string> = {
  md: "px-[13px] py-[7px] text-[13px]",
  sm: "px-[9px] py-[4px] text-[12px]",
  icon: "w-8 h-8 p-0",
};

/**
 * Editorial button — 1.5px border, 4px radius, Kalam font.
 * Hover state lifts 1px + drops a hard shadow underneath.
 */
export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn(
  { variant = "default", size = "md", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[4px] border-[1.5px] font-hand",
        "transition-[transform,background,color,box-shadow] duration-[120ms]",
        "hover:-translate-y-[1px] hover:[box-shadow:0_2px_0_var(--color-ink)]",
        "active:translate-y-0 active:shadow-none",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
