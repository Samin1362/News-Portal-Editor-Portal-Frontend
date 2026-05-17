"use client";

import { useEffect } from "react";

export interface Shortcut {
  /** Single-character lower-case key, or one of: Enter, Escape, ? */
  key: string;
  /** Hint shown in the shortcuts sheet. */
  label?: string;
  /** Handler — return true to mark the event as handled (preventDefault). */
  handler: (event: KeyboardEvent) => void | boolean;
  /** If true, ignore even when the user is typing in an input/textarea. */
  global?: boolean;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  options: { enabled?: boolean } = {},
): void {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const onKey = (event: KeyboardEvent) => {
      // Don't hijack typing.
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isTypingTarget(event.target)) return;
      }
      // Skip if a modal is open and the shortcut isn't global.
      const hasModal = document.querySelector("[data-modal-open='true']");

      for (const s of shortcuts) {
        if (matches(s.key, event)) {
          if (hasModal && !s.global) return;
          const result = s.handler(event);
          if (result !== false) event.preventDefault();
          break;
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts, enabled]);
}

function matches(key: string, event: KeyboardEvent): boolean {
  if (key === "?" ) return event.key === "?" || (event.shiftKey && event.key === "/");
  if (key === "Enter") return event.key === "Enter";
  if (key === "Escape") return event.key === "Escape";
  return event.key.toLowerCase() === key.toLowerCase();
}
