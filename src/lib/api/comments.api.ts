import type { ApiFetchOptions } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type {
  CommentDTO,
  CommentStatus,
  ModerationCommentDTO,
} from "@/lib/types/comment";

type AuthedFetch = <T>(
  path: string,
  options?: Omit<ApiFetchOptions, "token">,
) => Promise<ApiResult<T>>;

export interface AdminCommentsQuery {
  status?: CommentStatus;
  reported?: boolean;
  page?: number;
  limit?: number;
}

function qs(q: AdminCommentsQuery): string {
  const parts: string[] = [];
  if (q.status) parts.push(`status=${q.status}`);
  if (q.reported !== undefined) parts.push(`reported=${q.reported ? "true" : "false"}`);
  if (q.page) parts.push(`page=${q.page}`);
  if (q.limit) parts.push(`limit=${q.limit}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export async function listAdminComments(
  fetcher: AuthedFetch,
  query: AdminCommentsQuery,
): Promise<ApiResult<ModerationCommentDTO[]>> {
  return fetcher<ModerationCommentDTO[]>(`/api/v1/admin/comments${qs(query)}`, {
    cache: "no-store",
  });
}

/** Editor/admin: pending → approved. Returns the updated single comment DTO. */
export async function approveComment(
  fetcher: AuthedFetch,
  id: string,
): Promise<CommentDTO> {
  const { data } = await fetcher<CommentDTO>(
    `/api/v1/comments/${encodeURIComponent(id)}/approve`,
    { method: "PATCH", cache: "no-store" },
  );
  return data;
}

/** Editor/admin: pending → rejected. Soft-rejects only — admins delete. */
export async function rejectComment(
  fetcher: AuthedFetch,
  id: string,
): Promise<CommentDTO> {
  const { data } = await fetcher<CommentDTO>(
    `/api/v1/comments/${encodeURIComponent(id)}/reject`,
    { method: "PATCH", cache: "no-store" },
  );
  return data;
}

/**
 * POST /articles/:id/comments — used by the commission flow so the editor
 * can drop a "@reporter please pick this up" note on a freshly-created draft.
 * Body matches the backend `createCommentBodySchema` (content 1–2000 chars).
 */
export async function createCommentOnArticle(
  fetcher: AuthedFetch,
  articleId: string,
  content: string,
): Promise<CommentDTO> {
  const { data } = await fetcher<CommentDTO>(
    `/api/v1/articles/${encodeURIComponent(articleId)}/comments`,
    { method: "POST", body: { content }, cache: "no-store" },
  );
  return data;
}
