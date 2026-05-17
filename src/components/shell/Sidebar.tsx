"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDeskCounts } from "@/hooks/useDeskCounts";
import { cn } from "@/lib/utils/cn";
import { SIDEBAR_GROUPS, MOCK_COUNTS, type SidebarItem } from "./nav-items";
import { UserMenu } from "./UserMenu";

interface SidebarProps {
  /** Mobile drawer state — desktop sidebar ignores both. */
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname() ?? "/";
  const liveCounts = useDeskCounts();

  const resolveCount = (item: SidebarItem): number => {
    if (!item.countKey) return 0;
    if (item.countKey === "queue") return liveCounts.queue ?? MOCK_COUNTS.queue;
    if (item.countKey === "flagged") return liveCounts.flagged ?? MOCK_COUNTS.flagged;
    if (item.countKey === "scheduled")
      return liveCounts.scheduled ?? MOCK_COUNTS.scheduled;
    if (item.countKey === "comments")
      return liveCounts.comments ?? MOCK_COUNTS.comments;
    return MOCK_COUNTS[item.countKey];
  };

  return (
    <>
      {/* Mobile backdrop — covers the page below the sidebar on small screens. */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-ink/35 lg:hidden",
          open ? "block" : "hidden",
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        data-print="hide"
        className={cn(
          "z-40 bg-paper-2 border-r-[1.5px] border-ink",
          "flex flex-col gap-0.5 p-3 pt-4",
          "fixed inset-y-0 left-0 w-[270px]",
          "lg:sticky lg:top-0 lg:h-screen lg:w-[240px] lg:translate-x-0",
          "transition-transform duration-300 ease-out overflow-y-auto",
          open ? "translate-x-0 shadow-xl" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-baseline gap-1.5 px-1.5 pb-4 pt-1">
          <span className="font-serif font-extrabold text-[22px] tracking-[-0.02em]">
            Deligo
          </span>
          <span className="font-hand text-[11px] text-accent">· editor</span>
        </div>

        {SIDEBAR_GROUPS.map((group, gIdx) => (
          <div key={`${group.label}-${gIdx}`}>
            <div className="font-hand text-[10px] text-muted tracking-[0.12em] px-2 pb-1 pt-3">
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              const count = resolveCount(item);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2.5 px-2.5 py-2 rounded-[4px]",
                    "font-hand text-[13.5px] text-ink cursor-pointer",
                    "transition-[background,color,padding] duration-[180ms]",
                    "hover:bg-ink/5 hover:pl-3.5",
                    "focus:outline-none focus:ring-2 focus:ring-accent/40",
                    isActive && "bg-ink text-paper hover:bg-ink hover:pl-3.5",
                  )}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-[-12px] top-2 bottom-2 w-[3px] bg-accent rounded-[2px]"
                    />
                  )}
                  <Icon
                    className={cn(
                      "w-[18px] h-[18px]",
                      isActive ? "text-paper" : "text-muted",
                    )}
                    strokeWidth={1.6}
                  />
                  <span className="grow">{item.label}</span>
                  {item.countKey && count > 0 && (
                    <span
                      className={cn(
                        "ml-auto font-hand text-[11px] px-[7px] py-[1px] rounded-full border-[1.2px]",
                        isActive
                          ? "bg-accent text-white border-accent"
                          : "bg-paper text-ink border-ink",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        <UserMenu variant="sidebar" onNavigate={onClose} />
      </aside>
    </>
  );
}
