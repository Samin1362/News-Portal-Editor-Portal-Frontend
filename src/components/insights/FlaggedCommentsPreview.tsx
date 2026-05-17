"use client";

import { Card, CardHead, CardTitle, CardMoreLink } from "@/components/primitives/Card";
import { Avatar } from "@/components/primitives/Avatar";
import { Pill } from "@/components/primitives/Pill";
import { relativeTime } from "@/lib/utils/format";
import type { ModerationCommentDTO } from "@/lib/types/comment";

interface Props {
  items: ModerationCommentDTO[];
  isLoading?: boolean;
}

export function FlaggedCommentsPreview({ items, isLoading }: Props) {
  const visible = items.slice(0, 3);
  return (
    <Card>
      <CardHead>
        <CardTitle>Flagged comments</CardTitle>
        <CardMoreLink href="/flagged">Review →</CardMoreLink>
      </CardHead>

      {isLoading && visible.length === 0 ? (
        <Skel />
      ) : visible.length === 0 ? (
        <p className="font-hand text-[13px] text-muted">
          Nothing flagged. The community is behaving.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((c) => (
            <li
              key={c.id}
              className="flex items-start gap-2 border-[1.5px] border-ink rounded-sm bg-paper p-2"
            >
              <Avatar name={c.author?.displayName ?? "—"} tone="red" size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-hand text-[12px] font-bold text-ink truncate">
                    {c.author?.displayName ?? "Anonymous"}
                  </span>
                  <Pill variant="warn">{c.reportCount} report{c.reportCount === 1 ? "" : "s"}</Pill>
                  <span className="font-hand text-[11px] text-muted">
                    · {relativeTime(c.createdAt)}
                  </span>
                </div>
                <p className="font-sans text-[12.5px] text-ink line-clamp-1 mt-0.5">
                  “{c.content}”
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Skel() {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="h-[52px] border-[1.5px] border-ink/15 rounded-sm bg-paper-2 animate-pulse" />
      ))}
    </ul>
  );
}
