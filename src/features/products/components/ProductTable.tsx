import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Send,
} from "lucide-react";
import type { Product } from "../../../types/database";

export type ProductTableProps = {
  products: Product[];
  categories: { id: string; name: string }[];
  colors: { id: string; name: string; hex_code?: string | null }[];
  badges: {
    id: string;
    name: string;
    background_color?: string | null;
    text_color?: string | null;
  }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onTogglePage: () => void;
  onEdit?: (product: Product) => void;
  onMore?: (product: Product) => void;
  onPublish?: (product: Product) => void;
  loading?: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

const statusStyles: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700",
  draft: "bg-amber-50 text-amber-700",
  archived: "bg-stone-100 text-stone-500",
};

const statusLabels: Record<string, string> = {
  published: "Online",
  draft: "Chờ xuất bản",
  archived: "Offline",
};

const money = (value: number | string) =>
  `${Number(value).toLocaleString("vi-VN")} ₫`;

export default function ProductTable({
  products,
  categories,
  colors,
  badges,
  selectedIds,
  onToggle,
  onTogglePage,
  onEdit,
  onMore,
  onPublish,
  loading = false,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: ProductTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const allSelected =
    products.length > 0 &&
    products.every((product) => selectedIds.includes(product.id));

  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm md:block">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <span className="text-xs font-semibold text-stone-800">
          Danh sách {totalItems} sản phẩm
        </span>
        <span className="text-[11px] text-stone-400">
          Hiển thị {start}–{end} của {totalItems} sản phẩm
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-[#fcfbfa] text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả sản phẩm trên trang"
                  checked={allSelected}
                  onChange={onTogglePage}
                  className="h-4 w-4 cursor-pointer accent-[#c92830]"
                />
              </th>
              <th className="px-3 py-3">Sản phẩm</th>
              {/* <th className="px-3 py-3">SLUG</th> */}
              <th className="px-3 py-3 text-center">Danh mục</th>
              <th className="px-3 py-3 text-center">Màu sắc</th>
              <th className="px-3 py-3 text-center">Nhãn sản phẩm</th>
              <th className="px-3 py-3 text-center">Giá niêm yết</th>
              {/* <th className="px-3 py-3 text-center">Ảnh</th> */}
              <th className="px-3 py-3 text-center">Trạng thái</th>
              <th className="px-3 py-3 text-center">Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-16 text-center text-stone-400"
                >
                  Đang tải sản phẩm...
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const category = categories.find(
                  (item) => item.id === product.category_id,
                );

                const color = colors.find(
                  (item) => item.id === product.color_id,
                );

                const badge = badges.find(
                  (item) => item.id === product.badge_id,
                );

                const image =
                  product.images?.find((item) => item.is_primary) ??
                  product.images?.[0];

                const isSelected = selectedIds.includes(product.id);

                return (
                  <tr
                    key={product.id}
                    className={`border-b border-stone-100 last:border-0 hover:bg-[#fdfbf9] ${
                      isSelected ? "bg-red-50/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${product.name}`}
                        checked={isSelected}
                        onChange={() => onToggle(product.id)}
                        className="h-4 w-4 cursor-pointer accent-[#c92830]"
                      />
                    </td>

                    <td className="min-w-37.5 px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-stone-100 bg-stone-50">
                          {image ? (
                            <img
                              src={image.image_url}
                              alt={image.alt || product.name}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-[10px] text-stone-400">
                              Chưa có ảnh
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="line-clamp-2 font-semibold leading-5 text-stone-800">
                            {product.name}
                          </div>
                          <div className="mt-0.5 line-clamp-1 text-[10px] text-stone-400">
                            {product.description || "Chưa có mô tả"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* <td className="max-w-24 px-3 py-3 font-mono text-[10px] text-stone-500">
                      <span title={product.slug || product.id}>
                        {(product.slug || product.id).slice(0, 12)}
                      </span>
                    </td> */}

                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex max-w-28 rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] text-red-700">
                        {category?.name || "Chưa phân loại"}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      <span className="flex items-center justify-center gap-2 whitespace-nowrap text-stone-600">
                        <span
                          className="h-3 w-3 rounded-full border border-black/10"
                          style={{
                            backgroundColor: color?.hex_code || "#e7e5e4",
                          }}
                        />
                        {/* {color?.name || "—"} */}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center">
                      {badge && (
                        <span
                          className="inline-flex rounded-full border border-transparent px-2 py-1 text-[10px] font-semibold"
                          style={{
                            backgroundColor:
                              badge.background_color || "#E5F1E8",
                            color: badge.text_color || "#286344",
                          }}
                        >
                          {badge.name}
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3  font-semibold text-stone-800 text-center">
                      {money(product.price)}
                    </td>

                    {/* <td className="px-3 py-3 text-center text-stone-600">
                      {product.images?.length ?? 0}
                    </td> */}

                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${
                          statusStyles[product.status] ||
                          "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {statusLabels[product.status] || product.status}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {product.status === "draft" && onPublish && (
                          <button
                            type="button"
                            title="Xuất bản"
                            aria-label={`Xuất bản ${product.name}`}
                            onClick={() => onPublish(product)}
                            className="rounded-md bg-transparent p-2 text-stone-400 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <Send size={15} />
                          </button>
                        )}

                        <button
                          type="button"
                          title="Chỉnh sửa"
                          aria-label={`Chỉnh sửa ${product.name}`}
                          disabled={!onEdit}
                          onClick={() => onEdit?.(product)}
                          className="rounded-md bg-transparent p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          title="Thao tác khác"
                          aria-label={`Thao tác khác với ${product.name}`}
                          disabled={!onMore}
                          onClick={() => onMore?.(product)}
                          className="rounded-md bg-transparent p-2 text-stone-400 hover:bg-stone-100 disabled:opacity-40"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}

            {!loading && products.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-16 text-center text-sm text-stone-400"
                >
                  Không tìm thấy sản phẩm.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        className="flex items-center justify-between gap-4 border-t border-stone-100 
      px-5 py-3"
      >
        <div className="flex items-center gap-2 text-[11px] text-stone-500">
          Hiển thị
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="w-[62px] rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          trên mỗi trang
          {selectedIds.length > 0 && (
            <span className="text-red-700">· Đã chọn {selectedIds.length}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Trang trước"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-md border border-stone-200 bg-white p-2 text-stone-500 hover:bg-stone-50 disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>

          <span className="min-w-16 text-center text-xs text-stone-600">
            Trang {page}/{totalPages}
          </span>

          <button
            type="button"
            aria-label="Trang sau"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-md border border-stone-200 bg-white p-2 text-stone-500 hover:bg-stone-50 disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
