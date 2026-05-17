"use client";

import { Card, CardHead, CardTitle, CardMoreLink } from "@/components/primitives/Card";
import { Avatar } from "@/components/primitives/Avatar";
import { BarTrack } from "@/components/primitives/BarTrack";
import { Pill } from "@/components/primitives/Pill";
import { cn } from "@/lib/utils/cn";
import type { UserDTO } from "@/lib/types/user";
import type { ArticleCardDTO } from "@/lib/types/article";

interface Props {
  /** May be null when the current user is an editor (admin-only endpoint). */
  reporters: UserDTO[] | null;
  /** Submitted + under_review articles — used to derive per-reporter load. */
  queue: ArticleCardDTO[];
  /** Target items per reporter — see plan §5. */
  deskTarget?: number;
}

function loadFor(authorId: string, queue: ArticleCardDTO[], deskTarget: number) {
  const active = queue.filter((a) => a.authorId === authorId && a.status === "submitted").length;
  const inReview = queue.filter((a) => a.authorId === authorId && a.status === "under_review").length;
  const pct = Math.min(100, Math.round(((active + 2 * inReview) / deskTarget) * 100));
  return { active, inReview, pct };
}

function tone(pct: number): "red" | "warn" | "green" | "default" {
  if (pct > 70) return "red";
  if (pct >= 40) return "warn";
  if (pct > 0) return "green";
  return "default";
}

export function ReportersWorkload({ reporters, queue, deskTarget = 5 }: Props) {
  if (reporters === null) {
    return (
      <Card>
        <CardHead>
          <CardTitle>Reporters</CardTitle>
          <CardMoreLink href="/reporters">Open →</CardMoreLink>
        </CardHead>
        <div className="border-[1.5px] border-dashed border-ink/30 rounded-sm bg-paper-2 p-3">
          <p className="font-hand text-[12px] text-ink">
            Reporter directory is admin-gated.
          </p>
          <p className="font-hand text-[11px] text-muted mt-1">
            Editors will see load bars once a desk-scoped author endpoint lands.
          </p>
        </div>
      </Card>
    );
  }

  const rows = reporters
    .map((r) => ({ user: r, ...loadFor(r.id, queue, deskTarget) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);

  return (
    <Card>
      <CardHead>
        <CardTitle>Reporters</CardTitle>
        <CardMoreLink href="/reporters">Open →</CardMoreLink>
      </CardHead>
      {rows.length === 0 ? (
        <p className="font-hand text-[13px] text-muted">No reporters yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const t = tone(r.pct);
            return (
              <li key={r.user.id} className="flex items-center gap-2.5">
                <Avatar name={r.user.displayName} tone="warm" size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-[13px] font-bold truncate">
                      {r.user.displayName}
                    </span>
                    <Pill variant={pillVariant(t)}>{r.pct}%</Pill>
                  </div>
                  <p className={cn("font-hand text-[11px] text-muted truncate")}>
                    {r.active} submitted · {r.inReview} in review
                  </p>
                  <BarTrack
                    value={r.pct}
                    tone={t === "default" ? "default" : t}
                    className="mt-1"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function pillVariant(t: "red" | "warn" | "green" | "default") {
  if (t === "red") return "red" as const;
  if (t === "warn") return "warn" as const;
  if (t === "green") return "green" as const;
  return "ghost" as const;
}
