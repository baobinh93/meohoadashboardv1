import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Package,
  UserRound,
  Phone,
  MapPin,
  MessageSquare,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ShoppingBag,
} from "lucide-react";

import {
  getOrderDetail,
  updateOrderStatus,
} from "../../../services/orderService";

import type { OrderStatus } from "../../../types/database";
import { useToast } from "../../../components/layout/ToastProvider";

interface OrderDetailModalProps {
  orderId: string;
  onClose: () => void;
}

const statusLabels: Record<OrderStatus, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
};

const statusStyles: Record<OrderStatus, string> = {
  NEW: "bg-blue-50 text-blue-700",
  CONTACTED: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700",
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

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-3">
      <div className="mt-0.5 text-stone-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-stone-500">{label}</p>
        <div className="mt-1 text-sm font-medium text-stone-800">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailModal({
  orderId,
  onClose,
}: OrderDetailModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => getOrderDetail(orderId),
    enabled: Boolean(orderId),
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: OrderStatus) =>
      updateOrderStatus(orderId, newStatus),

    onSuccess: async (_, newStatus) => {
      toast.success(`Đã cập nhật trạng thái: ${statusLabels[newStatus]}.`);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({
          queryKey: ["order-detail", orderId],
        }),
      ]);
    },

    onError: (e) => {
      toast.error(
        e instanceof Error
          ? e.message
          : "Không thể cập nhật trạng thái đơn hàng.",
      );
    },
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const order = data?.order;
  const history = data?.history ?? [];

  function handleStatusChange(newStatus: OrderStatus) {
    const message =
      newStatus === "CANCELLED"
        ? "Bạn có chắc chắn muốn hủy đơn hàng này?"
        : `Xác nhận chuyển đơn hàng sang trạng thái "${statusLabels[newStatus]}"?`;

    if (!window.confirm(message)) return;

    statusMutation.mutate(newStatus);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-[#fffdfa] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              Chi tiết đơn hàng
            </h2>
            {order && (
              <p className="mt-1 text-xs font-medium text-stone-500">
                {order.order_number}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400">
              <Loader2 size={28} className="animate-spin" />
              <p className="mt-3 text-sm">Đang tải chi tiết đơn hàng...</p>
            </div>
          ) : error || !order ? (
            <div className="py-16 text-center">
              <Package size={36} className="mx-auto text-stone-300" />
              <p className="mt-3 text-sm font-medium text-stone-700">
                Không thể tải chi tiết đơn hàng.
              </p>
              <p className="mt-1 text-xs text-stone-400">
                Vui lòng đóng và thử mở lại đơn hàng.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status */}
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
                <div>
                  <p className="text-xs text-stone-500">Trạng thái hiện tại</p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[order.status]}`}
                  >
                    {statusLabels[order.status]}
                  </span>
                </div>

                <div className="text-right">
                  <p className="text-xs text-stone-500">Ngày đặt hàng</p>
                  <p className="mt-2 text-sm font-medium text-stone-700">
                    {formatDate(order.created_at)}
                  </p>
                </div>
              </section>

              {/* Product */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-stone-900">
                  Sản phẩm đặt hàng
                </h3>

                <div className="flex gap-4 rounded-xl border border-stone-200 bg-white p-4">
                  {order.product_image_url ? (
                    <img
                      src={order.product_image_url}
                      alt={order.product_name_snapshot}
                      className="h-24 w-24 shrink-0 rounded-lg border border-stone-100 object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                      <ShoppingBag size={28} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-stone-800">
                      {order.product_name_snapshot}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#794640]">
                      {formatPrice(order.price_snapshot)}
                    </p>
                  </div>
                </div>
              </section>

              {/* Customer */}
              <section>
                <h3 className="mb-2 text-sm font-semibold text-stone-900">
                  Thông tin khách hàng
                </h3>

                <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white px-4">
                  <DetailRow icon={<UserRound size={17} />} label="Họ và tên">
                    {order.customer_name}
                  </DetailRow>

                  <DetailRow icon={<Phone size={17} />} label="Số điện thoại">
                    <a
                      href={`tel:${order.phone}`}
                      className="text-[#794640] hover:underline"
                    >
                      {order.phone}
                    </a>
                  </DetailRow>

                  <DetailRow
                    icon={<Package size={17} />}
                    label="Phương thức nhận hàng"
                  >
                    {order.pickup_method === "delivery"
                      ? "Giao hàng"
                      : "Đến lấy tại cửa hàng"}
                  </DetailRow>

                  {order.pickup_method === "delivery" && (
                    <DetailRow
                      icon={<MapPin size={17} />}
                      label="Địa chỉ giao hàng"
                    >
                      {order.delivery_address || "Chưa có địa chỉ"}
                    </DetailRow>
                  )}

                  {order.greeting_message && (
                    <DetailRow
                      icon={<MessageSquare size={17} />}
                      label="Lời chúc / Nội dung thiệp"
                    >
                      <p className="whitespace-pre-wrap font-normal leading-relaxed">
                        {order.greeting_message}
                      </p>
                    </DetailRow>
                  )}
                </div>
              </section>

              {/* Status history */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-stone-900">
                  Lịch sử trạng thái
                </h3>

                {history.length === 0 ? (
                  <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-400">
                    Chưa có lịch sử thay đổi trạng thái.
                  </p>
                ) : (
                  <div className="space-y-0 rounded-xl border border-stone-200 bg-white p-4">
                    {history.map((item, index) => (
                      <div
                        key={item.id}
                        className="relative flex gap-3 pb-4 last:pb-0"
                      >
                        <div className="relative flex flex-col items-center">
                          <span className="z-10 flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-stone-500">
                            <Clock size={14} />
                          </span>

                          {index !== history.length - 1 && (
                            <span className="absolute top-7 h-full w-px bg-stone-200" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 pt-1">
                          <p className="text-sm font-medium text-stone-800">
                            {statusLabels[item.old_status]} →{" "}
                            {statusLabels[item.new_status]}
                          </p>
                          <p className="mt-1 text-xs text-stone-400">
                            {formatDate(item.changed_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {order && (
          <div className="shrink-0 border-t border-stone-200 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            {order.status === "NEW" && (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() => handleStatusChange("CANCELLED")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Hủy đơn
                </button>

                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() => handleStatusChange("CONTACTED")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#794640] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#603731] disabled:opacity-50"
                >
                  {statusMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Đã liên hệ khách
                </button>
              </div>
            )}

            {order.status === "CONTACTED" && (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() => handleStatusChange("CANCELLED")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Hủy đơn
                </button>

                <button
                  type="button"
                  disabled={statusMutation.isPending}
                  onClick={() => handleStatusChange("CONFIRMED")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  {statusMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Xác nhận đơn
                </button>
              </div>
            )}

            {(order.status === "CONFIRMED" || order.status === "CANCELLED") && (
              <p className="text-center text-sm text-stone-500">
                Đơn hàng đã ở trạng thái cuối cùng.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
