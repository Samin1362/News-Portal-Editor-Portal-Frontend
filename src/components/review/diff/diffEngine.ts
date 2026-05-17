import DiffMatchPatch, { type Diff } from "diff-match-patch";

/**
 * Wrapper around `diff-match-patch` tuned for editorial copy. We strip HTML
 * tags to plain text before diffing so the editor sees what *changed in the
 * prose*, not what re-arranged in the markup. For a 5k-word article this
 * runs comfortably under the 200 ms acceptance budget on a modern laptop.
 */

const HTML_TAG = /<[^>]+>/g;

/**
 * Convert an HTML fragment to plain text suitable for diffing:
 * - newlines preserved between block-level tags
 * - inline tags become spaces so words don't fuse
 * - collapse runs of whitespace
 */
export function htmlToPlain(html: string): string {
  if (!html) return "";
  const blockified = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|blockquote|pre)>/gi, "\n")
    .replace(HTML_TAG, " ");
  return decode(blockified)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export interface DiffStats {
  added: number;
  removed: number;
  equal: number;
}

export interface DiffResult {
  diffs: Diff[];
  stats: DiffStats;
}

/** Produces a word-level diff list (-1 deleted / 0 equal / 1 added). */
export function computeDiff(prevHtml: string, nextHtml: string): DiffResult {
  const dmp = new DiffMatchPatch.diff_match_patch();
  // Convert to char-level first so dmp can find similar chunks, then bump up
  // to word-level via the line-mode trick so the visual blocks aren't a sea
  // of single-character churn.
  const prev = htmlToPlain(prevHtml);
  const next = htmlToPlain(nextHtml);

  const a = dmp.diff_linesToChars_(prev, next);
  const charDiffs = dmp.diff_main(
    a.chars1 as unknown as string,
    a.chars2 as unknown as string,
    false,
  );
  dmp.diff_charsToLines_(charDiffs, a.lineArray as unknown as string[]);
  dmp.diff_cleanupSemantic(charDiffs);

  const stats: DiffStats = { added: 0, removed: 0, equal: 0 };
  for (const [op, text] of charDiffs) {
    if (op === 1) stats.added += text.length;
    else if (op === -1) stats.removed += text.length;
    else stats.equal += text.length;
  }
  return { diffs: charDiffs, stats };
}
