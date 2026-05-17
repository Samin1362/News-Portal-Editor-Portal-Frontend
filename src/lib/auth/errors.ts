import { FirebaseError } from "firebase/app";
import { ApiError } from "@/lib/api/client";

const FIREBASE_MESSAGES: Record<string, string> = {
  "auth/invalid-email": "That email address looks invalid.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "No account found with that email.",
  "auth/wrong-password": "Wrong password. Try again or reset it.",
  "auth/invalid-credential": "Wrong email or password.",
  "auth/email-already-in-use":
    "An account already exists with that email — try signing in instead.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  "auth/popup-blocked":
    "Browser blocked the Google sign-in popup. Allow popups and retry.",
  "auth/network-request-failed":
    "Network error. Check your connection and try again.",
  "auth/too-many-requests":
    "Too many attempts. Wait a minute, then try again.",
};

const API_MESSAGES: Record<string, string> = {
  CONFLICT:
    "An account with this email is already linked to a different identity.",
  UNAUTHORIZED: "Your session expired. Please sign in again.",
  FORBIDDEN: "You don't have access to this resource.",
  VALIDATION_ERROR: "Some details look invalid — please check the form.",
};

export function authErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    return FIREBASE_MESSAGES[err.code] ?? err.message;
  }
  if (err instanceof ApiError) {
    return API_MESSAGES[err.code] ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}
