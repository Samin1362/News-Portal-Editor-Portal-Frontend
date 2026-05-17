"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Download,
  Eye,
  MessageSquare,
  Share2,
} from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { listPublished } from "@/lib/api/articles.api";
import { listCategories } from "@/lib/api/categories.api";
import { listUsers } from "@/lib/api/users.api";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { BarTrack } from "@/components/primitives/BarTrack";
import { cn } from "@/lib/utils/cn";
import {
  addDays,
  endOfDay,
  fromIsoDay,
  isoDay,
  startOfDay,
} from "@/lib/utils/date";
import { formatDate } from "@/lib/utils/format";
import type { ArticleCardDTO } from "@/lib/types/article";
import type { UserDTO } from "@/lib/types/user";

type RangeKey = "24h" | "7d" | "30d" | "90d" | "custom";

const RANGE_CHIPS: Array<{ key: RangeKey; label: string }> = [
  { key: "24h", label: "Last 24h" },
  { key: "7d", label: "Last 7d" },
  { key: "30d", label: "Last 30d" },
  { key: "90d", label: "Last 90d" },
];

const POOL_LIMIT = 200;
const TOP_N = 10;

function rangeWindow(
  key: RangeKey,
  fromIso: string | null,
  toIso: string | null,
) {
  const now = new Date();
  if (key === "24h") {
    return {
      start: now.getTime() - 24 * 60 * 60 * 1000,
      end: now.getTime(),
    };
  }
  if (key === "7d") {
    return {
      start: startOfDay(addDays(now, -6)).getTime(),
      end: endOfDay(now).getTime(),
    };
  }
  if (key === "30d") {
    return {
      start: startOfDay(addDays(now, -29)).getTime(),
      end: endOfDay(now).getTime(),
    };
  }
  if (key === "90d") {
    return {
      start: startOfDay(addDays(now, -89)).getTime(),
      end: endOfDay(now).getTime(),
    };
  }
  if (key === "custom" && (fromIso || toIso)) {
    const start = fromIso
      ? startOfDay(fromIsoDay(fromIso)).getTime()
      : -Infinity;
    const end = toIso ? endOfDay(fromIsoDay(toIso)).getTime() : Infinity;
    return { start, end };
  }
  return { start: -Infinity, end: Infinity };
}

function rangeLabel(
  key: RangeKey,
  fromIso: string | null,
  toIso: string | null,
): string {
  if (key === "custom") {
    if (fromIso && toIso) return `${fromIso} → ${toIso}`;
    if (fromIso) return `from ${fromIso}`;
    if (toIso) return `until ${toIso}`;
    return "all time";
  }
  return RANGE_CHIPS.find((c) => c.key === key)?.label ?? "Last 7d";
}

function csvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PerformanceClient() {
  const router = useRouter();
  const params = useSearchParams();
  const fetcher = useAuthedApi();

  const range = (params.get("range") as RangeKey | null) ?? "7d";
  const fromIso = params.get("from");
  const toIso = params.get("to");

  const setParam = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === "") sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      router.replace(qs ? `/performance?${qs}` : "/performance");
    },
    [params, router],
  );

  // Pull two pages of published articles (up to 400) — backend has no
  // top-stories analytics endpoint, so we aggregate client-side.
  const articlesQuery = useQuery({
    queryKey: ["performance", "published-pool", POOL_LIMIT * 2],
    queryFn: async () => {
      const [p1, p2] = await Promise.all([
        listPublished(fetcher, { page: 1, limit: POOL_LIMIT }),
        listPublished(fetcher, { page: 2, limit: POOL_LIMIT }),
      ]);
      return [...p1.data, ...p2.data];
    },
    staleTime: 60_000,
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

  const reportersQuery = useQuery({
    queryKey: ["users", "journalist-list-perf"],
    queryFn: async () => {
      const result = await listUsers(fetcher, {
        role: "journalist",
        limit: 100,
      });
      return result?.data ?? null;
    },
    staleTime: 5 * 60_000,
  });
  const reporterMap = useMemo(() => {
    const m = new Map<string, UserDTO>();
    for (const u of reportersQuery.data ?? []) m.set(u.id, u);
    return m;
  }, [reportersQuery.data]);

  const allPublished = useMemo(
    () => articlesQuery.data ?? [],
    [articlesQuery.data],
  );

  const { start, end } = useMemo(
    () => rangeWindow(range, fromIso, toIso),
    [range, fromIso, toIso],
  );

  const inWindow = useMemo(
    () =>
      allPublished.filter((a) => {
        const t = a.publishedAt
          ? new Date(a.publishedAt).getTime()
          : new Date(a.updatedAt).getTime();
        return t >= start && t <= end;
      }),
    [allPublished, start, end],
  );

  const totals = useMemo(() => {
    let reads = 0;
    let comments = 0;
    let shares = 0;
    for (const a of inWindow) {
      reads += a.viewCount ?? 0;
      comments += a.commentCount ?? 0;
      shares += a.shareCount ?? 0;
    }
    return { reads, comments, shares, stories: inWindow.length };
  }, [inWindow]);

  const topByReads = useMemo(
    () =>
      [...inWindow]
        .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
        .slice(0, TOP_N),
    [inWindow],
  );

  const byCategory = useMemo(() => {
    const tallies = new Map<
      string,
      { reads: number; stories: number; comments: number }
    >();
    for (const a of inWindow) {
      const cur = tallies.get(a.categoryId) ?? {
        reads: 0,
        stories: 0,
        comments: 0,
      };
      cur.reads += a.viewCount ?? 0;
      cur.comments += a.commentCount ?? 0;
      cur.stories += 1;
      tallies.set(a.categoryId, cur);
    }
    const rows = Array.from(tallies.entries()).map(([categoryId, v]) => ({
      categoryId,
      name: categoryMap.get(categoryId)?.name ?? "Uncategorised",
      ...v,
    }));
    rows.sort((a, b) => b.reads - a.reads);
    return rows;
  }, [inWindow, categoryMap]);

  const byReporter = useMemo(() => {
    const tallies = new Map<
      string,
      { reads: number; stories: number; comments: number }
    >();
    for (const a of inWindow) {
      const cur = tallies.get(a.authorId) ?? {
        reads: 0,
        stories: 0,
        comments: 0,
      };
      cur.reads += a.viewCount ?? 0;
      cur.comments += a.commentCount ?? 0;
      cur.stories += 1;
      tallies.set(a.authorId, cur);
    }
    const rows = Array.from(tallies.entries()).map(([authorId, v]) => ({
      authorId,
      name:
        reporterMap.get(authorId)?.displayName ??
        `Reporter …${authorId.slice(-6)}`,
      ...v,
    }));
    rows.sort((a, b) => b.reads - a.reads);
    return rows.slice(0, TOP_N);
  }, [inWindow, reporterMap]);

  const handleExport = useCallback(() => {
    const today = isoDay(new Date());
    const label = rangeLabel(range, fromIso, toIso).replace(/\s+/g, "_");
    const filename = `performance_${label}_${today}.csv`;
    const rows: string[][] = [];
    rows.push([
      "Section",
      "Rank",
      "Headline / Name",
      "Category",
      "Reporter",
      "Reads",
      "Comments",
      "Shares",
      "Published",
      "Slug",
    ]);
    topByReads.forEach((a, i) => {
      rows.push([
        "Top stories",
        String(i + 1),
        a.headline,
        categoryMap.get(a.categoryId)?.name ?? "",
        reporterMap.get(a.authorId)?.displayName ?? a.authorId,
        String(a.viewCount ?? 0),
        String(a.commentCount ?? 0),
        String(a.shareCount ?? 0),
        a.publishedAt ?? a.updatedAt ?? "",
        a.slug,
      ]);
    });
    byCategory.forEach((r, i) => {
      rows.push([
        "By category",
        String(i + 1),
        r.name,
        "",
        "",
        String(r.reads),
        String(r.comments),
        "",
        "",
        "",
      ]);
    });
    byReporter.forEach((r, i) => {
      rows.push([
        "By reporter",
        String(i + 1),
        r.name,
        "",
        "",
        String(r.reads),
        String(r.comments),
        "",
        "",
        "",
      ]);
    });
    rows.push([]);
    rows.push([
      "Totals",
      "",
      `${totals.stories} stories`,
      "",
      "",
      String(totals.reads),
      String(totals.comments),
      String(totals.shares),
      "",
      "",
    ]);
    downloadCsv(filename, rows);
  }, [
    topByReads,
    byCategory,
    byReporter,
    totals,
    categoryMap,
    reporterMap,
    range,
    fromIso,
    toIso,
  ]);

  const maxCategoryReads = byCategory[0]?.reads ?? 0;
  const maxReporterReads = byReporter[0]?.reads ?? 0;
  const isLoading = articlesQuery.isLoading;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-[28px] tracking-[-0.02em] font-extrabold leading-tight">
            <span className="uline">Performance</span>
          </h1>
          <p className="font-hand text-[13px] text-muted mt-1 flex items-center gap-2">
            <BarChart3 size={12} aria-hidden /> Window:{" "}
            <strong className="font-semibold text-ink">
              {rangeLabel(range, fromIso, toIso)}
            </strong>{" "}
            · {totals.stories} stories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Btn
            variant="ghost"
            size="sm"
            onClick={handleExport}
            disabled={inWindow.length === 0}
            title="Download CSV"
          >
            <Download size={12} /> Export CSV
          </Btn>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap items-center">
        {RANGE_CHIPS.map((c) => (
          <Chip
            key={c.key}
            label={c.label}
            active={range === c.key}
            onClick={() =>
              setParam({ range: c.key, from: null, to: null })
            }
          />
        ))}
        <Chip
          label="Custom"
          active={range === "custom"}
          onClick={() => setParam({ range: "custom" })}
        />
        {range === "custom" ? (
          <div className="flex items-center gap-1.5 ml-1">
            <input
              type="date"
              value={fromIso ?? ""}
              onChange={(e) =>
                setParam({ from: e.target.value || null })
              }
              className="border-[1.5px] border-ink rounded-sm bg-paper px-2 py-1 font-sans text-[12px]"
              aria-label="From date"
            />
            <span className="font-hand text-[12px] text-muted">→</span>
            <input
              type="date"
              value={toIso ?? ""}
              onChange={(e) => setParam({ to: e.target.value || null })}
              className="border-[1.5px] border-ink rounded-sm bg-paper px-2 py-1 font-sans text-[12px]"
              aria-label="To date"
            />
          </div>
        ) : null}
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Stories" value={totals.stories} />
        <Kpi label="Reads" value={totals.reads} />
        <Kpi label="Comments" value={totals.comments} />
        <Kpi label="Shares" value={totals.shares} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        {/* Top stories */}
        <Card title="Top stories" subtitle={`Top ${TOP_N} by reads`}>
          {isLoading ? (
            <p className="font-hand text-[12px] text-muted">Loading…</p>
          ) : topByReads.length === 0 ? (
            <Empty />
          ) : (
            <ol className="flex flex-col">
              {topByReads.map((a, i) => (
                <TopRow
                  key={a.id}
                  rank={i + 1}
                  article={a}
                  category={categoryMap.get(a.categoryId)?.name ?? "—"}
                  reporter={
                    reporterMap.get(a.authorId)?.displayName ??
                    `Reporter …${a.authorId.slice(-6)}`
                  }
                />
              ))}
            </ol>
          )}
        </Card>

        {/* By category */}
        <Card title="By category" subtitle={`${byCategory.length} categories`}>
          {isLoading ? (
            <p className="font-hand text-[12px] text-muted">Loading…</p>
          ) : byCategory.length === 0 ? (
            <Empty />
          ) : (
            <ul className="flex flex-col gap-2">
              {byCategory.slice(0, 10).map((c) => (
                <BarRow
                  key={c.categoryId}
                  label={c.name}
                  value={c.reads}
                  max={maxCategoryReads}
                  hint={`${c.stories} ${c.stories === 1 ? "story" : "stories"} · ${c.comments} comments`}
                  tone="red"
                />
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Card
        title="By reporter"
        subtitle={`Top ${TOP_N} by total reads`}
      >
        {isLoading ? (
          <p className="font-hand text-[12px] text-muted">Loading…</p>
        ) : byReporter.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col gap-2">
            {byReporter.map((r) => (
              <BarRow
                key={r.authorId}
                label={
                  <Link
                    href={`/reporters/${r.authorId}`}
                    className="hover:underline"
                  >
                    {r.name}
                  </Link>
                }
                value={r.reads}
                max={maxReporterReads}
                hint={`${r.stories} ${r.stories === 1 ? "story" : "stories"} · ${r.comments} comments`}
                tone="green"
              />
            ))}
          </ul>
        )}
      </Card>
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

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-[1.5px] border-ink rounded-sm bg-paper px-3 py-2">
      <p className="font-hand text-[10px] uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="font-serif text-[22px] font-extrabold tracking-[-0.01em] mt-0.5">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-[1.5px] border-ink rounded-sm bg-paper p-3 flex flex-col gap-2">
      <header className="flex items-center justify-between gap-2">
        <h2 className="font-serif text-[15px] font-extrabold tracking-[-0.01em]">
          {title}
        </h2>
        {subtitle ? (
          <span className="font-hand text-[11px] text-muted">{subtitle}</span>
        ) : null}
      </header>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="border-[1.5px] border-dashed border-ink/30 rounded-sm bg-paper-2 p-4 text-center">
      <p className="font-hand text-[12px] text-muted">
        Nothing published in this window.
      </p>
    </div>
  );
}

function TopRow({
  rank,
  article,
  category,
  reporter,
}: {
  rank: number;
  article: ArticleCardDTO;
  category: string;
  reporter: string;
}) {
  return (
    <li className="border-b-[1.5px] border-ink/15 last:border-b-0 py-2 first:pt-0 last:pb-0 flex items-start gap-3">
      <span className="font-serif text-[18px] font-extrabold tabular-nums w-6 shrink-0 text-ink/80">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <Link
          href={`/queue/${article.id}`}
          className="font-serif text-[14px] font-bold leading-tight hover:underline line-clamp-2"
        >
          {article.headline}
        </Link>
        <p className="font-hand text-[11px] text-muted mt-0.5">
          {category} · {reporter} ·{" "}
          {formatDate(article.publishedAt ?? article.updatedAt)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <Pill variant="ghost">
          <Eye size={10} /> {(article.viewCount ?? 0).toLocaleString()}
        </Pill>
        <p className="font-hand text-[10px] text-muted inline-flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5">
            <MessageSquare size={9} /> {article.commentCount ?? 0}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Share2 size={9} /> {article.shareCount ?? 0}
          </span>
        </p>
      </div>
    </li>
  );
}

function BarRow({
  label,
  value,
  max,
  hint,
  tone,
}: {
  label: React.ReactNode;
  value: number;
  max: number;
  hint?: string;
  tone: "red" | "green";
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-serif text-[13px] font-bold truncate">
          {label}
        </span>
        <span className="font-hand text-[12px] tabular-nums text-ink/80">
          {value.toLocaleString()}
        </span>
      </div>
      <BarTrack value={pct} tone={tone} height={10} />
      {hint ? (
        <p className="font-hand text-[10px] text-muted">{hint}</p>
      ) : null}
    </li>
  );
}
