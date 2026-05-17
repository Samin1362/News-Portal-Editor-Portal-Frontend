"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { BOTTOM_TABS, MOCK_COUNTS } from "./nav-items";

/**
 * Mobile-only bottom tab bar — surfaces the 5 most-used routes. Hidden on
 * ≥820px (where the sidebar is visible). Each tab carries an optional red
 * notification dot if the underlying count is non-zero.
 */
export function BottomTabs() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 flex justify-around bg-paper border-t-[1.5px] border-ink"
      style={{ paddingBottom: "calc(6px + env(safe-area-inset-bottom))" }}
    >
      {BOTTOM_TABS.map((tab) => {
        const isActive =
          tab.href === "/"
            ? pathname === "/"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;
        const count = tab.countKey ? MOCK_COUNTS[tab.countKey] : 0;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "relative flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[44px] flex-1 rounded-[4px] font-hand text-[10px]",
              isActive ? "text-ink" : "text-muted",
            )}
          >
            <Icon
              className={cn(
                "w-[18px] h-[18px]",
                isActive ? "text-accent" : "text-muted",
              )}
              strokeWidth={1.6}
            />
            <span>{tab.label}</span>
            {count > 0 && (
              <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-accent rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
