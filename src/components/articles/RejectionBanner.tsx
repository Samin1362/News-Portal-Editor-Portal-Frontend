import { AlertTriangle } from "lucide-react";
import type { HistoryDTO } from "@/lib/types/article";
import { formatDate } from "@/lib/utils/format";

interface Props {
  rejectionReason: string | null;
  history: HistoryDTO[];
}

/**
 * Surfaces the most-recent reject entry above the editor when a draft comes
 * back rejected. The reason on the article doc is the source of truth; the
 * history line just supplies the *when*.
 */
export function RejectionBanner({ rejectionReason, history }: Props) {
  if (!rejectionReason) return null;
  const lastReject = [...history].reverse().find((h) => h.action === "reject");

  return (
    <div className="border-[1.5px] border-accent rounded-sm bg-paper p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle
          size={16}
          className="text-accent shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="min-w-0">
          <h3 className="font-serif text-[15px] font-bold tracking-tight text-ink">
            This draft was rejected
          </h3>
          <p className="mt-1 font-sans text-[14px] leading-relaxed text-ink whitespace-pre-wrap">
            {rejectionReason}
          </p>
          {lastReject ? (
            <p className="mt-2 font-hand text-[11px] text-muted">
              Rejected on {formatDate(lastReject.at, true)} — fix the issues and
              re-submit.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
