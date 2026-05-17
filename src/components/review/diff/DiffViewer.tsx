"use client";

import { useMemo, useSyncExternalStore } from "react";
import { GitCompare, Sparkles } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { cn } from "@/lib/utils/cn";
import { computeDiff } from "./diffEngine";

const SNAPSHOT_PREFIX = "deligo.diffSnapshot.";

function snapshotKey(articleId: string): string {
  return `${SNAPSHOT_PREFIX}${articleId}`;
}

/** Pulls the previously-seen content snapshot from sessionStorage. */
function readSnapshot(articleId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(snapshotKey(articleId));
  } catch {
    return null;
  }
}

function writeSnapshot(articleId: string, content: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(snapshotKey(articleId), content);
    window.dispatchEvent(new Event("deligo:diff-snapshot"));
  } catch {
    // Ignore quota / private-mode failures — the diff just degrades.
  }
}

/**
 * SSR-safe subscription to the sessionStorage snapshot. The component
 * re-renders when the snapshot is rewritten (cross-tab `storage` event +
 * same-tab custom event).
 */
function useSnapshot(articleId: string): string | null {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener("storage", notify);
      window.addEventListener("deligo:diff-snapshot", notify);
      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener("deligo:diff-snapshot", notify);
      };
    },
    () => readSnapshot(articleId),
    () => null,
  );
}

interface Props {
  articleId: string;
  /** The article's current saved content (HTML). */
  currentContent: string;
  /** The in-progress Quick-edit draft, if any. */
  draftContent?: string | null;
}

/**
 * Side-by-side diff for the review surface. Backend has no per-version
 * content snapshots, so we synthesise two useful baselines:
 *
 *   - **Quick-edit draft vs saved**: the most useful diff in practice — what
 *     is the editor about to change?
 *   - **Saved vs last-seen snapshot**: a sessionStorage-backed snapshot of
 *     the saved content as it appeared the first time this article was
 *     opened. Lets the editor spot what shifted between visits (typically
 *     after the reporter re-submitted).
 *
 * The viewer prefers the draft diff when available; otherwise it falls back
 * to the last-seen snapshot diff. If neither baseline exists, it surfaces a
 * "no previous version" empty state.
 */
export function DiffViewer({
  articleId,
  currentContent,
  draftContent,
}: Props) {
  const snapshot = useSnapshot(articleId);
  const hasDraft = typeof draftContent === "string";

  const mode: "draft" | "snapshot" | "empty" = hasDraft
    ? "draft"
    : snapshot != null && snapshot !== currentContent
      ? "snapshot"
      : "empty";

  const { left, right, leftLabel, rightLabel } = useMemo(() => {
    if (mode === "draft") {
      return {
        left: currentContent,
        right: draftContent ?? "",
        leftLabel: "Saved",
        rightLabel: "Your edit",
      };
    }
    if (mode === "snapshot") {
      return {
        left: snapshot ?? "",
        right: currentContent,
        leftLabel: "Last time you opened this",
        rightLabel: "Current",
      };
    }
    return { left: "", right: "", leftLabel: "", rightLabel: "" };
  }, [mode, currentContent, draftContent, snapshot]);

  const result = useMemo(() => {
    if (mode === "empty") return null;
    return computeDiff(left, right);
  }, [left, right, mode]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-ink">
          <GitCompare size={13} aria-hidden />
          <span className="font-serif text-[13.5px] font-extrabold">
            Diff
          </span>
          {mode === "draft" ? (
            <Pill variant="ghost">unsaved edit</Pill>
          ) : mode === "snapshot" ? (
            <Pill variant="ghost">vs. snapshot</Pill>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {result ? (
            <>
              <Pill variant="green">+{result.stats.added} chars</Pill>
              <Pill variant="warn">−{result.stats.removed} chars</Pill>
            </>
          ) : null}
          <Btn
            size="sm"
            variant="ghost"
            onClick={() => writeSnapshot(articleId, currentContent)}
            title="Snapshot the saved content so future visits diff against it"
          >
            <Sparkles size={11} /> Snapshot
          </Btn>
        </div>
      </div>

      {result == null ? (
        <p className="font-hand text-[12px] text-muted">
          No previous version to compare. Click <strong>Snapshot</strong> to
          capture the current content — next time the article changes,
          you&apos;ll see the diff here. Or start a Quick edit to preview
          your own changes.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Column
            label={leftLabel}
            tone="left"
            text={renderHalf(result.diffs, "left")}
          />
          <Column
            label={rightLabel}
            tone="right"
            text={renderHalf(result.diffs, "right")}
          />
        </div>
      )}
    </div>
  );
}

function Column({
  label,
  tone,
  text,
}: {
  label: string;
  tone: "left" | "right";
  text: React.ReactNode;
}) {
  return (
    <div className="border-[1.5px] border-ink/15 rounded-sm bg-paper p-2 min-w-0">
      <p
        className={cn(
          "font-hand text-[10px] uppercase tracking-[0.08em] mb-1",
          tone === "left" ? "text-warn" : "text-accent-2",
        )}
      >
        {label}
      </p>
      <div className="font-sans text-[12.5px] leading-relaxed text-ink whitespace-pre-wrap break-words max-h-[420px] overflow-y-auto">
        {text}
      </div>
    </div>
  );
}

/**
 * Renders one column. On the LEFT column, `equal` and `removed` chunks
 * appear (added chunks hide). On the RIGHT column, `equal` and `added`
 * chunks appear. Each non-equal chunk gets a coloured background so the
 * scan-pattern matches a GitHub-style diff.
 */
function renderHalf(
  diffs: ReadonlyArray<[number, string]>,
  side: "left" | "right",
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  diffs.forEach(([op, text], i) => {
    if (op === 0) {
      out.push(<span key={i}>{text}</span>);
      return;
    }
    if (op === -1 && side === "left") {
      out.push(
        <span
          key={i}
          className="bg-warn/30 text-ink line-through decoration-warn/80"
        >
          {text}
        </span>,
      );
    } else if (op === 1 && side === "right") {
      out.push(
        <span key={i} className="bg-accent-2/25 text-ink">
          {text}
        </span>,
      );
    }
  });
  return out;
}
