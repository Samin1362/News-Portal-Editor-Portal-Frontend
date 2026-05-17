"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { X } from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { listTags } from "@/lib/api/tags.api";
import type { TagDTO } from "@/lib/types/tag";
import { cn } from "@/lib/utils/cn";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  /** Hard cap (matches backend max of 20). */
  max?: number;
  placeholder?: string;
  disabled?: boolean;
}

const DEBOUNCE_MS = 200;

/** Tag input with chips + autocomplete (backend creates tags by name on save). */
export function TagInput({
  value,
  onChange,
  max = 20,
  placeholder = "Add tags…",
  disabled = false,
}: Props) {
  const fetcher = useAuthedApi();
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<TagDTO[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const lower = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value],
  );

  useEffect(() => {
    const term = draft.trim();
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      if (!term) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      try {
        const matches = await listTags(fetcher, term);
        if (ctrl.signal.aborted) return;
        const filtered = matches
          .filter((t) => !lower.has(t.name.toLowerCase()))
          .slice(0, 8);
        setSuggestions(filtered);
        setOpen(filtered.length > 0);
      } catch {
        if (!ctrl.signal.aborted) setSuggestions([]);
      }
    }, DEBOUNCE_MS);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [draft, lower, fetcher]);

  function add(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (lower.has(trimmed.toLowerCase())) return;
    if (value.length >= max) return;
    onChange([...value, trimmed]);
    setDraft("");
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  function remove(name: string) {
    onChange(value.filter((v) => v !== name));
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      remove(value[value.length - 1]!);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className={cn("relative", disabled && "opacity-60")}>
      <div
        className="flex flex-wrap items-center gap-1.5 border-[1.5px] border-ink rounded-sm bg-paper px-2 py-1.5 min-h-[42px] focus-within:ring-2 focus-within:ring-accent/30"
        onClick={() => inputRef.current?.focus()}
        role="presentation"
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 border-[1.5px] border-ink rounded-full px-2 py-0.5 font-hand text-[11px] text-ink bg-paper-2"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => remove(tag)}
              className="hover:text-accent"
              disabled={disabled}
            >
              <X size={11} aria-hidden />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          disabled={disabled || value.length >= max}
          placeholder={value.length >= max ? `Max ${max} tags` : placeholder}
          className="flex-1 min-w-[100px] bg-transparent font-sans text-[14px] outline-none placeholder:text-muted py-1"
        />
      </div>
      {open ? (
        <ul
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 border-[1.5px] border-ink rounded-sm bg-paper shadow-md max-h-[200px] overflow-y-auto"
        >
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(s.name)}
                className="w-full text-left px-3 py-1.5 font-sans text-[13px] hover:bg-paper-2"
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-1 font-hand text-[10px] text-muted">
        Press Enter or comma to add. {value.length}/{max} used.
      </p>
    </div>
  );
}
