import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Optional error text shown below the input. */
  errorText?: string;
}

/**
 * Editorial input — 1.5px ink border, 4px radius, Inter font.
 * Matches the journalist portal's Input so ported forms look identical.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, errorText, ...rest },
  ref,
) {
  return (
    <>
      <input
        ref={ref}
        className={cn(
          "mt-1 w-full border-[1.5px] border-ink rounded-sm bg-paper px-3 py-2",
          "font-sans text-[14px] placeholder:text-muted",
          "focus:outline-none focus:ring-2 focus:ring-accent/30",
          "disabled:opacity-50",
          errorText && "border-accent",
          className,
        )}
        aria-invalid={errorText ? true : undefined}
        {...rest}
      />
      {errorText ? (
        <p className="mt-1 font-hand text-[11px] text-accent">{errorText}</p>
      ) : null}
    </>
  );
});
