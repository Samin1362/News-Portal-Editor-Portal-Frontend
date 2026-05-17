"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlignJustify,
  BarChart3,
  CalendarDays,
  FileText,
  Flag,
  Home,
  Image as ImageIcon,
  MessageSquare,
  Newspaper,
  Pencil,
  Search,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { listUsers } from "@/lib/api/users.api";
import { Avatar } from "@/components/primitives/Avatar";
import { cn } from "@/lib/utils/cn";
import type { ArticleCardDTO } from "@/lib/types/article";
import type { UserDTO } from "@/lib/types/user";

/**
 * Custom event surface — anywhere can dispatch `deligo:palette-open` to
 * pop the palette open without grabbing a ref to the component. The Topbar
 * search input uses this for the click-to-open path.
 */
export function openPalette() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("deligo:palette-open"));
  }
}

const PAGE_ITEMS: Array<{
  label: string;
  href: string;
  icon: LucideIcon;
  keywords?: string[];
}> = [
  { label: "Today", href: "/", icon: Home, keywords: ["home", "dashboard"] },
  { label: "Review queue", href: "/queue", icon: AlignJustify, keywords: ["review"] },
  { label: "Schedule", href: "/schedule", icon: CalendarDays },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Reporters", href: "/reporters", icon: Pencil, keywords: ["journalists", "writers"] },
  { label: "Published", href: "/published", icon: Newspaper, keywords: ["live", "feed"] },
  { label: "Drafts", href: "/drafts", icon: FileText },
  { label: "Flagged", href: "/flagged", icon: Flag, keywords: ["reported"] },
  { label: "Media library", href: "/media", icon: ImageIcon, keywords: ["images", "video"] },
  { label: "Comments", href: "/comments", icon: MessageSquare, keywords: ["pending"] },
  { label: "Performance", href: "/performance", icon: BarChart3, keywords: ["analytics", "stats"] },
  { label: "Daily plan", href: "/daily-plan", icon: BarChart3, keywords: ["briefing", "print"] },
  { label: "Settings", href: "/settings", icon: BarChart3 },
];

type PalettePage = (typeof PAGE_ITEMS)[number];

interface ArticleHit {
  kind: "article";
  id: string;
  href: string;
  headline: string;
  status: string;
}
interface ReporterHit {
  kind: "reporter";
  id: string;
  href: string;
  displayName: string;
  email: string;
}
interface PageHit {
  kind: "page";
  page: PalettePage;
}
type Hit = ArticleHit | ReporterHit | PageHit;

const MAX_PER_SECTION = 6;

function articlesFromCache(qc: ReturnType<typeof useQueryClient>): ArticleCardDTO[] {
  // Find any cached `queue` query and unwrap its data — we only need ids /
  // headlines, so the union of every shape is fine.
  const out: ArticleCardDTO[] = [];
  const seen = new Set<string>();
  const cache = qc.getQueryCache();
  for (const entry of cache.findAll({ queryKey: ["queue"] })) {
    const data = entry.state.data;
    if (!data) continue;
    const list: ArticleCardDTO[] = Array.isArray(data)
      ? (data as ArticleCardDTO[])
      : Array.isArray((data as { items?: unknown }).items)
        ? ((data as { items: ArticleCardDTO[] }).items)
        : Array.isArray((data as { data?: unknown }).data)
          ? ((data as { data: ArticleCardDTO[] }).data)
          : [];
    for (const a of list) {
      if (a && typeof a === "object" && "id" in a && !seen.has(a.id)) {
        seen.add(a.id);
        out.push(a);
      }
    }
  }
  // Also check published-feed cache
  for (const entry of cache.findAll({ queryKey: ["published-feed"] })) {
    const data = entry.state.data as { items?: ArticleCardDTO[] } | undefined;
    if (!data?.items) continue;
    for (const a of data.items) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        out.push(a);
      }
    }
  }
  return out;
}

export function CommandPalette() {
  const router = useRouter();
  const fetcher = useAuthedApi();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open/close via global event + ⌘K / Ctrl+K shortcut.
  useEffect(() => {
    function onShortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onShortcut);
    window.addEventListener("deligo:palette-open", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onShortcut);
      window.removeEventListener("deligo:palette-open", onOpenEvent);
    };
  }, []);

  // Focus the input + reset state whenever the palette opens. Done via a
  // microtask in a callback ref so the effect body has no setState.
  const handleInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (node && open) {
        node.focus();
        node.select();
      }
    },
    [open],
  );

  // Reporters search — debounced via TanStack staleTime + enabled-when-typed.
  const reportersQuery = useQuery({
    queryKey: ["palette", "reporters", term],
    queryFn: async () => {
      const result = await listUsers(fetcher, {
        role: "journalist",
        q: term,
        limit: MAX_PER_SECTION,
      });
      return result?.data ?? [];
    },
    enabled: open && term.trim().length > 0,
    staleTime: 30_000,
  });

  const articles = useMemo(
    () => (open ? articlesFromCache(qc) : []),
    [open, qc],
  );

  const hits: Hit[] = useMemo(() => {
    if (!open) return [];
    const t = term.trim().toLowerCase();
    const pageHits: PageHit[] = PAGE_ITEMS.filter((p) => {
      if (!t) return true;
      const hay = [p.label, ...(p.keywords ?? [])].join(" ").toLowerCase();
      return hay.includes(t);
    })
      .slice(0, MAX_PER_SECTION)
      .map((page) => ({ kind: "page", page }));

    const reporterHits: ReporterHit[] = t
      ? (reportersQuery.data ?? []).map((r: UserDTO) => ({
          kind: "reporter",
          id: r.id,
          href: `/reporters/${r.id}`,
          displayName: r.displayName,
          email: r.email,
        }))
      : [];

    const articleHits: ArticleHit[] = t
      ? articles
          .filter((a) => {
            const h = a.headline?.toLowerCase() ?? "";
            const s = a.slug?.toLowerCase() ?? "";
            return h.includes(t) || s.includes(t);
          })
          .slice(0, MAX_PER_SECTION)
          .map((a) => ({
            kind: "article",
            id: a.id,
            href: `/queue/${a.id}`,
            headline: a.headline,
            status: a.status,
          }))
      : [];

    return [...pageHits, ...reporterHits, ...articleHits];
  }, [open, term, reportersQuery.data, articles]);

  // Clamp active index when the hit list changes (also satisfies React 19's
  // purity rule via a derived value rather than a setState-in-effect).
  const safeActive = hits.length === 0 ? 0 : Math.min(active, hits.length - 1);

  const close = useCallback(() => {
    setOpen(false);
    setTerm("");
    setActive(0);
  }, []);

  const jumpTo = useCallback(
    (hit: Hit) => {
      if (hit.kind === "page") router.push(hit.page.href);
      else router.push(hit.href);
      close();
    },
    [router, close],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) =>
        hits.length === 0 ? 0 : (i + 1) % hits.length,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) =>
        hits.length === 0 ? 0 : (i - 1 + hits.length) % hits.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = hits[safeActive];
      if (pick) jumpTo(pick);
    }
  }

  if (!open) return null;

  return (
    <div
      data-modal-open="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button
        type="button"
        aria-label="Close command palette"
        onClick={close}
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-[640px] border-[1.5px] border-ink rounded-sm bg-paper shadow-[6px_6px_0_var(--color-ink)] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b-[1.5px] border-ink">
          <Search className="w-4 h-4 text-muted" strokeWidth={1.6} aria-hidden />
          <input
            ref={handleInputRef}
            type="text"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Jump to a page, reporter, or article…"
            className="grow bg-transparent border-0 outline-none font-sans text-[14px] placeholder:text-muted py-1"
            aria-label="Search command palette"
          />
          <kbd className="font-hand text-[10px] text-muted border border-ink/25 px-[5px] py-[1px] rounded-[3px]">
            esc
          </kbd>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] hover:bg-paper-2"
          >
            <X size={13} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {hits.length === 0 ? (
            <p className="font-hand text-[12px] text-muted px-3 py-4">
              {term.trim()
                ? `No matches for "${term.trim()}".`
                : "Type to search pages, reporters, or articles…"}
            </p>
          ) : (
            <ul role="listbox" className="py-1">
              {hits.map((hit, i) => (
                <li
                  key={`${hit.kind}:${hit.kind === "page" ? hit.page.href : hit.id}`}
                  role="option"
                  aria-selected={i === safeActive}
                >
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => jumpTo(hit)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "w-full text-left px-3 py-2 flex items-center gap-3",
                      "border-l-[3px] border-transparent transition-colors duration-[120ms]",
                      i === safeActive
                        ? "bg-paper-2 border-l-accent"
                        : "hover:bg-paper-2",
                    )}
                  >
                    <HitIcon hit={hit} />
                    <div className="flex-1 min-w-0">
                      <HitLine hit={hit} />
                    </div>
                    <span className="font-hand text-[10px] text-muted uppercase tracking-[0.08em]">
                      {hit.kind}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t-[1.5px] border-ink/15 bg-paper-2">
          <span className="font-hand text-[11px] text-muted">
            ↑↓ navigate · enter to select · esc to close
          </span>
          <span className="font-hand text-[11px] text-muted">
            {hits.length} {hits.length === 1 ? "result" : "results"}
          </span>
        </div>
      </div>
    </div>
  );
}

function HitIcon({ hit }: { hit: Hit }) {
  if (hit.kind === "page") {
    const Icon = hit.page.icon;
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 border-[1.5px] border-ink rounded-sm bg-paper">
        <Icon size={13} aria-hidden />
      </span>
    );
  }
  if (hit.kind === "reporter") {
    return <Avatar name={hit.displayName} size="sm" tone="warm" />;
  }
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 border-[1.5px] border-ink rounded-sm bg-paper">
      <Newspaper size={13} aria-hidden />
    </span>
  );
}

function HitLine({ hit }: { hit: Hit }) {
  if (hit.kind === "page") {
    return (
      <>
        <p className="font-serif text-[13.5px] font-extrabold leading-tight truncate">
          {hit.page.label}
        </p>
        <p className="font-hand text-[11px] text-muted truncate">
          {hit.page.href}
        </p>
      </>
    );
  }
  if (hit.kind === "reporter") {
    return (
      <>
        <p className="font-serif text-[13.5px] font-extrabold leading-tight truncate">
          {hit.displayName}
        </p>
        <p className="font-hand text-[11px] text-muted truncate">
          {hit.email}
        </p>
      </>
    );
  }
  return (
    <>
      <p className="font-serif text-[13.5px] font-extrabold leading-tight truncate">
        {hit.headline}
      </p>
      <p className="font-hand text-[11px] text-muted truncate">
        {hit.status.replace(/_/g, " ")}
      </p>
    </>
  );
}
