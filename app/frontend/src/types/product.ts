export interface ProductInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId: number;
  subcategoryId?: number;
  imageUrl?: string;
  isPublished: boolean;
}
