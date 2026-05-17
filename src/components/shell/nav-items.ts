import type { LucideIcon } from "lucide-react";
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
} from "lucide-react";

export interface SidebarItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Optional count badge — fed from a TanStack query on the live shell. */
  countKey?:
    | "queue"
    | "scheduled"
    | "flagged"
    | "drafts"
    | "comments";
}

export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

/**
 * Three groups from `news-portal-deligo/project/Editor Dashboard.html`:
 * - DESK (Today, Review queue, Schedule, Reporters)
 * - CONTENT (Published, Drafts, Flagged, Media library)
 * - DESK (Comments, Performance)
 * The two DESK headers are intentional in the mock — keep them.
 */
export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: "DESK",
    items: [
      { key: "today", label: "Today", href: "/", icon: Home },
      {
        key: "queue",
        label: "Review queue",
        href: "/queue",
        icon: AlignJustify,
        countKey: "queue",
      },
      {
        key: "schedule",
        label: "Schedule",
        href: "/schedule",
        icon: CalendarDays,
        countKey: "scheduled",
      },
      { key: "reporters", label: "Reporters", href: "/reporters", icon: Pencil },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { key: "published", label: "Published", href: "/published", icon: Newspaper },
      { key: "drafts", label: "Drafts", href: "/drafts", icon: FileText, countKey: "drafts" },
      { key: "flagged", label: "Flagged", href: "/flagged", icon: Flag, countKey: "flagged" },
      { key: "media", label: "Media library", href: "/media", icon: ImageIcon },
    ],
  },
  {
    label: "DESK",
    items: [
      {
        key: "comments",
        label: "Comments",
        href: "/comments",
        icon: MessageSquare,
        countKey: "comments",
      },
      { key: "performance", label: "Performance", href: "/performance", icon: BarChart3 },
    ],
  },
];

/** Routes shown in the mobile bottom tab bar (5 max). */
export const BOTTOM_TABS: SidebarItem[] = [
  { key: "today", label: "Today", href: "/", icon: Home },
  { key: "queue", label: "Queue", href: "/queue", icon: AlignJustify, countKey: "queue" },
  { key: "schedule", label: "Schedule", href: "/schedule", icon: CalendarDays },
  { key: "flagged", label: "Flagged", href: "/flagged", icon: Flag, countKey: "flagged" },
  { key: "performance", label: "Stats", href: "/performance", icon: BarChart3 },
];

/** Used by the topbar to derive the breadcrumb label from the pathname. */
export const CRUMB_FOR_PATH: Record<string, string> = {
  "/": "Today",
  "/queue": "Review queue",
  "/schedule": "Schedule",
  "/reporters": "Reporters",
  "/published": "Published",
  "/drafts": "Drafts",
  "/flagged": "Flagged",
  "/media": "Media library",
  "/comments": "Comments",
  "/performance": "Performance",
  "/settings": "Settings",
  "/calendar": "Calendar",
};

/** Mock-side fallback counts so the shell looks alive before Phase 2 wires real queries. */
export const MOCK_COUNTS: Record<NonNullable<SidebarItem["countKey"]>, number> = {
  queue: 12,
  scheduled: 8,
  flagged: 3,
  drafts: 0,
  comments: 0,
};
