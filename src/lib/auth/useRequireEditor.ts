"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./EditorAuthProvider";

interface Options {
  /** Where to send unauthenticated users. Defaults to `/login`. */
  loginPath?: string;
  /** Where to send role-mismatched users. Defaults to `/access-denied`. */
  fallbackPath?: string;
}

/**
 * Guards the editor route group. Allows `editor` + `admin` (admin has editor
 * privileges per the backend `requireRole('editor', 'admin')` rule). Anyone
 * else is sent to `/access-denied`. Blocked users are signed out + bounced.
 *
 * Returns the auth state plus `isAllowed` (true once profile resolves and
 * role passes) and `isAdmin` (so callers can show the "viewing as admin"
 * banner without re-checking).
 */
export function useRequireEditor({
  loginPath = "/login",
  fallbackPath = "/access-denied",
}: Options = {}) {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.firebaseUser) {
      router.replace(loginPath);
      return;
    }
    if (auth.profile?.isBlocked) {
      void auth.signOut();
      router.replace(loginPath);
      return;
    }
    if (auth.role && auth.role !== "editor" && auth.role !== "admin") {
      router.replace(fallbackPath);
    }
  }, [auth, router, loginPath, fallbackPath]);

  const isAllowed =
    !auth.loading &&
    !!auth.firebaseUser &&
    (auth.role === "editor" || auth.role === "admin");

  return { ...auth, isAllowed, isAdmin: auth.role === "admin" };
}

/** Redirect-to-login guard with no role restriction (used inside /login). */
export function useRedirectIfSignedIn(target = "/") {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.loading) return;
    if (auth.firebaseUser && (auth.role === "editor" || auth.role === "admin")) {
      router.replace(target);
    }
  }, [auth, router, target]);

  return auth;
}
