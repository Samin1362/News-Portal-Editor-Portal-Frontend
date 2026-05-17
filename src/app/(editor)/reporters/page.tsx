import { Suspense } from "react";
import { ReportersClient } from "./ReportersClient";

export default function ReportersPage() {
  return (
    <Suspense
      fallback={
        <div className="font-hand text-[13px] text-muted">Loading reporters…</div>
      }
    >
      <ReportersClient />
    </Suspense>
  );
}
