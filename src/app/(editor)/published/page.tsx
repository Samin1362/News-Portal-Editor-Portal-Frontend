import { Suspense } from "react";
import { PublishedClient } from "./PublishedClient";

export default function PublishedPage() {
  return (
    <Suspense
      fallback={
        <div className="font-hand text-[13px] text-muted">Loading published…</div>
      }
    >
      <PublishedClient />
    </Suspense>
  );
}
