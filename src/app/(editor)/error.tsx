"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";

/**
 * Editor route-group error boundary. Catches uncaught render / loader
 * errors thrown anywhere under `(editor)/*` and surfaces a usable recovery
 * screen instead of the default Next.js error page.
 */
export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the console so the editor can grab the message if they need
    // to file a bug; in production this should hook into your tracker.
    console.error("[editor] route error", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-warn/15 text-warn">
        <AlertTriangle size={24} aria-hidden />
      </span>
      <h1 className="font-serif text-[24px] font-extrabold tracking-[-0.01em]">
        Something went sideways
      </h1>
      <p className="font-hand text-[13px] text-muted max-w-[42ch]">
        {error.message ||
          "An unexpected error broke this page. Try again, or jump back to Today."}
      </p>
      {error.digest ? (
        <p className="font-hand text-[10px] text-muted">
          ref:{" "}
          <code className="border border-ink/20 px-1 rounded-[2px]">
            {error.digest}
          </code>
        </p>
      ) : null}
      <div className="flex items-center gap-2 mt-1">
        <Btn variant="primary" size="sm" onClick={() => reset()}>
          <RefreshCw size={12} /> Try again
        </Btn>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-[9px] py-[4px] border-[1.5px] border-ink rounded-[4px] font-hand text-[12px] text-ink hover:bg-paper-2"
        >
          Back to Today
        </Link>
      </div>
    </div>
  );
}
