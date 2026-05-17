import { ApiError, type ApiFetchOptions } from "./client";
import type { ApiResult } from "@/lib/types/api";
import type { UserDTO } from "@/lib/types/user";
import type { UserRole } from "@/lib/auth/types";

type AuthedFetch = <T>(
  path: string,
  options?: Omit<ApiFetchOptions, "token">,
) => Promise<ApiResult<T>>;

export interface ListUsersQuery {
  role?: UserRole;
  q?: string;
  page?: number;
  limit?: number;
}

function qs(q: ListUsersQuery): string {
  const parts: string[] = [];
  if (q.role) parts.push(`role=${q.role}`);
  if (q.q) parts.push(`q=${encodeURIComponent(q.q)}`);
  if (q.page) parts.push(`page=${q.page}`);
  if (q.limit) parts.push(`limit=${q.limit}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/**
 * Lists users. Backend allows editor + admin reads (Phase 5). If a future
 * gate tightens to admin-only again, the wrapper still returns `null` on
 * 401/403 so consumers degrade gracefully instead of hard-erroring.
 */
export async function listUsers(
  fetcher: AuthedFetch,
  query: ListUsersQuery,
): Promise<ApiResult<UserDTO[]> | null> {
  try {
    return await fetcher<UserDTO[]>(`/api/v1/users${qs(query)}`, {
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
      return null;
    }
    throw err;
  }
}

/** Fetches a single user. Returns null on 401/403 (mirrors `listUsers`). */
export async function getUser(
  fetcher: AuthedFetch,
  id: string,
): Promise<UserDTO | null> {
  try {
    const { data } = await fetcher<UserDTO>(
      `/api/v1/users/${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    return data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
      return null;
    }
    throw err;
  }
}
