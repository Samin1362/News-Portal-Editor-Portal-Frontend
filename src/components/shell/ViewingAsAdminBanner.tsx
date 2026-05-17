"use client";

import { useAuth } from "@/lib/auth/EditorAuthProvider";

/**
 * Compact info banner shown only when an admin is using the editor portal.
 * Lives above the page header so it doesn't disrupt the layout when absent.
 */
export function ViewingAsAdminBanner() {
  const { role } = useAuth();
  if (role !== "admin") return null;

  return (
    <div className="border-[1.5px] border-accent rounded-sm px-3 py-2 bg-accent/5 font-hand text-[12px] text-ink flex items-center gap-2">
      <span className="text-accent font-bold tracking-[0.08em]">ADMIN ●</span>
      <span>
        Viewing as admin. You have editor privileges here — your own portal
        is at <span className="underline">admin.deligo.news</span>.
      </span>
    </div>
  );
}
