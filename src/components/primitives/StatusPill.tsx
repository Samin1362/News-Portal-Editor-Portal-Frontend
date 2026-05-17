import { Pill, type PillVariant } from "./Pill";
import type { ArticleStatus } from "@/lib/types/article";

const VARIANT: Record<ArticleStatus, PillVariant> = {
  draft: "default",
  submitted: "red",
  under_review: "red",
  approved: "green",
  published: "solid",
  rejected: "red",
  archived: "default",
};

const LABEL: Record<ArticleStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "In review",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

/** Single-source-of-truth status pill — used by /drafts, /published, etc. */
export function StatusPill({ status }: { status: ArticleStatus }) {
  const variant = VARIANT[status];
  const isActive = status === "approved" || status === "published";
  return (
    <Pill variant={variant} dot={isActive}>
      {LABEL[status]}
    </Pill>
  );
}
