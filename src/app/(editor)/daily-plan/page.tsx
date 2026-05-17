import { Suspense } from "react";
import { DailyPlanClient } from "./DailyPlanClient";

export default function DailyPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="font-hand text-[13px] text-muted">
          Loading daily plan…
        </div>
      }
    >
      <DailyPlanClient />
    </Suspense>
  );
}
