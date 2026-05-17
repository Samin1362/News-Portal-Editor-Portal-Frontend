"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { getArticle } from "@/lib/api/articles.api";
import { ArticleForm } from "@/components/articles/ArticleForm";

interface Props {
  id: string;
}

export function EditDraftClient({ id }: Props) {
  const fetcher = useAuthedApi();

  const articleQuery = useQuery({
    queryKey: ["article", id],
    queryFn: () => getArticle(fetcher, id),
    staleTime: 30_000,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/drafts"
          className="inline-flex items-center gap-1 font-hand text-[12px] text-muted hover:text-ink"
        >
          <ArrowLeft size={12} /> All drafts
        </Link>
      </div>

      {articleQuery.isLoading ? (
        <p className="font-hand text-[13px] text-muted">Loading draft…</p>
      ) : articleQuery.isError || !articleQuery.data ? (
        <div className="border-[1.5px] border-warn rounded-sm bg-warn/10 p-4 font-hand text-[13px]">
          Could not load this draft. It may have been deleted, or you may not
          have access.
        </div>
      ) : (
        <ArticleForm article={articleQuery.data} />
      )}
    </div>
  );
}
