import { MoreHorizontal, Pencil } from "lucide-react";
import type { Product } from "../../../types/database";

export type ProductCardProps = {
  product: Product;
  categoryName?: string;
  colorName?: string;
  colorHex?: string;
  badgeName?: string;
  stock?: number;
  onEdit?: (product: Product) => void;
  onMore?: (product: Product) => void;
};

const statusStyles: Record<string, string> = {
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  draft: "border-amber-200 bg-amber-50 text-amber-700",
  archived: "border-stone-200 bg-stone-100 text-stone-500",
};

const statusLabels: Record<string, string> = {
  published: "Đang bán",
  draft: "Chờ xuất bản",
  archived: "Đã lưu trữ",
};

const money = (value: number | string) =>
  `${Number(value).toLocaleString("vi-VN")} ₫`;

export default function ProductCard({
  product,
  categoryName,
  colorName,
  colorHex,
  badgeName,
  stock,
  onEdit,
  onMore,
}: ProductCardProps) {
  const primaryImage =
    product.images?.find((image) => image.is_primary) ?? product.images?.[0];
  const status = product.status;

  return (
    <article className="rounded-[22px] border border-[#e9e0d7] bg-white p-4 shadow-sm shadow-stone-900/[0.02] overflow-hidden">
      <div className="flex gap-3">
        <div className="h-[96px] w-[96px] shrink-0 overflow-hidden rounded-2xl border border-stone-100 bg-[#f7f3ed]">
          {primaryImage ? (
            <img
              src={primaryImage.image_url}
              alt={primaryImage.alt || product.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-stone-400">
              Chưa có ảnh
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <span className="max-w-[70%] truncate rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-600">
              {categoryName || "Chưa phân loại"}
            </span>
            <span
              className="shrink-0 text-[10px] text-stone-500"
              title={product.slug || product.id}
            >
              {product.slug || product.id.slice(0, 12)}
            </span>
          </div>
          <h3
            className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-5 text-stone-900"
            title={product.name}
          >
            {product.name}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-stone-500">
            {product.description || "Chưa có mô tả"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {colorName && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-[#f5f1eb] px-2 py-1 text-[11px] text-stone-600">
                <span
                  className="h-2.5 w-2.5 rounded-full border border-black/10"
                  style={{ backgroundColor: colorHex || "#e7e5e4" }}
                />
                {colorName}
              </span>
            )}
            <span
              className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${badgeName ? "border-blue-200 bg-blue-50 text-blue-700" : "border-red-200 bg-red-50 text-red-600"}`}
            >
              {badgeName || "Chưa gắn nhãn"}
            </span>
            <span
              className={`rounded-full border px-2 py-1 text-[11px] font-medium ${statusStyles[status] || "border-stone-200 bg-stone-50 text-stone-600"}`}
            >
              {statusLabels[status] || status}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eee8e1] pt-3">
        <div className="min-w-0">
          <div className="text-[11px] text-stone-500">Giá bán niêm yết</div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[20px] font-bold leading-tight text-stone-900">
              {money(product.price)}
            </span>
            {stock !== undefined && (
              <span
                className={`text-xs font-medium ${stock === 0 ? "text-red-600" : "text-stone-600"}`}
              >
                Tồn: {stock}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={`Chỉnh sửa ${product.name}`}
            title="Chỉnh sửa"
            onClick={() => onEdit?.(product)}
            disabled={!onEdit}
            className="grid h-11 w-11 place-items-center rounded-xl bg-[#f5f0ea] text-stone-700 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Pencil size={19} />
          </button>
          <button
            type="button"
            aria-label={`Thao tác khác với ${product.name}`}
            title="Thao tác khác"
            onClick={() => onMore?.(product)}
            disabled={!onMore}
            className="grid h-11 w-11 place-items-center rounded-xl bg-[#f5f0ea] text-stone-700 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}
