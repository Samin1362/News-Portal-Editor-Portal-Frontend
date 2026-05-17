"use client";

import Link from "next/link";
import { Card, CardHead, CardTitle, CardMoreLink } from "@/components/primitives/Card";
import { Pill } from "@/components/primitives/Pill";
import { relativeTime } from "@/lib/utils/format";
import type { ArticleCardDTO } from "@/lib/types/article";
import type { CategoryDTO } from "@/lib/types/category";

interface Props {
  items: ArticleCardDTO[];
  categoryMap: Map<string, CategoryDTO>;
  isLoading?: boolean;
}

export function TodayReviewQueuePreview({ items, categoryMap, isLoading }: Props) {
  const visible = items.slice(0, 5);
  return (
    <Card>
      <CardHead>
        <CardTitle>Review queue</CardTitle>
        <CardMoreLink href="/queue">All →</CardMoreLink>
      </CardHead>

      {isLoading && visible.length === 0 ? (
        <Skel rows={5} />
      ) : visible.length === 0 ? (
        <p className="font-hand text-[13px] text-muted">
          Queue is clear — go publish something.
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {visible.map((a) => {
            const cat = categoryMap.get(a.categoryId);
            return (
              <li key={a.id}>
                <Link
                  href={`/queue/${a.id}`}
                  className="queue-hov flex items-start gap-2.5 border-[1.5px] border-ink rounded-sm bg-paper p-2.5 transition-[transform,border,box-shadow] duration-[140ms]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {a.isBreaking ? (
                        <Pill variant="red" dot dotStatic>
                          Priority
                        </Pill>
                      ) : null}
                      {cat ? <Pill variant="solid">{cat.name}</Pill> : null}
                      <span className="font-hand text-[11px] text-muted">
                        {a.status === "under_review" ? "under review" : "submitted"} ·{" "}
                        {relativeTime(a.updatedAt)}
                      </span>
                    </div>
                    <p className="font-serif text-[15px] font-extrabold tracking-[-0.01em] leading-snug line-clamp-2">
                      {a.headline}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function Skel({ rows }: { rows: number }) {
  return (
    <ol className="flex flex-col gap-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="border-[1.5px] border-ink/15 rounded-sm bg-paper-2 h-[58px] animate-pulse"
        />
      ))}
    </ol>
  );
}
