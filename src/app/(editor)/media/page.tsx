import { Suspense } from "react";
import { MediaClient } from "./MediaClient";

export default function MediaPage() {
  return (
    <Suspense
      fallback={
        <div className="font-hand text-[13px] text-muted">Loading media…</div>
      }
    >
      <MediaClient />
    </Suspense>
  );
}
