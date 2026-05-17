"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth/EditorAuthProvider";
import { useToast } from "@/lib/ui/toast";
import { initialsFor } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface UserMenuProps {
  /** Variant — sidebar chip (default) is full-width, topbar is compact. */
  variant?: "sidebar" | "topbar";
  onNavigate?: () => void;
}

/**
 * Profile chip with a popover menu (profile / settings / sign out).
 * Closes on click-outside, Escape, route change, or after a destructive action.
 */
export function UserMenu({ variant = "sidebar", onNavigate }: UserMenuProps) {
  const { profile, role, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const displayName = profile?.displayName ?? "—";
  const email = profile?.email ?? "";
  const roleLine =
    role === "admin"
      ? "Admin · viewing as editor"
      : role === "editor"
        ? "Editor · desk"
        : "—";

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign out");
      setSigningOut(false);
    }
  };

  const handleNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div ref={rootRef} className={cn("relative", variant === "sidebar" && "mt-auto")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex items-center gap-2.5 border-[1.5px] border-ink rounded-[4px] bg-paper",
          "transition-[background,box-shadow] duration-[120ms]",
          "hover:bg-paper-2 active:translate-y-[0.5px]",
          variant === "sidebar" ? "w-full px-2.5 py-2" : "px-2 py-1.5",
        )}
      >
        <span
          className={cn(
            "rounded-full border-[1.5px] border-ink bg-accent/15",
            "inline-flex items-center justify-center font-hand font-bold text-ink shrink-0",
            variant === "sidebar" ? "w-[28px] h-[28px] text-[12px]" : "w-[24px] h-[24px] text-[11px]",
          )}
        >
          {initialsFor(displayName)}
        </span>
        {variant === "sidebar" ? (
          <div className="flex flex-col min-w-0 flex-1 text-left">
            <span className="font-hand text-[13px] font-bold truncate">{displayName}</span>
            <span className="font-hand text-[10px] text-muted truncate">{roleLine}</span>
          </div>
        ) : null}
        <span
          className={cn(
            "font-hand text-muted text-[12px] transition-transform duration-[120ms]",
            open && "rotate-180",
          )}
          aria-hidden="true"
        >
          ⌄
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-[230px] bg-paper border-[1.5px] border-ink rounded-sm",
            "shadow-[4px_4px_0_var(--color-ink)] overflow-hidden",
            variant === "sidebar"
              ? "bottom-[calc(100%+6px)] left-0"
              : "top-[calc(100%+6px)] right-0",
          )}
        >
          <div className="px-3 py-2.5 border-b-[1.5px] border-ink/15 bg-paper-2">
            <p className="font-serif text-[14px] font-extrabold truncate">{displayName}</p>
            {email ? (
              <p className="font-hand text-[11px] text-muted truncate" title={email}>
                {email}
              </p>
            ) : null}
            <p className="font-hand text-[10px] text-accent uppercase tracking-[0.08em] mt-0.5">
              {roleLine}
            </p>
          </div>

          <ul className="flex flex-col py-1">
            <li>
              <Link
                href="/settings"
                onClick={handleNavigate}
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2 font-hand text-[13px] hover:bg-paper-2"
              >
                <UserRound size={14} /> Your profile
              </Link>
            </li>
            <li>
              <Link
                href="/settings"
                onClick={handleNavigate}
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2 font-hand text-[13px] hover:bg-paper-2"
              >
                <Settings size={14} /> Settings
              </Link>
            </li>
            <li className="border-t-[1.5px] border-ink/15 mt-1 pt-1">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                role="menuitem"
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 font-hand text-[13px] text-accent",
                  "hover:bg-accent/10 disabled:opacity-60 disabled:cursor-wait text-left",
                )}
              >
                <LogOut size={14} /> {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
