import { useEffect, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import {
  PlusCircle,
  Package,
  ImagePlus,
  UploadCloud,
  X,
  RefreshCw,
  Trash2,
  Check,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { createProductWithImages } from "../../../services/productService";
import type { Category, Color } from "../../../types/database";

type PendingProduct = {
  key: string;
  name: string;
  price: string;
  originalPrice: string;
  description: string;
  categoryId: string;
  colorId: string;
  files: File[];
};

type ProductAddModalProps = {
  categories: Category[];
  colors: Color[];
  existingProductCount: number;
  onClose: () => void;
  onCreated: (createdCount: number, message: string) => Promise<void> | void;
};

const money = (value: number | string) =>
  `${Number(value).toLocaleString("vi-VN")} ₫`;
const inputClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-base sm:text-sm text-stone-800 font-normal outline-none transition placeholder:text-stone-400 focus:border-red-300 focus:ring-2 focus:ring-red-50";

// Chỉnh sửa các lựa chọn mô tả nhanh tại đây.
// power: chọn nhiều; motion: chỉ chọn một lựa chọn.
const optionData = {
  power: {
    battery: "pin",
    electric: "điện",
    solar: "năng lượng mặt trời",
  },
  motion: {
    waving: "vẫy tay",
    notWaving: "không vẫy tay",
  },
} as const;

const DESCRIPTION_MAX_LENGTH = 200;

export default function ProductAddModal({
  categories,
  colors,
  existingProductCount,
  onClose,
  onCreated,
}: ProductAddModalProps) {
  // Modal tự lọc danh mục và màu sắc đang hoạt động; không phụ thuộc biến của ProductsPage.
  const activeCategories = categories.filter((item) => item.is_active);
  const activeColors = colors.filter((item) => item.is_active);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const priceInvalid = price.length > 0 && !/^\d+$/.test(price);
  const originalPriceInvalid =
    originalPrice.length > 0 && !/^\d+$/.test(originalPrice);
  const [customDescription, setCustomDescription] = useState("");
  const [selectedDescriptionOptions, setSelectedDescriptionOptions] = useState<
    string[]
  >([]);
  const [descriptionOptionError, setDescriptionOptionError] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [colorId, setColorId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [queueOpen, setQueueOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const selectedCategory = activeCategories.find(
    (category) => category.id === categoryId,
  );
  const [colorOpen, setColorOpen] = useState(false);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const selectedColor = activeColors.find((color) => color.id === colorId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const creatingRef = useRef(false);

  useEffect(() => {
    if (!categoryOpen && !colorOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (categoryOpen && !categoryDropdownRef.current?.contains(event.target))
        setCategoryOpen(false);
      if (colorOpen && !colorDropdownRef.current?.contains(event.target))
        setColorOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCategoryOpen(false);
        setColorOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [categoryOpen, colorOpen]);

  function resetForm() {
    setName("");
    setPrice("");
    setOriginalPrice("");
    setCustomDescription("");
    setSelectedDescriptionOptions([]);
    setDescriptionOptionError("");
    setFiles([]);
    setError("");
    setCategoryId("");
    setColorId("");
  }

  function handleToggleDescriptionOption(
    option: string,
    checked: boolean,
    group: "power" | "motion",
  ) {
    const groupLabels: readonly string[] = Object.values(optionData[group]);
    let nextOptions: string[];

    if (group === "motion" && checked) {
      // Nhóm vẫy tay: chỉ được chọn một lựa chọn.
      nextOptions = [
        ...selectedDescriptionOptions.filter(
          (item) => !groupLabels.includes(item),
        ),
        option,
      ];
    } else {
      nextOptions = checked
        ? [...selectedDescriptionOptions, option]
        : selectedDescriptionOptions.filter((item) => item !== option);
    }

    setSelectedDescriptionOptions(nextOptions);
    setDescriptionOptionError("");
  }

  function handleResetForm() {
    const hasData =
      Boolean(name.trim()) ||
      Boolean(price) ||
      Boolean(originalPrice) ||
      Boolean(customDescription.trim()) ||
      selectedDescriptionOptions.length > 0 ||
      files.length > 0;

    if (!hasData) return;
    const confirmed = window.confirm(
      "Bạn có chắc muốn làm mới biểu mẫu? Thông tin và ảnh đang nhập sẽ bị xóa.",
    );
    if (confirmed) resetForm();
  }

  function handleClearQueue() {
    if (!pendingProducts.length || busy) return;
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa tất cả ${pendingProducts.length} sản phẩm khỏi hàng chờ? Thao tác này không thể hoàn tác.`,
    );
    if (confirmed) setPendingProducts([]);
  }

  function handleAddToQueue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError("Vui lòng nhập tên sản phẩm.");
    if (!price || !/^\d+$/.test(price) || !Number.isFinite(Number(price)))
      return setError("Giá niêm yết chỉ được nhập số nguyên không âm.");
    if (
      originalPrice.trim() &&
      (!/^\d+$/.test(originalPrice) || !Number.isFinite(Number(originalPrice)))
    )
      return setError("Giá gốc chỉ được nhập số nguyên không âm.");
    if (!files.length)
      return setError("Vui lòng chọn ít nhất một ảnh sản phẩm.");
    if (!categoryId || !colorId)
      return setError("Vui lòng chọn danh mục và màu sắc.");

    // Tự ghép mô tả khi thêm vào hàng chờ; không thêm dấu đầu dòng.
    const customLines = customDescription
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const selectedOptionsInDisplayOrder = [
      ...Object.values(optionData.power).filter((item) =>
        selectedDescriptionOptions.includes(item),
      ),
      ...Object.values(optionData.motion).filter((item) =>
        selectedDescriptionOptions.includes(item),
      ),
    ];
    const finalDescription = [
      ...selectedOptionsInDisplayOrder,
      ...customLines,
    ].join(", ");

    if (finalDescription.length > DESCRIPTION_MAX_LENGTH) {
      setDescriptionOptionError(
        `Mô tả tối đa ${DESCRIPTION_MAX_LENGTH} ký tự. Hãy rút gọn nội dung trước khi thêm vào hàng chờ.`,
      );
      return;
    }

    setDescriptionOptionError("");
    setPendingProducts((current) => [
      ...current,
      {
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim(),
        price,
        originalPrice,
        description: finalDescription,
        categoryId,
        colorId,
        files: [...files],
      },
    ]);
    resetForm();
  }

  async function handleCreateQueuedProducts() {
    if (creatingRef.current || !pendingProducts.length) return;
    creatingRef.current = true;
    setBusy(true);
    setError("");
    const queueAtStart = [...pendingProducts];
    const failedItems: PendingProduct[] = [];
    const failureMessages: string[] = [];
    let created = 0;
    try {
      for (const item of queueAtStart) {
        try {
          await createProductWithImages({
            name: item.name,
            price: Number(item.price),
            original_price: item.originalPrice.trim()
              ? Number(item.originalPrice)
              : null,
            description: item.description || null,
            category_id: item.categoryId,
            color_id: item.colorId,
            badge_id: null,
            sort_order: existingProductCount + created,
            files: item.files,
          });
          created += 1;
        } catch (e) {
          failedItems.push(item);
          failureMessages.push(
            `${item.name}: ${e instanceof Error ? e.message : "Tạo sản phẩm thất bại."}`,
          );
        }
      }
      setPendingProducts(failedItems);
      if (failedItems.length === 0) {
        flushSync(() => onClose());
        setPendingProducts([]);
        resetForm();
        setError("");
        await onCreated(created, `Đã tạo thành công ${created} sản phẩm nháp.`);
      } else if (created > 0) {
        setError(
          `Đã tạo thành công ${created}/${queueAtStart.length} sản phẩm. Các sản phẩm lỗi vẫn được giữ trong hàng chờ để kiểm tra. ${failureMessages.join(" · ")}`,
        );
        await onCreated(created, "");
      } else {
        setError(`Chưa tạo được sản phẩm nào. ${failureMessages.join(" · ")}`);
      }
    } finally {
      creatingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:p-4 lg:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-product-title"
        className="flex h-dvh w-full max-w-375 flex-col overflow-hidden bg-[#fffdf9] shadow-2xl sm:h-[min(94dvh,1050px)] sm:rounded-2xl sm:border sm:border-[#e8dccc]"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#eee3d5] bg-[#fcf8f2] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#c92830] text-white shadow-sm">
              <PlusCircle size={23} />
            </div>
            <div>
              <h2
                id="create-product-title"
                className="text-lg font-bold text-slate-900"
              >
                Thêm nhiều sản phẩm
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Thêm sản phẩm vào hàng chờ, sau đó tạo tất cả cùng lúc
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            disabled={busy}
            onClick={() => onClose()}
            className="rounded-xl bg-[#f2e8da] p-2.5 text-slate-600 transition hover:bg-[#e8d9c5] disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-rows-1 lg:grid-cols-[minmax(0,1.28fr)_minmax(380px,0.92fr)]">
          <form
            onSubmit={handleAddToQueue}
            className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6"
          >
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
              >
                {error}
              </div>
            )}

            <section>
              <div className="mb-3 flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#c92830] text-xs font-bold text-white">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Thêm hình ảnh sản phẩm
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Có thể chọn nhiều ảnh cùng lúc. Hỗ trợ JPG, PNG, WEBP (tối
                    đa 10MB/ảnh).
                  </p>
                </div>
              </div>

              <label
                className="flex min-h-25 cursor-pointer flex-col items-center justify-center
               rounded-xl border-2 border-dashed border-[#e7d7c4] bg-white px-3 py-3 
               text-center transition hover:border-[#c92830]/60 hover:bg-[#fffaf5] sm:min-h-38.75 sm:px-4 sm:py-6"
              >
                <UploadCloud
                  size={24}
                  className="text-[#b9a58d] sm:h-8.75 sm:w-8.75"
                />
                <span className="mt-1.5 text-sm font-semibold text-slate-700 sm:mt-2">
                  <span className="sm:hidden">Chạm để chọn ảnh</span>
                  <span className="hidden sm:inline">Kéo thả ảnh vào đây</span>
                </span>
                <span className="mt-1 hidden text-xs text-slate-400 sm:block">
                  hoặc
                </span>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#c92830] px-3 py-1.5 text-xs font-semibold text-[#c92830] sm:mt-3 sm:gap-2 sm:px-3.5 sm:py-2">
                  <ImagePlus size={14} className="sm:h-[15px] sm:w-[15px]" />{" "}
                  Chọn ảnh
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  disabled={busy}
                  className="sr-only"
                  onChange={(event) => {
                    const chosen = Array.from(event.target.files ?? []);
                    const valid = chosen.filter(
                      (file) => file.size <= 10 * 1024 * 1024,
                    );
                    if (valid.length !== chosen.length) {
                      setError(
                        "Có ảnh vượt quá giới hạn 10MB/ảnh nên chưa được thêm.",
                      );
                    }
                    setFiles((current) => [...current, ...valid]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              {files.length > 0 && (
                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Đã chọn {files.length} ảnh</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setFiles([])}
                      className="font-medium text-[#c92830] hover:underline"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {files.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-[#eadfD2] bg-white"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          aria-label={`Xóa ảnh ${file.name}`}
                          disabled={busy}
                          onClick={() =>
                            setFiles((current) =>
                              current.filter((_, i) => i !== index),
                            )
                          }
                          className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white opacity-100 transition hover:bg-[#c92830] sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#c92830] text-xs font-bold text-white">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Nhập thông tin sản phẩm
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Điền thông tin rồi thêm vào danh sách chờ bên phải.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs sm:font-semibold text-slate-700">
                  Tên sản phẩm <span className="text-[#c92830]">*</span>
                  <input
                    required
                    maxLength={200}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={`${inputClass} mt-1.5`}
                    placeholder="Nhập tên sản phẩm"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div
                    className="relative text-xs font-semibold text-slate-700"
                    ref={categoryDropdownRef}
                  >
                    <label
                      className="mb-1.5 block"
                      id="product-add-category-label"
                    >
                      Danh mục <span className="text-[#c92830]">*</span>
                    </label>
                    <button
                      type="button"
                      aria-labelledby="product-add-category-label"
                      aria-haspopup="listbox"
                      aria-expanded={categoryOpen}
                      disabled={busy}
                      onClick={() => setCategoryOpen((open) => !open)}
                      className={`${inputClass} flex text-sm min-h-10.5 items-center justify-between gap-3 text-left`}
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
                        className="absolute left-0 right-0 top-full z-60 mt-1 max-h-56 overflow-y-auto 
                        rounded-xl border border-[#e9e0d7] bg-white p-1.5 shadow-lg"
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={!categoryId}
                          onClick={() => {
                            setCategoryId("");
                            setCategoryOpen(false);
                          }}
                          className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left  hover:bg-[#f4eee6] ${!categoryId ? "bg-[#f4eee6] font-semibold" : ""}`}
                        >
                          Chọn danh mục
                        </button>
                        {activeCategories.map((category) => (
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
                    <input
                      type="text"
                      required
                      value={categoryId}
                      readOnly
                      tabIndex={-1}
                      aria-hidden="true"
                      className="pointer-events-none absolute h-px w-px opacity-0"
                    />
                  </div>
                  <div
                    className="relative text-xs font-semibold text-slate-700"
                    ref={colorDropdownRef}
                  >
                    <label
                      className="mb-1.5 block"
                      id="product-add-color-label"
                    >
                      Màu sắc <span className="text-[#c92830]">*</span>
                    </label>
                    <button
                      type="button"
                      aria-labelledby="product-add-color-label"
                      aria-haspopup="listbox"
                      aria-expanded={colorOpen}
                      disabled={busy}
                      onClick={() => setColorOpen((open) => !open)}
                      className={`${inputClass} mt-0 flex min-h-10.5 items-center justify-between gap-3 text-left`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {selectedColor && (
                          <span
                            className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                            style={{
                              backgroundColor:
                                selectedColor.hex_code || "#e7e5e4",
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
                        className="absolute left-0 right-0 top-full z-60 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#e9e0d7] bg-white p-1.5 shadow-lg"
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={!colorId}
                          onClick={() => {
                            setColorId("");
                            setColorOpen(false);
                          }}
                          className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left font-normal hover:bg-[#f4eee6] ${!colorId ? "bg-[#f4eee6] font-semibold" : ""}`}
                        >
                          Chọn màu sắc
                        </button>
                        {activeColors.map((color) => (
                          <button
                            key={color.id}
                            type="button"
                            role="option"
                            aria-selected={colorId === color.id}
                            onClick={() => {
                              setColorId(color.id);
                              setColorOpen(false);
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-normal hover:bg-[#f4eee6] ${colorId === color.id ? "bg-[#f4eee6] font-semibold" : ""}`}
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
                  <label className="block text-xs font-semibold text-slate-700">
                    Giá niêm yết <span className="text-[#c92830]">*</span>
                    <div className="relative mt-1.5">
                      <input
                        required
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={price}
                        aria-invalid={priceInvalid}
                        aria-describedby={
                          priceInvalid ? "product-price-error" : undefined
                        }
                        onChange={(event) => {
                          setPrice(event.target.value);
                          setError("");
                        }}
                        className={`${inputClass} pr-8 ${priceInvalid ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                        placeholder="Nhập giá bằng số"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        ₫
                      </span>
                    </div>
                    {priceInvalid && (
                      <span
                        id="product-price-error"
                        role="alert"
                        className="mt-1.5 flex items-center gap-1 text-[11px] font-normal text-red-600"
                      >
                        Chỉ được nhập số, không nhập chữ hoặc ký tự khác.
                      </span>
                    )}
                  </label>
                </div>

                <label className="block text-xs font-semibold text-slate-700">
                  Giá gốc (không bắt buộc)
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    value={originalPrice}
                    aria-invalid={originalPriceInvalid}
                    aria-describedby={
                      originalPriceInvalid
                        ? "product-original-price-error"
                        : undefined
                    }
                    onChange={(event) => {
                      setOriginalPrice(event.target.value);
                      setError("");
                    }}
                    className={`${inputClass} mt-1.5 ${originalPriceInvalid ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                    placeholder="Nhập giá gốc bằng số"
                  />
                  {originalPriceInvalid && (
                    <span
                      id="product-original-price-error"
                      role="alert"
                      className="mt-1.5 flex items-center gap-1 text-[11px] font-normal text-red-600"
                    >
                      Chỉ được nhập số, không nhập chữ hoặc ký tự khác.
                    </span>
                  )}
                </label>

                <div className="space-y-2.5">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-700">
                      Mô tả ngắn
                    </p>
                    <fieldset className="rounded-xl border border-[#eadfD2] bg-white p-3">
                      {/* Nhập mô tả tự do; mỗi dòng sẽ trở thành một dòng mô tả khi thêm vào hàng chờ */}
                      <div className="mt-2">
                        <textarea
                          value={customDescription}
                          maxLength={DESCRIPTION_MAX_LENGTH}
                          rows={2}
                          disabled={busy}
                          onChange={(event) => {
                            setCustomDescription(event.target.value);
                            setDescriptionOptionError("");
                          }}
                          className="w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-red-300 focus:ring-2 focus:ring-red-50"
                          placeholder={"Nhập mô tả..... "}
                        />
                      </div>

                      {/* Hàng 1: có thể chọn nhiều loại năng lượng */}
                      <div className="flex space-x-5">
                        {Object.entries(optionData.power).map(
                          ([key, label]) => (
                            <label
                              key={key}
                              className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-normal text-slate-700 hover:bg-[#faf5ee]"
                            >
                              <input
                                type="checkbox"
                                checked={selectedDescriptionOptions.includes(
                                  label,
                                )}
                                onChange={(event) =>
                                  handleToggleDescriptionOption(
                                    label,
                                    event.target.checked,
                                    "power",
                                  )
                                }
                                disabled={busy}
                                className="h-4 w-4 shrink-0 accent-[#c92830]"
                              />
                              <span>{label}</span>
                            </label>
                          ),
                        )}
                      </div>

                      {/* Hàng 2: chọn một trong hai */}
                      <div className="mt-1 flex space-x-5">
                        {Object.entries(optionData.motion).map(
                          ([key, label]) => (
                            <label
                              key={key}
                              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-xs font-normal text-slate-700 hover:bg-[#faf5ee]"
                            >
                              <input
                                type="radio"
                                name="product-description-motion"
                                checked={selectedDescriptionOptions.includes(
                                  label,
                                )}
                                onChange={() =>
                                  handleToggleDescriptionOption(
                                    label,
                                    true,
                                    "motion",
                                  )
                                }
                                disabled={busy}
                                className="h-4 w-4 shrink-0 accent-[#c92830]"
                              />
                              <span>{label}</span>
                            </label>
                          ),
                        )}
                      </div>

                      {descriptionOptionError && (
                        <p
                          role="alert"
                          className="mt-2 text-[11px] font-normal text-red-600"
                        >
                          {descriptionOptionError}
                        </p>
                      )}
                    </fieldset>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-row gap-2 border-t border-[#eee3d5] pt-4 sm:justify-end">
              <button
                type="button"
                aria-label="Làm mới biểu mẫu"
                title="Làm mới biểu mẫu"
                disabled={busy}
                onClick={handleResetForm}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#e5d7c5] bg-white text-slate-600 transition hover:bg-[#faf5ee] disabled:opacity-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2.5 sm:text-xs sm:font-semibold"
              >
                <RefreshCw size={15} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
              <button
                type="submit"
                disabled={
                  busy ||
                  !name.trim() ||
                  !price ||
                  priceInvalid ||
                  originalPriceInvalid ||
                  !categoryId ||
                  !colorId ||
                  !files.length
                }
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-[#c92830] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#ad2028] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-4"
              >
                <PlusCircle size={15} /> Thêm vào hàng chờ
              </button>
            </div>
            <p className="text-center text-[11px] text-slate-400">
              Sản phẩm sẽ được thêm vào danh sách bên phải. Bạn có thể tiếp tục
              thêm sản phẩm khác.
            </p>
          </form>

          <aside
            className={`relative z-10 flex min-h-0 flex-col overflow-hidden border-t border-[#eee3d5] bg-[#faf5ee] transition-[height,max-height] duration-300 ease-in-out lg:h-auto lg:max-h-none lg:border-l lg:border-t-0 ${queueOpen ? "h-[34dvh] max-h-[34dvh]" : "h-[56px] max-h-[56px]"}`}
          >
            <div
              className="flex min-h-13.75 shrink-0 items-center justify-between gap-2
             border-b border-[#eee3d5] px-3 py-2.5 sm:px-5 sm:py-4"
            >
              <button
                type="button"
                aria-expanded={queueOpen}
                aria-label={
                  queueOpen
                    ? "Thu gọn danh sách chờ tạo"
                    : "Mở danh sách chờ tạo"
                }
                onClick={() => setQueueOpen((open) => !open)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left lg:pointer-events-none"
              >
                <span className="min-w-0 text-xs font-bold uppercase tracking-wide text-slate-800">
                  Danh sách chờ tạo
                </span>
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#eadcc9] px-1.5 text-[10px]">
                  {pendingProducts.length}
                </span>
                <span className="ml-auto shrink-0 text-[#8b7967] lg:hidden">
                  {queueOpen ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronUp size={18} />
                  )}
                </span>
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {pendingProducts.length === 0 ? (
                <div className="flex min-h-27.5 h-full flex-col items-center justify-center rounded-xl border border-dashed border-[#e6d8c6] px-4 py-3 text-center lg:min-h-[180px]">
                  <Package size={28} className="text-[#c5b39e]" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Chưa có sản phẩm chờ tạo
                  </p>
                  <p className="mt-1 max-w-60 text-xs leading-5 text-slate-500">
                    Hoàn tất thông tin ở cột bên trái rồi nhấn “Thêm vào hàng
                    chờ”.
                  </p>
                </div>
              ) : (
                pendingProducts.map((item, index) => {
                  const category = categories.find(
                    (entry) => entry.id === item.categoryId,
                  );
                  const color = colors.find(
                    (entry) => entry.id === item.colorId,
                  );
                  return (
                    <article
                      key={item.key}
                      className="rounded-xl border border-[#eadfD2] bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                    >
                      <div className="flex gap-3">
                        <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#f4ecdf] text-[10px] font-bold text-slate-600">
                          {index + 1}
                        </span>
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#eee3d5] bg-[#faf5ee]">
                          {item.files[0] && (
                            <img
                              src={URL.createObjectURL(item.files[0])}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-xs font-bold leading-5 text-slate-900">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Danh mục: {category?.name ?? "—"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Màu sắc: {color?.name ?? "—"}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-slate-800">
                            {money(item.price)}{" "}
                            <span className="font-normal text-slate-400">
                              | {item.files.length} ảnh
                            </span>
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Xóa ${item.name} khỏi hàng chờ`}
                          disabled={busy}
                          onClick={() =>
                            setPendingProducts((current) =>
                              current.filter((entry) => entry.key !== item.key),
                            )
                          }
                          className="h-fit rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-[#c92830] disabled:opacity-50"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <footer className="flex shrink-0 flex-row items-center gap-2 border-t border-[#eee3d5] bg-[#fcf8f2] p-3 sm:justify-end sm:p-4">
              {pendingProducts.length > 0 && (
                <button
                  type="button"
                  aria-label="Xóa tất cả sản phẩm trong hàng chờ"
                  title="Xóa tất cả sản phẩm trong hàng chờ"
                  disabled={busy}
                  onClick={handleClearQueue}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-[#c92830] transition hover:bg-red-50 disabled:opacity-50 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2.5 sm:text-xs sm:font-semibold"
                >
                  <Trash2 size={15} />
                  <span className="text-[10px] font-semibold sm:hidden">
                    Xóa
                  </span>
                  <span className="hidden sm:inline">Xóa tất cả</span>
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => onClose()}
                className="min-w-0 flex-1 rounded-lg border border-[#e5d7c5] bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-[#faf5ee] disabled:opacity-50 sm:flex-none sm:px-4"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={busy || pendingProducts.length === 0}
                onClick={() => void handleCreateQueuedProducts()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#c92830] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#ad2028] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-4"
              >
                {busy ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                {busy
                  ? "Đang tạo sản phẩm..."
                  : `Thêm ${pendingProducts.length} sản phẩm`}
              </button>
            </footer>
          </aside>
        </div>
      </div>
    </div>
  );
}
