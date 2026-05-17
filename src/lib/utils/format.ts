import { formatDistanceToNow, format } from "date-fns";

/** "3m ago", "5h ago", "yesterday", "2 days ago" — short relative time. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

/** "12 May 2026" or "12 May, 14:30" depending on `withTime`. */
export function formatDate(
  iso: string | null | undefined,
  withTime = false,
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return withTime ? format(d, "d MMM, HH:mm") : format(d, "d MMM yyyy");
}

/** Initials for an avatar, max 2 letters, uppercase. */
export function initialsFor(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
