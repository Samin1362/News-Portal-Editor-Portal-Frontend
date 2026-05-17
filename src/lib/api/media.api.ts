import type { ApiFetchOptions } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type {
  MediaDTO,
  MediaType,
  RegisterMediaBody,
} from "@/lib/types/media";

type AuthedFetch = <T>(
  path: string,
  options?: Omit<ApiFetchOptions, "token">,
) => Promise<ApiResult<T>>;

export interface ListMediaQuery {
  type?: MediaType;
  articleId?: string;
  unattached?: boolean;
  page?: number;
  limit?: number;
}

function qs(query: ListMediaQuery): string {
  const parts: string[] = [];
  if (query.type) parts.push(`type=${encodeURIComponent(query.type)}`);
  if (query.articleId)
    parts.push(`articleId=${encodeURIComponent(query.articleId)}`);
  if (query.unattached !== undefined)
    parts.push(`unattached=${query.unattached ? "true" : "false"}`);
  if (query.page) parts.push(`page=${query.page}`);
  if (query.limit) parts.push(`limit=${query.limit}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export async function listMine(
  fetcher: AuthedFetch,
  query: ListMediaQuery = {},
): Promise<ApiResult<MediaDTO[]>> {
  return fetcher<MediaDTO[]>(`/api/v1/media/me${qs(query)}`, {
    cache: "no-store",
  });
}

export async function registerMedia(
  fetcher: AuthedFetch,
  body: RegisterMediaBody,
): Promise<MediaDTO> {
  const { data } = await fetcher<MediaDTO>("/api/v1/media", {
    method: "POST",
    body,
    cache: "no-store",
  });
  return data;
}

export interface UpdateMediaBody {
  alt?: string;
  caption?: string;
  articleId?: string | null;
}

export async function updateMedia(
  fetcher: AuthedFetch,
  id: string,
  body: UpdateMediaBody,
): Promise<MediaDTO> {
  const { data } = await fetcher<MediaDTO>(
    `/api/v1/media/${encodeURIComponent(id)}`,
    { method: "PATCH", body, cache: "no-store" },
  );
  return data;
}

export async function deleteMedia(
  fetcher: AuthedFetch,
  id: string,
): Promise<void> {
  await fetcher<unknown>(`/api/v1/media/${encodeURIComponent(id)}`, {
    method: "DELETE",
    cache: "no-store",
  });
}
