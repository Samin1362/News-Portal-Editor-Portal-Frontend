import { Suspense } from "react";
import { ScheduleClient } from "./ScheduleClient";

export default function SchedulePage() {
  return (
    <Suspense fallback={<ScheduleSkeleton />}>
      <ScheduleClient />
    </Suspense>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="font-hand text-[13px] text-muted">Loading schedule…</div>
  );
}
