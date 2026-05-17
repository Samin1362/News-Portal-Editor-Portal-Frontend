"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/auth/EditorAuthProvider";
import { apiFetch, ApiError, type ApiFetchOptions } from "./client";
import type { ApiResult } from "@/lib/types/api";

/**
 * Client-side wrapper around `apiFetch` that injects the current Firebase
 * ID token automatically. Retries once on 401 with a force-refreshed token.
 */
export function useAuthedApi() {
  const { getIdToken } = useAuth();

  const authedFetch = useCallback(
    async <T,>(
      path: string,
      options: Omit<ApiFetchOptions, "token"> = {},
    ): Promise<ApiResult<T>> => {
      const token = await getIdToken();
      try {
        return await apiFetch<T>(path, { ...options, token });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const refreshed = await getIdToken(true);
          if (refreshed) {
            return apiFetch<T>(path, { ...options, token: refreshed });
          }
        }
        throw err;
      }
    },
    [getIdToken],
  );

  return authedFetch;
}
