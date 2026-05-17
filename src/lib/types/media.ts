/** Mirrors backend media DTOs — see backend/src/views/media.view.ts. */

export type MediaType = "image" | "video" | "audio";

export interface MediaDTO {
  id: string;
  type: MediaType;
  url: string;
  publicId: string;
  format: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  uploadedBy: string;
  articleId: string | null;
  alt: string | null;
  caption: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Browser → POST /api/v1/media payload after a successful Cloudinary upload.
 * Mirrors backend's `mediaMetadataSchema`.
 */
export interface RegisterMediaBody {
  type: MediaType;
  url: string;
  publicId: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
  alt?: string;
  caption?: string;
  articleId?: string;
}
