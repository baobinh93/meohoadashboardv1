/**
 * RPC contract adapter.
 * Business writes use Supabase RPCs; do not write directly to business tables.
 */
import { supabase } from "../lib/supabase";
import type { Category, Color, Product } from "../types/database";

type CreateProductRpcInput = {
  name: string;
  price: number;
  original_price: number | null;
  description: string | null;
  category_id: string;
  color_id: string;
  badge_id: string | null;
  sort_order: number;
  meta_title?: string | null;
  meta_description?: string | null;
};

type ProductRpcRow = {
  product_id: string;
  product_name: string;
  product_slug: string;
  product_status: string;
};

export async function rpcCreateProduct(
  input: CreateProductRpcInput,
): Promise<string> {
  const { data, error } = await supabase.rpc("create_product", {
    p_name: input.name.trim(),
    p_category_id: input.category_id,
    p_color_id: input.color_id,
    p_price: input.price,
    p_badge_id: input.badge_id,
    p_original_price: input.original_price,
    p_description: input.description,
    p_sort_order: input.sort_order,
    p_meta_title: input.meta_title ?? null,
    p_meta_description: input.meta_description ?? null,
  });
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : null) as ProductRpcRow | null;
  if (!row?.product_id) {
    throw new Error(
      "RPC create_product không trả về product_id như hợp đồng đã xác nhận.",
    );
  }
  return row.product_id;
}

/**
 * Chữ ký đã xác minh từ Supabase:
 * update_product(p_product_id uuid, p_name text, p_category_id uuid,
 * p_color_id uuid, p_price numeric, p_badge_id uuid, p_original_price numeric,
 * p_description text, p_sort_order integer, p_meta_title text, p_meta_description text)
 */
export async function rpcUpdateProduct(
  productId: string,
  input: Partial<Product>,
): Promise<void> {
  if (!input.name?.trim()) throw new Error("Tên sản phẩm không được để trống.");
  if (!input.category_id || !input.color_id) {
    throw new Error("Vui lòng chọn danh mục và màu sắc.");
  }
  if (
    input.price == null ||
    !Number.isFinite(Number(input.price)) ||
    Number(input.price) < 0
  ) {
    throw new Error("Giá bán không hợp lệ.");
  }

  const { data: metadata, error: metadataError } = await supabase
    .from("products")
    .select("meta_title,meta_description")
    .eq("id", productId)
    .maybeSingle();
  if (metadataError) throw metadataError;

  const { data, error } = await supabase.rpc("update_product", {
    p_product_id: productId,
    p_name: input.name.trim(),
    p_category_id: input.category_id,
    p_color_id: input.color_id,
    p_price: Number(input.price),
    p_badge_id: input.badge_id ?? null,
    p_original_price:
      input.original_price == null ? null : Number(input.original_price),
    p_description: input.description ?? null,
    p_sort_order: input.sort_order ?? 0,
    p_meta_title: metadata?.meta_title ?? null,
    p_meta_description: metadata?.meta_description ?? null,
  });
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as ProductRpcRow | null;
  if (!row?.product_id) {
    throw new Error(
      "RPC update_product không trả về product_id. Hãy kiểm tra lại hợp đồng RPC.",
    );
  }
}

export async function rpcAddProductImage(input: {
  productId: string;
  imageUrl: string;
  alt: string | null;
  sortOrder: number;
}): Promise<void> {
  const { error } = await supabase.rpc("add_product_image", {
    p_product_id: input.productId,
    p_image_url: input.imageUrl,
    p_alt: input.alt,
    p_sort_order: input.sortOrder,
  });
  if (error) throw new Error(`Không thể thêm ảnh sản phẩm: ${error.message}`);
}

export async function rpcSetPrimaryProductImage(
  productId: string,
  imageId: string,
): Promise<void> {
  const { error } = await supabase.rpc("set_primary_product_image", {
    p_product_id: productId,
    p_image_id: imageId,
  });
  if (error) throw error;
}

export async function rpcPublishProduct(productId: string): Promise<void> {
  const { error } = await supabase.rpc("publish_product", {
    p_product_id: productId,
  });
  if (error) throw error;
}

export async function rpcArchiveProduct(productId: string): Promise<void> {
  const { error } = await supabase.rpc("archive_product", {
    p_product_id: productId,
  });
  if (error) throw error;
}

export async function rpcDeleteProduct(productId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_product", {
    p_product_id: productId,
  });
  if (error) throw error;
}

type CategoryRpcRow = {
  category_id: string;
  category_name: string;
  category_slug?: string;
};

type SetCategoryActiveRpcRow = {
  category_id: string;
  category_name: string;
  is_active: boolean;
};

type ColorRpcRow = {
  color_id: string;
  color_name: string;
  color_slug: string;
  color_hex_code: string;
};

type SetColorActiveRpcRow = {
  color_id: string;
  color_name: string;
  is_active: boolean;
};

type BadgeRpcRow = {
  badge_id: string;
  badge_name: string;
  background_color: string;
  text_color: string;
};

type SetBadgeActiveRpcRow = {
  badge_id: string;
  badge_name: string;
  is_active: boolean;
};

function getRpcRow<T>(data: unknown, functionName: string): T {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw new Error(`RPC ${functionName} không trả về dữ liệu như mong đợi.`);
  }
  return row as T;
}

function normalizeHexCode(hexCode: string): string {
  const normalized = hexCode.trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(normalized)) {
    throw new Error("Mã màu phải có định dạng HEX #RRGGBB.");
  }
  return normalized;
}

/** Tạo danh mục qua RPC create_category. */
export async function rpcCreateCategory(input: {
  name: string;
  sortOrder?: number;
}): Promise<CategoryRpcRow> {
  const name = input.name.trim();
  const sortOrder = input.sortOrder ?? 0;

  if (!name) throw new Error("Tên danh mục không được để trống.");
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new Error("Thứ tự danh mục phải là số nguyên không âm.");
  }

  const { data, error } = await supabase.rpc("create_category", {
    p_name: name,
    p_sort_order: sortOrder,
  });
  if (error) throw new Error(`Không thể tạo danh mục: ${error.message}`);
  return getRpcRow<CategoryRpcRow>(data, "create_category");
}

/** Cập nhật tên và thứ tự danh mục qua RPC update_category. */
export async function rpcUpdateCategory(input: {
  id: string;
  name: string;
  sortOrder: number;
}): Promise<CategoryRpcRow> {
  const name = input.name.trim();
  if (!name) throw new Error("Tên danh mục không được để trống.");
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    throw new Error("Thứ tự danh mục phải là số nguyên không âm.");
  }

  const { data, error } = await supabase.rpc("update_category", {
    p_id: input.id,
    p_name: name,
    p_sort_order: input.sortOrder,
  });
  if (error) throw new Error(`Không thể cập nhật danh mục: ${error.message}`);
  return getRpcRow<CategoryRpcRow>(data, "update_category");
}

/** Bật/tắt danh mục qua RPC set_category_active. */
export async function rpcSetCategoryActive(
  id: string,
  isActive: boolean,
): Promise<SetCategoryActiveRpcRow> {
  const { data, error } = await supabase.rpc("set_category_active", {
    p_id: id,
    p_is_active: isActive,
  });
  if (error)
    throw new Error(`Không thể thay đổi trạng thái danh mục: ${error.message}`);
  return getRpcRow<SetCategoryActiveRpcRow>(data, "set_category_active");
}

/** Tạo màu qua RPC create_color. */
export async function rpcCreateColor(input: {
  name: string;
  hexCode: string;
  sortOrder: number;
}): Promise<ColorRpcRow> {
  const name = input.name.trim();
  const hexCode = normalizeHexCode(input.hexCode);
  if (!name) throw new Error("Tên màu không được để trống.");
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    throw new Error("Thứ tự màu phải là số nguyên không âm.");
  }
  const { data, error } = await supabase.rpc("create_color", {
    p_name: name,
    p_hex_code: hexCode,
    p_sort_order: input.sortOrder,
  });
  if (error) throw new Error(`Không thể tạo màu: ${error.message}`);
  return getRpcRow<ColorRpcRow>(data, "create_color");
}

/** Cập nhật tên, mã HEX và thứ tự màu qua RPC update_color. */
export async function rpcUpdateColor(input: {
  id: string;
  name: string;
  hexCode: string;
  sortOrder: number;
}): Promise<ColorRpcRow> {
  const name = input.name.trim();
  const hexCode = normalizeHexCode(input.hexCode);
  if (!name) throw new Error("Tên màu không được để trống.");
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    throw new Error("Thứ tự màu phải là số nguyên không âm.");
  }

  const { data, error } = await supabase.rpc("update_color", {
    p_id: input.id,
    p_name: name,
    p_hex_code: hexCode,
    p_sort_order: input.sortOrder,
  });
  if (error) throw new Error(`Không thể cập nhật màu: ${error.message}`);
  return getRpcRow<ColorRpcRow>(data, "update_color");
}

/** Bật/tắt màu qua RPC set_color_active. */
export async function rpcSetColorActive(
  id: string,
  isActive: boolean,
): Promise<SetColorActiveRpcRow> {
  const { data, error } = await supabase.rpc("set_color_active", {
    p_id: id,
    p_is_active: isActive,
  });
  if (error)
    throw new Error(`Không thể thay đổi trạng thái màu: ${error.message}`);
  return getRpcRow<SetColorActiveRpcRow>(data, "set_color_active");
}

/** Tạo nhãn qua RPC create_badge. */
export async function rpcCreateBadge(input: {
  name: string;
  backgroundColor: string;
  textColor: string;
  sortOrder: number;
}): Promise<BadgeRpcRow> {
  const name = input.name.trim();
  const backgroundColor = normalizeHexCode(input.backgroundColor);
  const textColor = normalizeHexCode(input.textColor);
  if (!name) throw new Error("Tên nhãn dán không được để trống.");
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    throw new Error("Thứ tự nhãn dán phải là số nguyên không âm.");
  }
  const { data, error } = await supabase.rpc("create_badge", {
    p_name: name,
    p_background_color: backgroundColor,
    p_text_color: textColor,
    p_sort_order: input.sortOrder,
  });
  if (error) throw new Error(`Không thể tạo nhãn dán: ${error.message}`);
  return getRpcRow<BadgeRpcRow>(data, "create_badge");
}

/** Cập nhật tên, màu nền, màu chữ và thứ tự nhãn qua RPC update_badge. */
export async function rpcUpdateBadge(input: {
  id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  sortOrder: number;
}): Promise<BadgeRpcRow> {
  const name = input.name.trim();
  const backgroundColor = normalizeHexCode(input.backgroundColor);
  const textColor = normalizeHexCode(input.textColor);
  if (!name) throw new Error("Tên nhãn dán không được để trống.");
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    throw new Error("Thứ tự nhãn dán phải là số nguyên không âm.");
  }

  const { data, error } = await supabase.rpc("update_badge", {
    p_id: input.id,
    p_name: name,
    p_background_color: backgroundColor,
    p_text_color: textColor,
    p_sort_order: input.sortOrder,
  });
  if (error) throw new Error(`Không thể cập nhật nhãn dán: ${error.message}`);
  return getRpcRow<BadgeRpcRow>(data, "update_badge");
}

/** Bật/tắt nhãn dán qua RPC set_badge_active. */
export async function rpcSetBadgeActive(
  id: string,
  isActive: boolean,
): Promise<SetBadgeActiveRpcRow> {
  const { data, error } = await supabase.rpc("set_badge_active", {
    p_id: id,
    p_is_active: isActive,
  });
  if (error)
    throw new Error(`Không thể thay đổi trạng thái nhãn dán: ${error.message}`);
  return getRpcRow<SetBadgeActiveRpcRow>(data, "set_badge_active");
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,sort_order,is_active")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function listColors(): Promise<Color[]> {
  const { data, error } = await supabase
    .from("colors")
    .select("id,name,slug,hex_code,sort_order,is_active")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Color[];
}

export interface Badge {
  id: string;
  name: string;
  background_color: string;
  text_color: string;
  sort_order: number;
  is_active: boolean;
}

export async function listBadges(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from("badges")
    .select("id, name, background_color, text_color, sort_order, is_active")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Badge[];
}

export async function rpcDeleteProductImage(
  productId: string,
  imageId: string,
): Promise<void> {
  const { error } = await supabase.rpc("delete_product_image", {
    p_product_id: productId,
    p_image_id: imageId,
  });
  if (error) throw new Error(`Không thể xóa ảnh sản phẩm: ${error.message}`);
}
