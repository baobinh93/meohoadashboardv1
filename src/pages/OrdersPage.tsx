import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Truck,
  Store,
  CalendarDays,
  Phone,
} from "lucide-react";

import { getOrders } from "../services/orderService";
import type { OrderStatus } from "../types/database";
import OrderDetailModal from "../features/orders/components/OrderDetailModal";
const PAGE_SIZE = 10;

const statusOptions: {
  value: OrderStatus | "ALL";
  label: string;
}[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "NEW", label: "Mới" },
  { value: "CONTACTED", label: "Đã liên hệ" },
  { value: "CONFIRMED", label: "Đã hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const statusStyles: Record<OrderStatus, string> = {
  NEW: "bg-blue-50 text-blue-700",
  CONTACTED: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700",
};

const statusLabels: Record<OrderStatus, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  CONFIRMED: "Đã hoành thành",
  CANCELLED: "Đã hủy",
};

function formatPrice(price: number | string) {
  return Number(price).toLocaleString("vi-VN") + " ₫";
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["orders", page, search, status],
    queryFn: () =>
      getOrders({
        page,
        pageSize: PAGE_SIZE,
        search,
        status,
      }),
    placeholderData: (previousData) => previousData,
  });

  const orders = data?.data ?? [];
  const totalOrders = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE));

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: OrderStatus | "ALL") => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#c92d35]">
            ORDERS
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
            Quản lý đơn hàng
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý và theo dõi đơn hàng của Mèo Hoa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Tìm mã đơn, tên khách, số điện thoại hoặc sản phẩm..."
            className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          />
        </div>

        {/* Status filters */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleStatusChange(option.value)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
                status === option.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders container */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {/* List header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-semibold text-gray-900">Danh sách đơn hàng</h2>
            <p className="mt-1 text-xs text-gray-500">{totalOrders} đơn hàng</p>
          </div>

          {isFetching && (
            <span className="text-xs text-gray-400">Đang cập nhật...</span>
          )}
        </div>

        {/* Error */}
        {error ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-red-600">
              Không thể tải danh sách đơn hàng.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 text-sm font-medium text-gray-700 underline"
            >
              Thử lại
            </button>
          </div>
        ) : isLoading ? (
          <div className="px-5 py-16 text-center text-sm text-gray-500">
            Đang tải đơn hàng...
          </div>
        ) : orders.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <ShoppingBag size={36} className="mx-auto text-gray-300" />
            <p className="mt-3 font-medium text-gray-700">Chưa có đơn hàng</p>
            <p className="mt-1 text-sm text-gray-400">
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Mã đơn</th>
                    <th className="px-5 py-3 font-medium">Khách hàng</th>
                    <th className="px-5 py-3 font-medium">Sản phẩm</th>
                    <th className="px-5 py-3 font-medium">Giá trị</th>
                    <th className="px-5 py-3 font-medium">Nhận hàng</th>
                    <th className="px-5 py-3 font-medium">Trạng thái</th>
                    <th className="px-5 py-3 font-medium">Ngày tạo</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => {
                        setSelectedOrderId(order.id);
                      }}
                      className="cursor-pointer transition hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-900">
                        {order.order_number}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800">
                          {order.customer_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {order.phone}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {order.product_image_url ? (
                            <img
                              src={order.product_image_url}
                              alt={order.product_name_snapshot}
                              loading="lazy"
                              className="h-14 w-14 shrink-0 rounded-lg border border-gray-100 object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                              <ShoppingBag size={22} />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate font-medium text-gray-800">
                              {order.product_name_snapshot}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                              {order.product_id
                                ? "Sản phẩm Mèo Hoa"
                                : "Sản phẩm đã lưu snapshot"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-800">
                        {formatPrice(order.price_snapshot)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        {order.pickup_method === "delivery"
                          ? "Giao hàng"
                          : "Đến lấy"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyles[order.status]}`}
                        >
                          {statusLabels[order.status]}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 px-3 py-3 md:hidden">
              {orders.map((order) => (
                <article
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedOrderId(order.id);
                    }
                  }}
                  className="cursor-pointer overflow-hidden rounded-xl border border-stone-200 bg-white transition hover:border-stone-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#794640]/30"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-[11px] text-stone-400">Mã đơn hàng</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-stone-800">
                        {order.order_number}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusStyles[order.status]}`}
                    >
                      {statusLabels[order.status]}
                    </span>
                  </div>

                  {/* Product */}
                  <div className="flex gap-3 p-3">
                    {order.product_image_url ? (
                      <img
                        src={order.product_image_url}
                        alt={order.product_name_snapshot}
                        loading="lazy"
                        className="h-[76px] w-[76px] shrink-0 rounded-lg border border-stone-100 object-cover"
                      />
                    ) : (
                      <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                        <ShoppingBag size={26} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium leading-5 text-stone-800">
                        {order.product_name_snapshot}
                      </p>

                      <p className="mt-2 text-sm font-semibold text-[#794640]">
                        {formatPrice(order.price_snapshot)}
                      </p>

                      <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
                        {order.pickup_method === "delivery" ? (
                          <>
                            <Truck size={14} />
                            <span>Giao hàng</span>
                          </>
                        ) : (
                          <>
                            <Store size={14} />
                            <span>Đến lấy</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Customer information */}
                  <div className="space-y-2 border-t border-stone-100 bg-stone-50/60 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-stone-400">Khách hàng</span>
                      <span className="text-right text-sm font-medium text-stone-700">
                        {order.customer_name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-stone-400">
                        <Phone size={13} />
                        Điện thoại
                      </span>
                      <a
                        href={`tel:${order.phone}`}
                        onClick={(event) => event.stopPropagation()}
                        className="text-sm font-medium text-stone-700"
                      >
                        {order.phone}
                      </a>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-stone-400">
                        <CalendarDays size={13} />
                        Ngày tạo
                      </span>
                      <span className="text-right text-xs text-stone-600">
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-center text-sm text-gray-500 sm:text-left">
                Trang {page}/{totalPages} · {totalOrders} đơn hàng
              </p>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Trước
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}
