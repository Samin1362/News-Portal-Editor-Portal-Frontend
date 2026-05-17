import { apiFetch } from "./client";
import type { UserProfile } from "@/lib/auth/types";

export async function syncMe(token: string): Promise<UserProfile> {
  const result = await apiFetch<UserProfile>("/api/v1/auth/sync", {
    method: "POST",
    body: {},
    token,
    cache: "no-store",
  });
  return result.data;
}

export async function getMe(token: string): Promise<UserProfile> {
  const result = await apiFetch<UserProfile>("/api/v1/auth/me", {
    token,
    cache: "no-store",
  });
  return result.data;
}
