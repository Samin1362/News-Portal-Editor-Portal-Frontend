"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Copy, ExternalLink, Sparkles } from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { useToast } from "@/lib/ui/toast";
import { ApiError } from "@/lib/api/client";
import { createArticle } from "@/lib/api/articles.api";
import { createCommentOnArticle } from "@/lib/api/comments.api";
import { listCategories } from "@/lib/api/categories.api";
import { listUsers } from "@/lib/api/users.api";
import { Dialog } from "@/components/primitives/Dialog";
import { Btn } from "@/components/primitives/Btn";
import { Input } from "@/components/primitives/Input";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-select a reporter (used when launched from /reporters/[id]). */
  reporterId?: string;
}

/**
 * Commission-a-story modal. Backend has no `/commissions` endpoint, so the
 * flow is:
 *   1. Editor fills out reporter / category / title / deadline / brief.
 *   2. Frontend creates a draft via `POST /articles` (authored by the editor).
 *   3. Frontend posts a comment on the draft tagging the reporter so they get
 *      a notification when they next open the queue.
 *   4. Frontend copies the queue deeplink to the editor's clipboard so they
 *      can paste it into chat / email.
 *
 * The deadline is stored inside the brief because draft articles can't carry
 * `scheduledAt` (only approved articles can). This is honest about the gap.
 */
export function CommissionStoryDialog({ open, onClose, reporterId }: Props) {
  const fetcher = useAuthedApi();
  const router = useRouter();
  const toast = useToast();

  // The Dialog primitive unmounts the panel when `open=false`, so these
  // initial values are re-evaluated each time the modal opens — no syncing
  // effect needed for the `reporterId` prop.
  const [title, setTitle] = useState("");
  const [chosenCategoryId, setChosenCategoryId] = useState<string>("");
  const [selectedReporterId, setSelectedReporterId] = useState<string>(
    reporterId ?? "",
  );
  const [deadline, setDeadline] = useState<string>("");
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(fetcher),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const reportersQuery = useQuery({
    queryKey: ["users", "journalist-list-commission"],
    queryFn: async () => {
      const result = await listUsers(fetcher, {
        role: "journalist",
        limit: 100,
      });
      return result?.data ?? null;
    },
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  );
  const reporters = useMemo(
    () => reportersQuery.data ?? [],
    [reportersQuery.data],
  );

  // Derived default — first active category. The user's explicit choice
  // (`chosenCategoryId`) wins. Avoids a setState-in-effect to seed state.
  const defaultCategoryId = useMemo(
    () =>
      categories.find((c) => c.isActive)?.id ?? categories[0]?.id ?? "",
    [categories],
  );
  const categoryId = chosenCategoryId || defaultCategoryId;

  function reset() {
    setTitle("");
    setBrief("");
    setDeadline("");
    setChosenCategoryId("");
    setSelectedReporterId(reporterId ?? "");
  }

  function handleClose() {
    if (submitting) return;
    onClose();
    // Reset on next tick so the close animation doesn't show empty fields.
    setTimeout(reset, 50);
  }

  const titleErr =
    title.trim().length > 0 && title.trim().length < 5
      ? "At least 5 characters."
      : null;
  const briefErr =
    brief.trim().length > 0 && brief.trim().length < 20
      ? "Brief must be at least 20 characters (content body requirement)."
      : null;
  const canSubmit =
    !submitting &&
    title.trim().length >= 5 &&
    brief.trim().length >= 20 &&
    categoryId.length > 0 &&
    selectedReporterId.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const reporter = reporters.find((r) => r.id === selectedReporterId);
    if (!reporter) {
      toast.error("Pick a reporter.");
      return;
    }
    setSubmitting(true);
    try {
      const deadlineLine = deadline
        ? `\n\nDeadline: ${new Date(deadline).toLocaleString()}`
        : "";
      const summary = brief.trim().slice(0, 480);
      const content =
        `# Commission brief\n\n` +
        `Commissioned to: ${reporter.displayName} (${reporter.email})${deadlineLine}\n\n` +
        `${brief.trim()}`;

      const created = await createArticle(fetcher, {
        headline: title.trim(),
        summary,
        content,
        categoryId,
        tags: ["commission"],
      });

      // Best-effort: drop a comment so the reporter sees a note next time
      // they open the article. If commenting fails (rate-limited, comments
      // disabled), we still surface the created draft.
      try {
        const commentLines = [
          `Commissioned to @${reporter.displayName}.`,
          deadline
            ? `Deadline: ${new Date(deadline).toLocaleString()}.`
            : null,
          `Brief: ${brief.trim().slice(0, 600)}${brief.trim().length > 600 ? "…" : ""}`,
        ].filter(Boolean) as string[];
        await createCommentOnArticle(
          fetcher,
          created.id,
          commentLines.join("\n\n"),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "comment failed";
        toast.info(`Draft created, but note couldn't be posted: ${msg}`);
      }

      // Copy the deeplink so the editor can paste it into chat / email.
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const deeplink = `${origin}/queue/${created.id}`;
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        try {
          await navigator.clipboard.writeText(deeplink);
          toast.success("Commission created — deeplink copied to clipboard.");
        } catch {
          toast.success("Commission created.");
        }
      } else {
        toast.success("Commission created.");
      }

      handleClose();
      router.push(`/queue/${created.id}`);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not create commission.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLastDeeplink() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/queue/`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      toast.info("Queue base URL copied.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Commission a story"
      description="Creates a draft (authored by you) and notifies the reporter via comment + deeplink."
      size="lg"
      footer={
        <>
          <Btn
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Btn>
          <Btn
            type="submit"
            form="commission-form"
            variant="primary"
            size="sm"
            disabled={!canSubmit}
          >
            <Sparkles size={12} /> {submitting ? "Creating…" : "Commission"}
          </Btn>
        </>
      }
    >
      <form
        id="commission-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
      >
        <label className="block">
          <span className="font-sans text-[12px] font-semibold text-ink">
            Reporter
          </span>
          <select
            value={selectedReporterId}
            onChange={(e) => setSelectedReporterId(e.target.value)}
            disabled={reportersQuery.isLoading || submitting}
            className="mt-1 w-full border-[1.5px] border-ink rounded-sm bg-paper px-3 py-2 font-sans text-[14px]"
            required
          >
            <option value="">
              {reportersQuery.isLoading ? "Loading…" : "Pick a reporter"}
            </option>
            {reporters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.displayName} ({r.email})
              </option>
            ))}
          </select>
          {!reportersQuery.isLoading && reporters.length === 0 ? (
            <p className="mt-1 font-hand text-[11px] text-warn">
              No journalists visible. Ask an admin to invite a reporter first.
            </p>
          ) : null}
        </label>

        <label className="block">
          <span className="font-sans text-[12px] font-semibold text-ink">
            Category
          </span>
          <select
            value={categoryId}
            onChange={(e) => setChosenCategoryId(e.target.value)}
            disabled={categoriesQuery.isLoading || submitting}
            className="mt-1 w-full border-[1.5px] border-ink rounded-sm bg-paper px-3 py-2 font-sans text-[14px]"
            required
          >
            <option value="">
              {categoriesQuery.isLoading ? "Loading…" : "Pick a category"}
            </option>
            {categories
              .filter((c) => c.isActive)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>

        <label className="block">
          <span className="font-sans text-[12px] font-semibold text-ink">
            Working title
          </span>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. City Hall budget — week 3 follow-up"
            disabled={submitting}
            maxLength={300}
            errorText={titleErr ?? undefined}
          />
        </label>

        <label className="block">
          <span className="font-sans text-[12px] font-semibold text-ink">
            Deadline{" "}
            <span className="font-hand text-[11px] text-muted">
              (optional — stored in the brief; can&apos;t be enforced on
              drafts)
            </span>
          </span>
          <Input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={submitting}
          />
        </label>

        <label className="block">
          <span className="font-sans text-[12px] font-semibold text-ink">
            Brief
          </span>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={5}
            maxLength={2000}
            disabled={submitting}
            placeholder="Angle, must-have sources, length, links, anything else the reporter needs."
            className="mt-1 w-full border-[1.5px] border-ink rounded-sm bg-paper px-3 py-2 font-sans text-[13.5px] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y"
          />
          {briefErr ? (
            <p className="mt-1 font-hand text-[11px] text-accent">
              {briefErr}
            </p>
          ) : (
            <p className="mt-1 font-hand text-[11px] text-muted">
              {brief.trim().length} / 2000 chars. Saved as the draft summary +
              body.
            </p>
          )}
        </label>

        <details className="mt-1 font-hand text-[11px] text-muted">
          <summary className="cursor-pointer hover:text-ink">
            What happens when I click Commission?
          </summary>
          <ol className="list-decimal pl-5 mt-1 space-y-0.5">
            <li>
              A draft is created authored by you (backend has no
              create-on-behalf endpoint).
            </li>
            <li>
              A comment is posted on the draft tagging the reporter so they
              see it on next visit.
            </li>
            <li>
              The queue deeplink is copied to your clipboard for chat / email.
            </li>
            <li>
              You land on the new article&apos;s queue page to add any
              attachments.
            </li>
          </ol>
          <button
            type="button"
            onClick={copyLastDeeplink}
            className="mt-2 inline-flex items-center gap-1 hover:text-ink"
          >
            <Copy size={11} aria-hidden /> Copy queue base URL
          </button>
          <a
            href="/queue"
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 hover:text-ink"
          >
            <ExternalLink size={11} aria-hidden /> Open queue in new tab
          </a>
        </details>
      </form>
    </Dialog>
  );
}
