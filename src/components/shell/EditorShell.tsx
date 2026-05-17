"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Ticker, type TickerItem } from "./Ticker";
import { BottomTabs } from "./BottomTabs";

interface EditorShellProps {
  children: ReactNode;
  ticker?: TickerItem[];
}

/**
 * Two-column app shell: sticky sidebar on desktop, slide-over drawer on
 * mobile. Topbar + ticker stick to the top of the main column. Bottom-tabs
 * appear only on mobile. Phase 1 ships with a static placeholder ticker;
 * Phase 3 (Today dashboard) feeds it real data from cached queries.
 */
export function EditorShell({ children, ticker }: EditorShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const tickerItems: TickerItem[] =
    ticker && ticker.length > 0
      ? ticker
      : [
          { pre: "DESK ●", body: "12 drafts awaiting your review" },
          { label: "Next slot", body: "11:00 — Politics lead" },
          { label: "Deadline", body: "Cricket squad announce · 14:30" },
          { label: "R. Bhuiyan", body: "requested edit on monsoon piece" },
          { label: "P. Banerjee", body: 'submitted "Bridge collapse" v3' },
        ];

  return (
    <div className="grid lg:grid-cols-[240px_1fr] min-h-screen bg-paper">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex flex-col min-w-0 bg-paper">
        <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <Ticker items={tickerItems} />
        <div className="px-3.5 lg:px-[26px] py-[22px] pb-[80px] flex flex-col gap-[22px] stagger">
          {children}
        </div>
      </main>
      <BottomTabs />
    </div>
  );
}
