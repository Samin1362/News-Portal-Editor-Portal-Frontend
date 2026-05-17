"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell, Check, Flag, RefreshCw, Send } from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { listQueue } from "@/lib/api/articles.api";
import { listAdminComments } from "@/lib/api/comments.api";
import { cn } from "@/lib/utils/cn";
import { relativeTime } from "@/lib/utils/format";

/**
 * Backend has no `/notifications` collection (documented Phase 9 gap). The
 * bell badge is therefore derived from session storage: each time the
 * editor explicitly opens the dropdown and clicks "Mark all as read", we
 * record the current wall-clock time. Anything submitted/resubmitted/
 * reported *after* that timestamp counts as unseen.
 */

const STORAGE_KEY = "deligo.notifications.lastSeen";

function readLastSeen(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function writeLastSeen(ts: number): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, String(ts));
  window.dispatchEvent(new Event("deligo:notifications-seen"));
}

/** SSR-safe subscription to the lastSeen timestamp. */
function useLastSeen(): number {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener("storage", notify);
      window.addEventListener("deligo:notifications-seen", notify);
      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener("deligo:notifications-seen", notify);
      };
    },
    readLastSeen,
    () => 0,
  );
}

interface NotifItem {
  id: string;
  kind: "submitted" | "under_review" | "flagged";
  title: string;
  detail: string;
  href: string;
  at: string;
}

export function NotificationBell() {
  const fetcher = useAuthedApi();
  const lastSeen = useLastSeen();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close the dropdown when a click lands outside, or Esc is pressed.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const submittedQuery = useQuery({
    queryKey: ["notif", "submitted"],
    queryFn: async () => {
      const r = await listQueue(fetcher, { status: "submitted", limit: 10 });
      return r.data;
    },
    staleTime: 60_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 60_000
        : false,
  });

  const underReviewQuery = useQuery({
    queryKey: ["notif", "under_review"],
    queryFn: async () => {
      const r = await listQueue(fetcher, { status: "under_review", limit: 10 });
      return r.data;
    },
    staleTime: 60_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 60_000
        : false,
  });

  const flaggedQuery = useQuery({
    queryKey: ["notif", "flagged"],
    queryFn: async () => {
      const r = await listAdminComments(fetcher, { reported: true, limit: 10 });
      return r.data;
    },
    staleTime: 60_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 60_000
        : false,
  });

  const items: NotifItem[] = useMemo(() => {
    const out: NotifItem[] = [];
    for (const a of submittedQuery.data ?? []) {
      out.push({
        id: `sub:${a.id}`,
        kind: "submitted",
        title: a.headline,
        detail: "Submitted for review",
        href: `/queue/${a.id}`,
        at: a.updatedAt,
      });
    }
    for (const a of underReviewQuery.data ?? []) {
      out.push({
        id: `rev:${a.id}`,
        kind: "under_review",
        title: a.headline,
        detail: "Picked up for review",
        href: `/queue/${a.id}`,
        at: a.updatedAt,
      });
    }
    for (const c of flaggedQuery.data ?? []) {
      out.push({
        id: `flag:${c.id}`,
        kind: "flagged",
        title: c.content?.slice(0, 80) ?? "Reported comment",
        detail: "Reader reported a comment",
        href: `/flagged`,
        at: c.createdAt,
      });
    }
    out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return out;
  }, [submittedQuery.data, underReviewQuery.data, flaggedQuery.data]);

  const unseenCount = useMemo(() => {
    if (lastSeen === 0) return items.length;
    return items.filter((it) => new Date(it.at).getTime() > lastSeen).length;
  }, [items, lastSeen]);

  const markAllRead = useCallback(() => {
    writeLastSeen(Date.now());
  }, []);

  const toggle = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      // Opening = implicit "seen" event so the badge clears.
      if (next) writeLastSeen(Date.now());
      return next;
    });
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label={
          unseenCount > 0
            ? `Notifications (${unseenCount} new)`
            : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          "relative inline-flex items-center justify-center w-8 h-8 rounded-[4px]",
          "hover:bg-paper-2 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40",
        )}
      >
        <Bell className="w-[17px] h-[17px]" strokeWidth={1.6} aria-hidden />
        {unseenCount > 0 ? (
          <span
            className={cn(
              "absolute top-[2px] right-[2px] min-w-[16px] h-[16px] px-1",
              "bg-accent text-paper rounded-full border-[1.5px] border-paper",
              "font-hand text-[9px] font-bold leading-[13px] text-center",
            )}
          >
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className={cn(
            "absolute right-0 mt-2 w-[340px] max-h-[60vh] overflow-hidden",
            "border-[1.5px] border-ink rounded-sm bg-paper z-40",
            "shadow-[4px_4px_0_var(--color-ink)] flex flex-col",
          )}
        >
          <header className="flex items-center justify-between gap-2 px-3 py-2 border-b-[1.5px] border-ink">
            <p className="font-serif text-[14px] font-extrabold">
              Activity
            </p>
            <button
              type="button"
              onClick={markAllRead}
              className="font-hand text-[11px] text-muted hover:text-ink inline-flex items-center gap-1"
              title="Mark all as read"
            >
              <Check size={11} aria-hidden /> Mark all read
            </button>
          </header>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="font-hand text-[12px] text-muted px-3 py-4">
                Nothing new — queue is calm.
              </p>
            ) : (
              <ul>
                {items.slice(0, 12).map((it) => (
                  <li key={it.id}>
                    <Link
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block px-3 py-2 border-b border-ink/10 last:border-b-0",
                        "hover:bg-paper-2 transition-colors",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <NotifIcon kind={it.kind} />
                        <div className="flex-1 min-w-0">
                          <p className="font-serif text-[13px] font-bold leading-tight line-clamp-2">
                            {it.title}
                          </p>
                          <p className="font-hand text-[11px] text-muted mt-0.5 flex items-center gap-1.5">
                            <span>{it.detail}</span>
                            <span>·</span>
                            <span>{relativeTime(it.at)}</span>
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="flex items-center justify-between gap-2 px-3 py-2 border-t-[1.5px] border-ink/15 bg-paper-2">
            <span className="font-hand text-[11px] text-muted">
              {unseenCount > 0
                ? `${unseenCount} new since last seen`
                : "All caught up"}
            </span>
            <Link
              href="/queue"
              onClick={() => setOpen(false)}
              className="font-hand text-[11px] text-ink hover:underline"
            >
              Open queue →
            </Link>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

function NotifIcon({ kind }: { kind: NotifItem["kind"] }) {
  if (kind === "flagged") {
    return (
      <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-sm bg-warn/15 text-warn">
        <Flag size={12} aria-hidden />
      </span>
    );
  }
  if (kind === "under_review") {
    return (
      <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-sm bg-info/15 text-info">
        <RefreshCw size={12} aria-hidden />
      </span>
    );
  }
  return (
    <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-sm bg-accent/15 text-accent">
      <Send size={12} aria-hidden />
    </span>
  );
}
