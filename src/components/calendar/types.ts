/** Normalised calendar event projected from an approved/published article. */
export interface CalendarEvent {
  id: string;
  /** ISO timestamp — `scheduledAt` for approved, `publishedAt` for published. */
  at: string;
  headline: string;
  categoryId: string;
  kind: "approved" | "published";
}
