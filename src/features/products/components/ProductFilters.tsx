import { Search, ChevronDown, ListFilter, Plus, X } from "lucide-react";
import type { Category, Color } from "../../../types/database";
import type { Badge } from "../../../services/rpcContract";
import { useEffect, useMemo, useRef, useState } from "react";

export type ProductFiltersProps = {
  categories: Category[];
  categoryId: string;
  categoryCounts: Record<string, number>;
  onCategoryChange: (value: string) => void;
  colors: Color[];
  badges: Badge[];
  query: string;
  colorId: string;
  badgeId: string;
  status: string;
  sort: string;
  totalCount: number;
  onQueryChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onBadgeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onAddProduct?: () => void;
};

type DropdownOption = {
  value: string;
  label: string;
  swatch?: string;
};

type FilterDropdownProps = {
  id: string;
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  leadingIcon?: boolean;
};

const selectClass =
  "h-[58px] w-full rounded-[8px] border border-transparent bg-[#f4eee6] px-[14px] pb-[7px] pt-[25px] text-[14px] font-semibold text-[#302d2a] outline-none transition-colors hover:bg-[#efe7dd] focus:border-[#c92830] focus:ring-2 focus:ring-[#c92830]/10";

const labelClass =
  "pointer-events-none absolute left-[14px] top-[8px] text-[13px] font-normal leading-[18px] text-[#827a73]";

function FilterDropdown({
  id,
  label,
  value,
  options,
  onChange,
  leadingIcon = false,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <label htmlFor={`${id}-trigger`} className={labelClass}>
        {label}
      </label>
      <button
        id={`${id}-trigger`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        onClick={() => setOpen((current) => !current)}
        className={`${selectClass} flex items-end justify-between gap-2 text-left`}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {leadingIcon && (
            <ListFilter size={15} className="shrink-0 text-[#827a73]" />
          )}
          {selected?.swatch && (
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
              style={{ backgroundColor: selected.swatch }}
            />
          )}
          <span className="truncate">{selected?.label ?? "Chọn"}</span>
        </span>
        <ChevronDown
          size={17}
          className={`shrink-0 text-[#827a73] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-xl border border-[#e7dfd5] bg-white p-1.5 shadow-lg"
        >
          {options.map((option) => {
            const selectedOption = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selectedOption}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#f4eee6] ${
                  selectedOption
                    ? "bg-[#f4eee6] font-semibold text-[#302d2a]"
                    : "text-[#302d2a]"
                }`}
              >
                {option.swatch && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: option.swatch }}
                  />
                )}
                <span className="min-w-0 truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const categoryLabel = (category: Category) => category.name;

export default function ProductFilters({
  categories,
  categoryId,
  categoryCounts,
  onCategoryChange,
  colors,
  badges,
  query,
  colorId,
  badgeId,
  status,
  sort,
  totalCount,
  onQueryChange,
  onColorChange,
  onBadgeChange,
  onStatusChange,
  onSortChange,
  onAddProduct,
}: ProductFiltersProps) {
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {},
  );
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const allCount = Object.values(categoryCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  const categoryTabs = useMemo(
    () => [
      { id: "all", name: "Tất cả", count: allCount },
      ...categories.map((category) => ({
        id: category.id,
        name: categoryLabel(category),
        count: categoryCounts[category.id] ?? 0,
      })),
    ],
    [categories, categoryCounts, allCount],
  );

  const activeCategoryId =
    categoryId === "all" || !categoryId ? "all" : categoryId;

  useEffect(() => {
    const updateIndicator = () => {
      const selectedButton = categoryButtonRefs.current[activeCategoryId];
      const container = categoryTabsRef.current;
      if (!selectedButton || !container) return;
      setIndicator({
        left: selectedButton.offsetLeft,
        width: selectedButton.offsetWidth,
      });
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeCategoryId, categoryTabs]);

  const badgeOptions: DropdownOption[] = [
    { value: "all", label: "Tất cả" },
    ...badges.map((badge) => ({ value: badge.id, label: badge.name })),
    { value: "none", label: "Chưa gắn nhãn" },
  ];

  const colorOptions: DropdownOption[] = [
    { value: "all", label: "Tất cả màu sắc" },
    ...colors.map((color: Color) => ({
      value: color.id,
      label: color.name,
      swatch: color.hex_code || "#e7e5e4",
    })),
  ];

  const statusOptions: DropdownOption[] = [
    { value: "all", label: "Tất cả trạng thái" },
    { value: "published", label: "Online" },
    { value: "draft", label: "Chờ xuất bản" },
    { value: "archived", label: "Offline" },
  ];

  const sortOptions: DropdownOption[] = [
    { value: "newest", label: "Mới nhất" },
    { value: "price_asc", label: "Giá thấp đến cao" },
    { value: "price_desc", label: "Giá cao đến thấp" },
    { value: "name_asc", label: "Tên A–Z" },
    { value: "name_desc", label: "Tên Z–A" },
  ];

  return (
    <section className="w-full space-y-3">
      {/* Category tabs with a shared sliding indicator */}
      <div
        ref={categoryTabsRef}
        className="relative flex w-full items-center gap-2 overflow-x-auto border-b border-stone-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Lọc theo danh mục"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 h-[3px] rounded-full bg-[#c92830] transition-[left,width] duration-300 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
        {categoryTabs.map((category) => {
          const selected = activeCategoryId === category.id;
          return (
            <button
              key={category.id}
              ref={(node) => {
                categoryButtonRefs.current[category.id] = node;
              }}
              type="button"
              onClick={() => onCategoryChange(category.id)}
              aria-pressed={selected}
              className={`relative inline-flex shrink-0 items-center gap-2 px-3 pb-3 pt-1 text-[14px] font-medium transition-colors sm:text-[15px] ${
                selected
                  ? "text-[#302d2a]"
                  : "text-[#827a73] hover:text-[#302d2a]"
              }`}
            >
              <span>{category.name}</span>
              <span
                className={`min-w-8 rounded-full px-2.5 py-1 text-center text-[12px] font-semibold transition-colors ${
                  selected
                    ? "bg-[#fde4e2] text-[#c92830]"
                    : "bg-[#efebe6] text-[#5f5852]"
                }`}
              >
                {category.count.toLocaleString("vi-VN")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + add product */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            strokeWidth={1.8}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#aaa29a]"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Tìm kiếm theo tên sản phẩm"
            aria-label="Tìm kiếm sản phẩm"
            className="h-[42px] w-full rounded-[12px] border border-transparent bg-[#f4eee6] pl-11 pr-11 text-[14px] text-[#302d2a] outline-none transition-colors placeholder:text-[#827a73] focus:border-[#c92830] focus:ring-2 focus:ring-[#c92830]/10"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#827a73] hover:bg-black/5 hover:text-[#302d2a]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {onAddProduct && (
          <button
            type="button"
            onClick={onAddProduct}
            className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-[12px] bg-[#c92830] px-5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#b51f27] focus:outline-none focus:ring-2 focus:ring-[#c92830]/30 focus:ring-offset-2"
          >
            <Plus size={15} strokeWidth={2.2} />
            <span>Thêm sản phẩm</span>
          </button>
        )}
      </div>

      {/* Compact custom dropdown filters */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <FilterDropdown
          id="product-badge-filter"
          label="Nhãn sản phẩm"
          value={badgeId}
          options={badgeOptions}
          onChange={onBadgeChange}
        />
        <FilterDropdown
          id="product-color-filter"
          label="Màu sắc"
          value={colorId}
          options={colorOptions}
          onChange={onColorChange}
        />
        <FilterDropdown
          id="product-status-filter"
          label="Trạng thái"
          value={status}
          options={statusOptions}
          onChange={onStatusChange}
        />
        <FilterDropdown
          id="product-sort-filter"
          label="Sắp xếp"
          value={sort}
          options={sortOptions}
          onChange={onSortChange}
          leadingIcon
        />
      </div>
    </section>
  );
}
