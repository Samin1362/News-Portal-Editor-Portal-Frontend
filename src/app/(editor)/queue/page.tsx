import { Suspense } from "react";
import { QueueClient } from "./QueueClient";

export default function QueuePage() {
  return (
    <Suspense
      fallback={
        <div className="font-hand text-[13px] text-muted">Loading queue…</div>
      }
    >
      <QueueClient />
    </Suspense>
  );
}
