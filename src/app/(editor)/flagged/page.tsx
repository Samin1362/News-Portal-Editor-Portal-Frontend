import { Suspense } from "react";
import { ModerationClient } from "@/components/moderation/ModerationClient";

export default function FlaggedPage() {
  return (
    <Suspense
      fallback={
        <div className="font-hand text-[13px] text-muted">Loading flagged…</div>
      }
    >
      <ModerationClient
        title="Flagged comments"
        defaultChip="reported"
        chips={["reported", "pending", "all"]}
        basePath="/flagged"
        subtitle="reader-reported first"
      />
    </Suspense>
  );
}
