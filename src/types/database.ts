export type ProductStatus = "draft" | "published" | "archived";

export interface Product {
  id: string;
  name: string;
  slug?: string;
  price: number | string;
  original_price?: number | string | null;
  description?: string | null;
  status: ProductStatus;
  category_id: string;
  color_id: string;
  badge_id?: string | null;
  sort_order?: number;
  created_at?: string;
  images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt?: string | null;
  is_primary: boolean;
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order?: number;
  is_active: boolean;
}

export interface Color {
  id: string;
  name: string;
  slug: string;
  hex_code?: string | null;
  sort_order?: number;
  is_active: boolean;
}

export interface Badge {
  id: string;
  name: string;
  background_color?: string | null;
  text_color?: string | null;
  sort_order?: number;
  is_active: boolean;
}
