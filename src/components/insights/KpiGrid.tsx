"use client";

import { KpiCard, Delta } from "@/components/primitives/KpiCard";
import { Spark } from "@/components/primitives/Spark";

interface KpiGridProps {
  awaitingReview: number | undefined;
  todaysReads: number | undefined;
  publishedToday: number | undefined;
  flaggedComments: number | undefined;
}

function fmt(n: number | undefined): string {
  if (n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function KpiGrid({
  awaitingReview,
  todaysReads,
  publishedToday,
  flaggedComments,
}: KpiGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        accent
        label="Awaiting review"
        value={fmt(awaitingReview)}
        meta="submitted, not claimed"
        spark={<Spark points="0,20 10,18 20,14 30,18 40,10 50,12 60,6 70,8" stroke="var(--color-accent)" delayMs={120} />}
      />
      <KpiCard
        label="Reads · today"
        value={fmt(todaysReads)}
        delta={
          todaysReads === undefined ? null : (
            <Delta direction="flat">snapshot</Delta>
          )
        }
        meta="aggregated from latest published"
        spark={<Spark points="0,22 10,18 20,16 30,12 40,14 50,10 60,8 70,4" delayMs={220} />}
      />
      <KpiCard
        label="Published today"
        value={fmt(publishedToday)}
        meta="from /public/latest (24h window)"
        spark={<Spark points="0,18 10,16 20,18 30,14 40,16 50,10 60,12 70,8" stroke="var(--color-accent-2)" delayMs={320} />}
      />
      <KpiCard
        label="Flagged comments"
        value={fmt(flaggedComments)}
        meta="reported, awaiting moderation"
        spark={<Spark points="0,24 10,22 20,16 30,18 40,14 50,18 60,16 70,12" stroke="var(--color-warn)" delayMs={420} />}
      />
    </div>
  );
}
