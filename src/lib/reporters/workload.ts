import { useSyncExternalStore } from "react";
import type { ArticleCardDTO } from "@/lib/types/article";

export interface ReporterStats {
  active: number;
  inReview: number;
  revisions: number;
  /** ISO timestamp of the most recent article touched by this reporter, or null. */
  lastFiledAt: string | null;
  /** Most-common categoryId over the supplied article pool (last 30d ideally). */
  topCategoryId: string | null;
  /** clamp((active + 2*inReview) / target * 100, 0, 100). */
  loadPct: number;
}

export const DEFAULT_DESK_TARGET = 5;
const DESK_TARGET_KEY = "deligo.deskTarget";

/** Read the desk_target setting from localStorage; falls back to 5. */
export function readDeskTarget(): number {
  if (typeof window === "undefined") return DEFAULT_DESK_TARGET;
  const raw = window.localStorage.getItem(DESK_TARGET_KEY);
  if (!raw) return DEFAULT_DESK_TARGET;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DESK_TARGET;
  return Math.min(50, Math.max(1, Math.floor(n)));
}

export function writeDeskTarget(target: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DESK_TARGET_KEY, String(target));
  // localStorage's `storage` event only fires across tabs — dispatch one
  // manually so same-tab subscribers (useDeskTarget below) re-snapshot.
  window.dispatchEvent(new Event("deligo:desk-target"));
}

/**
 * SSR-safe live read of the desk-target setting. The server snapshot is the
 * static default; once on the client the hook subscribes to localStorage +
 * the in-tab "deligo:desk-target" event so all callers stay in sync after a
 * setting change.
 */
export function useDeskTarget(): number {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener("storage", notify);
      window.addEventListener("deligo:desk-target", notify);
      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener("deligo:desk-target", notify);
      };
    },
    () => readDeskTarget(),
    () => DEFAULT_DESK_TARGET,
  );
}

/**
 * Reduce a pool of articles (across status filters) into per-reporter stats.
 * Callers pass *all* fetched articles for a reporter — this helper does not
 * filter by status itself except in the obvious counters.
 *
 * `pool` should be filtered to the last 30 days for `revisions` + topCategory
 * to behave per the spec; counts for active/inReview use the latest snapshot.
 */
export function statsFor(
  authorId: string,
  pool: ArticleCardDTO[],
  target: number = DEFAULT_DESK_TARGET,
): ReporterStats {
  let active = 0;
  let inReview = 0;
  let revisions = 0;
  let lastFiledMs = 0;
  const categoryCounts = new Map<string, number>();
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const a of pool) {
    if (a.authorId !== authorId) continue;

    // Recency for "last filed" — uses updatedAt because submit/start-review
    // bumps updatedAt on every transition.
    const ts = new Date(a.updatedAt).getTime();
    if (Number.isFinite(ts) && ts > lastFiledMs) lastFiledMs = ts;

    if (a.status === "submitted") active += 1;
    else if (a.status === "under_review") inReview += 1;

    if (a.status === "rejected" && ts >= since) revisions += 1;

    if (ts >= since) {
      categoryCounts.set(
        a.categoryId,
        (categoryCounts.get(a.categoryId) ?? 0) + 1,
      );
    }
  }

  let topCategoryId: string | null = null;
  let topCount = 0;
  for (const [cat, count] of categoryCounts) {
    if (count > topCount) {
      topCategoryId = cat;
      topCount = count;
    }
  }

  const t = target > 0 ? target : DEFAULT_DESK_TARGET;
  const raw = ((active + 2 * inReview) / t) * 100;
  const loadPct = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    active,
    inReview,
    revisions,
    lastFiledAt: lastFiledMs ? new Date(lastFiledMs).toISOString() : null,
    topCategoryId,
    loadPct,
  };
}

/** Pretty role label — "Senior reporter" reads better than "journalist". */
export function reporterRoleLabel(role: string): string {
  if (role === "journalist") return "Reporter";
  if (role === "editor") return "Editor";
  if (role === "admin") return "Admin";
  return role;
}
