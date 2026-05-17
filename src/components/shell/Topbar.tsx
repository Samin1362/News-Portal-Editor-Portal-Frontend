"use client";

import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { CRUMB_FOR_PATH } from "./nav-items";
import { openPalette } from "@/components/palette/CommandPalette";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils/cn";

interface TopbarProps {
  onToggleSidebar: () => void;
}

function crumbFor(pathname: string): string {
  if (CRUMB_FOR_PATH[pathname]) return CRUMB_FOR_PATH[pathname]!;
  // Fall back to last segment, title-cased.
  const seg = pathname.split("/").filter(Boolean).pop();
  if (!seg) return "Today";
  return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const pathname = usePathname() ?? "/";
  const crumb = crumbFor(pathname);

  return (
    <div
      data-print="hide"
      className="sticky top-0 z-20 flex items-center gap-3.5 px-3.5 py-3 border-b-[1.5px] border-ink bg-paper lg:px-[22px]"
    >
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

      <button
        type="button"
        onClick={openPalette}
        aria-label="Open command palette (Cmd+K)"
        className={cn(
          "hidden lg:flex items-center gap-2 h-8 w-[280px] px-2.5",
          "border-[1.5px] border-ink rounded-[4px] bg-paper-2 text-left",
          "hover:bg-paper transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40",
        )}
      >
        <Search className="w-3.5 h-3.5 text-muted" strokeWidth={1.6} />
        <span className="grow font-hand text-[12.5px] text-muted">
          Search drafts, reporters, tags…
        </span>
        <kbd className="font-hand text-[10px] text-muted border border-ink/25 px-[5px] py-[1px] rounded-[3px]">
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        onClick={openPalette}
        aria-label="Open command palette"
        className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-[4px] border-[1.5px] border-ink bg-paper hover:bg-paper-2"
      >
        <Search className="w-4 h-4" strokeWidth={1.6} aria-hidden />
      </button>

      <NotificationBell />
    </div>
  );
}
