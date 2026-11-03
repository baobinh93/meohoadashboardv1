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

export type OrderStatus = "NEW" | "CONTACTED" | "CONFIRMED" | "CANCELLED";

export type PickupMethod = "pickup" | "delivery";

export interface Order {
  id: string;
  order_number: string;

  product_id: string | null;
  product_name_snapshot: string;
  price_snapshot: number | string;
  product_image_snapshot: string | null;

  customer_name: string;
  phone: string;

  pickup_method: PickupMethod;
  delivery_address: string | null;
  greeting_message: string | null;

  status: OrderStatus;

  handled_by: string | null;

  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  old_status: OrderStatus;
  new_status: OrderStatus;
  changed_by: string;
  changed_at: string;
}
