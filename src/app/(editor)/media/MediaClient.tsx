"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Film, Image as ImageIcon, Save, Trash2, X } from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { useToast } from "@/lib/ui/toast";
import { ApiError } from "@/lib/api/client";
import {
  deleteMedia,
  listMine,
  updateMedia,
  type UpdateMediaBody,
} from "@/lib/api/media.api";
import { CloudinaryUploader } from "@/components/articles/CloudinaryUploader";
import { Btn } from "@/components/primitives/Btn";
import { Input } from "@/components/primitives/Input";
import { Pill } from "@/components/primitives/Pill";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import type { MediaDTO, MediaType } from "@/lib/types/media";

const PAGE_SIZE = 24;

type TypeFilter = "all" | MediaType;

export function MediaClient() {
  const router = useRouter();
  const params = useSearchParams();
  const fetcher = useAuthedApi();
  const toast = useToast();
  const qc = useQueryClient();

  const typeFilter = (params.get("type") as TypeFilter | null) ?? "all";
  const unattached = params.get("unattached") === "true";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);

  const setParam = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === "" || v === "all") sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      router.replace(qs ? `/media?${qs}` : "/media");
    },
    [params, router],
  );

  const query = useQuery({
    queryKey: ["media", "mine", typeFilter, unattached, page],
    queryFn: async () => {
      const r = await listMine(fetcher, {
        type: typeFilter === "all" ? undefined : typeFilter,
        unattached: unattached ? true : undefined,
        page,
        limit: PAGE_SIZE,
      });
      return { items: r.data, total: r.meta?.total ?? r.data.length };
    },
    staleTime: 30_000,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const total = query.data?.total ?? 0;
  const hasMore = items.length === PAGE_SIZE || page * PAGE_SIZE < total;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftAlt, setDraftAlt] = useState("");
  const [draftCaption, setDraftCaption] = useState("");

  const editingItem = items.find((m) => m.id === editingId) ?? null;

  function openEditor(m: MediaDTO) {
    setEditingId(m.id);
    setDraftAlt(m.alt ?? "");
    setDraftCaption(m.caption ?? "");
  }

  const updateMu = useMutation({
    mutationFn: (vars: { id: string; body: UpdateMediaBody }) =>
      updateMedia(fetcher, vars.id, vars.body),
    onSuccess: () => {
      toast.success("Saved.");
      qc.invalidateQueries({ queryKey: ["media", "mine"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Save failed."),
  });

  const deleteMu = useMutation({
    mutationFn: (id: string) => deleteMedia(fetcher, id),
    onSuccess: () => {
      toast.success("Deleted.");
      qc.invalidateQueries({ queryKey: ["media", "mine"] });
      setEditingId(null);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Delete failed."),
  });

  function handleSave() {
    if (!editingItem) return;
    updateMu.mutate({
      id: editingItem.id,
      body: { alt: draftAlt.trim(), caption: draftCaption.trim() },
    });
  }

  function handleDelete(m: MediaDTO) {
    if (
      !window.confirm(
        `Delete "${m.alt || m.publicId}" from your library? It will be removed from any article that uses it.`,
      )
    )
      return;
    deleteMu.mutate(m.id);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-[28px] tracking-[-0.02em] font-extrabold leading-tight">
            <span className="uline">Media library</span>
          </h1>
          <p className="font-hand text-[13px] text-muted mt-1">
            {query.isLoading
              ? "Loading…"
              : `${items.length} on page ${page} · ${total} total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill variant="ghost">Your uploads · Cloudinary-backed</Pill>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        <Chip
          label="All"
          active={typeFilter === "all"}
          onClick={() => setParam({ type: null, page: null })}
        />
        <Chip
          label="Images"
          active={typeFilter === "image"}
          onClick={() => setParam({ type: "image", page: null })}
        />
        <Chip
          label="Videos"
          active={typeFilter === "video"}
          onClick={() => setParam({ type: "video", page: null })}
        />
        <Chip
          label={unattached ? "Unattached only ✓" : "Unattached only"}
          active={unattached}
          onClick={() =>
            setParam({ unattached: unattached ? null : "true", page: null })
          }
        />
      </div>

      {/* Uploader */}
      <CloudinaryUploader
        accept={typeFilter === "video" ? "video" : "image"}
        multiple
        onUploaded={() => qc.invalidateQueries({ queryKey: ["media", "mine"] })}
      />

      {/* Grid + inline editor */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
        <div>
          {query.isError ? (
            <div className="border-[1.5px] border-warn rounded-sm bg-warn/10 p-4 font-hand text-[13px]">
              Could not load your library.
            </div>
          ) : items.length === 0 && !query.isLoading ? (
            <div className="border-[1.5px] border-dashed border-ink/30 rounded-sm bg-paper-2 p-8 text-center">
              <p className="font-serif text-[18px] font-extrabold">Empty</p>
              <p className="font-hand text-[12px] text-muted mt-1">
                Upload an asset above — it&apos;ll appear here.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map((m) => (
                <li key={m.id}>
                  <LibraryCard
                    media={m}
                    selected={editingId === m.id}
                    onClick={() => openEditor(m)}
                    onDelete={() => handleDelete(m)}
                  />
                </li>
              ))}
            </ul>
          )}

          {items.length > 0 || page > 1 ? (
            <div className="flex items-center justify-between gap-2 pt-3">
              <span className="font-hand text-[12px] text-muted">
                Page {page} · {PAGE_SIZE} per page
              </span>
              <div className="flex items-center gap-2">
                <Btn
                  size="sm"
                  variant="ghost"
                  disabled={page <= 1}
                  onClick={() => setParam({ page: String(page - 1) })}
                >
                  Prev
                </Btn>
                <Btn
                  size="sm"
                  variant="ghost"
                  disabled={!hasMore}
                  onClick={() => setParam({ page: String(page + 1) })}
                >
                  Next
                </Btn>
              </div>
            </div>
          ) : null}
        </div>

        {/* Inline editor panel */}
        <aside className="border-[1.5px] border-ink rounded-sm bg-paper p-4 lg:sticky lg:top-4">
          {editingItem ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-serif text-[15px] font-extrabold tracking-[-0.01em]">
                  Edit asset
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  aria-label="Close editor"
                  className="border-[1.5px] border-ink rounded-sm w-7 h-7 flex items-center justify-center hover:bg-paper-2"
                >
                  <X size={13} />
                </button>
              </div>

              {editingItem.type === "video" ? (
                <video
                  src={editingItem.url}
                  controls
                  className="w-full aspect-video bg-ink rounded-sm border-[1.5px] border-ink/15"
                />
              ) : (
                <div className="relative w-full aspect-[4/3] rounded-sm border-[1.5px] border-ink/15 overflow-hidden bg-paper-2">
                  <Image
                    src={editingItem.url}
                    alt={editingItem.alt ?? ""}
                    fill
                    sizes="360px"
                    className="object-cover"
                  />
                </div>
              )}

              <label className="block">
                <span className="font-sans text-[12px] font-semibold text-ink">
                  Alt text
                </span>
                <Input
                  type="text"
                  value={draftAlt}
                  maxLength={500}
                  onChange={(e) => setDraftAlt(e.target.value)}
                  placeholder="Describe the image for screen readers."
                />
              </label>

              <label className="block">
                <span className="font-sans text-[12px] font-semibold text-ink">
                  Caption
                </span>
                <textarea
                  value={draftCaption}
                  maxLength={500}
                  rows={3}
                  onChange={(e) => setDraftCaption(e.target.value)}
                  placeholder="Optional caption shown next to the asset."
                  className="mt-1 w-full border-[1.5px] border-ink rounded-sm bg-paper px-3 py-2 font-sans text-[13px] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y"
                />
              </label>

              <dl className="grid grid-cols-2 gap-2 text-[12px]">
                <Meta label="Type" value={editingItem.type} />
                <Meta
                  label="Dimensions"
                  value={
                    editingItem.width && editingItem.height
                      ? `${editingItem.width}×${editingItem.height}`
                      : "—"
                  }
                />
                <Meta
                  label="Format"
                  value={editingItem.format ?? "—"}
                />
                <Meta
                  label="Size"
                  value={
                    editingItem.bytes != null
                      ? `${(editingItem.bytes / 1024).toFixed(1)} KB`
                      : "—"
                  }
                />
                <Meta
                  label="Uploaded"
                  value={formatDate(editingItem.createdAt, true)}
                />
                <Meta
                  label="Attached"
                  value={editingItem.articleId ? "yes" : "no"}
                />
              </dl>

              <div className="flex items-center justify-between gap-2">
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(editingItem)}
                  disabled={deleteMu.isPending}
                  title="Delete asset"
                >
                  <Trash2 size={12} /> Delete
                </Btn>
                <Btn
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={updateMu.isPending}
                >
                  <Save size={12} /> {updateMu.isPending ? "Saving…" : "Save"}
                </Btn>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="font-serif text-[15px] font-extrabold">
                Pick an asset
              </p>
              <p className="font-hand text-[12px] text-muted mt-1">
                Click any tile on the left to edit its alt text + caption, or
                delete it from your library.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-[1.5px] rounded-[4px] px-2.5 py-1 font-hand text-[12px] transition-[background,color,border] duration-[120ms]",
        active
          ? "border-ink bg-ink text-paper"
          : "border-ink/30 bg-paper text-ink hover:border-ink hover:bg-paper-2",
      )}
    >
      {label}
    </button>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="font-hand text-[10px] uppercase tracking-[0.08em] text-muted">
        {label}
      </dt>
      <dd className="font-sans text-[12px] text-ink truncate" title={value}>
        {value}
      </dd>
    </div>
  );
}

function LibraryCard({
  media,
  selected,
  onClick,
  onDelete,
}: {
  media: MediaDTO;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const isVideo = media.type === "video";
  return (
    <div
      className={cn(
        "border-[1.5px] rounded-sm overflow-hidden bg-paper-2 group cursor-pointer",
        selected
          ? "border-accent ring-2 ring-accent/30"
          : "border-ink hover:border-ink",
      )}
      onClick={onClick}
    >
      <div className="relative w-full aspect-square bg-ink/90">
        {isVideo ? (
          <>
            <video
              src={media.url}
              preload="metadata"
              muted
              className="w-full h-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center text-paper">
              <Film size={28} aria-hidden />
            </span>
          </>
        ) : (
          <Image
            src={media.url}
            alt={media.alt ?? ""}
            fill
            sizes="(max-width: 768px) 50vw, 240px"
            className="object-cover"
          />
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete asset"
          className={cn(
            "absolute top-1.5 right-1.5 inline-flex items-center justify-center w-7 h-7 bg-paper border-[1.5px] border-ink rounded-sm",
            "opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-paper transition-opacity",
          )}
        >
          <Trash2 size={11} aria-hidden />
        </button>
      </div>
      <div className="px-2 py-1.5 border-t-[1.5px] border-ink/40 bg-paper">
        <div className="flex items-center gap-1.5 font-hand text-[11px] truncate">
          {isVideo ? (
            <Film size={11} aria-hidden className="text-muted" />
          ) : (
            <ImageIcon size={11} aria-hidden className="text-muted" />
          )}
          <span className="truncate text-ink">
            {media.alt || media.publicId}
          </span>
        </div>
        <div className="flex items-center justify-between font-hand text-[10px] text-muted">
          <span>
            {media.width && media.height
              ? `${media.width}×${media.height}`
              : (media.format ?? media.type)}
          </span>
          {media.articleId ? <span title="Attached">●</span> : null}
        </div>
      </div>
    </div>
  );
}
