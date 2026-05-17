import { Suspense } from "react";
import { EditDraftClient } from "./EditDraftClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditDraftPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="font-hand text-[13px] text-muted">Loading draft…</div>
      }
    >
      <EditDraftClient id={id} />
    </Suspense>
  );
}
