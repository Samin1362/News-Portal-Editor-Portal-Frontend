"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";
import { CRUMB_FOR_PATH } from "./nav-items";
import { cn } from "@/lib/utils/cn";

interface TopbarProps {
  onToggleSidebar: () => void;
  /** Hide the pulsing red dot on the bell when there are no new notifications. */
  hasUnread?: boolean;
}

function crumbFor(pathname: string): string {
  if (CRUMB_FOR_PATH[pathname]) return CRUMB_FOR_PATH[pathname]!;
  // Fall back to last segment, title-cased.
  const seg = pathname.split("/").filter(Boolean).pop();
  if (!seg) return "Today";
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
}

export function Topbar({ onToggleSidebar, hasUnread = true }: TopbarProps) {
  const pathname = usePathname() ?? "/";
  const crumb = crumbFor(pathname);

  return (
    <div className="sticky top-0 z-20 flex items-center gap-3.5 px-3.5 py-3 border-b-[1.5px] border-ink bg-paper lg:px-[22px]">
      <button
        type="button"
        aria-label="Open sidebar"
        onClick={onToggleSidebar}
        className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-[4px] border-[1.5px] border-ink bg-paper"
      >
        <Menu className="w-4 h-4" strokeWidth={1.6} />
      </button>

      <div className="flex lg:hidden items-baseline gap-1.5">
        <span className="font-serif font-extrabold text-[20px] tracking-[-0.02em]">
          Deligo
        </span>
        <span className="font-hand text-[10px] text-accent">· editor</span>
      </div>

      <nav className="hidden lg:flex items-center gap-1.5 font-hand text-[12px] text-muted">
        <span>Desk</span>
        <span>/</span>
        <span className="text-ink font-bold">{crumb}</span>
      </nav>

      <div className="grow" />

      <label
        className={cn(
          "hidden lg:flex items-center gap-2 h-8 w-[280px] px-2.5",
          "border-[1.5px] border-ink rounded-[4px] bg-paper-2",
        )}
      >
        <Search className="w-3.5 h-3.5 text-muted" strokeWidth={1.6} />
        <input
          type="text"
          placeholder="Search drafts, reporters, tags…"
          className="grow bg-transparent border-0 outline-none font-hand text-[12.5px] placeholder:text-muted"
        />
        <span className="font-hand text-[10px] text-muted border border-ink/25 px-[5px] py-[1px] rounded-[3px]">
          ⌘K
        </span>
      </label>

      <button
        type="button"
        aria-label="Notifications"
        className="relative inline-flex items-center justify-center w-8 h-8 rounded-[4px] hover:bg-paper-2 transition-colors"
      >
        <Bell className="w-[17px] h-[17px]" strokeWidth={1.6} />
        {hasUnread && (
          <span className="absolute top-[4px] right-[6px] w-2 h-2 bg-accent rounded-full border-[1.5px] border-paper live-dot" />
        )}
      </button>
    </div>
  );
}
