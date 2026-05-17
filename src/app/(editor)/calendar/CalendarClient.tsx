"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { listPublished, listScheduled } from "@/lib/api/articles.api";
import { listCategories } from "@/lib/api/categories.api";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { CalendarWeek } from "@/components/calendar/CalendarWeek";
import { CalendarMonth } from "@/components/calendar/CalendarMonth";
import { EventDrawer } from "@/components/calendar/EventDrawer";
import { cn } from "@/lib/utils/cn";
import {
  addDays,
  endOfMonth,
  endOfDay,
  fromIsoDay,
  isoDay,
  sameDay,
  startOfMonth,
  startOfWeek,
} from "@/lib/utils/date";
import type { ArticleCardDTO } from "@/lib/types/article";
import type { CalendarEvent } from "@/components/calendar/types";

type ViewMode = "week" | "month";

const PAGE_SIZE = 200;
const MONTH_LABEL = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

export function CalendarClient() {
  const router = useRouter();
  const params = useSearchParams();
  const fetcher = useAuthedApi();

  const focus = useMemo(() => fromIsoDay(params.get("d")), [params]);
  const view = (params.get("view") as ViewMode | null) === "month"
    ? "month"
    : "week";

  const setParam = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === "") sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      router.replace(qs ? `/calendar?${qs}` : "/calendar");
    },
    [params, router],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Data — same queries the schedule page uses so cache is shared.
  const approvedQuery = useQuery({
    queryKey: ["schedule", "approved", PAGE_SIZE],
    queryFn: async () => {
      const r = await listScheduled(fetcher, { limit: PAGE_SIZE });
      return r.data;
    },
    staleTime: 30_000,
  });

  const publishedQuery = useQuery({
    queryKey: ["schedule", "published", PAGE_SIZE],
    queryFn: async () => {
      const r = await listPublished(fetcher, { limit: PAGE_SIZE });
      return r.data;
    },
    staleTime: 30_000,
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

  // Project to CalendarEvent + group by isoDay. Sorting within day is
  // ascending by time so the first event in the chip list is the earliest.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const push = (article: ArticleCardDTO, kind: "approved" | "published") => {
      const iso = kind === "approved" ? article.scheduledAt : article.publishedAt;
      if (!iso) return;
      const day = isoDay(new Date(iso));
      const e: CalendarEvent = {
        id: article.id,
        at: iso,
        headline: article.headline,
        categoryId: article.categoryId,
        kind,
      };
      const list = map.get(day);
      if (list) list.push(e);
      else map.set(day, [e]);
    };
    (approvedQuery.data ?? []).forEach((a) => push(a, "approved"));
    (publishedQuery.data ?? []).forEach((a) => push(a, "published"));
    map.forEach((list) =>
      list.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),
    );
    return map;
  }, [approvedQuery.data, publishedQuery.data]);

  // Range label + stepper deltas depend on the view.
  const { rangeLabel, stepDays } = useMemo(() => {
    if (view === "week") {
      const ws = startOfWeek(focus);
      const we = addDays(ws, 6);
      const sameMonth = ws.getMonth() === we.getMonth();
      const label = sameMonth
        ? `${ws.getDate()}–${we.getDate()} ${MONTH_LABEL(ws)}`
        : `${ws.getDate()} ${ws.toLocaleString(undefined, { month: "short" })} – ${we.getDate()} ${we.toLocaleString(undefined, { month: "short" })} ${we.getFullYear()}`;
      return { rangeLabel: label, stepDays: 7 };
    }
    return { rangeLabel: MONTH_LABEL(focus), stepDays: 0 };
  }, [view, focus]);

  const goPrev = useCallback(() => {
    if (view === "week") setParam({ d: isoDay(addDays(focus, -stepDays)) });
    else {
      const next = new Date(focus);
      next.setMonth(next.getMonth() - 1);
      setParam({ d: isoDay(next) });
    }
  }, [view, focus, stepDays, setParam]);

  const goNext = useCallback(() => {
    if (view === "week") setParam({ d: isoDay(addDays(focus, stepDays)) });
    else {
      const next = new Date(focus);
      next.setMonth(next.getMonth() + 1);
      setParam({ d: isoDay(next) });
    }
  }, [view, focus, stepDays, setParam]);

  const goToday = useCallback(() => setParam({ d: null }), [setParam]);

  // Visible range counts (for the header summary).
  const stats = useMemo(() => {
    const start = view === "week" ? startOfWeek(focus) : startOfMonth(focus);
    const end = view === "week" ? addDays(start, 6) : endOfMonth(focus);
    const endMs = endOfDay(end).getTime();
    const startMs = start.getTime();
    let approved = 0;
    let published = 0;
    for (const list of eventsByDay.values()) {
      for (const e of list) {
        const ms = new Date(e.at).getTime();
        if (ms < startMs || ms > endMs) continue;
        if (e.kind === "approved") approved += 1;
        else published += 1;
      }
    }
    return { approved, published };
  }, [view, focus, eventsByDay]);

  const isToday = sameDay(focus, new Date());
  const loading = approvedQuery.isLoading || publishedQuery.isLoading;
  const errored = approvedQuery.isError || publishedQuery.isError;

  const openEvent = useCallback(
    (e: CalendarEvent) => setSelectedId(e.id),
    [],
  );
  const focusDay = useCallback(
    (d: Date) => setParam({ d: isoDay(d) }),
    [setParam],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-[28px] tracking-[-0.02em] font-extrabold leading-tight">
            <span className="uline">Calendar</span>
          </h1>
          <p className="font-hand text-[13px] text-muted mt-1">
            {loading
              ? "Loading…"
              : `${stats.approved} scheduled · ${stats.published} published · ${rangeLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Btn
            size="icon"
            variant="ghost"
            onClick={goPrev}
            aria-label={view === "week" ? "Previous week" : "Previous month"}
          >
            <ChevronLeft size={14} />
          </Btn>
          <div className="font-serif text-[14px] font-extrabold tracking-[-0.01em] min-w-[170px] text-center">
            {rangeLabel}
          </div>
          <Btn
            size="icon"
            variant="ghost"
            onClick={goNext}
            aria-label={view === "week" ? "Next week" : "Next month"}
          >
            <ChevronRight size={14} />
          </Btn>
          {!isToday ? (
            <Btn size="sm" variant="ghost" onClick={goToday}>
              Today
            </Btn>
          ) : null}

          <div className="inline-flex border-[1.5px] border-ink rounded-[4px] overflow-hidden">
            <ToggleSeg
              active={view === "week"}
              onClick={() => setParam({ view: null })}
            >
              Week
            </ToggleSeg>
            <ToggleSeg
              active={view === "month"}
              onClick={() => setParam({ view: "month" })}
            >
              Month
            </ToggleSeg>
          </div>

          <Btn size="sm" variant="ghost" onClick={() => router.push("/schedule")}>
            ← Day view
          </Btn>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 font-hand text-[11px] text-muted">
        <Swatch className="bg-accent" /> Scheduled
        <Swatch className="bg-accent-2" /> Published
        <Pill variant="ghost">Click any event to peek</Pill>
      </div>

      {errored ? (
        <div className="border-[1.5px] border-warn rounded-sm bg-warn/10 p-4 font-hand text-[13px]">
          Could not load the calendar — refresh to retry.
        </div>
      ) : view === "week" ? (
        <CalendarWeek
          focus={focus}
          eventsByDay={eventsByDay}
          onSelect={openEvent}
          onSelectDay={focusDay}
        />
      ) : (
        <CalendarMonth
          focus={focus}
          eventsByDay={eventsByDay}
          onSelect={openEvent}
          onSelectDay={focusDay}
        />
      )}

      <EventDrawer
        articleId={selectedId}
        onClose={() => setSelectedId(null)}
        categoryMap={categoryMap}
      />
    </div>
  );
}

function ToggleSeg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 font-hand text-[12px] transition-[background,color] duration-[120ms]",
        active ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-paper-2",
      )}
    >
      {children}
    </button>
  );
}

function Swatch({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block w-3 h-3 rounded-sm border-[1.5px] border-ink",
        className,
      )}
    />
  );
}
