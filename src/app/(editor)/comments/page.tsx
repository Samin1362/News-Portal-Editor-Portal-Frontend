import { Suspense } from "react";
import { ModerationClient } from "@/components/moderation/ModerationClient";

export default function CommentsPage() {
  return (
    <Suspense
      fallback={
        <div className="font-hand text-[13px] text-muted">Loading comments…</div>
      }
    >
      <ModerationClient
        title="Comments"
        defaultChip="pending"
        chips={["pending", "reported", "approved", "rejected", "all"]}
        basePath="/comments"
        subtitle="full moderation queue"
      />
    </Suspense>
  );
}
