"use client";

import { Dialog } from "@/components/primitives/Dialog";

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["j"], label: "Next row" },
  { keys: ["k"], label: "Previous row" },
  { keys: ["Enter"], label: "Open selected" },
  { keys: ["a"], label: "Approve (only if claimed)" },
  { keys: ["r"], label: "Reject (opens dialog)" },
  { keys: ["p"], label: "Publish (only if approved)" },
  { keys: ["?"], label: "Toggle this sheet" },
];

export function QueueShortcutsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="Available on the review queue"
    >
      <ul className="flex flex-col gap-1.5">
        {SHORTCUTS.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-between gap-3 py-1.5 border-b border-ink/10 last:border-b-0"
          >
            <span className="font-hand text-[13px] text-muted">{s.label}</span>
            <span className="flex gap-1">
              {s.keys.map((k) => (
                <kbd
                  key={k}
                  className="border-[1.5px] border-ink rounded-sm bg-paper-2 px-1.5 py-0.5 font-sans text-[11px] font-semibold min-w-6 text-center"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
