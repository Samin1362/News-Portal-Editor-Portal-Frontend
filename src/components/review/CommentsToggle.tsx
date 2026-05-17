"use client";

import { MessageSquareOff, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CommentsToggleProps {
  enabled: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}

export function CommentsToggle({ enabled, disabled, onToggle }: CommentsToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={!enabled}
      onClick={() => onToggle(!enabled)}
      className={cn(
        "w-full inline-flex items-center gap-2 border-[1.5px] rounded-[4px]",
        "px-2.5 py-1.5 font-hand text-[12px]",
        "transition-[background,color,border] duration-[120ms]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        enabled
          ? "border-ink/30 bg-paper text-ink hover:border-ink hover:bg-paper-2"
          : "border-warn bg-warn/15 text-ink",
      )}
    >
      {enabled ? (
        <>
          <MessageSquare size={13} />
          Comments on — click to disable
        </>
      ) : (
        <>
          <MessageSquareOff size={13} />
          Comments disabled — click to re-enable
        </>
      )}
    </button>
  );
}
