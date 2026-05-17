"use client";

import { Input } from "@/components/primitives/Input";
import type { ArticleSeo } from "@/lib/types/article";

export type SeoFormValue = Partial<
  Pick<ArticleSeo, "title" | "description" | "ogImage" | "canonicalUrl">
> & {
  /** Stored as comma-separated string in the form for easier handling. */
  keywords?: string;
};

interface Props {
  value: SeoFormValue;
  onChange: (next: SeoFormValue) => void;
  disabled?: boolean;
  /** Defaults derived from the article so empty fields show as placeholders. */
  defaults?: { title?: string; description?: string };
}

export function SeoPanel({ value, onChange, disabled, defaults }: Props) {
  function set<K extends keyof SeoFormValue>(key: K, v: SeoFormValue[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="font-sans text-[12px] font-semibold text-ink">
          SEO title
        </span>
        <Input
          type="text"
          value={value.title ?? ""}
          onChange={(e) => set("title", e.target.value)}
          maxLength={160}
          placeholder={defaults?.title ?? "Defaults to the headline."}
          disabled={disabled}
        />
      </label>

      <label className="block">
        <span className="font-sans text-[12px] font-semibold text-ink">
          SEO description
        </span>
        <textarea
          value={value.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          maxLength={300}
          rows={2}
          placeholder={defaults?.description ?? "Defaults to the summary."}
          disabled={disabled}
          className="mt-1 w-full border-[1.5px] border-ink rounded-sm bg-paper px-3 py-2 font-sans text-[14px] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y disabled:opacity-60"
        />
      </label>

      <label className="block">
        <span className="font-sans text-[12px] font-semibold text-ink">
          OG image URL
        </span>
        <Input
          type="url"
          value={value.ogImage ?? ""}
          onChange={(e) => set("ogImage", e.target.value)}
          placeholder="Defaults to the featured image."
          disabled={disabled}
        />
      </label>

      <label className="block">
        <span className="font-sans text-[12px] font-semibold text-ink">
          Canonical URL
        </span>
        <Input
          type="url"
          value={value.canonicalUrl ?? ""}
          onChange={(e) => set("canonicalUrl", e.target.value)}
          placeholder="Auto-generated from the slug."
          disabled={disabled}
        />
      </label>

      <label className="block">
        <span className="font-sans text-[12px] font-semibold text-ink">
          Keywords{" "}
          <span className="font-hand text-[10px] text-muted">
            (comma-separated)
          </span>
        </span>
        <Input
          type="text"
          value={value.keywords ?? ""}
          onChange={(e) => set("keywords", e.target.value)}
          placeholder="ai, climate, finance"
          disabled={disabled}
        />
      </label>
    </div>
  );
}

/** Splits the keywords string back into a backend-shaped array (max 20). */
export function serialiseKeywords(s: string | undefined): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .slice(0, 20);
}
