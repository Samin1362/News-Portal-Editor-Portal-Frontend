import type { ApiFetchOptions } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type { CategoryDTO } from "@/lib/types/category";

type AuthedFetch = <T>(
  path: string,
  options?: Omit<ApiFetchOptions, "token">,
) => Promise<ApiResult<T>>;

export async function listCategories(
  fetcher: AuthedFetch,
): Promise<CategoryDTO[]> {
  const { data } = await fetcher<CategoryDTO[]>(`/api/v1/categories`, {
    cache: "no-store",
  });
  return data;
}
