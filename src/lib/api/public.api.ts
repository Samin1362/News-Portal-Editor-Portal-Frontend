import type { ApiFetchOptions } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type { HomepageDTO } from "@/lib/types/homepage";

type AuthedFetch = <T>(
  path: string,
  options?: Omit<ApiFetchOptions, "token">,
) => Promise<ApiResult<T>>;

/**
 * Public homepage payload — used for top-stories + reads-today insights.
 * Endpoint is unauthenticated but we still go through the authed fetcher so
 * a single client handles all calls (and so the token, when present, lets
 * future personalisation kick in cleanly).
 */
export async function getHomepage(fetcher: AuthedFetch): Promise<HomepageDTO> {
  const { data } = await fetcher<HomepageDTO>("/api/v1/public/homepage", {
    cache: "no-store",
  });
  return data;
}
