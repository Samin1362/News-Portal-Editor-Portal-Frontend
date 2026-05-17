import type { ReactNode } from "react";
import { EditorGuard } from "@/components/shell/EditorGuard";
import { EditorShell } from "@/components/shell/EditorShell";

/**
 * Editor route group layout. The `EditorGuard` enforces
 * `role === 'editor' | 'admin'` and bounces anyone else to `/access-denied`.
 * The `EditorShell` provides the sidebar + topbar + ticker + bottom tabs.
 */
export default function EditorLayout({ children }: { children: ReactNode }) {
  return (
    <EditorGuard>
      <EditorShell>{children}</EditorShell>
    </EditorGuard>
  );
}
