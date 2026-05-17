export type CommentStatus = "pending" | "approved" | "rejected";

export interface CommentAuthorDTO {
  id: string;
  displayName: string;
  photoURL: string | null;
}

export interface CommentDTO {
  id: string;
  articleId: string;
  parentId: string | null;
  content: string;
  author: CommentAuthorDTO | null;
  likeCount: number;
  hasLiked: boolean;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CommentReport {
  userId: string;
  reason: string;
  at: string;
}

export interface ModerationCommentDTO extends CommentDTO {
  reportCount: number;
  reports: CommentReport[];
}
