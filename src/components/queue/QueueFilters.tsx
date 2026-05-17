"use client";

import { cn } from "@/lib/utils/cn";
import type { CategoryDTO } from "@/lib/types/category";
import type { QueueStatus } from "@/lib/types/article";

interface QueueFiltersProps {
  categories: CategoryDTO[];
  selectedCategoryId: string | "all";
  onCategoryChange: (id: string | "all") => void;
  selectedStatus: QueueStatus | "all";
  onStatusChange: (s: QueueStatus | "all") => void;
}

const STATUS_OPTIONS: Array<{ value: QueueStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
];

export function QueueFilters({
  categories,
  selectedCategoryId,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
}: QueueFiltersProps) {
  return (
    <div className="flex flex-col gap-2">
      <Chips
        items={[
          { value: "all", label: "All" },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]}
        selected={selectedCategoryId}
        onChange={(v) => onCategoryChange(v as string | "all")}
      />
      <Chips
        items={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
        selected={selectedStatus}
        onChange={(v) => onStatusChange(v as QueueStatus | "all")}
        size="sm"
      />
    </div>
  );
}

function Chips<T extends string>({
  items,
  selected,
  onChange,
  size = "md",
}: {
  items: Array<{ value: T; label: string }>;
  selected: T;
  onChange: (v: T) => void;
  size?: "md" | "sm";
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {items.map((it) => {
        const isActive = it.value === selected;
        return (
          <button
            type="button"
            key={it.value}
            onClick={() => onChange(it.value)}
            className={cn(
              "border-[1.5px] rounded-[4px] font-hand whitespace-nowrap",
              "transition-[background,color,border] duration-[120ms]",
              size === "md" ? "px-2.5 py-1 text-[12px]" : "px-2 py-0.5 text-[11px]",
              isActive
                ? "border-ink bg-ink text-paper"
                : "border-ink/30 bg-paper text-ink hover:border-ink hover:bg-paper-2",
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
