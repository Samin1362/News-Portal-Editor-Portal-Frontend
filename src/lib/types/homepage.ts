import type { ArticleCardDTO } from "./article";
import type { CategoryDTO } from "./category";

export interface HomepageCategoryBlockDTO {
  category: CategoryDTO;
  articles: ArticleCardDTO[];
}

export interface HomepageDTO {
  breaking: ArticleCardDTO[];
  topHeadlines: ArticleCardDTO[];
  featured: ArticleCardDTO[];
  trending: ArticleCardDTO[];
  latest: ArticleCardDTO[];
  categories: HomepageCategoryBlockDTO[];
  videos: ArticleCardDTO[];
  gallery: ArticleCardDTO[];
  generatedAt: string;
}
