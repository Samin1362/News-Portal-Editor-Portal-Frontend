import { Suspense } from "react";
import { DraftsClient } from "./DraftsClient";

export default function DraftsPage() {
  return (
    <Suspense
      fallback={
        <div className="font-hand text-[13px] text-muted">Loading drafts…</div>
      }
    >
      <DraftsClient />
    </Suspense>
  );
}
