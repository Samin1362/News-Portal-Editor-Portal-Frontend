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
 * Lists users. Backend currently restricts `GET /users` to `admin` — for a
 * plain editor this call returns 403, which the queue treats as a non-fatal
 * "author names unavailable" state. Once a backend "editor-visible author
 * directory" endpoint exists this can be widened.
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
