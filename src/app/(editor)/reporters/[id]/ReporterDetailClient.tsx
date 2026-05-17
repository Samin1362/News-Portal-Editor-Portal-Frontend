"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Copy,
  Eye,
  MessageSquare,
  Newspaper,
  PenSquare,
  Sparkles,
} from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { useToast } from "@/lib/ui/toast";
import { listQueue, getArticle } from "@/lib/api/articles.api";
import { listCategories } from "@/lib/api/categories.api";
import { getUser } from "@/lib/api/users.api";
import { Avatar } from "@/components/primitives/Avatar";
import { BarTrack } from "@/components/primitives/BarTrack";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import {
  reporterRoleLabel,
  statsFor,
  useDeskTarget,
} from "@/lib/reporters/workload";
import { formatDate, relativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ArticleCardDTO, ArticleFullDTO } from "@/lib/types/article";
import type { CategoryDTO } from "@/lib/types/category";

const POOL_LIMIT = 200;
const RECENT_LIMIT = 10;

interface Props {
  id: string;
}

export function ReporterDetailClient({ id }: Props) {
  const fetcher = useAuthedApi();
  const toast = useToast();

  const target = useDeskTarget();

  const userQuery = useQuery({
    queryKey: ["users", id],
    queryFn: () => getUser(fetcher, id),
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

  const pool = useMemo(() => poolQuery.data ?? [], [poolQuery.data]);

  // Partition the pool for this reporter
  const buckets = useMemo(() => {
    const mine = pool.filter((a) => a.authorId === id);
    const active = mine
      .filter((a) => a.status === "submitted" || a.status === "under_review")
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    const revisions = mine
      .filter((a) => a.status === "rejected")
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    const published = mine
      .filter((a) => a.status === "published")
      .sort(
        (a, b) =>
          new Date(b.publishedAt ?? b.updatedAt).getTime() -
          new Date(a.publishedAt ?? a.updatedAt).getTime(),
      )
      .slice(0, RECENT_LIMIT);
    return { active, revisions, published };
  }, [pool, id]);

  const stats = useMemo(() => statsFor(id, pool, target), [id, pool, target]);
  const topCategory =
    stats.topCategoryId != null ? categoryMap.get(stats.topCategoryId) : undefined;

  const user = userQuery.data;

  if (userQuery.isLoading) {
    return (
      <div className="font-hand text-[13px] text-muted">Loading reporter…</div>
    );
  }
  if (user === null) {
    return (
      <ReporterMissing
        message="Reporter not found, or your account does not have permission to view this profile."
      />
    );
  }
  if (!user) {
    return (
      <ReporterMissing message="Reporter not found." />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/reporters"
          className="inline-flex items-center gap-1 font-hand text-[12px] text-muted hover:text-ink"
        >
          <ArrowLeft size={12} /> All reporters
        </Link>
      </div>

      {/* Header card */}
      <div className="border-[1.5px] border-ink rounded-sm bg-paper p-4 flex flex-col md:flex-row gap-4 md:items-center">
        <Avatar name={user.displayName} tone="warm" size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-[24px] tracking-[-0.02em] font-extrabold leading-tight">
              {user.displayName}
            </h1>
            {user.isBlocked ? <Pill variant="warn">Blocked</Pill> : null}
          </div>
          <p className="font-hand text-[12.5px] text-muted truncate">
            {reporterRoleLabel(user.role)}
            {topCategory ? ` · ${topCategory.name}` : ""}
            {" · "}
            <a href={`mailto:${user.email}`} className="hover:underline">
              {user.email}
            </a>
          </p>
          {user.bio ? (
            <p className="font-serif text-[13.5px] leading-snug mt-2 max-w-[68ch]">
              {user.bio}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col md:items-end gap-2 md:min-w-[260px]">
          <div className="flex items-center gap-2">
            <BarTrack
              value={stats.loadPct}
              tone={
                stats.loadPct > 70
                  ? "red"
                  : stats.loadPct >= 40
                    ? "warn"
                    : stats.loadPct > 0
                      ? "green"
                      : "default"
              }
              className="w-[180px]"
            />
            <Pill
              variant={
                stats.loadPct > 70
                  ? "red"
                  : stats.loadPct >= 40
                    ? "warn"
                    : stats.loadPct > 0
                      ? "green"
                      : "ghost"
              }
            >
              {stats.loadPct}%
            </Pill>
          </div>
          <p className="font-hand text-[11px] text-muted">
            Target {target} · last filed {relativeTime(stats.lastFiledAt)}
          </p>
          <Btn
            size="sm"
            variant="primary"
            onClick={() =>
              toast.info(
                "Commission flow lands in Phase 8 — draft self + comment-tag the reporter for now.",
              )
            }
          >
            <Sparkles size={12} /> Commission a story
          </Btn>
        </div>
      </div>

      {/* Three columns */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <ColumnCard
          icon={<PenSquare size={14} />}
          title="Active"
          subtitle={`${buckets.active.length} ${buckets.active.length === 1 ? "story" : "stories"} in motion`}
          empty="No submitted or in-review stories."
          loading={poolQuery.isLoading}
        >
          {buckets.active.map((a) => (
            <ArticleListItem
              key={a.id}
              article={a}
              category={categoryMap.get(a.categoryId)}
              tone="default"
            />
          ))}
        </ColumnCard>

        <ColumnCard
          icon={<MessageSquare size={14} />}
          title="Revisions"
          subtitle={`${buckets.revisions.length} rejected, awaiting rework`}
          empty="No outstanding revisions."
          loading={poolQuery.isLoading}
        >
          {buckets.revisions.map((a) => (
            <RevisionItem
              key={a.id}
              article={a}
              category={categoryMap.get(a.categoryId)}
              reporterName={user.displayName}
            />
          ))}
        </ColumnCard>

        <ColumnCard
          icon={<Newspaper size={14} />}
          title="Recently published"
          subtitle={`Last ${RECENT_LIMIT} stories`}
          empty="Nothing published yet."
          loading={poolQuery.isLoading}
        >
          {buckets.published.map((a) => (
            <PublishedItem
              key={a.id}
              article={a}
              category={categoryMap.get(a.categoryId)}
            />
          ))}
        </ColumnCard>
      </section>
    </div>
  );
}

function ReporterMissing({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/reporters"
        className="inline-flex items-center gap-1 font-hand text-[12px] text-muted hover:text-ink"
      >
        <ArrowLeft size={12} /> All reporters
      </Link>
      <div className="border-[1.5px] border-dashed border-ink/30 rounded-sm bg-paper-2 p-4">
        <p className="font-serif text-[16px] font-extrabold">Reporter unavailable</p>
        <p className="font-hand text-[13px] text-muted mt-1">{message}</p>
      </div>
    </div>
  );
}

function ColumnCard({
  icon,
  title,
  subtitle,
  empty,
  children,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  empty: string;
  children: React.ReactNode;
  loading?: boolean;
}) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : children != null;
  return (
    <div className="border-[1.5px] border-ink rounded-sm bg-paper p-3 flex flex-col gap-2">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-ink">
          {icon}
          <h2 className="font-serif text-[15px] font-extrabold tracking-[-0.01em]">
            {title}
          </h2>
        </div>
        <span className="font-hand text-[11px] text-muted">{subtitle}</span>
      </header>
      {loading ? (
        <p className="font-hand text-[12px] text-muted">Loading…</p>
      ) : hasChildren ? (
        <ul className="flex flex-col gap-1.5">{children}</ul>
      ) : (
        <p className="font-hand text-[12px] text-muted">{empty}</p>
      )}
    </div>
  );
}

function ArticleListItem({
  article,
  category,
  tone,
}: {
  article: ArticleCardDTO;
  category?: CategoryDTO;
  tone: "default" | "warn" | "ok";
}) {
  const border =
    tone === "warn"
      ? "border-l-warn"
      : tone === "ok"
        ? "border-l-accent-2"
        : "border-l-accent";
  return (
    <li className={cn("border-[1.5px] border-ink/15 border-l-[3px] rounded-sm bg-paper-2 p-2", border)}>
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/queue/${article.id}`}
          className="font-serif text-[13.5px] font-bold leading-tight line-clamp-2 flex-1 hover:underline"
        >
          {article.headline}
        </Link>
        <Pill variant="ghost">{article.status.replace("_", " ")}</Pill>
      </div>
      <p className="font-hand text-[11px] text-muted mt-0.5">
        {category ? `${category.name} · ` : ""}
        {relativeTime(article.updatedAt)}
      </p>
    </li>
  );
}

function PublishedItem({
  article,
  category,
}: {
  article: ArticleCardDTO;
  category?: CategoryDTO;
}) {
  return (
    <li className="border-[1.5px] border-ink/15 border-l-[3px] border-l-accent-2 rounded-sm bg-paper-2 p-2">
      <Link
        href={`/queue/${article.id}`}
        className="font-serif text-[13.5px] font-bold leading-tight line-clamp-2 hover:underline"
      >
        {article.headline}
      </Link>
      <p className="font-hand text-[11px] text-muted mt-0.5 flex items-center gap-2">
        {category ? <span>{category.name}</span> : null}
        <span>{formatDate(article.publishedAt)}</span>
        <span className="inline-flex items-center gap-0.5">
          <Eye size={10} /> {article.viewCount}
        </span>
        <span className="inline-flex items-center gap-0.5">
          <MessageSquare size={10} /> {article.commentCount}
        </span>
      </p>
    </li>
  );
}

function RevisionItem({
  article,
  category,
  reporterName,
}: {
  article: ArticleCardDTO;
  category?: CategoryDTO;
  reporterName: string;
}) {
  const fetcher = useAuthedApi();
  const toast = useToast();
  const [copying, setCopying] = useState(false);

  // Full article only fetched when the user actually requests revision
  // (avoids 1+ DTO fetch per row on mount).
  const handleRequestRevision = async () => {
    setCopying(true);
    try {
      const full = (await getArticle(fetcher, article.id)) as ArticleFullDTO;
      const reason = full.rejectionReason?.trim() ?? "";
      const message =
        `Hi ${reporterName.split(" ")[0] ?? reporterName},\n\n` +
        `Quick revision ask on "${full.headline}".\n\n` +
        (reason
          ? `Notes from review:\n${reason}\n\n`
          : "Notes from review: (see queue history)\n\n") +
        `Once you've adjusted, resubmit and I'll pick it up.`;
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        toast.success("Revision message copied — paste into chat or email.");
      } else {
        toast.info(message);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not load rejection reason.",
      );
    } finally {
      setCopying(false);
    }
  };

  return (
    <li className="border-[1.5px] border-ink/15 border-l-[3px] border-l-warn rounded-sm bg-paper-2 p-2">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/queue/${article.id}`}
          className="font-serif text-[13.5px] font-bold leading-tight line-clamp-2 flex-1 hover:underline"
        >
          {article.headline}
        </Link>
        <Pill variant="warn">rejected</Pill>
      </div>
      <p className="font-hand text-[11px] text-muted mt-0.5">
        {category ? `${category.name} · ` : ""}
        {relativeTime(article.updatedAt)}
      </p>
      <div className="mt-1.5 flex justify-end">
        <Btn
          size="sm"
          variant="ghost"
          onClick={handleRequestRevision}
          disabled={copying}
        >
          <Copy size={11} /> {copying ? "Copying…" : "Request revision"}
        </Btn>
      </div>
    </li>
  );
}
