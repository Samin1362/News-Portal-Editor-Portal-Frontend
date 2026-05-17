"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ArticleForm } from "@/components/articles/ArticleForm";

export default function NewDraftPage() {
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
      <ArticleForm />
    </div>
  );
}
