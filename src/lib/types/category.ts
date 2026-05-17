export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  bannerUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
