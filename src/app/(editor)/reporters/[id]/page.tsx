import { Suspense } from "react";
import { ReporterDetailClient } from "./ReporterDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReporterDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="font-hand text-[13px] text-muted">Loading reporter…</div>
      }
    >
      <ReporterDetailClient id={id} />
    </Suspense>
  );
}
