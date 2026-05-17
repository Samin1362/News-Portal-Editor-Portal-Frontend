"use client";

import { Card, CardHead, CardTitle, CardMoreLink } from "@/components/primitives/Card";
import type { ArticleCardDTO } from "@/lib/types/article";
import { cn } from "@/lib/utils/cn";

interface Props {
  items: ArticleCardDTO[];
  isLoading?: boolean;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function TopStoriesToday({ items, isLoading }: Props) {
  const visible = items.slice(0, 5);
  return (
    <Card>
      <CardHead>
        <CardTitle>Top stories</CardTitle>
        <CardMoreLink href="/performance">All →</CardMoreLink>
      </CardHead>

      {isLoading && visible.length === 0 ? (
        <Skel />
      ) : visible.length === 0 ? (
        <p className="font-hand text-[13px] text-muted">
          No published stories in the trending window yet.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {visible.map((a, idx) => (
            <li key={a.id} className="flex items-baseline gap-2.5">
              <span
                className={cn(
                  "font-serif font-extrabold text-[22px] leading-none w-[26px] shrink-0",
                  idx === 0 ? "text-accent" : "text-ink/60",
                )}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-[14px] font-bold leading-snug line-clamp-2">
                  {a.headline}
                </p>
                <p className="font-hand text-[11px] text-muted mt-0.5">
                  {fmt(a.viewCount)} reads · {a.commentCount} comments · {a.shareCount} shares
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function Skel() {
  return (
    <ol className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="h-[44px] border-[1.5px] border-ink/15 rounded-sm bg-paper-2 animate-pulse" />
      ))}
    </ol>
  );
}
