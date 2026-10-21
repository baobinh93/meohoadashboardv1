import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Package,
  PackagePlus,
  RefreshCw,
  UploadCloud,
} from "lucide-react";

import { useToast } from "../components/layout/ToastProvider";
import { listManageableProducts } from "../services/productService";
import type { Product } from "../types/database";

const RED = "#c92830";

function formatCount(value: number) {
  return value.toLocaleString("vi-VN");
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  description: string;
  icon: typeof Package;
  accent: "red" | "green" | "stone";
}) {
  const iconClasses = {
    red: "bg-red-50 text-[#c92830]",
    green: "bg-emerald-50 text-emerald-700",
    stone: "bg-stone-100 text-stone-600",
  }[accent];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            {formatCount(value)}
          </p>
        </div>
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconClasses}`}
        >
          <Icon size={19} />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-500">{description}</p>
    </div>
  );
}

export function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const toast = useToast();

  const loadProducts = useCallback(
    async (showSuccess = false) => {
      setLoading(true);
      setLoadError("");

      try {
        const data = await listManageableProducts();
        setProducts(data);
        if (showSuccess) toast.success("Đã làm mới dữ liệu tổng quan.");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Không tải được dữ liệu tổng quan.";
        setLoadError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const stats = useMemo(
    () => ({
      total: products.length,
      published: products.filter((product) => product.status === "published")
        .length,
      draft: products.filter((product) => product.status === "draft").length,
      archived: products.filter((product) => product.status === "archived")
        .length,
    }),
    [products],
  );

  return (
    <section className="min-w-0 space-y-6 pb-20 md:pb-0">
      <header className="flex flex-col justify-between gap-4 border-b border-[#f0e9e1] pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#c92830]">
            Catalogue management
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Tổng quan
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
            Theo dõi tình trạng sản phẩm và những việc cần xử lý trong cửa hàng
            Mèo Hoa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadProducts(true)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </header>

      {loadError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-red-800">
              Chưa tải được dữ liệu tổng quan
            </p>
            <p className="mt-1 break-words text-xs leading-5 text-red-700">
              {loadError}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadProducts()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            <RefreshCw size={13} />
            Thử lại
          </button>
        </div>
      )}

      {loading && products.length === 0 && !loadError ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-2xl border border-stone-200 bg-white"
            />
          ))}
        </div>
      ) : !loadError ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Tổng sản phẩm"
              value={stats.total}
              description="Tất cả sản phẩm trong danh sách quản lý."
              icon={Package}
              accent="stone"
            />
            <StatCard
              label="Đang bán"
              value={stats.published}
              description="Sản phẩm có trạng thái published."
              icon={CheckCircle2}
              accent="green"
            />
            <StatCard
              label="Chờ xuất bản"
              value={stats.draft}
              description="Sản phẩm draft cần được kiểm tra trước khi đăng."
              icon={Clock3}
              accent="red"
            />
            <StatCard
              label="Đã lưu trữ"
              value={stats.archived}
              description="Sản phẩm có trạng thái archived."
              icon={Archive}
              accent="stone"
            />
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-[#f0e9e1] px-4 py-4 sm:px-5">
                <div>
                  <h2 className="text-sm font-bold text-stone-900">
                    Cần xử lý
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    Ưu tiên kiểm tra sản phẩm đang chờ xuất bản.
                  </p>
                </div>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-50 text-[#c92830]">
                  <UploadCloud size={18} />
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {stats.draft > 0 ? (
                  <div className="flex flex-col gap-4 rounded-xl border border-red-100 bg-red-50/60 p-4 sm:flex-row sm:items-center">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#c92830] shadow-sm">
                      <Clock3 size={21} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-900">
                        {formatCount(stats.draft)} sản phẩm chờ xuất bản
                      </p>
                      <p className="mt-1 text-xs leading-5 text-stone-600">
                        Mở danh sách sản phẩm để kiểm tra thông tin và thực hiện
                        xuất bản theo quy trình hiện tại.
                      </p>
                    </div>
                    <Link
                      to="/products"
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
                      style={{ backgroundColor: RED }}
                    >
                      Xem sản phẩm
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-6 text-center">
                    <CheckCircle2
                      className="mx-auto text-emerald-700"
                      size={25}
                    />
                    <p className="mt-2 text-sm font-semibold text-stone-800">
                      Không có sản phẩm chờ xuất bản
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Khi có sản phẩm draft, chúng sẽ được hiển thị tại đây.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-bold text-stone-900">
                Thao tác nhanh
              </h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                Truy cập các công việc quản lý thường dùng.
              </p>

              <div className="mt-4 grid gap-2">
                <Link
                  to="/products"
                  className="group flex items-center gap-3 rounded-xl border border-stone-200 p-3 transition hover:border-red-200 hover:bg-red-50/40"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50 text-[#c92830]">
                    <PackagePlus size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-stone-800">
                      Thêm sản phẩm
                    </span>
                    <span className="mt-1 block text-xs text-stone-500">
                      Mở trang quản lý sản phẩm
                    </span>
                  </span>
                  <ArrowRight
                    size={15}
                    className="text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-[#c92830]"
                  />
                </Link>

                <Link
                  to="/products"
                  className="group flex items-center gap-3 rounded-xl border border-stone-200 p-3 transition hover:border-red-200 hover:bg-red-50/40"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600">
                    <Package size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-stone-800">
                      Quản lý sản phẩm
                    </span>
                    <span className="mt-1 block text-xs text-stone-500">
                      Tìm kiếm, chỉnh sửa và xuất bản
                    </span>
                  </span>
                  <ArrowRight
                    size={15}
                    className="text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-[#c92830]"
                  />
                </Link>

                <Link
                  to="/categories"
                  className="group flex items-center gap-3 rounded-xl border border-stone-200 p-3 transition hover:border-red-200 hover:bg-red-50/40"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600">
                    <Package size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-stone-800">
                      Danh mục & Phân loại
                    </span>
                    <span className="mt-1 block text-xs text-stone-500">
                      Quản lý danh mục, màu và nhãn
                    </span>
                  </span>
                  <ArrowRight
                    size={15}
                    className="text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-[#c92830]"
                  />
                </Link>
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-10 text-center">
          <Package className="mx-auto text-stone-300" size={28} />
          <p className="mt-3 text-sm font-semibold text-stone-700">
            Chưa có số liệu để hiển thị
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Tải lại dữ liệu để thử lại.
          </p>
        </div>
      )}

      <p className="text-[11px] leading-5 text-stone-400">
        Số liệu được tính từ danh sách sản phẩm mà tài khoản hiện tại có quyền
        quản lý. Dashboard chưa hiển thị doanh thu, đơn hàng hoặc lịch sử hoạt
        động vì chưa xác nhận nguồn dữ liệu và quy tắc nghiệp vụ cho các mục đó.
      </p>
    </section>
  );
}

export default DashboardPage;
