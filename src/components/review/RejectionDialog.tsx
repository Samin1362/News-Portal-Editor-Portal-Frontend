"use client";

import { useState } from "react";
import { Dialog } from "@/components/primitives/Dialog";
import { Btn } from "@/components/primitives/Btn";

interface RejectionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  isSubmitting?: boolean;
  headline?: string;
}

export function RejectionDialog({
  open,
  onClose,
  onConfirm,
  isSubmitting,
  headline,
}: RejectionDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Reject submission"
      description={headline}
      size="md"
    >
      <RejectionBody
        onClose={onClose}
        onConfirm={onConfirm}
        isSubmitting={isSubmitting}
      />
    </Dialog>
  );
}

const MIN = 5;
const MAX = 1000;

function RejectionBody({
  onClose,
  onConfirm,
  isSubmitting,
}: Pick<RejectionDialogProps, "onClose" | "onConfirm" | "isSubmitting">) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN && trimmed.length <= MAX;

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="font-hand text-[11px] uppercase tracking-[0.08em] text-muted">
          Reason ({MIN}–{MAX} chars)
        </span>
        <textarea
          autoFocus
          required
          minLength={MIN}
          maxLength={MAX}
          rows={6}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What needs to change before this can be published?"
          className="border-[1.5px] border-ink rounded-sm px-2.5 py-2 font-sans text-[14px] outline-none focus:border-accent resize-y"
        />
        <span className="font-hand text-[11px] text-muted self-end">
          {trimmed.length}/{MAX}
        </span>
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Btn variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Btn>
        <Btn
          variant="primary"
          size="sm"
          onClick={() => valid && onConfirm(trimmed)}
          disabled={!valid || isSubmitting}
        >
          {isSubmitting ? "Sending…" : "Send rejection"}
        </Btn>
      </div>
    </>
  );
}
