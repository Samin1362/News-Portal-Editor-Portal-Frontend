import type { ApiFetchOptions } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type {
  ArticleCardDTO,
  ArticleFullDTO,
  ArticleMediaItem,
  ArticleSeo,
  ArticleStatus,
  ArticleVideoItem,
  QueueStatus,
} from "@/lib/types/article";

type AuthedFetch = <T>(
  path: string,
  options?: Omit<ApiFetchOptions, "token">,
) => Promise<ApiResult<T>>;

export interface QueueQuery {
  status?: QueueStatus;
  page?: number;
  limit?: number;
}

function qs(q: QueueQuery): string {
  const parts: string[] = [];
  if (q.status) parts.push(`status=${q.status}`);
  if (q.page) parts.push(`page=${q.page}`);
  if (q.limit) parts.push(`limit=${q.limit}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export async function listQueue(
  fetcher: AuthedFetch,
  query: QueueQuery,
): Promise<ApiResult<ArticleCardDTO[]>> {
  return fetcher<ArticleCardDTO[]>(`/api/v1/articles/queue${qs(query)}`, {
    cache: "no-store",
  });
}

/**
 * Approved articles (have `scheduledAt`, not yet published). Backend sorts by
 * `updatedAt: -1`; callers re-sort by `scheduledAt` for timeline use.
 */
export async function listScheduled(
  fetcher: AuthedFetch,
  query: Omit<QueueQuery, "status"> = {},
): Promise<ApiResult<ArticleCardDTO[]>> {
  return listQueue(fetcher, { ...query, status: "approved" });
}

/**
 * Published articles in reverse-chrono order (per `updatedAt`). Use this for
 * filling the calendar/schedule with already-out items. Caller filters by date
 * window client-side.
 */
export async function listPublished(
  fetcher: AuthedFetch,
  query: Omit<QueueQuery, "status"> = {},
): Promise<ApiResult<ArticleCardDTO[]>> {
  return listQueue(fetcher, { ...query, status: "published" });
}

export async function getArticle(
  fetcher: AuthedFetch,
  id: string,
): Promise<ArticleFullDTO> {
  const { data } = await fetcher<ArticleFullDTO>(
    `/api/v1/articles/${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );
  return data;
}

export async function startReview(
  fetcher: AuthedFetch,
  id: string,
): Promise<ArticleFullDTO> {
  const { data } = await fetcher<ArticleFullDTO>(
    `/api/v1/articles/${encodeURIComponent(id)}/start-review`,
    { method: "POST", cache: "no-store" },
  );
  return data;
}

export async function approveArticle(
  fetcher: AuthedFetch,
  id: string,
): Promise<ArticleFullDTO> {
  const { data } = await fetcher<ArticleFullDTO>(
    `/api/v1/articles/${encodeURIComponent(id)}/approve`,
    { method: "POST", cache: "no-store" },
  );
  return data;
}

export async function rejectArticle(
  fetcher: AuthedFetch,
  id: string,
  reason: string,
): Promise<ArticleFullDTO> {
  const { data } = await fetcher<ArticleFullDTO>(
    `/api/v1/articles/${encodeURIComponent(id)}/reject`,
    { method: "POST", body: { reason }, cache: "no-store" },
  );
  return data;
}

export async function publishArticle(
  fetcher: AuthedFetch,
  id: string,
): Promise<ArticleFullDTO> {
  const { data } = await fetcher<ArticleFullDTO>(
    `/api/v1/articles/${encodeURIComponent(id)}/publish`,
    { method: "POST", cache: "no-store" },
  );
  return data;
}

export async function scheduleArticle(
  fetcher: AuthedFetch,
  id: string,
  scheduledAt: string,
): Promise<ArticleFullDTO> {
  const { data } = await fetcher<ArticleFullDTO>(
    `/api/v1/articles/${encodeURIComponent(id)}/schedule`,
    { method: "POST", body: { scheduledAt }, cache: "no-store" },
  );
  return data;
}

export interface FlagsPatch {
  isBreaking?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
}

export async function setFlags(
  fetcher: AuthedFetch,
  id: string,
  patch: FlagsPatch,
): Promise<ArticleFullDTO> {
  const { data } = await fetcher<ArticleFullDTO>(
    `/api/v1/articles/${encodeURIComponent(id)}/flags`,
    { method: "PATCH", body: patch, cache: "no-store" },
  );
  return data;
}

export interface UpdateArticleBody {
  headline?: string;
  summary?: string;
  content?: string;
  categoryId?: string;
  tags?: string[];
  featuredImage?: ArticleMediaItem | null;
  gallery?: ArticleMediaItem[];
  videos?: ArticleVideoItem[];
  seo?: Partial<ArticleSeo>;
  isCommentsEnabled?: boolean;
}

export async function updateArticle(
  fetcher: AuthedFetch,
  id: string,
  body: UpdateArticleBody,
): Promise<ArticleFullDTO> {
  const { data } = await fetcher<ArticleFullDTO>(
    `/api/v1/articles/${encodeURIComponent(id)}`,
    { method: "PATCH", body, cache: "no-store" },
  );
  return data;
}

export async function setCommentsEnabled(
  fetcher: AuthedFetch,
  id: string,
  isCommentsEnabled: boolean,
): Promise<{ id: string; isCommentsEnabled: boolean }> {
  const { data } = await fetcher<{ id: string; isCommentsEnabled: boolean }>(
    `/api/v1/articles/${encodeURIComponent(id)}/comments-enabled`,
    { method: "PATCH", body: { isCommentsEnabled }, cache: "no-store" },
  );
  return data;
}

// ----- Editor-as-author surfaces (Phase 7: /drafts, /drafts/new, etc.) -----

export interface CreateArticleBody {
  headline: string;
  summary: string;
  content: string;
  categoryId: string;
  tags?: string[];
  featuredImage?: ArticleMediaItem | null;
  gallery?: ArticleMediaItem[];
  videos?: ArticleVideoItem[];
  seo?: Partial<ArticleSeo>;
  isCommentsEnabled?: boolean;
}

export interface ListMineQuery {
  status?: ArticleStatus;
  page?: number;
  limit?: number;
}

function mineQs(q: ListMineQuery): string {
  const parts: string[] = [];
  if (q.status) parts.push(`status=${encodeURIComponent(q.status)}`);
  if (q.page) parts.push(`page=${q.page}`);
  if (q.limit) parts.push(`limit=${q.limit}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/** GET /articles/me — the editor's own authored articles (draft, etc.). */
export async function listMineArticles(
  fetcher: AuthedFetch,
  query: ListMineQuery = {},
): Promise<ApiResult<ArticleCardDTO[]>> {
  return fetcher<ArticleCardDTO[]>(`/api/v1/articles/me${mineQs(query)}`, {
    cache: "no-store",
  });
}

/** POST /articles — create a draft authored by the current user. */
export async function createArticle(
  fetcher: AuthedFetch,
  body: CreateArticleBody,
): Promise<ArticleFullDTO> {
  const { data } = await fetcher<ArticleFullDTO>("/api/v1/articles", {
    method: "POST",
    body,
    cache: "no-store",
  });
  return data;
}

/** POST /articles/:id/submit — moves draft → submitted. */
export async function submitArticle(
  fetcher: AuthedFetch,
  id: string,
  note?: string,
): Promise<ArticleFullDTO> {
  const { data } = await fetcher<ArticleFullDTO>(
    `/api/v1/articles/${encodeURIComponent(id)}/submit`,
    {
      method: "POST",
      body: note ? { note } : undefined,
      cache: "no-store",
    },
  );
  return data;
}

/** DELETE /articles/:id — only owner (journalist|editor) + admin can delete. */
export async function deleteArticle(
  fetcher: AuthedFetch,
  id: string,
): Promise<void> {
  await fetcher<unknown>(`/api/v1/articles/${encodeURIComponent(id)}`, {
    method: "DELETE",
    cache: "no-store",
  });
}
