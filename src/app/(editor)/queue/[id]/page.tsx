import { ReviewClient } from "./ReviewClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: Props) {
  const { id } = await params;
  return <ReviewClient id={id} />;
}
