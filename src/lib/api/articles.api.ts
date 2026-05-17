import type { ApiFetchOptions } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type {
  ArticleCardDTO,
  ArticleFullDTO,
  ArticleMediaItem,
  ArticleSeo,
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
