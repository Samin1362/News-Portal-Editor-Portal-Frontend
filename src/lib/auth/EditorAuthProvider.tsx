"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase/client";
import { syncMe } from "@/lib/api/auth.api";
import { ApiError } from "@/lib/api/client";
import type { UserProfile, UserRole } from "./types";

export interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Editor-portal auth provider. Same shape as the journalist portal's
 * AuthProvider, but no `signUp` path is exposed — accounts are created
 * elsewhere and an admin elevates the role.
 */
export function EditorAuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const syncedUidRef = useRef<string | null>(null);

  const syncProfileFor = useCallback(async (user: FirebaseUser) => {
    const token = await user.getIdToken();
    try {
      const next = await syncMe(token);
      setProfile(next);
      return next;
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        await fbSignOut(getFirebaseAuth());
        setProfile(null);
        syncedUidRef.current = null;
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        syncedUidRef.current = null;
        setLoading(false);
        return;
      }
      if (syncedUidRef.current === user.uid) {
        setLoading(false);
        return;
      }
      try {
        await syncProfileFor(user);
        syncedUidRef.current = user.uid;
      } catch {
        // CONFLICT already signed out; for other failures we let the firebase
        // user stand and surface the failure on the next authed request.
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [syncProfileFor]);

  const getIdToken = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      const user = getFirebaseAuth().currentUser;
      if (!user) return null;
      return user.getIdToken(forceRefresh);
    },
    [],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(getFirebaseAuth(), googleProvider);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(getFirebaseAuth());
    syncedUidRef.current = null;
  }, []);

  const refreshProfile = useCallback(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) return;
    await syncProfileFor(user);
  }, [syncProfileFor]);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      role: profile?.role ?? null,
      loading,
      getIdToken,
      signIn,
      signInWithGoogle,
      sendPasswordReset,
      signOut,
      refreshProfile,
    }),
    [
      firebaseUser,
      profile,
      loading,
      getIdToken,
      signIn,
      signInWithGoogle,
      sendPasswordReset,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <EditorAuthProvider>");
  }
  return ctx;
}
