"use client";

import { useState } from "react";
import { Dialog } from "@/components/primitives/Dialog";
import { Btn } from "@/components/primitives/Btn";

interface ScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (iso: string) => void | Promise<void>;
  isSubmitting?: boolean;
  headline?: string;
  initial?: string | null;
}

export function ScheduleDialog({
  open,
  onClose,
  onConfirm,
  isSubmitting,
  headline,
  initial,
}: ScheduleDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Schedule publish"
      description={headline}
    >
      <ScheduleBody
        onClose={onClose}
        onConfirm={onConfirm}
        isSubmitting={isSubmitting}
        initial={initial}
      />
    </Dialog>
  );
}

/** "YYYY-MM-DDTHH:mm" in the local zone — captured once at mount time. */
function defaultLocal(initialIso?: string | null): string {
  const d = initialIso ? new Date(initialIso) : new Date(Date.now() + 60 * 60 * 1000);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function ScheduleBody({
  onClose,
  onConfirm,
  isSubmitting,
  initial,
}: Pick<ScheduleDialogProps, "onClose" | "onConfirm" | "isSubmitting" | "initial">) {
  const [value, setValue] = useState(() => defaultLocal(initial));
  const [inFuture, setInFuture] = useState(true);

  const handleChange = (next: string) => {
    setValue(next);
    setInFuture(next ? new Date(next).getTime() > Date.now() : false);
  };

  const handleConfirm = () => {
    if (!value) return;
    const iso = new Date(value).toISOString();
    if (new Date(iso).getTime() <= Date.now()) {
      setInFuture(false);
      return;
    }
    onConfirm(iso);
  };

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="font-hand text-[11px] uppercase tracking-[0.08em] text-muted">
          Publish at
        </span>
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="border-[1.5px] border-ink rounded-sm px-2.5 py-2 font-sans text-[14px] outline-none focus:border-accent"
        />
        {value && !inFuture ? (
          <span className="font-hand text-[11px] text-accent">
            Must be in the future
          </span>
        ) : (
          <span className="font-hand text-[11px] text-muted">
            Cron auto-publishes within ~1 minute of this time.
          </span>
        )}
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Btn variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Btn>
        <Btn
          variant="primary"
          size="sm"
          onClick={handleConfirm}
          disabled={!value || !inFuture || isSubmitting}
        >
          {isSubmitting ? "Scheduling…" : "Schedule"}
        </Btn>
      </div>
    </>
  );
}
