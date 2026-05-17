"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock,
  Printer,
  Users,
} from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { listQueue, listScheduled } from "@/lib/api/articles.api";
import { listCategories } from "@/lib/api/categories.api";
import { listUsers } from "@/lib/api/users.api";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { statsFor, useDeskTarget } from "@/lib/reporters/workload";
import {
  endOfDay,
  isoDay,
  startOfDay,
} from "@/lib/utils/date";
import { formatDate, relativeTime } from "@/lib/utils/format";
import type { ArticleCardDTO } from "@/lib/types/article";
import type { UserDTO } from "@/lib/types/user";

const QUEUE_LIMIT = 50;
const SLOT_LIMIT = 60;
const REPORTER_AT_RISK_THRESHOLD = 70;
const REPORTER_TOP = 5;

export function DailyPlanClient() {
  const fetcher = useAuthedApi();
  const router = useRouter();
  const target = useDeskTarget();

  const today = useMemo(() => new Date(), []);
  const dayStart = useMemo(() => startOfDay(today).getTime(), [today]);
  const dayEnd = useMemo(() => endOfDay(today).getTime(), [today]);

  const queueQuery = useQuery({
    queryKey: ["daily-plan", "queue"],
    queryFn: async () => {
      const [submitted, underReview] = await Promise.all([
        listQueue(fetcher, { status: "submitted", limit: QUEUE_LIMIT }),
        listQueue(fetcher, { status: "under_review", limit: QUEUE_LIMIT }),
      ]);
      return [...submitted.data, ...underReview.data];
    },
    staleTime: 60_000,
  });

  const scheduledQuery = useQuery({
    queryKey: ["daily-plan", "scheduled"],
    queryFn: async () => {
      const r = await listScheduled(fetcher, { limit: SLOT_LIMIT });
      return r.data;
    },
    staleTime: 60_000,
  });

  const reportersQuery = useQuery({
    queryKey: ["users", "journalist-list-plan"],
    queryFn: async () => {
      const result = await listUsers(fetcher, {
        role: "journalist",
        limit: 100,
      });
      return result?.data ?? null;
    },
    staleTime: 5 * 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(fetcher),
    staleTime: 5 * 60_000,
  });
  const categoryMap = useMemo(
    () => new Map((categoriesQuery.data ?? []).map((c) => [c.id, c])),
    [categoriesQuery.data],
  );

  const queueItems = useMemo(
    () => queueQuery.data ?? [],
    [queueQuery.data],
  );
  const scheduledItems = useMemo(
    () => scheduledQuery.data ?? [],
    [scheduledQuery.data],
  );
  const reporters: UserDTO[] = useMemo(
    () => reportersQuery.data ?? [],
    [reportersQuery.data],
  );
  const reporterMap = useMemo(() => {
    const m = new Map<string, UserDTO>();
    for (const r of reporters) m.set(r.id, r);
    return m;
  }, [reporters]);

  // Slots today: approved articles with `scheduledAt` falling between
  // midnight and 23:59, plus queue items that carry an explicit
  // `scheduledAt` in the same window (rare but possible).
  const todaysSlots = useMemo(() => {
    const all: ArticleCardDTO[] = [...scheduledItems, ...queueItems];
    const seen = new Set<string>();
    const slots = all.filter((a) => {
      if (seen.has(a.id)) return false;
      if (!a.scheduledAt) return false;
      const t = new Date(a.scheduledAt).getTime();
      const inWindow = t >= dayStart && t <= dayEnd;
      if (!inWindow) return false;
      seen.add(a.id);
      return true;
    });
    slots.sort(
      (a, b) =>
        new Date(a.scheduledAt!).getTime() -
        new Date(b.scheduledAt!).getTime(),
    );
    return slots;
  }, [scheduledItems, queueItems, dayStart, dayEnd]);

  // Top 10 review queue items by recency, prioritising under_review then
  // submitted within each group.
  const topQueue = useMemo(() => {
    return [...queueItems]
      .sort((a, b) => {
        const rank = (s: string) => (s === "under_review" ? 0 : 1);
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return (
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime()
        );
      })
      .slice(0, 10);
  }, [queueItems]);

  // Reporters with at-risk loads (loadPct >= threshold). Falls back to
  // sorted-by-load if nobody is currently over the line.
  const atRisk = useMemo(() => {
    const rows = reporters.map((r) => {
      const stats = statsFor(r.id, queueItems, target);
      return { user: r, stats };
    });
    const flagged = rows
      .filter((r) => r.stats.loadPct >= REPORTER_AT_RISK_THRESHOLD)
      .sort((a, b) => b.stats.loadPct - a.stats.loadPct)
      .slice(0, REPORTER_TOP);
    if (flagged.length > 0) return { rows: flagged, fallback: false };
    return {
      rows: rows
        .filter((r) => r.stats.active + r.stats.inReview > 0)
        .sort((a, b) => b.stats.loadPct - a.stats.loadPct)
        .slice(0, REPORTER_TOP),
      fallback: true,
    };
  }, [reporters, queueItems, target]);

  const isLoading =
    queueQuery.isLoading ||
    scheduledQuery.isLoading ||
    reportersQuery.isLoading;

  const dayIso = isoDay(today);

  return (
    <div className="daily-plan-page flex flex-col gap-5">
      {/* Header — hidden on print so the printed sheet is just the briefing. */}
      <div
        className="flex items-start justify-between gap-3 flex-wrap"
        data-print="hide"
      >
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-hand text-[12px] text-muted hover:text-ink"
          >
            <ArrowLeft size={12} /> Back to Today
          </Link>
          <h1 className="font-serif text-[28px] tracking-[-0.02em] font-extrabold leading-tight mt-1">
            <span className="uline">Daily plan</span>
          </h1>
          <p className="font-hand text-[13px] text-muted mt-1">
            Briefing for {formatDate(today.toISOString())} · prints clean on a
            single sheet
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft size={12} /> Back
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            onClick={() => window.print()}
            title="Print briefing"
          >
            <Printer size={12} /> Print
          </Btn>
        </div>
      </div>

      {/* Printable masthead — visible only when printing (header is hidden). */}
      <div className="hidden print:block">
        <h1 className="font-serif text-[26px] font-extrabold tracking-[-0.02em]">
          Deligo — Daily plan
        </h1>
        <p className="font-hand text-[12px] text-muted">
          {formatDate(today.toISOString())} · printed {dayIso}
        </p>
        <hr className="border-ink/30 my-2" />
      </div>

      {isLoading ? (
        <p className="font-hand text-[13px] text-muted">
          Building briefing…
        </p>
      ) : null}

      {/* Today's slots */}
      <section className="daily-plan-card border-[1.5px] border-ink rounded-sm bg-paper p-4">
        <header className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} aria-hidden />
            <h2 className="font-serif text-[17px] font-extrabold tracking-[-0.01em]">
              Today&apos;s slots
            </h2>
          </div>
          <span className="font-hand text-[11px] text-muted">
            {todaysSlots.length}{" "}
            {todaysSlots.length === 1 ? "slot" : "slots"}
          </span>
        </header>
        {todaysSlots.length === 0 ? (
          <p className="font-hand text-[13px] text-muted">
            No scheduled slots for today.
          </p>
        ) : (
          <ol className="flex flex-col">
            {todaysSlots.map((a) => (
              <SlotRow
                key={a.id}
                article={a}
                categoryName={categoryMap.get(a.categoryId)?.name}
                reporterName={reporterMap.get(a.authorId)?.displayName}
              />
            ))}
          </ol>
        )}
      </section>

      {/* Review queue */}
      <section className="daily-plan-card border-[1.5px] border-ink rounded-sm bg-paper p-4">
        <header className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Clock size={14} aria-hidden />
            <h2 className="font-serif text-[17px] font-extrabold tracking-[-0.01em]">
              Review queue — top 10
            </h2>
          </div>
          <span className="font-hand text-[11px] text-muted">
            {queueItems.length} in total
          </span>
        </header>
        {topQueue.length === 0 ? (
          <p className="font-hand text-[13px] text-muted">
            Queue is empty.
          </p>
        ) : (
          <ol className="flex flex-col">
            {topQueue.map((a, i) => (
              <QueueRow
                key={a.id}
                rank={i + 1}
                article={a}
                categoryName={categoryMap.get(a.categoryId)?.name}
                reporterName={reporterMap.get(a.authorId)?.displayName}
              />
            ))}
          </ol>
        )}
      </section>

      {/* At-risk reporters */}
      <section className="daily-plan-card border-[1.5px] border-ink rounded-sm bg-paper p-4">
        <header className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Users size={14} aria-hidden />
            <h2 className="font-serif text-[17px] font-extrabold tracking-[-0.01em]">
              {atRisk.fallback ? "Reporters under load" : "At-risk reporters"}
            </h2>
          </div>
          <span className="font-hand text-[11px] text-muted">
            target {target} · threshold {REPORTER_AT_RISK_THRESHOLD}%
          </span>
        </header>
        {atRisk.rows.length === 0 ? (
          <p className="font-hand text-[13px] text-muted">
            Nobody is carrying queue load right now.
          </p>
        ) : (
          <ul className="flex flex-col">
            {atRisk.rows.map(({ user, stats }) => (
              <li
                key={user.id}
                className="border-b-[1.5px] border-ink/15 last:border-b-0 py-2 first:pt-0 last:pb-0 flex items-start gap-3"
              >
                <AlertTriangle
                  size={14}
                  className={
                    stats.loadPct >= REPORTER_AT_RISK_THRESHOLD
                      ? "text-warn shrink-0 mt-1"
                      : "text-muted shrink-0 mt-1"
                  }
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/reporters/${user.id}`}
                    className="font-serif text-[14px] font-bold hover:underline"
                  >
                    {user.displayName}
                  </Link>
                  <p className="font-hand text-[11px] text-muted">
                    {stats.active} submitted · {stats.inReview} under review ·{" "}
                    {stats.revisions} revisions · last filed{" "}
                    {relativeTime(stats.lastFiledAt)}
                  </p>
                </div>
                <Pill
                  variant={
                    stats.loadPct >= REPORTER_AT_RISK_THRESHOLD
                      ? "warn"
                      : "ghost"
                  }
                >
                  {stats.loadPct}%
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p
        className="font-hand text-[11px] text-muted text-center"
        data-print="hide"
      >
        Tip: print to PDF for the file-and-forget version, or `Cmd+P` /
        `Ctrl+P` from anywhere.
      </p>
    </div>
  );
}

function SlotRow({
  article,
  categoryName,
  reporterName,
}: {
  article: ArticleCardDTO;
  categoryName?: string;
  reporterName?: string;
}) {
  const slotTime = article.scheduledAt
    ? new Date(article.scheduledAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  return (
    <li className="border-b-[1.5px] border-ink/15 last:border-b-0 py-2 first:pt-0 last:pb-0 flex items-start gap-3">
      <span className="font-serif text-[14px] font-extrabold tabular-nums w-[58px] shrink-0">
        {slotTime}
      </span>
      <div className="flex-1 min-w-0">
        <Link
          href={`/queue/${article.id}`}
          className="font-serif text-[13.5px] font-bold leading-tight hover:underline line-clamp-2"
        >
          {article.headline}
        </Link>
        <p className="font-hand text-[11px] text-muted">
          {categoryName ? `${categoryName} · ` : ""}
          {reporterName ?? `Reporter …${article.authorId.slice(-6)}`}
        </p>
      </div>
      <Pill variant={article.status === "approved" ? "green" : "ghost"}>
        {article.status.replace("_", " ")}
      </Pill>
    </li>
  );
}

function QueueRow({
  rank,
  article,
  categoryName,
  reporterName,
}: {
  rank: number;
  article: ArticleCardDTO;
  categoryName?: string;
  reporterName?: string;
}) {
  return (
    <li className="border-b-[1.5px] border-ink/15 last:border-b-0 py-2 first:pt-0 last:pb-0 flex items-start gap-3">
      <span className="font-serif text-[14px] font-extrabold tabular-nums w-6 shrink-0 text-ink/80">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <Link
          href={`/queue/${article.id}`}
          className="font-serif text-[13.5px] font-bold leading-tight hover:underline line-clamp-2"
        >
          {article.headline}
        </Link>
        <p className="font-hand text-[11px] text-muted">
          {categoryName ? `${categoryName} · ` : ""}
          {reporterName ?? `Reporter …${article.authorId.slice(-6)}`} ·{" "}
          updated {relativeTime(article.updatedAt)}
        </p>
      </div>
      <Pill
        variant={article.status === "under_review" ? "warn" : "ghost"}
      >
        {article.status.replace("_", " ")}
      </Pill>
    </li>
  );
}
