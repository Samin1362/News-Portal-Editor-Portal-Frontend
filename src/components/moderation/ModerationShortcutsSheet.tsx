"use client";

import { Dialog } from "@/components/primitives/Dialog";

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["j"], label: "Next comment" },
  { keys: ["k"], label: "Previous comment" },
  { keys: ["Enter"], label: "Open detail drawer" },
  { keys: ["a"], label: "Approve selected" },
  { keys: ["r"], label: "Reject selected" },
  { keys: ["?"], label: "Toggle this sheet" },
];

export function ModerationShortcutsSheet({
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
      description="Available on the comments moderation surface"
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
