"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { listMine } from "@/lib/api/media.api";
import type { MediaDTO, MediaType } from "@/lib/types/media";
import { cn } from "@/lib/utils/cn";
import { CloudinaryUploader } from "./CloudinaryUploader";
import { MediaCard } from "./MediaCard";

interface BaseProps {
  open: boolean;
  onClose: () => void;
  type: MediaType;
  /** Optional articleId attached to newly uploaded items. */
  articleId?: string;
  title?: string;
}

interface SingleProps extends BaseProps {
  mode: "single";
  onSelect: (media: MediaDTO) => void;
}
interface MultiProps extends BaseProps {
  mode: "multi";
  onSelect: (media: MediaDTO[]) => void;
}

type Props = SingleProps | MultiProps;

const PAGE_SIZE = 24;

/**
 * Drawer-style modal for picking media from the editor's library or uploading
 * a new asset. Supports single-pick (featured image) and multi-pick (gallery
 * / video list).
 */
export function MediaPicker(props: Props) {
  const { open, onClose, type, articleId, mode, title } = props;
  const fetcher = useAuthedApi();
  const qc = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ["media", "picker", type],
    queryFn: () => listMine(fetcher, { type, limit: PAGE_SIZE }),
    enabled: open,
    staleTime: 30_000,
  });

  const items = useMemo(() => query.data?.data ?? [], [query.data]);
  const loading = query.isLoading || query.isFetching;

  const handleClose = useCallback(() => {
    setSelected(new Set());
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  if (!open) return null;

  function handleClick(media: MediaDTO) {
    if (mode === "single") {
      props.onSelect(media);
      handleClose();
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(media.id)) next.delete(media.id);
      else next.add(media.id);
      return next;
    });
  }

  function handleConfirmMulti() {
    if (mode !== "multi") return;
    const picked = items.filter((m) => selected.has(m.id));
    props.onSelect(picked);
    handleClose();
  }

  const headerLabel =
    title ?? (mode === "single" ? "Pick an asset" : "Pick assets");

  return (
    <div data-modal-open="true">
      <button
        type="button"
        aria-label="Close media picker"
        onClick={handleClose}
        className="fixed inset-0 bg-ink/40 z-40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-picker-title"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[640px] bg-paper border-l-[1.5px] border-ink flex flex-col"
      >
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b-[1.5px] border-ink">
          <div className="min-w-0">
            <h2
              id="media-picker-title"
              className="font-serif text-[18px] font-extrabold tracking-tight"
            >
              {headerLabel}
            </h2>
            <p className="font-hand text-[11px] text-muted">
              Type: {type} · {items.length} in library
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="inline-flex items-center justify-center w-9 h-9 border-[1.5px] border-ink rounded-sm hover:bg-paper-2"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <div className="px-4 py-3 border-b-[1.5px] border-ink/30 bg-paper-2">
          <CloudinaryUploader
            accept={type === "video" ? "video" : "image"}
            multiple={mode === "multi"}
            articleId={articleId}
            size="compact"
            onUploaded={(media) => {
              qc.invalidateQueries({ queryKey: ["media", "picker", type] });
              if (mode === "single") {
                props.onSelect(media);
                handleClose();
              } else {
                setSelected((prev) => {
                  const next = new Set(prev);
                  next.add(media.id);
                  return next;
                });
              }
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="font-hand text-[12px] text-muted">Loading library…</p>
          ) : items.length === 0 ? (
            <p className="font-hand text-[12px] text-muted">
              No {type === "video" ? "videos" : "images"} yet — upload one above
              to get started.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((m) => (
                <MediaCard
                  key={m.id}
                  media={m}
                  compact
                  selected={selected.has(m.id)}
                  onClick={() => handleClick(m)}
                />
              ))}
            </div>
          )}
        </div>

        {mode === "multi" ? (
          <footer
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-3",
              "border-t-[1.5px] border-ink bg-paper-2",
            )}
          >
            <span className="font-hand text-[12px] text-muted">
              {selected.size} selected
            </span>
            <div className="flex items-center gap-2">
              <Btn
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
              >
                Cancel
              </Btn>
              <Btn
                type="button"
                variant="primary"
                size="sm"
                disabled={selected.size === 0}
                onClick={handleConfirmMulti}
              >
                Add {selected.size > 0 ? `(${selected.size})` : ""}
              </Btn>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
