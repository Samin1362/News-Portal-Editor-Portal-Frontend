"use client";

import { Dialog } from "@/components/primitives/Dialog";
import { Btn } from "@/components/primitives/Btn";

interface ApproveDialogProps {
  open: boolean;
  onClose: () => void;
  onPublishNow: () => void;
  onSchedule: () => void;
  isSubmitting?: boolean;
  headline?: string;
}

export function ApproveDialog({
  open,
  onClose,
  onPublishNow,
  onSchedule,
  isSubmitting,
  headline,
}: ApproveDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Approved"
      description={headline ?? "What's next?"}
      footer={
        <>
          <Btn variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Back to queue
          </Btn>
          <Btn variant="default" size="sm" onClick={onSchedule} disabled={isSubmitting}>
            Schedule
          </Btn>
          <Btn variant="primary" size="sm" onClick={onPublishNow} disabled={isSubmitting}>
            {isSubmitting ? "Publishing…" : "Publish now"}
          </Btn>
        </>
      }
    >
      <p className="font-sans text-[14px] text-ink leading-snug">
        This article is approved. Publish it now to push it live, or schedule it
        for a future slot. You can also return to the queue and decide later.
      </p>
    </Dialog>
  );
}
