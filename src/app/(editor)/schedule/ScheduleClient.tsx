"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { useToast } from "@/lib/ui/toast";
import { ApiError } from "@/lib/api/client";
import {
  listPublished,
  listScheduled,
  publishArticle,
  scheduleArticle,
} from "@/lib/api/articles.api";
import { listCategories } from "@/lib/api/categories.api";
import { DateStepper } from "@/components/schedule/DateStepper";
import { DayTimeline } from "@/components/schedule/DayTimeline";
import { Pill } from "@/components/primitives/Pill";
import { Btn } from "@/components/primitives/Btn";
import { cn } from "@/lib/utils/cn";
import {
  endOfDay,
  fromIsoDay,
  isoDay,
  isoForMinute,
  minuteOfDay,
  sameDay,
  startOfDay,
} from "@/lib/utils/date";
import type { ArticleCardDTO } from "@/lib/types/article";

const PAGE_SIZE = 100;

export function ScheduleClient() {
  const router = useRouter();
  const params = useSearchParams();
  const fetcher = useAuthedApi();
  const qc = useQueryClient();
  const toast = useToast();

  const dayIso = params.get("d");
  const categoryId = params.get("category") ?? "all";
  const focus = useMemo(() => fromIsoDay(dayIso), [dayIso]);
  const isToday = sameDay(focus, new Date());

  const setParam = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === "" || v === "all") sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      router.replace(qs ? `/schedule?${qs}` : "/schedule");
    },
    [params, router],
  );

  // Tick "now" once per minute so the now-line drifts naturally. `nowMs` is
  // a plain Date.now() snapshot that the interval bumps; the actual minute
  // is derived in a memo so the render stays pure and the only setState
  // call lives inside the interval callback (not the effect body).
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!isToday) return;
    const t = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, [isToday]);
  const nowMinute = useMemo(
    () => (isToday ? minuteOfDay(new Date(nowMs)) : null),
    [isToday, nowMs],
  );

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(fetcher),
    staleTime: 5 * 60_000,
  });
  const categoryMap = useMemo(
    () => new Map((categoriesQuery.data ?? []).map((c) => [c.id, c])),
    [categoriesQuery.data],
  );

  const approvedQuery = useQuery({
    queryKey: ["schedule", "approved", PAGE_SIZE],
    queryFn: async () => {
      const result = await listScheduled(fetcher, { limit: PAGE_SIZE });
      return result.data;
    },
    staleTime: 30_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 60_000
        : false,
  });

  const publishedQuery = useQuery({
    queryKey: ["schedule", "published", PAGE_SIZE],
    queryFn: async () => {
      const result = await listPublished(fetcher, { limit: PAGE_SIZE });
      return result.data;
    },
    staleTime: 30_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 60_000
        : false,
  });

  const allApproved = useMemo(
    () => approvedQuery.data ?? [],
    [approvedQuery.data],
  );
  const allPublished = useMemo(
    () => publishedQuery.data ?? [],
    [publishedQuery.data],
  );

  // Filter into the focused day window, then by category chip.
  const dayBounds = useMemo(
    () => ({ start: startOfDay(focus).getTime(), end: endOfDay(focus).getTime() }),
    [focus],
  );

  const matchesCategory = useCallback(
    (a: ArticleCardDTO) =>
      categoryId === "all" ? true : a.categoryId === categoryId,
    [categoryId],
  );

  const approvedToday = useMemo(() => {
    return allApproved
      .filter((a) => {
        if (!a.scheduledAt) return false;
        const t = new Date(a.scheduledAt).getTime();
        return t >= dayBounds.start && t <= dayBounds.end && matchesCategory(a);
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledAt!).getTime() -
          new Date(b.scheduledAt!).getTime(),
      );
  }, [allApproved, dayBounds, matchesCategory]);

  const publishedToday = useMemo(() => {
    return allPublished
      .filter((a) => {
        if (!a.publishedAt) return false;
        const t = new Date(a.publishedAt).getTime();
        return t >= dayBounds.start && t <= dayBounds.end && matchesCategory(a);
      })
      .sort(
        (a, b) =>
          new Date(a.publishedAt!).getTime() -
          new Date(b.publishedAt!).getTime(),
      );
  }, [allPublished, dayBounds, matchesCategory]);

  // Conflict set — any two scheduled blocks whose `scheduledAt` differ by ≤5
  // minutes get the warning tint. Tagged on both sides of the pair.
  const conflicts = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < approvedToday.length; i += 1) {
      for (let j = i + 1; j < approvedToday.length; j += 1) {
        const a = approvedToday[i]!;
        const b = approvedToday[j]!;
        const da = new Date(a.scheduledAt!).getTime();
        const db = new Date(b.scheduledAt!).getTime();
        if (Math.abs(da - db) <= 5 * 60_000) {
          set.add(a.id);
          set.add(b.id);
        }
      }
    }
    return set;
  }, [approvedToday]);

  // Reschedule mutation — optimistic move, revert on 4xx.
  const rescheduleMu = useMutation({
    mutationFn: (vars: { id: string; iso: string }) =>
      scheduleArticle(fetcher, vars.id, vars.iso),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["schedule", "approved", PAGE_SIZE] });
      const prev = qc.getQueryData<ArticleCardDTO[]>([
        "schedule",
        "approved",
        PAGE_SIZE,
      ]);
      qc.setQueryData<ArticleCardDTO[]>(
        ["schedule", "approved", PAGE_SIZE],
        (curr) =>
          (curr ?? []).map((a) =>
            a.id === vars.id ? { ...a, scheduledAt: vars.iso } : a,
          ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      qc.setQueryData(
        ["schedule", "approved", PAGE_SIZE],
        ctx?.prev ?? undefined,
      );
      toast.error(err instanceof ApiError ? err.message : "Schedule failed");
    },
    onSuccess: () => {
      toast.success("Rescheduled");
      qc.invalidateQueries({ queryKey: ["schedule", "approved", PAGE_SIZE] });
      qc.invalidateQueries({ queryKey: ["queue"] });
    },
  });

  const publishNowMu = useMutation({
    mutationFn: (id: string) => publishArticle(fetcher, id),
    onSuccess: () => {
      toast.success("Published");
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["queue"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Publish failed"),
  });

  const onReschedule = useCallback(
    (id: string, minutes: number) => {
      const newDate = new Date(startOfDay(focus));
      newDate.setMinutes(minutes);

      // Backend requires `scheduledAt` strictly in the future.
      if (newDate.getTime() <= Date.now()) {
        toast.error("Pick a time in the future.");
        return;
      }

      const collidesWithIso = allApproved.find((a) => {
        if (a.id === id || !a.scheduledAt) return false;
        return Math.abs(new Date(a.scheduledAt).getTime() - newDate.getTime()) <=
          5 * 60_000;
      });
      if (collidesWithIso) {
        toast.info(
          `Heads up — "${collidesWithIso.headline}" is also within 5 minutes of that slot.`,
        );
      }
      rescheduleMu.mutate({ id, iso: isoForMinute(focus, minutes) });
    },
    [focus, allApproved, rescheduleMu, toast],
  );

  const categories = categoriesQuery.data ?? [];
  const loading = approvedQuery.isLoading || publishedQuery.isLoading;
  const errored = approvedQuery.isError || publishedQuery.isError;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-[28px] tracking-[-0.02em] font-extrabold leading-tight">
            <span className="uline">Schedule</span>
          </h1>
          <p className="font-hand text-[13px] text-muted mt-1">
            {loading
              ? "Loading…"
              : `${approvedToday.length} scheduled · ${publishedToday.length} live today`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateStepper
            date={focus}
            onChange={(next) => setParam({ d: isoDay(next) })}
          />
          <Pill variant="ghost">Auto-refresh · 60s</Pill>
          <Btn size="sm" variant="ghost" onClick={() => router.push("/calendar")}>
            Calendar →
          </Btn>
        </div>
      </div>

      {/* Category chips */}
      {categories.length > 0 ? (
        <div className="flex gap-1.5 flex-wrap">
          <Chip
            label="All"
            active={categoryId === "all"}
            onClick={() => setParam({ category: null })}
          />
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={categoryId === c.id}
              onClick={() => setParam({ category: c.id })}
            />
          ))}
        </div>
      ) : null}

      {/* Legend */}
      <div className="flex items-center gap-3 font-hand text-[11px] text-muted">
        <Swatch className="bg-accent" /> Scheduled · drag to move
        <Swatch className="bg-accent-2" /> Published · locked
        {conflicts.size > 0 ? (
          <span className="text-warn font-bold">
            · {conflicts.size / 2} potential double-booking{conflicts.size / 2 > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {/* Body */}
      {errored ? (
        <div className="border-[1.5px] border-warn rounded-sm bg-warn/10 p-4 font-hand text-[13px]">
          Could not load the schedule. The backend may be down or the query
          parameter is unrecognised. Refresh to retry.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px] items-start">
          <DayTimeline
            approved={approvedToday}
            published={publishedToday}
            categoryMap={categoryMap}
            isToday={isToday}
            conflicts={conflicts}
            onReschedule={onReschedule}
            nowMinute={nowMinute}
          />

          {/* Side panel — quick list + publish-now */}
          <aside className="flex flex-col gap-3">
            <SidePanel
              title="Up next today"
              items={approvedToday.slice(0, 6)}
              empty="No approved articles are scheduled in this view."
              onOpen={(id) => router.push(`/queue/${id}`)}
              onPublishNow={(id) => publishNowMu.mutate(id)}
              busyId={publishNowMu.isPending ? publishNowMu.variables : null}
              showPublishNow
            />
            <SidePanel
              title="Published earlier today"
              items={publishedToday.slice(0, 6)}
              empty="Nothing has gone live today."
              onOpen={(id) => router.push(`/queue/${id}`)}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-[1.5px] rounded-[4px] px-2.5 py-1 font-hand text-[12px] transition-[background,color,border] duration-[120ms]",
        active
          ? "border-ink bg-ink text-paper"
          : "border-ink/30 bg-paper text-ink hover:border-ink hover:bg-paper-2",
      )}
    >
      {label}
    </button>
  );
}

function Swatch({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block w-3 h-3 rounded-sm border-[1.5px] border-ink", className)}
    />
  );
}

function SidePanel({
  title,
  items,
  empty,
  onOpen,
  onPublishNow,
  busyId,
  showPublishNow,
}: {
  title: string;
  items: ArticleCardDTO[];
  empty: string;
  onOpen: (id: string) => void;
  onPublishNow?: (id: string) => void;
  busyId?: string | null;
  showPublishNow?: boolean;
}) {
  return (
    <div className="rounded-sm border-[1.5px] border-ink bg-paper p-3">
      <h2 className="font-serif text-[15px] font-extrabold tracking-[-0.01em] mb-2">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="font-hand text-[11.5px] text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((a) => {
            const iso = a.scheduledAt ?? a.publishedAt;
            const at = iso
              ? new Date(iso).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—";
            return (
              <li
                key={a.id}
                className="border-[1.5px] border-ink/15 rounded-sm bg-paper-2 p-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-hand text-[10.5px] text-muted">{at}</span>
                  <button
                    type="button"
                    className="font-serif text-[12.5px] font-bold leading-tight text-left line-clamp-1 flex-1 hover:underline"
                    onClick={() => onOpen(a.id)}
                  >
                    {a.headline}
                  </button>
                </div>
                {showPublishNow && onPublishNow ? (
                  <div className="mt-1.5 flex justify-end">
                    <Btn
                      size="sm"
                      variant="primary"
                      onClick={() => onPublishNow(a.id)}
                      disabled={busyId === a.id}
                    >
                      {busyId === a.id ? "Publishing…" : "Publish now"}
                    </Btn>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
