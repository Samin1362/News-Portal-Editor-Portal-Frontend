"use client";

import { Btn } from "@/components/primitives/Btn";
import type { ArticleStatus } from "@/lib/types/article";

interface ReviewActionsProps {
  status: ArticleStatus;
  isCurrentUserReviewer: boolean;
  isMutating?: boolean;
  onClaim: () => void;
  onApprove: () => void;
  onReject: () => void;
  onPublish: () => void;
  onSchedule: () => void;
}

export function ReviewActions({
  status,
  isCurrentUserReviewer,
  isMutating,
  onClaim,
  onApprove,
  onReject,
  onPublish,
  onSchedule,
}: ReviewActionsProps) {
  if (status === "submitted") {
    return (
      <div className="flex flex-col gap-2">
        <Btn variant="primary" onClick={onClaim} disabled={isMutating}>
          {isMutating ? "Claiming…" : "Take over → start review"}
        </Btn>
        <Btn variant="ghost" onClick={onReject} disabled={isMutating}>
          Reject without claiming
        </Btn>
      </div>
    );
  }

  if (status === "under_review") {
    if (!isCurrentUserReviewer) {
      return (
        <div className="flex flex-col gap-2">
          <p className="font-hand text-[12px] text-muted">
            Another editor is reviewing this. Claim to take over.
          </p>
          <Btn variant="primary" onClick={onClaim} disabled={isMutating}>
            Take over
          </Btn>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        <Btn variant="primary" onClick={onApprove} disabled={isMutating}>
          Approve →
        </Btn>
        <Btn variant="ghost" onClick={onReject} disabled={isMutating}>
          Reject…
        </Btn>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="flex flex-col gap-2">
        <Btn variant="primary" onClick={onPublish} disabled={isMutating}>
          Publish now
        </Btn>
        <Btn variant="default" onClick={onSchedule} disabled={isMutating}>
          Schedule for later
        </Btn>
      </div>
    );
  }

  if (status === "published") {
    return (
      <p className="font-hand text-[12px] text-accent-2">
        Published — copy edits propagate via Quick edit + Save.
      </p>
    );
  }

  if (status === "rejected") {
    return (
      <p className="font-hand text-[12px] text-muted">
        Rejected — the author can resubmit a new version from their portal.
      </p>
    );
  }

  return (
    <p className="font-hand text-[12px] text-muted">
      No review actions available in <em>{status}</em>.
    </p>
  );
}
