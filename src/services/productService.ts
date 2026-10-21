import { supabase } from "../lib/supabase";
import type { Product } from "../types/database";
import {
  rpcAddProductImage,
  rpcCreateProduct,
  rpcPublishProduct,
  rpcSetPrimaryProductImage,
  rpcDeleteProductImage,
} from "./rpcContract";
import { uploadImage } from "./cloudinaryService";

export type ManageableProductsSort =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc";

export type ManageableProductsPageParams = {
  /** Trang bắt đầu từ 1. */
  page: number;
  /** Số sản phẩm mỗi trang; giới hạn tối đa 100. */
  pageSize: number;
  query?: string;
  categoryId?: string;
  colorId?: string;
  /** "all" = tất cả; "none" = không có nhãn; UUID = nhãn cụ thể. */
  badgeId?: string;
  /** "all" = tất cả; hoặc draft/published/archived. */
  status?: string;
  sort?: ManageableProductsSort;
};

export type ManageableProductsPageResult = {
  products: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ProductCategoryCounts = {
  all: number;
  byCategory: Record<string, number>;
};

/**
 * Lấy số lượng tổng của từng danh mục, không phụ thuộc bộ lọc đang chọn.
 * Phân trang nhỏ để tránh yêu cầu quá nhiều dòng trong một lần.
 */
export async function listProductCategoryCounts(): Promise<ProductCategoryCounts> {
  const pageSize = 1000;
  let from = 0;
  let all = 0;
  const byCategory: Record<string, number> = {};

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("category_id", { count: "exact" })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const rows = data ?? [];
    if (from === 0) all = 0;
    all += rows.length;

    for (const row of rows) {
      const categoryId = row.category_id;
      if (categoryId)
        byCategory[categoryId] = (byCategory[categoryId] ?? 0) + 1;
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return { all, byCategory };
}

/**
 * Tìm kiếm, lọc, sắp xếp và phân trang ngay tại Supabase.
 * Chỉ tải dữ liệu của trang hiện tại.
 */
export async function listManageableProductsPage({
  page,
  pageSize,
  query = "",
  categoryId = "all",
  colorId = "all",
  badgeId = "all",
  status = "all",
  sort = "newest",
}: ManageableProductsPageParams): Promise<ManageableProductsPageResult> {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let request = supabase
    .from("products")
    .select(
      "id,name,slug,price,original_price,description,status,category_id,color_id,badge_id,sort_order,created_at,product_images(id,product_id,image_url,alt,is_primary,sort_order)",
      { count: "exact" },
    );

  if (categoryId !== "all") request = request.eq("category_id", categoryId);
  if (colorId !== "all") request = request.eq("color_id", colorId);
  if (badgeId === "none") request = request.is("badge_id", null);
  else if (badgeId !== "all") request = request.eq("badge_id", badgeId);
  if (status !== "all") request = request.eq("status", status);

  const normalizedQuery = query.trim();
  if (normalizedQuery) {
    // Escape ký tự đặc biệt trong cú pháp bộ lọc PostgREST.
    const safeQuery = normalizedQuery.replace(/[(),.*%_\\\\]/g, "\\\\$&");
    const pattern = `%${safeQuery}%`;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        normalizedQuery,
      );

    if (isUuid) {
      // id là UUID, không thể dùng ilike trực tiếp trên cột này.
      request = request.or(
        `name.ilike.${pattern},slug.ilike.${pattern},id.eq.${normalizedQuery}`,
      );
    } else {
      request = request.or(`name.ilike.${pattern},slug.ilike.${pattern}`);
    }
  }

  switch (sort) {
    case "price-asc":
      request = request
        .order("price", { ascending: true })
        .order("id", { ascending: true });
      break;
    case "price-desc":
      request = request
        .order("price", { ascending: false })
        .order("id", { ascending: true });
      break;
    case "name-asc":
      request = request
        .order("name", { ascending: true })
        .order("id", { ascending: true });
      break;
    case "name-desc":
      request = request
        .order("name", { ascending: false })
        .order("id", { ascending: true });
      break;
    default:
      request = request
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });
      break;
  }

  const { data, error, count } = await request.range(from, to);
  if (error) throw error;

  const products = (data ?? []).map((row: any) => ({
    ...row,
    images: row.product_images ?? [],
  })) as Product[];

  const totalCount = count ?? 0;
  return {
    products,
    totalCount,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / safePageSize)),
  };
}

/** API cũ giữ lại để không phá các caller khác nếu còn sử dụng. */
export async function listManageableProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name,slug,price,original_price,description,status,category_id,color_id,badge_id,sort_order,created_at,product_images(id,product_id,image_url,alt,is_primary,sort_order)",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    images: row.product_images ?? [],
  })) as Product[];
}

export type CreateProductInput = {
  name: string;
  price: number;
  original_price: number | null;
  description: string | null;
  category_id: string;
  color_id: string;
  badge_id: string | null;
  sort_order: number;
  files: File[];
};

export async function createProductWithImages(
  input: CreateProductInput,
): Promise<string> {
  const productId = await rpcCreateProduct({
    name: input.name,
    price: input.price,
    original_price: input.original_price,
    description: input.description,
    category_id: input.category_id,
    color_id: input.color_id,
    badge_id: input.badge_id,
    sort_order: input.sort_order,
  });

  for (let index = 0; index < input.files.length; index += 1) {
    const file = input.files[index];
    const imageUrl = await uploadImage(file);
    await rpcAddProductImage({
      productId,
      imageUrl,
      alt: input.name,
      sortOrder: index,
    });
  }

  if (input.files.length > 0) {
    const { data: images, error } = await supabase
      .from("product_images")
      .select("id,product_id,image_url,alt,is_primary,sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(
        `Sản phẩm đã được tạo nhưng không thể xác minh danh sách ảnh: ${error.message}`,
      );
    }
    if (!images || images.length === 0) {
      throw new Error(
        "Sản phẩm đã được tạo nhưng chưa tìm thấy ảnh trong danh sách ảnh sản phẩm.",
      );
    }
    if (!images.some((image) => image.is_primary)) {
      await rpcSetPrimaryProductImage(productId, images[0].id);
    }
  }

  return productId;
}

export async function publishProduct(productId: string) {
  return rpcPublishProduct(productId);
}

export async function addProductImages(
  productId: string,
  files: File[],
  productName: string,
): Promise<void> {
  const existing = await supabase
    .from("product_images")
    .select("id,sort_order,is_primary")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (existing.error) throw existing.error;

  let nextSortOrder =
    (existing.data ?? []).reduce(
      (max, image) => Math.max(max, image.sort_order ?? -1),
      -1,
    ) + 1;

  for (const file of files) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      throw new Error(`Định dạng ảnh không hỗ trợ: ${file.name}`);
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`Ảnh vượt quá 10MB: ${file.name}`);
    }

    const imageUrl = await uploadImage(file);
    await rpcAddProductImage({
      productId,
      imageUrl,
      alt: productName,
      sortOrder: nextSortOrder++,
    });
  }

  const { data: images, error } = await supabase
    .from("product_images")
    .select("id,product_id,image_url,alt,is_primary,sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  if (images?.length && !images.some((image) => image.is_primary)) {
    await rpcSetPrimaryProductImage(productId, images[0].id);
  }
}

export async function deleteProductImage(
  productId: string,
  imageId: string,
): Promise<void> {
  const { data: target, error: targetError } = await supabase
    .from("product_images")
    .select("id,is_primary")
    .eq("product_id", productId)
    .eq("id", imageId)
    .maybeSingle();

  if (targetError) throw targetError;
  if (!target) throw new Error("Không tìm thấy ảnh cần xóa.");

  if (target.is_primary) {
    const { data: others, error: othersError } = await supabase
      .from("product_images")
      .select("id,sort_order")
      .eq("product_id", productId)
      .neq("id", imageId)
      .order("sort_order", { ascending: true })
      .limit(1);

    if (othersError) throw othersError;
    if (others?.[0]) await rpcSetPrimaryProductImage(productId, others[0].id);
  }

  await rpcDeleteProductImage(productId, imageId);
}

export async function setPrimaryProductImage(
  productId: string,
  imageId: string,
): Promise<void> {
  await rpcSetPrimaryProductImage(productId, imageId);
}
