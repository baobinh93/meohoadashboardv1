import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ImagePlus,
  Star,
  Trash2,
  X,
  Save,
  UploadCloud,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import type { Product, ProductImage } from "../../../types/database";
import type { Badge } from "../../../services/rpcContract";
import { useToast } from "../../../components/layout/ToastProvider";

type Option = {
  id: string;
  name: string;
  is_active?: boolean;
  hex_code?: string | null;
};
export type ProductEditValues = {
  name: string;
  price: number;
  original_price: number | null;
  description: string | null;
  category_id: string;
  color_id: string;
  badge_id: string | null;
  status: Product["status"];
};
type ProductEditModalProps = {
  product: Product;
  categories: Option[];
  colors: Option[];
  badges: Badge[];
  onClose: () => void;
  onSave: (productId: string, values: ProductEditValues) => Promise<void>;
  onAddImages: (productId: string, files: File[]) => Promise<void>;
  onDeleteImage: (productId: string, imageId: string) => Promise<void>;
  onSetPrimaryImage: (productId: string, imageId: string) => Promise<void>;
  onRefreshImages: (productId: string) => Promise<ProductImage[]>;
};
const inputClass =
  "mt-1 w-full rounded-xl border border-[#e9e0d7] bg-white px-3 py-2.5 text-base text-stone-800 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-50";

export default function ProductEditModal({
  product,
  categories,
  colors,
  badges,
  onClose,
  onSave,
  onAddImages,
  onDeleteImage,
  onSetPrimaryImage,
  onRefreshImages,
}: ProductEditModalProps) {
  const toast = useToast();
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price ?? ""));
  const [originalPrice, setOriginalPrice] = useState(
    product.original_price == null ? "" : String(product.original_price),
  );
  const [description, setDescription] = useState(product.description ?? "");
  const [categoryId, setCategoryId] = useState(product.category_id);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );
  const [colorId, setColorId] = useState(product.color_id);
  const [colorOpen, setColorOpen] = useState(false);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const selectedColor = colors.find((color) => color.id === colorId);
  const [badgeId, setBadgeId] = useState(product.badge_id ?? "");
  const [badgeOpen, setBadgeOpen] = useState(false);
  const badgeDropdownRef = useRef<HTMLDivElement>(null);
  const selectedBadge = badges.find((badge) => badge.id === badgeId);
  const [status, setStatus] = useState<Product["status"]>(product.status);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<ProductImage[]>(product.images ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty =
    name !== product.name ||
    price !== String(product.price ?? "") ||
    originalPrice !==
      (product.original_price == null ? "" : String(product.original_price)) ||
    description !== (product.description ?? "") ||
    categoryId !== product.category_id ||
    colorId !== product.color_id ||
    badgeId !== (product.badge_id ?? "") ||
    status !== product.status;
  const canClose = !saving && !imageBusy;
  const activeBadges = useMemo(
    () => badges.filter((b) => b.is_active || b.id === badgeId),
    [badges, badgeId],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!categoryDropdownRef.current?.contains(target))
        setCategoryOpen(false);
      if (!colorDropdownRef.current?.contains(target)) setColorOpen(false);
      if (!badgeDropdownRef.current?.contains(target)) setBadgeOpen(false);
      if (!statusDropdownRef.current?.contains(target)) setStatusOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setImages(product.images ?? []);
  }, [product.id, product.images]);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && canClose) close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // close behavior intentionally uses current form state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canClose, dirty]);

  function close() {
    if (!canClose) return;
    if (
      (dirty || newFiles.length > 0) &&
      !window.confirm("Bạn có thay đổi chưa lưu. Đóng mà không lưu?")
    )
      return;
    onClose();
  }
  async function runImageAction(action: () => Promise<void>, success: string) {
    setError("");
    setNotice("");
    setImageBusy(true);
    try {
      await action();
      setNotice("");
      toast.success(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể cập nhật hình ảnh.");
    } finally {
      setImageBusy(false);
    }
  }
  async function addImages() {
    const valid = newFiles.filter(
      (f) =>
        f.size <= 10 * 1024 * 1024 &&
        ["image/jpeg", "image/png", "image/webp"].includes(f.type),
    );
    if (valid.length !== newFiles.length) {
      setError("Chỉ hỗ trợ JPG, PNG, WEBP tối đa 10MB/ảnh.");
      return;
    }
    if (!valid.length) return;
    await runImageAction(async () => {
      await onAddImages(product.id, valid);
      // Refresh parent-owned product data via page reload callback is not exposed; append placeholders only after service confirms.
      setImages(await onRefreshImages(product.id));
      setNewFiles([]);
    }, "Đã thêm ảnh.");
  }
  async function removeImage(image: ProductImage) {
    if (
      !window.confirm(
        image.is_primary
          ? "Đây là ảnh đại diện. Xóa ảnh này và để hệ thống xử lý ảnh đại diện thay thế?"
          : "Xóa ảnh này khỏi sản phẩm?",
      )
    )
      return;
    await runImageAction(async () => {
      await onDeleteImage(product.id, image.id);
      setImages(await onRefreshImages(product.id));
    }, "Đã xóa ảnh.");
  }
  async function choosePrimary(image: ProductImage) {
    if (image.is_primary) return;
    await runImageAction(async () => {
      await onSetPrimaryImage(product.id, image.id);
      setImages(await onRefreshImages(product.id));
    }, "Đã đổi ảnh đại diện.");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const p = Number(price);
    const op = originalPrice.trim() ? Number(originalPrice) : null;
    if (!name.trim()) return setError("Vui lòng nhập tên sản phẩm.");
    if (!price.trim() || !Number.isFinite(p) || p < 0)
      return setError("Giá bán không hợp lệ.");
    if (op !== null && (!Number.isFinite(op) || op < 0))
      return setError("Giá gốc không hợp lệ.");
    if (!categoryId || !colorId)
      return setError("Vui lòng chọn danh mục và màu sắc.");
    setSaving(true);
    try {
      await onSave(product.id, {
        name: name.trim(),
        price: p,
        original_price: op,
        description: description.trim() || null,
        category_id: categoryId,
        color_id: colorId,
        badge_id: badgeId || null,
        status,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được sản phẩm.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-edit-title"
        className="flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-[#fffdfa] shadow-2xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between border-b border-stone-200 px-4 py-4 sm:px-6">
          <div>
            <h2
              id="product-edit-title"
              className="text-lg font-bold text-stone-900"
            >
              Sửa sản phẩm
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Chỉnh sửa thông tin, hình thức cung cấp và hình ảnh.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={!canClose}
            aria-label="Đóng modal"
            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </header>
        <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
            <label className="sm:col-span-2 text-xs font-semibold text-stone-700">
              Tên sản phẩm
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                maxLength={200}
                required
              />
            </label>
            <label className="text-xs font-semibold text-stone-700">
              Giá bán (₫)
              <input
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="text-xs font-semibold text-stone-700">
              Giá gốc (₫) — không bắt buộc
              <input
                type="number"
                min="0"
                step="1"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="sm:col-span-2 text-xs font-semibold text-stone-700">
              Mô tả
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="Mô tả sản phẩm..."
              />
            </label>
            <div
              className="relative text-xs font-semibold text-stone-700"
              ref={categoryDropdownRef}
            >
              <label className="mb-1 block" id="product-edit-category-label">
                Danh mục
              </label>
              <button
                type="button"
                aria-labelledby="product-edit-category-label"
                aria-haspopup="listbox"
                aria-expanded={categoryOpen}
                onClick={() => {
                  setCategoryOpen((open) => !open);
                  setColorOpen(false);
                  setBadgeOpen(false);
                  setStatusOpen(false);
                }}
                className={`${inputClass} flex min-h-[42px] items-center justify-between gap-3 text-left`}
              >
                <span className="truncate font-normal">
                  {selectedCategory?.name || "Chọn danh mục"}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-stone-500 transition-transform ${categoryOpen ? "rotate-180" : ""}`}
                />
              </button>
              {categoryOpen && (
                <div
                  role="listbox"
                  aria-label="Chọn danh mục"
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#e9e0d7] bg-white p-1.5 shadow-lg"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={!categoryId}
                    onClick={() => {
                      setCategoryId("");
                      setCategoryOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left font-normal hover:bg-[#f4eee6] ${!categoryId ? "bg-[#f4eee6] font-semibold" : ""}`}
                  >
                    Chọn danh mục
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      role="option"
                      aria-selected={categoryId === category.id}
                      onClick={() => {
                        setCategoryId(category.id);
                        setCategoryOpen(false);
                      }}
                      className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left font-normal hover:bg-[#f4eee6] ${categoryId === category.id ? "bg-[#f4eee6] font-semibold" : ""}`}
                    >
                      <span className="truncate">{category.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div
              className="relative text-xs font-semibold text-stone-700"
              ref={colorDropdownRef}
            >
              <label className="mb-1 block" id="product-edit-color-label">
                Màu sắc
              </label>
              <button
                type="button"
                aria-labelledby="product-edit-color-label"
                aria-haspopup="listbox"
                aria-expanded={colorOpen}
                onClick={() => {
                  setColorOpen((open) => !open);
                  setCategoryOpen(false);
                  setBadgeOpen(false);
                  setStatusOpen(false);
                }}
                className={`${inputClass} flex min-h-10.5 items-center justify-between gap-3 
                text-left`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {selectedColor && (
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                      style={{
                        backgroundColor: selectedColor.hex_code || "#e7e5e4",
                      }}
                    />
                  )}
                  <span className="truncate font-normal">
                    {selectedColor?.name || "Chọn màu sắc"}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-stone-500 transition-transform ${colorOpen ? "rotate-180" : ""}`}
                />
              </button>

              {colorOpen && (
                <div
                  role="listbox"
                  aria-label="Chọn màu sắc"
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#e9e0d7] bg-white p-1.5 shadow-lg"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={!colorId}
                    onClick={() => {
                      setColorId("");
                      setColorOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left font-normal hover:bg-[#f4eee6] ${
                      !colorId ? "bg-[#f4eee6] font-semibold" : ""
                    }`}
                  >
                    Chọn màu sắc
                  </button>
                  {colors.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      role="option"
                      aria-selected={colorId === color.id}
                      onClick={() => {
                        setColorId(color.id);
                        setColorOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-normal hover:bg-[#f4eee6] ${
                        colorId === color.id ? "bg-[#f4eee6] font-semibold" : ""
                      }`}
                    >
                      <span
                        className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                        style={{
                          backgroundColor: color.hex_code || "#e7e5e4",
                        }}
                      />
                      <span className="truncate">{color.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div
              className="relative text-xs font-semibold text-stone-700"
              ref={badgeDropdownRef}
            >
              <label className="mb-1 block" id="product-edit-badge-label">
                Hình thức cung cấp
              </label>
              <button
                type="button"
                aria-labelledby="product-edit-badge-label"
                aria-haspopup="listbox"
                aria-expanded={badgeOpen}
                onClick={() => {
                  setBadgeOpen((open) => !open);
                  setCategoryOpen(false);
                  setColorOpen(false);
                  setStatusOpen(false);
                }}
                className={`${inputClass} flex min-h-[42px] items-center justify-between gap-3 text-left`}
              >
                <span className="truncate font-normal">
                  {selectedBadge?.name || "Không gắn nhãn"}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-stone-500 transition-transform ${badgeOpen ? "rotate-180" : ""}`}
                />
              </button>
              {badgeOpen && (
                <div
                  role="listbox"
                  aria-label="Chọn hình thức cung cấp"
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#e9e0d7] bg-white p-1.5 shadow-lg"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={!badgeId}
                    onClick={() => {
                      setBadgeId("");
                      setBadgeOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left font-normal hover:bg-[#f4eee6] ${!badgeId ? "bg-[#f4eee6] font-semibold" : ""}`}
                  >
                    Không gắn nhãn
                  </button>
                  {activeBadges.map((badge) => (
                    <button
                      key={badge.id}
                      type="button"
                      role="option"
                      aria-selected={badgeId === badge.id}
                      onClick={() => {
                        setBadgeId(badge.id);
                        setBadgeOpen(false);
                      }}
                      className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left font-normal hover:bg-[#f4eee6] ${badgeId === badge.id ? "bg-[#f4eee6] font-semibold" : ""}`}
                    >
                      <span className="truncate">{badge.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <span className="mt-1 block text-[11px] font-normal text-stone-500">
                Ví dụ: CÓ SẴN hoặc THEO YÊU CẦU
              </span>
            </div>
            <div
              className="relative text-xs font-semibold text-stone-700"
              ref={statusDropdownRef}
            >
              <label className="mb-1 block" id="product-edit-status-label">
                Trạng thái xuất bản
              </label>
              <button
                type="button"
                aria-labelledby="product-edit-status-label"
                aria-haspopup="listbox"
                aria-expanded={statusOpen}
                onClick={() => {
                  setStatusOpen((open) => !open);
                  setCategoryOpen(false);
                  setColorOpen(false);
                  setBadgeOpen(false);
                }}
                className={`${inputClass} flex min-h-[42px] items-center justify-between gap-3 text-left`}
              >
                <span className="truncate font-normal">
                  {status === "published"
                    ? "Online"
                    : status === "archived"
                      ? "Offline"
                      : "Chờ xuất bản"}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-stone-500 transition-transform ${statusOpen ? "rotate-180" : ""}`}
                />
              </button>
              {statusOpen && (
                <div
                  role="listbox"
                  aria-label="Chọn trạng thái xuất bản"
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#e9e0d7] bg-white p-1.5 shadow-lg"
                >
                  {status === "draft" && (
                    <button
                      type="button"
                      role="option"
                      aria-selected={status === "draft"}
                      onClick={() => {
                        setStatus("draft");
                        setStatusOpen(false);
                      }}
                      className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left font-normal hover:bg-[#f4eee6] ${status === "draft" ? "bg-[#f4eee6] font-semibold" : ""}`}
                    >
                      Chờ xuất bản
                    </button>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={status === "published"}
                    onClick={() => {
                      setStatus("published");
                      setStatusOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left font-normal hover:bg-[#f4eee6] ${status === "published" ? "bg-[#f4eee6] font-semibold" : ""}`}
                  >
                    Online
                  </button>
                  <button
                    type="button"
                    role="option"
                    aria-selected={status === "archived"}
                    onClick={() => {
                      setStatus("archived");
                      setStatusOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left font-normal hover:bg-[#f4eee6] ${status === "archived" ? "bg-[#f4eee6] font-semibold" : ""}`}
                  >
                    Offline
                  </button>
                </div>
              )}
            </div>
            <section className="sm:col-span-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-stone-700">
                  Hình ảnh sản phẩm
                </p>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100">
                  <ImagePlus size={14} /> Thêm ảnh
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={imageBusy || saving}
                    onChange={(e) => {
                      setError("");
                      setNewFiles((cur) => [
                        ...cur,
                        ...Array.from(e.target.files ?? []),
                      ]);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              {images.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="relative aspect-square overflow-hidden rounded-lg border border-stone-200 bg-white"
                    >
                      <img
                        src={img.image_url}
                        alt={img.alt || product.name}
                        className="h-full w-full object-cover"
                      />
                      {img.is_primary && (
                        <span className="absolute inset-x-0 bottom-0 bg-black/65 px-1 py-1 text-center text-[10px] font-semibold text-white">
                          Ảnh đại diện
                        </span>
                      )}
                      <div className="absolute inset-x-1 top-1 flex justify-between gap-1">
                        <button
                          type="button"
                          title="Đặt làm ảnh đại diện"
                          disabled={imageBusy || saving || img.is_primary}
                          onClick={() => void choosePrimary(img)}
                          className={`rounded-md p-1.5 text-white ${img.is_primary ? "bg-amber-500" : "bg-black/60 hover:bg-amber-500"}`}
                        >
                          <Star
                            size={13}
                            fill={img.is_primary ? "currentColor" : "none"}
                          />
                        </button>
                        <button
                          type="button"
                          title="Xóa ảnh"
                          disabled={imageBusy || saving}
                          onClick={() => void removeImage(img)}
                          className="rounded-md bg-black/60 p-1.5 text-white hover:bg-red-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-stone-500">
                  Sản phẩm chưa có ảnh.
                </p>
              )}
              {newFiles.length > 0 && (
                <div className="mt-3 rounded-lg border border-dashed border-stone-300 bg-white p-3">
                  <p className="text-xs font-semibold">
                    Ảnh mới chọn: {newFiles.length}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {newFiles.map((f, i) => (
                      <span
                        key={`${f.name}-${i}`}
                        className="max-w-full truncate rounded-md bg-stone-100 px-2 py-1 text-[11px]"
                      >
                        {f.name}
                        <button
                          type="button"
                          className="ml-2 text-red-600"
                          onClick={() =>
                            setNewFiles((cur) => cur.filter((_, j) => i !== j))
                          }
                          aria-label={`Bỏ ${f.name}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={imageBusy || saving}
                    onClick={() => void addImages()}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#c92830] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {imageBusy ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <UploadCloud size={14} />
                    )}{" "}
                    Tải ảnh lên và lưu
                  </button>
                </div>
              )}
            </section>
            {notice && (
              <p
                role="status"
                className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
              >
                {notice}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              >
                {error}
              </p>
            )}
          </div>
          <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-stone-200 bg-[#fffdfa] px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={close}
              disabled={!canClose}
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || imageBusy || !dirty}
              className="inline-flex items-center gap-2 rounded-xl bg-[#c92830] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#ad2028] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={15} />
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
