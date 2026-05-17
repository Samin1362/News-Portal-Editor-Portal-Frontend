import type { UserRole } from "@/lib/auth/types";

export interface UserDTO {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  bio: string;
  isBlocked: boolean;
  isCommentBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}
