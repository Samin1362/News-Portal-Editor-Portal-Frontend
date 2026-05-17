import type { ApiFetchOptions } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type { TagDTO } from "@/lib/types/tag";

type AuthedFetch = <T>(
  path: string,
  options?: Omit<ApiFetchOptions, "token">,
) => Promise<ApiResult<T>>;

/**
 * GET /api/v1/tags?q= — used for tag-input autocomplete. Backend caps at 20
 * results and sorts by best match.
 */
export async function listTags(
  fetcher: AuthedFetch,
  q?: string,
): Promise<TagDTO[]> {
  const path = q
    ? `/api/v1/tags?q=${encodeURIComponent(q)}`
    : "/api/v1/tags";
  const { data } = await fetcher<TagDTO[]>(path, { cache: "no-store" });
  return data;
}
