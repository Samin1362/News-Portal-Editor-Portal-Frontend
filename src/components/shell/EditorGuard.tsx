"use client";

import type { ReactNode } from "react";
import { useRequireEditor } from "@/lib/auth/useRequireEditor";

interface EditorGuardProps {
  children: ReactNode;
}

/**
 * Wraps the editor route group. While the auth state resolves we paint a
 * minimal skeleton (no shell flash). Once the guard either redirects (to
 * /login or /access-denied) or confirms allowance, we render children.
 */
export function EditorGuard({ children }: EditorGuardProps) {
  const { loading, isAllowed } = useRequireEditor();

  if (loading || !isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="font-hand text-[12px] text-muted tracking-wider uppercase">
          Loading desk…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
