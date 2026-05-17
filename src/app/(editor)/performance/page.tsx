import { Suspense } from "react";
import { PerformanceClient } from "./PerformanceClient";

export default function PerformancePage() {
  return (
    <Suspense
      fallback={
        <div className="font-hand text-[13px] text-muted">
          Loading performance…
        </div>
      }
    >
      <PerformanceClient />
    </Suspense>
  );
}
