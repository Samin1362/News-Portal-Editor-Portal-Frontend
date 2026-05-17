import { Suspense } from "react";
import { CalendarClient } from "./CalendarClient";

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="font-hand text-[13px] text-muted">Loading calendar…</div>
      }
    >
      <CalendarClient />
    </Suspense>
  );
}
