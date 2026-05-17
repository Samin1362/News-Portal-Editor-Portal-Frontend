"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Search, Settings2 } from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { listUsers } from "@/lib/api/users.api";
import { listQueue } from "@/lib/api/articles.api";
import { listCategories } from "@/lib/api/categories.api";
import { Avatar } from "@/components/primitives/Avatar";
import { BarTrack } from "@/components/primitives/BarTrack";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { Dialog } from "@/components/primitives/Dialog";
import {
  DEFAULT_DESK_TARGET,
  reporterRoleLabel,
  statsFor,
  useDeskTarget,
  writeDeskTarget,
  type ReporterStats,
} from "@/lib/reporters/workload";
import { relativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ArticleCardDTO } from "@/lib/types/article";
import type { UserDTO } from "@/lib/types/user";
import type { CategoryDTO } from "@/lib/types/category";

const POOL_LIMIT = 200;

type SortKey = "load" | "name" | "active" | "inReview" | "revisions" | "lastFiled";
type SortDir = "asc" | "desc";

interface Row {
  user: UserDTO;
  stats: ReporterStats;
}

export function ReportersClient() {
  const router = useRouter();
  const params = useSearchParams();
  const fetcher = useAuthedApi();

  const sort = (params.get("sort") as SortKey | null) ?? "load";
  const dir =
    (params.get("dir") as SortDir | null) ??
    (sort === "name" ? "asc" : "desc");
  const search = params.get("q") ?? "";

  const setParam = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === "") sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      router.replace(qs ? `/reporters?${qs}` : "/reporters");
    },
    [params, router],
  );

  // Desk target — live snapshot from localStorage (SSR-safe). The dialog
  // draft is initialised from the current target each time it opens so the
  // input always reflects the saved value.
  const target = useDeskTarget();
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetDraft, setTargetDraft] = useState<string>(String(DEFAULT_DESK_TARGET));
  const openTargetDialog = () => {
    setTargetDraft(String(target));
    setTargetOpen(true);
  };

  // Data
  const reportersQuery = useQuery({
    queryKey: ["users", "journalist-list-50"],
    queryFn: async () => {
      const result = await listUsers(fetcher, { role: "journalist", limit: 50 });
      return result?.data ?? null;
    },
    staleTime: 60_000,
  });

  const poolQuery = useQuery({
    queryKey: ["reporters", "article-pool", POOL_LIMIT],
    queryFn: async () => {
      const [submitted, underReview, rejected, published] = await Promise.all([
        listQueue(fetcher, { status: "submitted", limit: POOL_LIMIT }),
        listQueue(fetcher, { status: "under_review", limit: POOL_LIMIT }),
        listQueue(fetcher, { status: "rejected", limit: POOL_LIMIT }).catch(
          () => ({ data: [] as ArticleCardDTO[] }),
        ),
        listQueue(fetcher, { status: "published", limit: POOL_LIMIT }),
      ]);
      return [
        ...submitted.data,
        ...underReview.data,
        ...rejected.data,
        ...published.data,
      ];
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

  const reporters = reportersQuery.data;
  const pool = useMemo(() => poolQuery.data ?? [], [poolQuery.data]);

  const rows: Row[] = useMemo(() => {
    if (!reporters) return [];
    return reporters.map((r) => ({
      user: r,
      stats: statsFor(r.id, pool, target),
    }));
  }, [reporters, pool, target]);

  const visibleRows = useMemo(() => {
    let r = rows;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (row) =>
          row.user.displayName.toLowerCase().includes(q) ||
          row.user.email.toLowerCase().includes(q),
      );
    }
    const factor = dir === "asc" ? 1 : -1;
    const cmp = (a: Row, b: Row): number => {
      switch (sort) {
        case "name":
          return a.user.displayName.localeCompare(b.user.displayName) * factor;
        case "active":
          return (a.stats.active - b.stats.active) * factor;
        case "inReview":
          return (a.stats.inReview - b.stats.inReview) * factor;
        case "revisions":
          return (a.stats.revisions - b.stats.revisions) * factor;
        case "lastFiled": {
          const av = a.stats.lastFiledAt ? new Date(a.stats.lastFiledAt).getTime() : 0;
          const bv = b.stats.lastFiledAt ? new Date(b.stats.lastFiledAt).getTime() : 0;
          return (av - bv) * factor;
        }
        case "load":
        default:
          return (a.stats.loadPct - b.stats.loadPct) * factor;
      }
    };
    return [...r].sort(cmp);
  }, [rows, sort, dir, search]);

  const handleSort = (key: SortKey) => {
    if (sort === key) {
      setParam({ dir: dir === "asc" ? "desc" : "asc" });
    } else {
      setParam({ sort: key, dir: key === "name" ? "asc" : "desc" });
    }
  };

  const handleSaveTarget = () => {
    const n = Number(targetDraft);
    if (!Number.isFinite(n) || n < 1 || n > 50) {
      // bounce back to current
      setTargetDraft(String(target));
      return;
    }
    writeDeskTarget(Math.floor(n));
    setTargetOpen(false);
  };

  const loading = reportersQuery.isLoading || poolQuery.isLoading;

  // Editor without admin user-read = degraded view.
  if (reporters === null) {
    return <ForbiddenState />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-[28px] tracking-[-0.02em] font-extrabold leading-tight">
            <span className="uline">Reporters</span>
          </h1>
          <p className="font-hand text-[13px] text-muted mt-1">
            {loading
              ? "Loading desk…"
              : `${visibleRows.length} of ${rows.length} reporters · target ${target} stories`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setParam({ q: e.target.value })}
              placeholder="Search name or email"
              className="border-[1.5px] border-ink rounded-[4px] pl-7 pr-2 py-[5px] font-hand text-[12.5px] bg-paper min-w-[200px]"
            />
          </div>
          <Btn size="sm" variant="ghost" onClick={openTargetDialog}>
            <Settings2 size={12} /> Desk target
          </Btn>
        </div>
      </div>

      {/* Table */}
      <div className="border-[1.5px] border-ink rounded-sm bg-paper overflow-x-auto">
        <table className="w-full text-[13px] min-w-[760px]">
          <thead>
            <tr className="border-b-[1.5px] border-ink bg-paper-2 text-left">
              <SortHeader
                label="Reporter"
                k="name"
                active={sort === "name"}
                dir={dir}
                onClick={handleSort}
              />
              <SortHeader
                label="Active"
                k="active"
                align="right"
                active={sort === "active"}
                dir={dir}
                onClick={handleSort}
              />
              <SortHeader
                label="In review"
                k="inReview"
                align="right"
                active={sort === "inReview"}
                dir={dir}
                onClick={handleSort}
              />
              <SortHeader
                label="Revisions · 30d"
                k="revisions"
                align="right"
                active={sort === "revisions"}
                dir={dir}
                onClick={handleSort}
              />
              <SortHeader
                label="Last filed"
                k="lastFiled"
                active={sort === "lastFiled"}
                dir={dir}
                onClick={handleSort}
              />
              <SortHeader
                label="Load"
                k="load"
                active={sort === "load"}
                dir={dir}
                onClick={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center font-hand text-muted">
                  Tallying queue activity…
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center font-hand text-muted">
                  {search
                    ? `No reporters match "${search}".`
                    : "No reporters yet."}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <ReporterRow
                  key={row.user.id}
                  row={row}
                  categoryMap={categoryMap}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Desk-target dialog */}
      <Dialog
        open={targetOpen}
        onClose={() => setTargetOpen(false)}
        title="Desk target"
        description="The expected number of stories per reporter. Load % normalises against this. Stored in your browser only."
        size="sm"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setTargetOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={handleSaveTarget}>
              Save
            </Btn>
          </>
        }
      >
        <label className="flex items-center gap-2 font-hand text-[13px]">
          <span className="text-muted">Stories per reporter</span>
          <input
            type="number"
            min={1}
            max={50}
            value={targetDraft}
            onChange={(e) => setTargetDraft(e.target.value)}
            className="border-[1.5px] border-ink rounded-[4px] px-2 py-1 w-24"
          />
        </label>
        <p className="font-hand text-[11.5px] text-muted mt-3">
          Formula:{" "}
          <code className="font-mono text-[11px] bg-paper-2 px-1 py-px rounded">
            (active + 2×in-review) ÷ target × 100
          </code>
          , clamped 0–100.
        </p>
      </Dialog>
    </div>
  );
}

function ForbiddenState() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-serif text-[28px] tracking-[-0.02em] font-extrabold leading-tight">
        <span className="uline">Reporters</span>
      </h1>
      <div className="border-[1.5px] border-dashed border-ink/30 rounded-sm bg-paper-2 p-4">
        <p className="font-serif text-[16px] font-extrabold">
          Reporter directory unavailable
        </p>
        <p className="font-hand text-[13px] text-muted mt-1">
          Your account does not have permission to read the user directory.
          Ask an admin to flip your role to <code>editor</code> or higher.
        </p>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  k,
  active,
  dir,
  align = "left",
  onClick,
}: {
  label: string;
  k: SortKey;
  active: boolean;
  dir: SortDir;
  align?: "left" | "right";
  onClick: (k: SortKey) => void;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-3 py-2 font-hand text-[11.5px] uppercase tracking-[0.06em] text-muted whitespace-nowrap",
        align === "right" && "text-right",
      )}
    >
      <button
        type="button"
        onClick={() => onClick(k)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-ink",
          active && "text-ink",
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp size={12} />
          ) : (
            <ChevronDown size={12} />
          )
        ) : null}
      </button>
    </th>
  );
}

function tone(pct: number): "red" | "warn" | "green" | "default" {
  if (pct > 70) return "red";
  if (pct >= 40) return "warn";
  if (pct > 0) return "green";
  return "default";
}

function pillVariantFor(t: "red" | "warn" | "green" | "default") {
  if (t === "red") return "red" as const;
  if (t === "warn") return "warn" as const;
  if (t === "green") return "green" as const;
  return "ghost" as const;
}

function ReporterRow({
  row,
  categoryMap,
}: {
  row: Row;
  categoryMap: Map<string, CategoryDTO>;
}) {
  const t = tone(row.stats.loadPct);
  const topCategory =
    row.stats.topCategoryId != null ? categoryMap.get(row.stats.topCategoryId) : undefined;
  return (
    <tr className="border-b-[1px] border-ink/10 last:border-b-0 hover:bg-paper-2">
      <td className="px-3 py-2.5">
        <Link
          href={`/reporters/${row.user.id}`}
          className="flex items-center gap-2.5 group"
        >
          <Avatar name={row.user.displayName} tone="warm" size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-serif text-[14px] font-extrabold truncate group-hover:underline">
                {row.user.displayName}
              </span>
              {row.user.isBlocked ? <Pill variant="warn">Blocked</Pill> : null}
            </div>
            <p className="font-hand text-[11px] text-muted truncate">
              {reporterRoleLabel(row.user.role)}
              {topCategory ? ` · ${topCategory.name}` : ""}
              {" · "}
              {row.user.email}
            </p>
          </div>
        </Link>
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-[13px]">
        {row.stats.active}
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-[13px]">
        {row.stats.inReview}
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-[13px]">
        {row.stats.revisions}
      </td>
      <td className="px-3 py-2.5 font-hand text-[12px] text-muted whitespace-nowrap">
        {relativeTime(row.stats.lastFiledAt)}
      </td>
      <td className="px-3 py-2.5 min-w-[200px]">
        <div className="flex items-center gap-2">
          <BarTrack
            value={row.stats.loadPct}
            tone={t === "default" ? "default" : t}
            className="flex-1"
          />
          <Pill variant={pillVariantFor(t)}>{row.stats.loadPct}%</Pill>
        </div>
      </td>
    </tr>
  );
}
