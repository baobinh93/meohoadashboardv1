import { supabase } from "../lib/supabase";
import type { Order, OrderStatus, OrderStatusHistory } from "../types/database";

export interface GetOrdersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: OrderStatus | "ALL";
}

export interface GetOrdersResult {
  data: OrderListItem[];
  count: number;
}

export interface OrderListItem extends Order {
  product_image_url: string | null;
}

export interface OrderDetailItem extends Order {
  product_image_url: string | null;
}

export interface OrderDetailResult {
  order: OrderDetailItem;
  history: OrderStatusHistory[];
}

/**
 * Lấy danh sách đơn hàng có phân trang, tìm kiếm và lọc trạng thái.
 */
export async function getOrders({
  page = 1,
  pageSize = 10,
  search = "",
  status = "ALL",
}: GetOrdersParams = {}): Promise<GetOrdersResult> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "ALL") {
    query = query.eq("status", status);
  }

  const keyword = search.trim();

  if (keyword) {
    const safeKeyword = keyword.replace(/[,%()\\]/g, "\\$&");

    query = query.or(
      [
        `order_number.ilike.%${safeKeyword}%`,
        `customer_name.ilike.%${safeKeyword}%`,
        `phone.ilike.%${safeKeyword}%`,
        `product_name_snapshot.ilike.%${safeKeyword}%`,
      ].join(","),
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  const orders = (data ?? []) as Order[];

  return {
    data: orders.map((order) => ({
      ...order,
      product_image_url: order.product_image_snapshot ?? null,
    })),
    count: count ?? 0,
  };
}

/**
 * Lấy chi tiết một đơn hàng và lịch sử thay đổi trạng thái.
 */
export async function getOrderDetail(
  orderId: string,
): Promise<OrderDetailResult> {
  const [orderResult, historyResult] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).single(),

    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", orderId)
      .order("changed_at", { ascending: false }),
  ]);

  if (orderResult.error) {
    throw orderResult.error;
  }

  if (historyResult.error) {
    throw historyResult.error;
  }

  const order = orderResult.data as Order;

  return {
    order: {
      ...order,
      product_image_url: order.product_image_snapshot ?? null,
    },
    history: (historyResult.data ?? []) as OrderStatusHistory[],
  };
}

/**
 * Đếm số đơn hàng mới để hiển thị badge trên menu.
 */
export async function getNewOrdersCount(): Promise<number> {
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "NEW");

  if (error) {
    throw error;
  }

  return count ?? 0;
}

/**
 * Cập nhật trạng thái đơn hàng thông qua RPC.
 * Không UPDATE trực tiếp bảng orders.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
) {
  const { data, error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_new_status: newStatus,
  });

  if (error) {
    throw error;
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    throw new Error("Không nhận được kết quả cập nhật đơn hàng.");
  }

  return result;
}
