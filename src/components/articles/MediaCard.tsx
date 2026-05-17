"use client";

import Image from "next/image";
import { Film, Image as ImageIcon } from "lucide-react";
import type { MediaDTO } from "@/lib/types/media";
import { cn } from "@/lib/utils/cn";

interface Props {
  media: MediaDTO;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

function formatBytes(bytes: number | null): string | null {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Visual card for a single media asset. Pure presentation. */
export function MediaCard({ media, selected, onClick, compact }: Props) {
  const isVideo = media.type === "video";
  const tile = (
    <div
      className={cn(
        "border-[1.5px] border-ink rounded-sm overflow-hidden bg-paper-2 group",
        selected && "ring-2 ring-accent ring-offset-1 ring-offset-paper",
      )}
    >
      <div
        className={cn(
          "relative w-full bg-ink/90",
          compact ? "aspect-square" : "aspect-[4/3]",
        )}
      >
        {isVideo ? (
          <>
            {media.url ? (
              <video
                src={media.url}
                preload="metadata"
                muted
                className="w-full h-full object-cover"
              />
            ) : null}
            <span className="absolute inset-0 flex items-center justify-center text-paper">
              <Film size={28} aria-hidden />
            </span>
          </>
        ) : (
          <Image
            src={media.url}
            alt={media.alt ?? ""}
            fill
            sizes={compact ? "(max-width: 768px) 33vw, 160px" : "320px"}
            className="object-cover"
          />
        )}
      </div>
      <div className="px-2 py-1.5 border-t-[1.5px] border-ink/40 bg-paper">
        <div className="flex items-center gap-1.5 font-hand text-[11px] text-muted truncate">
          {isVideo ? (
            <Film size={11} aria-hidden />
          ) : (
            <ImageIcon size={11} aria-hidden />
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
          <span>{formatBytes(media.bytes)}</span>
        </div>
      </div>
    </div>
  );

  if (!onClick) return tile;
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-accent/40 rounded-sm"
      aria-pressed={selected}
    >
      {tile}
    </button>
  );
}
