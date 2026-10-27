import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/layout/ToastProvider";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PlusCircle,
  Package,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RefreshCw,
  Check,
} from "lucide-react";

import ProductCard from "../features/products/components/ProductCard";
import ProductAddModal from "../features/products/components/ProductAddModal";
import ProductTable from "../features/products/components/ProductTable";
import ProductFilters from "../features/products/components/ProductFilters";
import ProductEditModal, {
  type ProductEditValues,
} from "../features/products/components/ProductEditModal";

import {
  listBadges,
  listCategories,
  listColors,
  rpcArchiveProduct,
  rpcDeleteProduct,
  rpcPublishProduct,
  rpcUpdateProduct,
} from "../services/rpcContract";
import {
  listManageableProductsPage,
  listProductCategoryCounts,
  publishProduct,
  addProductImages,
  deleteProductImage,
  setPrimaryProductImage,
} from "../services/productService";

import type { Category, Color, Product } from "../types/database";
import type { Badge } from "../services/rpcContract";

const RED = "#c92830";
const PRODUCTS_QUERY_KEY = ["manageable-products"] as const;

type SortOption =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc";

export function ProductsPage() {
  const { isAdmin } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(
    {},
  );
  const [allProductsCount, setAllProductsCount] = useState(0);

  // Bộ lọc
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [colorFilter, setColorFilter] = useState("all");
  const [badgeFilter, setBadgeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<SortOption>("newest");

  // Phân trang và chọn sản phẩm
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal thêm nhiều sản phẩm được tách riêng để giảm độ phức tạp của page.
  const [modalOpen, setModalOpen] = useState(false);

  // Trạng thái giao diện
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [publishConfirmProductId, setPublishConfirmProductId] = useState<
    string | null
  >(null);
  const [publishing, setPublishing] = useState(false);
  const toast = useToast();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const queryClient = useQueryClient();

  // Danh sách sản phẩm được quản lý bởi TanStack Query.
  const {
    data: productPageData,
    isLoading: productsLoading,
    isFetching: productsFetching,
    error: productsError,
  } = useQuery({
    queryKey: [
      ...PRODUCTS_QUERY_KEY,
      page,
      pageSize,
      query.trim(),
      categoryFilter,
      colorFilter,
      badgeFilter,
      statusFilter,
      sort,
    ],
    queryFn: () =>
      listManageableProductsPage({
        page,
        pageSize,
        query: query.trim(),
        categoryId: categoryFilter,
        colorId: colorFilter,
        badgeId: badgeFilter,
        status: statusFilter,
        sort,
      }),
    placeholderData: (previousData) => previousData,
  });

  const products = productPageData?.products ?? [];
  const totalCount = productPageData?.totalCount ?? 0;

  // Dữ liệu phân loại ít thay đổi: giữ cách tải hiện tại, không đưa vào cache query.
  useEffect(() => {
    let mounted = true;

    async function loadLookups() {
      try {
        const [categoryData, colorData, badgeData, countsData] =
          await Promise.all([
            listCategories(),
            listColors(),
            listBadges(),
            listProductCategoryCounts(),
          ]);

        if (!mounted) return;
        setCategories(categoryData);
        setColors(colorData);
        setBadges(badgeData);
        setCategoryCounts(countsData.byCategory);
        setAllProductsCount(countsData.all);
      } catch (e) {
        if (mounted) {
          toast.error(
            e instanceof Error
              ? e.message
              : "Không tải được danh mục, màu sắc và nhãn sản phẩm.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadLookups();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (productsError) {
      toast.error(
        productsError instanceof Error
          ? productsError.message
          : "Không tải được dữ liệu sản phẩm.",
      );
    }
  }, [productsError]);

  // Làm mới danh sách sản phẩm qua query cache, đồng thời tải lại dữ liệu phân loại.
  async function reload() {
    const [, categoryData, colorData, badgeData, countsData] =
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY }),
        listCategories(),
        listColors(),
        listBadges(),
        listProductCategoryCounts(),
      ]);

    setCategories(categoryData);
    setColors(colorData);
    setBadges(badgeData);
    setCategoryCounts(countsData.byCategory);
    setAllProductsCount(countsData.all);
  }

  const activeCategories = useMemo(
    () => categories.filter((category) => category.is_active),
    [categories],
  );

  const activeColors = useMemo(
    () => colors.filter((color) => color.is_active),
    [colors],
  );

  const activeBadges = useMemo(
    () => badges.filter((badge) => badge.is_active),
    [badges],
  );

  // Supabase đã lọc, sắp xếp và phân trang ở phía server.
  const totalPages = productPageData?.totalPages ?? 1;
  const currentPage = Math.min(page, totalPages);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageProducts = products;

  useEffect(() => {
    setSelectedIds([]);
  }, [page, pageSize]);

  // Staff không sử dụng chức năng chọn/xóa hàng loạt.
  useEffect(() => {
    if (!isAdmin) setSelectedIds([]);
  }, [isAdmin]);

  const allPageSelected =
    pageProducts.length > 0 &&
    pageProducts.every((product) => selectedIds.includes(product.id));

  function openCreateModal() {
    setModalOpen(true);
  }

  function chooseCategory(nextCategoryId: string) {
    setCategoryFilter(nextCategoryId);
    setPage(1);
    setSelectedIds([]);
  }

  function toggleProduct(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleCurrentPage() {
    setSelectedIds((current) =>
      allPageSelected
        ? current.filter(
            (id) => !pageProducts.some((product) => product.id === id),
          )
        : Array.from(
            new Set([...current, ...pageProducts.map((product) => product.id)]),
          ),
    );
  }

  async function handleSaveProduct(
    productId: string,
    values: ProductEditValues,
  ) {
    const currentProduct = products.find((item) => item.id === productId);
    if (!currentProduct)
      throw new Error("Không tìm thấy sản phẩm cần cập nhật.");

    // Chưa có RPC chuyển sản phẩm đã xuất bản về draft. Chặn trước khi ghi
    // để tránh cập nhật một phần rồi báo lỗi.
    if (values.status === "draft" && currentProduct.status !== "draft") {
      throw new Error(
        "Chưa có RPC đưa sản phẩm về Chờ xuất bản. Bạn hãy chọn Đang bán hoặc Đã lưu trữ.",
      );
    }

    await rpcUpdateProduct(productId, {
      ...values,
      badge_id: values.badge_id,
      sort_order: currentProduct.sort_order ?? 0,
    });

    if (values.status !== currentProduct.status) {
      if (values.status === "published") {
        await rpcPublishProduct(productId);
      } else if (values.status === "archived") {
        await rpcArchiveProduct(productId);
      }
    }

    await reload();
    setEditingProduct(null);
    toast.success("Đã cập nhật sản phẩm thành công.");
  }

  function handlePublish(id: string) {
    setPublishConfirmProductId(id);
  }

  async function confirmPublishProduct() {
    if (!publishConfirmProductId || publishing) return;

    setPublishing(true);
    try {
      await publishProduct(publishConfirmProductId);
      await reload();
      setPublishConfirmProductId(null);
      toast.success("Đã xuất bản sản phẩm thành công.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Xuất bản sản phẩm thất bại.",
      );
    } finally {
      setPublishing(false);
    }
  }

  function handleDeleteSelected() {
    if (!isAdmin) return;

    const selectedProducts = products.filter((product) =>
      selectedIds.includes(product.id),
    );
    if (selectedProducts.length === 0) {
      setSelectedIds([]);
      return;
    }
    setDeleteDialogOpen(true);
  }

  async function confirmDeleteSelected() {
    if (!isAdmin) {
      setDeleteDialogOpen(false);
      return;
    }

    const selectedProducts = products.filter((product) =>
      selectedIds.includes(product.id),
    );
    if (selectedProducts.length === 0) {
      setSelectedIds([]);
      setDeleteDialogOpen(false);
      return;
    }

    setDeleting(true);
    const deletedIds: string[] = [];
    const failures: string[] = [];

    try {
      for (const product of selectedProducts) {
        try {
          await rpcDeleteProduct(product.id);
          deletedIds.push(product.id);
        } catch (e) {
          failures.push(
            `${product.name}: ${e instanceof Error ? e.message : "Xóa thất bại."}`,
          );
        }
      }

      setSelectedIds((current) =>
        current.filter((id) => !deletedIds.includes(id)),
      );
      setDeleteDialogOpen(false);

      if (deletedIds.length > 0) {
        toast.success(`Đã xóa vĩnh viễn ${deletedIds.length} sản phẩm.`);
      }
      if (failures.length > 0) {
        toast.error(
          `Không xóa được ${failures.length} sản phẩm: ${failures.join(" · ")}`,
        );
      }

      try {
        await reload();
      } catch (e) {
        toast.error(
          e instanceof Error
            ? `Đã xóa nhưng không tải lại được danh sách: ${e.message}`
            : "Đã xóa nhưng không tải lại được danh sách sản phẩm.",
        );
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Đã xảy ra lỗi khi xóa sản phẩm.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleReload() {
    setLoading(true);
    try {
      await reload();
      toast.success("Đã làm mới danh sách sản phẩm.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="min-w-0 space-y-5 pb-20 md:pb-0">
      {/* Tiêu đề trang */}
      <div className="flex flex-col justify-between gap-4 border-b border-stone-200 pb-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Quản lý sản phẩm
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Danh sách sản phẩm của Mèo Hoa Shop
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
          style={{ backgroundColor: RED }}
        >
          <PlusCircle size={16} />
          Thêm sản phẩm
        </button>
      </div>

      {/* Bộ lọc sản phẩm */}
      <ProductFilters
        categories={activeCategories}
        colors={activeColors}
        badges={activeBadges}
        query={query}
        categoryId={categoryFilter}
        colorId={colorFilter}
        badgeId={badgeFilter}
        status={statusFilter}
        sort={
          sort === "price-asc"
            ? "price_asc"
            : sort === "price-desc"
              ? "price_desc"
              : sort === "name-asc"
                ? "name_asc"
                : sort === "name-desc"
                  ? "name_desc"
                  : "newest"
        }
        totalCount={allProductsCount}
        categoryCounts={categoryCounts}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(1);
          setSelectedIds([]);
        }}
        onCategoryChange={chooseCategory}
        onColorChange={(value) => {
          setColorFilter(value);
          setPage(1);
          setSelectedIds([]);
        }}
        onBadgeChange={(value) => {
          setBadgeFilter(value);
          setPage(1);
          setSelectedIds([]);
        }}
        onStatusChange={(value) => {
          setStatusFilter(value);
          setPage(1);
          setSelectedIds([]);
        }}
        onSortChange={(value) => {
          const mappedSort: SortOption =
            value === "price_asc"
              ? "price-asc"
              : value === "price_desc"
                ? "price-desc"
                : value === "name_asc"
                  ? "name-asc"
                  : value === "name_desc"
                    ? "name-desc"
                    : "newest";
          setSort(mappedSort);
          setPage(1);
          setSelectedIds([]);
        }}
      />

      {/* Danh sách sản phẩm */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-900">
              Danh sách sản phẩm
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              {loading || productsLoading
                ? "Đang tải dữ liệu..."
                : `${totalCount} sản phẩm phù hợp`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleReload()}
            disabled={loading || productsFetching}
            title="Làm mới dữ liệu"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={loading || productsFetching ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>

        {/* Bảng dành cho desktop */}
        <ProductTable
          products={pageProducts}
          categories={categories}
          colors={colors}
          badges={badges}
          selectedIds={isAdmin ? selectedIds : []}
          onToggle={isAdmin ? toggleProduct : () => {}}
          onTogglePage={isAdmin ? toggleCurrentPage : () => {}}
          onEdit={setEditingProduct}
          onPublish={(product) => void handlePublish(product.id)}
          loading={loading || productsLoading}
          page={currentPage}
          pageSize={pageSize}
          totalItems={totalCount}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />

        {/* Thẻ sản phẩm dành cho mobile */}
        <div className="space-y-3 md:hidden">
          {loading || productsLoading ? (
            <div className="rounded-xl border border-stone-200 bg-white px-4 py-12 text-center text-sm text-stone-400">
              Đang tải danh sách sản phẩm...
            </div>
          ) : pageProducts.length === 0 ? (
            <div className="rounded-xl border border-stone-200 bg-white px-4 py-12 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-stone-100 text-stone-400">
                <Package size={22} />
              </div>
              <p className="text-sm font-medium text-stone-700">
                Không tìm thấy sản phẩm
              </p>
              <p className="mt-1 text-xs text-stone-400">
                Thử thay đổi từ khóa hoặc bộ lọc.
              </p>
            </div>
          ) : (
            pageProducts.map((product) => {
              const category = categories.find(
                (item) => item.id === product.category_id,
              );
              const color = colors.find((item) => item.id === product.color_id);
              const badge = badges.find((item) => item.id === product.badge_id);

              return (
                <div key={product.id} className="relative">
                  {/* <label className="absolute left-2 top-2 z-10 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-stone-200 bg-white/95 shadow-sm">
                    <input
                      type="checkbox"
                      aria-label={`Chọn ${product.name}`}
                      checked={selectedIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="h-4 w-4 cursor-pointer accent-[#c92830]"
                    />
                  </label> */}

                  <ProductCard
                    product={product}
                    categoryName={category?.name}
                    colorName={color?.name}
                    colorHex={color?.hex_code ?? undefined}
                    badgeName={badge?.name}
                    onEdit={(selectedProduct) =>
                      setEditingProduct(selectedProduct)
                    }
                    onMore={() =>
                      toast.info(
                        `Mã sản phẩm: ${product.slug || product.id}`,
                        product.name,
                      )
                    }
                  />

                  {product.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => void handlePublish(product.id)}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <Check size={15} />
                      Xuất bản sản phẩm
                    </button>
                  )}
                </div>
              );
            })
          )}

          {/* Phân trang mobile */}
          {!loading && !productsLoading && totalCount > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3">
              <button
                type="button"
                aria-label="Trang trước"
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-stone-200 bg-white p-2 text-stone-600 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="text-center text-xs text-stone-500">
                Trang{" "}
                <span className="font-semibold text-stone-900">
                  {currentPage}
                </span>{" "}
                / {totalPages}
                <div className="mt-1 text-[10px] text-stone-400">
                  {totalCount} sản phẩm
                </div>
              </div>

              <button
                type="button"
                aria-label="Trang sau"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="rounded-lg border border-stone-200 bg-white p-2 text-stone-600 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Tổng số sản phẩm đã chọn */}
        {isAdmin && selectedIds.length > 0 && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5">
            <span className="text-xs text-red-800">
              Đã chọn {selectedIds.length} sản phẩm
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDeleteSelected()}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#c92830] px-3 py-2 text-xs font-semibold text-white hover:bg-[#ad2028] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={14} />
                {deleting ? "Đang xóa..." : "Xóa đã chọn"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setSelectedIds([])}
                className="rounded-md bg-transparent px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <ProductAddModal
          categories={categories}
          colors={colors}
          existingProductCount={allProductsCount}
          onClose={() => setModalOpen(false)}
          onCreated={async (createdCount, finalMessage) => {
            if (createdCount > 0) setPage(1);
            if (createdCount > 0)
              toast.success(
                finalMessage || `Đã thêm ${createdCount} sản phẩm thành công.`,
              );
            try {
              await reload();
            } catch (e) {
              toast.error(
                e instanceof Error
                  ? `Đã tạo sản phẩm nhưng không tải lại được danh sách: ${e.message}`
                  : "Đã tạo sản phẩm nhưng không tải lại được danh sách.",
              );
            }
          }}
        />
      )}

      {publishConfirmProductId && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-stone-950/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !publishing) {
              setPublishConfirmProductId(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-product-title"
            className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                <Check size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="publish-product-title"
                  className="text-base font-semibold text-stone-900"
                >
                  Xác nhận xuất bản sản phẩm?
                </h2>
                <p className="mt-1 text-sm leading-5 text-stone-600">
                  Sản phẩm “
                  {products.find(
                    (product) => product.id === publishConfirmProductId,
                  )?.name ?? "đã chọn"}
                  ” sẽ được xuất bản và hiển thị theo trạng thái công khai đã
                  cấu hình.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={publishing}
                onClick={() => setPublishConfirmProductId(null)}
                className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={() => void confirmPublishProduct()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={15} />
                {publishing ? "Đang xuất bản..." : "Xác nhận xuất bản"}
              </button>
            </div>
          </section>
        </div>
      )}

      {isAdmin && deleteDialogOpen && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-stone-950/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting)
              setDeleteDialogOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-products-title"
            className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
                <Trash2 size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="delete-products-title"
                  className="text-base font-semibold text-stone-900"
                >
                  Xóa vĩnh viễn sản phẩm?
                </h2>
                <p className="mt-1 text-sm leading-5 text-stone-600">
                  Bạn sắp xóa{" "}
                  {
                    products.filter((product) =>
                      selectedIds.includes(product.id),
                    ).length
                  }{" "}
                  sản phẩm. Thao tác này không thể hoàn tác.
                </p>
              </div>
            </div>
            <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50 p-3">
              <ul className="space-y-1.5 text-sm text-stone-700">
                {products
                  .filter((product) => selectedIds.includes(product.id))
                  .slice(0, 5)
                  .map((product) => (
                    <li key={product.id} className="break-words">
                      • {product.name}
                    </li>
                  ))}
                {products.filter((product) => selectedIds.includes(product.id))
                  .length > 5 && (
                  <li className="text-stone-500">
                    … và{" "}
                    {products.filter((product) =>
                      selectedIds.includes(product.id),
                    ).length - 5}{" "}
                    sản phẩm khác
                  </li>
                )}
              </ul>
            </div>
            <p className="mt-3 text-xs text-red-700">
              Chỉ tiếp tục nếu đây là sản phẩm test hoặc bạn chắc chắn không cần
              giữ lại.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteDialogOpen(false)}
                className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDeleteSelected()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={15} />
                {deleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </section>
        </div>
      )}

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          categories={categories}
          colors={colors}
          badges={badges}
          onClose={() => setEditingProduct(null)}
          onSave={handleSaveProduct}
          onAddImages={(productId, files) =>
            addProductImages(productId, files, editingProduct.name)
          }
          onDeleteImage={deleteProductImage}
          onSetPrimaryImage={setPrimaryProductImage}
          onRefreshImages={async (productId) => {
            const { data, error } = await supabase
              .from("product_images")
              .select("id, product_id, image_url, alt, is_primary, sort_order")
              .eq("product_id", productId)
              .order("sort_order", { ascending: true });

            if (error) throw error;

            return data ?? [];
          }}
        />
      )}
    </section>
  );
}

export default ProductsPage;
