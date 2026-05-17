"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Pencil, Save, X } from "lucide-react";
import { useAuth } from "@/lib/auth/EditorAuthProvider";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { useToast } from "@/lib/ui/toast";
import {
  approveArticle,
  getArticle,
  publishArticle,
  rejectArticle,
  scheduleArticle,
  setCommentsEnabled,
  setFlags,
  startReview,
  updateArticle,
} from "@/lib/api/articles.api";
import { listCategories } from "@/lib/api/categories.api";
import { listUsers } from "@/lib/api/users.api";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { Avatar } from "@/components/primitives/Avatar";
import { Card } from "@/components/primitives/Card";
import { ArticleContent } from "@/components/review/ArticleContent";
import { ReviewActions } from "@/components/review/ReviewActions";
import { FlagsToggleGroup } from "@/components/review/FlagsToggleGroup";
import { CommentsToggle } from "@/components/review/CommentsToggle";
import { StatusTimeline } from "@/components/review/StatusTimeline";
import { RejectionDialog } from "@/components/review/RejectionDialog";
import { ApproveDialog } from "@/components/review/ApproveDialog";
import { ScheduleDialog } from "@/components/review/ScheduleDialog";
import { DiffViewer } from "@/components/review/diff/DiffViewer";
import type { ArticleFullDTO } from "@/lib/types/article";
import type { FlagsPatch } from "@/lib/api/articles.api";
import type { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/utils/format";

export function ReviewClient({ id }: { id: string }) {
  const router = useRouter();
  const fetcher = useAuthedApi();
  const qc = useQueryClient();
  const toast = useToast();
  const { profile } = useAuth();

  const articleQuery = useQuery({
    queryKey: ["article", id],
    queryFn: () => getArticle(fetcher, id),
    staleTime: 15_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(fetcher),
    staleTime: 5 * 60_000,
  });

  const authorsQuery = useQuery({
    queryKey: ["users", "journalist-map"],
    queryFn: async () => {
      const result = await listUsers(fetcher, { role: "journalist", limit: 100 });
      if (!result) return new Map<string, string>();
      return new Map(result.data.map((u) => [u.id, u.displayName]));
    },
    staleTime: 5 * 60_000,
  });

  const article = articleQuery.data;
  const isSelfReviewer = !!article && !!profile && article.reviewerId === profile.id;
  const category = useMemo(
    () => categoriesQuery.data?.find((c) => c.id === article?.categoryId),
    [categoriesQuery.data, article?.categoryId],
  );
  const authorName = article ? authorsQuery.data?.get(article.authorId) : undefined;

  // Mutations
  const onMutateError = (err: ApiError) =>
    toast.error(err.message ?? "Action failed");

  const claimMu = useMutation({
    mutationFn: () => startReview(fetcher, id),
    onSuccess: (full) => qc.setQueryData(["article", id], full),
    onError: onMutateError,
  });

  const approveMu = useMutation({
    mutationFn: () => approveArticle(fetcher, id),
    onSuccess: (full) => {
      qc.setQueryData(["article", id], full);
      qc.invalidateQueries({ queryKey: ["queue"] });
      toast.success("Approved");
    },
    onError: onMutateError,
  });

  const publishMu = useMutation({
    mutationFn: () => publishArticle(fetcher, id),
    onSuccess: (full) => {
      qc.setQueryData(["article", id], full);
      qc.invalidateQueries({ queryKey: ["queue"] });
      toast.success("Published");
    },
    onError: onMutateError,
  });

  const scheduleMu = useMutation({
    mutationFn: (iso: string) => scheduleArticle(fetcher, id, iso),
    onSuccess: (full) => {
      qc.setQueryData(["article", id], full);
      qc.invalidateQueries({ queryKey: ["queue"] });
      toast.success("Scheduled");
    },
    onError: onMutateError,
  });

  const rejectMu = useMutation({
    mutationFn: (reason: string) => rejectArticle(fetcher, id, reason),
    onSuccess: (full) => {
      qc.setQueryData(["article", id], full);
      qc.invalidateQueries({ queryKey: ["queue"] });
      toast.success("Rejected");
    },
    onError: onMutateError,
  });

  const flagsMu = useMutation({
    mutationFn: (patch: FlagsPatch) => setFlags(fetcher, id, patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["article", id] });
      const prev = qc.getQueryData<ArticleFullDTO>(["article", id]);
      if (prev) {
        qc.setQueryData<ArticleFullDTO>(["article", id], { ...prev, ...patch });
      }
      return { prev };
    },
    onError: (err: ApiError, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["article", id], ctx.prev);
      onMutateError(err);
    },
    onSuccess: (full) => qc.setQueryData(["article", id], full),
  });

  const commentsMu = useMutation({
    mutationFn: (next: boolean) => setCommentsEnabled(fetcher, id, next),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ["article", id] });
      const prev = qc.getQueryData<ArticleFullDTO>(["article", id]);
      if (prev) {
        qc.setQueryData<ArticleFullDTO>(["article", id], {
          ...prev,
          isCommentsEnabled: next,
        });
      }
      return { prev };
    },
    onError: (err: ApiError, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["article", id], ctx.prev);
      onMutateError(err);
    },
    onSuccess: () => toast.success("Comment policy updated"),
  });

  // Quick-edit state — `draftHtml` is null when not editing, otherwise the
  // in-flight HTML the user is shaping.
  const [draftHtml, setDraftHtml] = useState<string | null>(null);
  const isEditing = draftHtml !== null;

  const saveEditMu = useMutation({
    mutationFn: (html: string) => updateArticle(fetcher, id, { content: html }),
    onSuccess: (full) => {
      qc.setQueryData(["article", id], full);
      toast.success("Saved copy-edit");
      setDraftHtml(null);
    },
    onError: onMutateError,
  });

  const anyMutating =
    claimMu.isPending ||
    approveMu.isPending ||
    publishMu.isPending ||
    scheduleMu.isPending ||
    rejectMu.isPending ||
    saveEditMu.isPending;

  // Dialogs
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  if (articleQuery.isLoading) {
    return (
      <div className="font-hand text-[13px] text-muted">Loading article…</div>
    );
  }

  if (articleQuery.isError || !article) {
    return (
      <div className="border-[1.5px] border-warn rounded-sm bg-warn/10 p-4 font-hand text-[13px]">
        Could not load article: {(articleQuery.error as ApiError)?.message ?? "Not found"}
        <div className="mt-3">
          <Link href="/queue" className="underline text-ink">← Back to queue</Link>
        </div>
      </div>
    );
  }

  const wordCount = article.content
    .replace(/<[^>]*>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 font-hand text-[12px] text-muted">
          <Link href="/queue" className="inline-flex items-center gap-1 hover:text-ink">
            <ArrowLeft size={14} /> Queue
          </Link>
          <ChevronRight size={12} />
          <span className="text-ink">{shortStatus(article.status)}</span>
        </div>
        <div className="flex items-center gap-2">
          {article.status === "under_review" && isSelfReviewer ? (
            <Pill variant="red" dot>claimed by you</Pill>
          ) : article.status === "under_review" ? (
            <Pill variant="warn">claimed by another editor</Pill>
          ) : (
            <Pill variant="ghost">{article.status}</Pill>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        {/* LEFT: content */}
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-serif text-[28px] tracking-[-0.02em] font-extrabold leading-tight">
                {article.headline}
              </h1>
              <p className="font-hand text-[12px] text-muted mt-1">
                {authorName ? `By ${authorName}` : "By —"} ·{" "}
                {wordCount.toLocaleString()} words · updated{" "}
                {formatDate(article.updatedAt, true)}
              </p>
              {article.summary ? (
                <p className="font-serif text-[17px] leading-snug text-ink/80 mt-2 italic">
                  {article.summary}
                </p>
              ) : null}
            </div>
            <div className="shrink-0">
              {isEditing ? (
                <div className="flex gap-1.5">
                  <Btn
                    size="sm"
                    variant="primary"
                    onClick={() => draftHtml && saveEditMu.mutate(draftHtml)}
                    disabled={
                      saveEditMu.isPending || !draftHtml || draftHtml.length < 20
                    }
                  >
                    <Save size={12} /> {saveEditMu.isPending ? "Saving…" : "Save edit"}
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    onClick={() => setDraftHtml(null)}
                    disabled={saveEditMu.isPending}
                  >
                    <X size={12} /> Cancel
                  </Btn>
                </div>
              ) : (
                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraftHtml(article.content)}
                  disabled={anyMutating}
                >
                  <Pencil size={12} /> Quick edit
                </Btn>
              )}
            </div>
          </div>

          <ArticleContent
            value={isEditing ? (draftHtml ?? article.content) : article.content}
            editable={isEditing}
            onChange={(html) => setDraftHtml(html)}
          />

          {article.rejectionReason ? (
            <Card className="border-warn bg-warn/10">
              <p className="font-hand text-[11px] uppercase tracking-[0.08em] text-ink mb-1">
                Last rejection reason
              </p>
              <p className="font-sans text-[13px] text-ink">
                {article.rejectionReason}
              </p>
            </Card>
          ) : null}
        </div>

        {/* RIGHT rail */}
        <aside className="flex flex-col gap-3">
          {/* Author */}
          <Card>
            <div className="flex items-center gap-2.5">
              <Avatar
                name={authorName ?? "—"}
                size="md"
                tone="warm"
              />
              <div className="flex-1 min-w-0">
                <p className="font-serif text-[14px] font-extrabold text-ink truncate">
                  {authorName ?? "Author"}
                </p>
                <p className="font-hand text-[11px] text-muted truncate">
                  {category?.name ?? "—"}
                  {article.tags.length ? ` · ${article.tags.length} tags` : ""}
                </p>
              </div>
            </div>
            {article.tags.length ? (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {article.tags.map((t) => (
                  <Pill key={t} variant="ghost">
                    #{t}
                  </Pill>
                ))}
              </div>
            ) : null}
          </Card>

          {/* Actions */}
          <Card>
            <p className="font-hand text-[11px] uppercase tracking-[0.08em] text-muted mb-2">
              Decision
            </p>
            <ReviewActions
              status={article.status}
              isCurrentUserReviewer={isSelfReviewer}
              isMutating={anyMutating}
              onClaim={() => claimMu.mutate()}
              onApprove={() => setApproveOpen(true)}
              onReject={() => setRejectOpen(true)}
              onPublish={() => publishMu.mutate()}
              onSchedule={() => setScheduleOpen(true)}
            />
          </Card>

          {/* Flags */}
          <Card>
            <p className="font-hand text-[11px] uppercase tracking-[0.08em] text-muted mb-2">
              Flags
            </p>
            <FlagsToggleGroup
              isBreaking={article.isBreaking}
              isFeatured={article.isFeatured}
              isTrending={article.isTrending}
              disabled={flagsMu.isPending}
              onToggle={(patch) => flagsMu.mutate(patch)}
            />
          </Card>

          {/* Comments */}
          <Card>
            <p className="font-hand text-[11px] uppercase tracking-[0.08em] text-muted mb-2">
              Comments
            </p>
            <CommentsToggle
              enabled={article.isCommentsEnabled}
              disabled={commentsMu.isPending}
              onToggle={(next) => commentsMu.mutate(next)}
            />
          </Card>

          {/* Timeline */}
          <Card>
            <p className="font-hand text-[11px] uppercase tracking-[0.08em] text-muted mb-2">
              History
            </p>
            <StatusTimeline history={article.history} />
          </Card>

          {/* Diff */}
          <Card>
            <DiffViewer
              articleId={article.id}
              currentContent={article.content}
              draftContent={isEditing ? (draftHtml ?? article.content) : null}
            />
          </Card>
        </aside>
      </div>

      {/* Dialogs */}
      <RejectionDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        isSubmitting={rejectMu.isPending}
        headline={article.headline}
        onConfirm={async (reason) => {
          await rejectMu.mutateAsync(reason);
          setRejectOpen(false);
          router.push("/queue");
        }}
      />
      <ApproveDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        headline={article.headline}
        isSubmitting={approveMu.isPending || publishMu.isPending}
        onPublishNow={async () => {
          await approveMu.mutateAsync();
          await publishMu.mutateAsync();
          setApproveOpen(false);
          router.push("/queue");
        }}
        onSchedule={async () => {
          await approveMu.mutateAsync();
          setApproveOpen(false);
          setScheduleOpen(true);
        }}
      />
      <ScheduleDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        isSubmitting={scheduleMu.isPending}
        headline={article.headline}
        initial={article.scheduledAt}
        onConfirm={async (iso) => {
          await scheduleMu.mutateAsync(iso);
          setScheduleOpen(false);
          router.push("/queue");
        }}
      />
    </div>
  );
}

function shortStatus(s: string): string {
  return s.replace(/_/g, " ");
}
