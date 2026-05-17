"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { UploadCloud, X } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { useToast } from "@/lib/ui/toast";
import { registerMedia } from "@/lib/api/media.api";
import {
  CloudinaryUploadError,
  uploadToCloudinary,
} from "@/lib/cloudinary/upload";
import type { MediaDTO, MediaType } from "@/lib/types/media";
import { cn } from "@/lib/utils/cn";

interface Props {
  /** Restrict accepted MIME types. Backend type is derived from the file. */
  accept?: "image" | "video" | "any";
  /** Multi-file mode (gallery upload). */
  multiple?: boolean;
  /** Optional articleId to attach the media row to on registration. */
  articleId?: string;
  /** Fired once per successful upload + registration. */
  onUploaded: (media: MediaDTO) => void;
  /** Compact variant used inside picker drawers. */
  size?: "default" | "compact";
}

interface Item {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "registering" | "done" | "error";
  message?: string;
}

const ACCEPT_MAP: Record<NonNullable<Props["accept"]>, string> = {
  image: "image/*",
  video: "video/*",
  any: "image/*,video/*",
};

let nextId = 0;

/** Unsigned-upload + register-with-backend flow with per-file progress + retry. */
export function CloudinaryUploader({
  accept = "image",
  multiple = false,
  articleId,
  onUploaded,
  size = "default",
}: Props) {
  const fetcher = useAuthedApi();
  const toast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const updateItem = useCallback(
    (id: string, patch: Partial<Item>) => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
      );
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const processItem = useCallback(
    async (item: Item) => {
      updateItem(item.id, { status: "uploading", progress: 0 });
      try {
        const asset = await uploadToCloudinary(item.file, {
          onProgress: (f) => updateItem(item.id, { progress: f }),
        });
        updateItem(item.id, { status: "registering", progress: 1 });
        const inferredType: MediaType = asset.type;
        const media = await registerMedia(fetcher, {
          ...asset,
          type: inferredType,
          articleId,
        });
        updateItem(item.id, { status: "done" });
        onUploaded(media);
        setTimeout(() => removeItem(item.id), 1200);
      } catch (err) {
        const message =
          err instanceof CloudinaryUploadError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Upload failed.";
        updateItem(item.id, { status: "error", message });
        toast.error(message);
      }
    },
    [articleId, fetcher, onUploaded, removeItem, toast, updateItem],
  );

  const enqueue = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      const newItems: Item[] = arr.map((file) => ({
        id: String(++nextId),
        file,
        progress: 0,
        status: "queued",
      }));
      setItems((prev) => [...prev, ...newItems]);
      for (const item of newItems) void processItem(item);
    },
    [processItem],
  );

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) enqueue(e.target.files);
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files) enqueue(e.dataTransfer.files);
  }

  function retry(item: Item) {
    updateItem(item.id, { status: "queued", message: undefined, progress: 0 });
    void processItem(item);
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={`uploader-${size}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5",
          "border-[1.5px] border-dashed border-ink rounded-sm bg-paper-2 cursor-pointer",
          "transition-colors hover:bg-paper",
          dragOver && "bg-paper border-accent",
          size === "compact" ? "py-3 px-3" : "py-6 px-4",
        )}
      >
        <UploadCloud size={size === "compact" ? 16 : 20} aria-hidden />
        <span className="font-sans text-[13px] text-ink">
          Drop{" "}
          {accept === "video"
            ? "videos"
            : accept === "any"
              ? "files"
              : "images"}{" "}
          here, or <span className="text-accent underline">browse</span>
        </span>
        <span className="font-hand text-[10px] text-muted">
          Uploaded to Cloudinary, registered in your library.
        </span>
        <input
          id={`uploader-${size}`}
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={ACCEPT_MAP[accept]}
          multiple={multiple}
          onChange={onPick}
        />
      </label>

      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-[1.5px] border-ink rounded-sm bg-paper px-2.5 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="font-sans text-[12px] text-ink truncate flex-1">
                  {item.file.name}
                </span>
                <span className="font-hand text-[10px] text-muted shrink-0">
                  {Math.round(item.progress * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove from queue"
                  className="text-muted hover:text-accent"
                >
                  <X size={12} aria-hidden />
                </button>
              </div>
              <div className="mt-1 h-1 bg-paper-2 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-[width] duration-200",
                    item.status === "error" ? "bg-accent" : "bg-accent-2",
                  )}
                  style={{ width: `${Math.round(item.progress * 100)}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-hand text-[10px] text-muted">
                  {item.status === "uploading" && "Uploading…"}
                  {item.status === "registering" && "Saving to library…"}
                  {item.status === "done" && "Done"}
                  {item.status === "error" && (item.message ?? "Failed")}
                  {item.status === "queued" && "Queued"}
                </span>
                {item.status === "error" ? (
                  <Btn
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => retry(item)}
                  >
                    Retry
                  </Btn>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
