export interface ArticleMediaItem {
  url: string;
  publicId: string;
  alt?: string;
  caption?: string;
}

export interface ArticleVideoItem {
  url: string;
  publicId: string;
  thumbnail?: string;
  caption?: string;
}

export interface ArticleSeo {
  title: string;
  description: string;
  ogImage: string | null;
  canonicalUrl: string | null;
  keywords: string[];
}

export type ArticleStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "published"
  | "rejected"
  | "archived";

export type QueueStatus = "submitted" | "under_review";

export interface ArticleCardDTO {
  id: string;
  headline: string;
  slug: string;
  summary: string;
  authorId: string;
  categoryId: string;
  tags: string[];
  featuredImage: ArticleMediaItem | null;
  status: ArticleStatus;
  isBreaking: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  publishedAt: string | null;
  scheduledAt: string | null;
  viewCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ArticleHistoryAction =
  | "create"
  | "update"
  | "submit"
  | "start-review"
  | "approve"
  | "reject"
  | "publish"
  | "schedule"
  | "archive"
  | "unarchive"
  | "flags";

export interface HistoryDTO {
  action: ArticleHistoryAction | string;
  by: string | null;
  at: string;
  note?: string;
}

export interface ArticleFullDTO extends ArticleCardDTO {
  content: string;
  gallery: ArticleMediaItem[];
  videos: ArticleVideoItem[];
  rejectionReason: string | null;
  reviewerId: string | null;
  approverId: string | null;
  history: HistoryDTO[];
  seo: ArticleSeo;
  recentViews: number;
  isCommentsEnabled: boolean;
}
