"use client";

import { Flame, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { FlagsPatch } from "@/lib/api/articles.api";

interface FlagsToggleGroupProps {
  isBreaking: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  disabled?: boolean;
  onToggle: (patch: FlagsPatch) => void;
}

const FLAGS = [
  { key: "isBreaking" as const, label: "Breaking", Icon: Flame },
  { key: "isFeatured" as const, label: "Featured", Icon: Star },
  { key: "isTrending" as const, label: "Trending", Icon: TrendingUp },
];

export function FlagsToggleGroup({
  isBreaking,
  isFeatured,
  isTrending,
  disabled,
  onToggle,
}: FlagsToggleGroupProps) {
  const state = { isBreaking, isFeatured, isTrending };
  return (
    <div className="flex flex-wrap gap-1.5">
      {FLAGS.map(({ key, label, Icon }) => {
        const active = state[key];
        return (
          <button
            type="button"
            key={key}
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onToggle({ [key]: !active })}
            className={cn(
              "inline-flex items-center gap-1.5 border-[1.5px] rounded-[4px]",
              "px-2 py-1 font-hand text-[11px] transition-[background,color,border] duration-[120ms]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              active
                ? "border-accent bg-accent text-white"
                : "border-ink/30 bg-paper text-ink hover:border-ink hover:bg-paper-2",
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
