import type { ApiFetchOptions } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type { CommentStatus, ModerationCommentDTO } from "@/lib/types/comment";

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
