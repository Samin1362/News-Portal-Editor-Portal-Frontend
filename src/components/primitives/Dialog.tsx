"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Max-width class — defaults to `max-w-md`. */
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS: Record<NonNullable<DialogProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    document.body.style.overflow = "hidden";
    // focus the panel for screen readers
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      data-modal-open="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative w-full bg-paper border-[1.5px] border-ink rounded-sm",
          "shadow-[6px_6px_0_var(--color-ink)]",
          "px-5 py-4 m-0 sm:m-4 outline-none",
          SIZE_CLASS[size],
        )}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h2
              id="dialog-title"
              className="font-serif text-[20px] tracking-[-0.01em] font-extrabold"
            >
              {title}
            </h2>
            {description ? (
              <p className="font-hand text-[12px] text-muted mt-0.5">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="border-[1.5px] border-ink rounded-sm w-7 h-7 flex items-center justify-center hover:bg-paper-2"
          >
            <X size={14} />
          </button>
        </div>
        <div className="text-[14px]">{children}</div>
        {footer ? (
          <div className="mt-4 flex justify-end gap-2">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
