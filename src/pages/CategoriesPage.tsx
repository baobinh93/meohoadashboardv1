// import { useEffect, useMemo, useState } from "react";
// import { Boxes, RefreshCw, Search, Palette, Tag, Pencil } from "lucide-react";
// import {
//   listCategories,
//   listColors,
//   listBadges,
//   rpcCreateCategory,
//   rpcCreateColor,
//   rpcCreateBadge,
//   rpcUpdateCategory,
//   rpcSetCategoryActive,
//   rpcUpdateColor,
//   rpcSetColorActive,
//   rpcUpdateBadge,
//   rpcSetBadgeActive,
//   type Badge,
// } from "../services/rpcContract";
// import { listManageableProducts } from "../services/productService";
// import type { Category, Color, Product } from "../types/database";
// import { useToast } from "../components/layout/ToastProvider";

// type Panel = "categories" | "colors" | "badges";

// const numberLabel = (value: number) => value.toLocaleString("vi-VN");

// function PanelHeader({
//   icon,
//   title,
//   description,
//   actionLabel,
//   onAction,
// }: {
//   icon: React.ReactNode;
//   title: string;
//   description: string;
//   actionLabel: string;
//   onAction?: () => void;
// }) {
//   return (
//     <div className="flex items-center justify-between gap-3 border-b border-[#f0e9e1] px-4 py-4 sm:px-5">
//       <div className="flex min-w-0 items-center gap-3">
//         <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-[#c92830]">
//           {icon}
//         </div>
//         <div className="min-w-0">
//           <h2 className="text-sm font-bold text-stone-800">{title}</h2>
//           <p className="mt-0.5 text-[11px] leading-4 text-stone-500">
//             {description}
//           </p>
//         </div>
//       </div>
//       <button
//         type="button"
//         disabled={!onAction}
//         onClick={onAction}
//         title={
//           onAction ? actionLabel : "Chức năng chỉnh sửa đang được hoàn thiện"
//         }
//         className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#c92830] px-3 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#b51f27] disabled:cursor-not-allowed disabled:opacity-60"
//       >
//         <span className="text-base leading-none">+</span>
//         <span className="hidden sm:inline">{actionLabel}</span>
//       </button>
//     </div>
//   );
// }

// export function CategoriesPage() {
//   const toast = useToast();
//   const [items, setItems] = useState<Category[]>([]);
//   const [colors, setColors] = useState<Color[]>([]);
//   const [badges, setBadges] = useState<Badge[]>([]);
//   const [products, setProducts] = useState<Product[]>([]);
//   const [error, setError] = useState("");
//   const [query, setQuery] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [panel, setPanel] = useState<Panel>("categories");
//   const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
//     null,
//   );
//   const [isCreatingCategory, setIsCreatingCategory] = useState(false);
//   const [isCreatingColor, setIsCreatingColor] = useState(false);
//   const [isCreatingBadge, setIsCreatingBadge] = useState(false);
//   const [editingColorId, setEditingColorId] = useState<string | null>(null);
//   const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
//   const [categoryDraft, setCategoryDraft] = useState({
//     name: "",
//     sortOrder: 0,
//   });
//   const [colorDraft, setColorDraft] = useState({
//     name: "",
//     hexCode: "",
//     sortOrder: 0,
//   });
//   const [badgeDraft, setBadgeDraft] = useState({
//     name: "",
//     backgroundColor: "",
//     textColor: "",
//     sortOrder: 0,
//   });
//   const [saving, setSaving] = useState(false);

//   async function runAction(
//     action: () => Promise<unknown>,
//     fallbackMessage: string,
//     successMessage: string,
//   ): Promise<boolean> {
//     setError("");
//     setSaving(true);
//     try {
//       await action();
//       toast.success(successMessage);
//       // A successful write should not be reported as failed just because
//       // refreshing the list failed. reload() keeps its own error visible.
//       await reload();
//       return true;
//     } catch (e) {
//       setError(e instanceof Error ? e.message : fallbackMessage);
//       return false;
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function saveCategory() {
//     const name = categoryDraft.name.trim();
//     if (!name) {
//       setError("Tên danh mục không được để trống.");
//       return;
//     }

//     const sortOrder = Number(categoryDraft.sortOrder);
//     if (!Number.isInteger(sortOrder) || sortOrder < 0) {
//       setError("Thứ tự danh mục phải là số nguyên không âm.");
//       return;
//     }

//     if (isCreatingCategory) {
//       if (
//         await runAction(
//           () => rpcCreateCategory({ name, sortOrder }),
//           "Không thể tạo danh mục.",
//           "Đã tạo danh mục.",
//         )
//       ) {
//         setIsCreatingCategory(false);
//         setCategoryDraft({ name: "", sortOrder: 0 });
//       }
//       return;
//     }

//     if (!editingCategoryId) return;
//     if (
//       await runAction(
//         () => rpcUpdateCategory({ id: editingCategoryId, name, sortOrder }),
//         "Không thể cập nhật danh mục.",
//         "Đã cập nhật danh mục.",
//       )
//     ) {
//       setEditingCategoryId(null);
//     }
//   }

//   async function saveColor() {
//     const input = { ...colorDraft, name: colorDraft.name.trim() };
//     if (!input.name) {
//       setError("Tên màu không được để trống.");
//       return;
//     }
//     if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
//       setError("Thứ tự màu phải là số nguyên không âm.");
//       return;
//     }
//     const ok = await runAction(
//       () =>
//         isCreatingColor
//           ? rpcCreateColor(input)
//           : editingColorId
//             ? rpcUpdateColor({ id: editingColorId, ...input })
//             : Promise.reject(
//                 new Error("Không xác định được thao tác màu sắc."),
//               ),
//       "Không thể lưu màu sắc.",
//       isCreatingColor ? "Đã tạo màu sắc." : "Đã cập nhật màu sắc.",
//     );
//     if (ok) {
//       setEditingColorId(null);
//       setIsCreatingColor(false);
//       setColorDraft({ name: "", hexCode: "#FFFFFF", sortOrder: colors.length });
//     }
//   }

//   async function saveBadge() {
//     const input = { ...badgeDraft, name: badgeDraft.name.trim() };
//     if (!input.name) {
//       setError("Tên nhãn dán không được để trống.");
//       return;
//     }
//     if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
//       setError("Thứ tự nhãn dán phải là số nguyên không âm.");
//       return;
//     }
//     const ok = await runAction(
//       () =>
//         isCreatingBadge
//           ? rpcCreateBadge(input)
//           : editingBadgeId
//             ? rpcUpdateBadge({ id: editingBadgeId, ...input })
//             : Promise.reject(
//                 new Error("Không xác định được thao tác nhãn dán."),
//               ),
//       "Không thể lưu nhãn dán.",
//       isCreatingBadge ? "Đã tạo nhãn dán." : "Đã cập nhật nhãn dán.",
//     );
//     if (ok) {
//       setEditingBadgeId(null);
//       setIsCreatingBadge(false);
//       setBadgeDraft({
//         name: "",
//         backgroundColor: "#FEE2E2",
//         textColor: "#991B1B",
//         sortOrder: badges.length,
//       });
//     }
//   }

//   async function reload(): Promise<boolean> {
//     setError("");
//     setLoading(true);
//     try {
//       const [categoryData, colorData, badgeData, productData] =
//         await Promise.all([
//           listCategories(),
//           listColors(),
//           listBadges(),
//           listManageableProducts(),
//         ]);
//       setItems(categoryData);
//       setColors(colorData);
//       setBadges(badgeData);
//       setProducts(productData);
//       return true;
//     } catch (e) {
//       setError(
//         e instanceof Error
//           ? e.message
//           : "Không tải được dữ liệu danh mục và phân loại.",
//       );
//       return false;
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     void reload();
//   }, []);

//   const filteredCategories = useMemo(
//     () =>
//       items.filter(
//         (x) =>
//           x.name.toLowerCase().includes(query.toLowerCase()) ||
//           x.slug.toLowerCase().includes(query.toLowerCase()),
//       ),
//     [items, query],
//   );

//   const filteredColors = useMemo(
//     () =>
//       colors.filter((x) => x.name.toLowerCase().includes(query.toLowerCase())),
//     [colors, query],
//   );

//   const filteredBadges = useMemo(
//     () =>
//       badges.filter((x) => x.name.toLowerCase().includes(query.toLowerCase())),
//     [badges, query],
//   );

//   const activeCategories = items.filter((x) => x.is_active).length;
//   const activeColors = colors.filter((x) => x.is_active).length;
//   const activeBadges = badges.filter((x) => x.is_active).length;

//   return (
//     <section className="space-y-5">
//       <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
//         <div>
//           <div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#c92d35]">
//             CATALOGUE SETTINGS
//           </div>
//           <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
//             Danh mục &amp; Phân Loại
//           </h1>
//           <p className="mt-1.5 text-sm text-stone-500">
//             Quản lý danh mục, màu sắc và nhãn dán hiển thị trên sản phẩm.
//           </p>
//         </div>
//         <button
//           type="button"
//           onClick={() => void reload()}
//           disabled={loading}
//           className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-60"
//         >
//           <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
//           Làm mới
//         </button>
//       </div>

//       {error && (
//         <div
//           role="alert"
//           className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
//         >
//           {error}
//         </div>
//       )}

//       {/* Summary cards */}
//       <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
//         {[
//           {
//             label: "Danh mục",
//             count: items.length,
//             active: activeCategories,
//             icon: <Boxes size={18} />,
//             target: "categories" as Panel,
//           },
//           {
//             label: "Màu sắc",
//             count: colors.length,
//             active: activeColors,
//             icon: <Palette size={18} />,
//             target: "colors" as Panel,
//           },
//           {
//             label: "Nhãn dán",
//             count: badges.length,
//             active: activeBadges,
//             icon: <Tag size={18} />,
//             target: "badges" as Panel,
//           },
//         ].map((card) => (
//           <button
//             key={card.target}
//             type="button"
//             onClick={() => setPanel(card.target)}
//             className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition ${
//               panel === card.target
//                 ? "border-red-200 ring-1 ring-red-100"
//                 : "border-stone-200 hover:border-stone-300"
//             }`}
//           >
//             <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-[#c92d35]">
//               {card.icon}
//             </div>
//             <div className="min-w-0 flex-1">
//               <div className="text-xs text-stone-500">{card.label}</div>
//               <div className="mt-0.5 text-xl font-bold text-stone-900">
//                 {numberLabel(card.count)}
//               </div>
//             </div>
//             <div className="text-right">
//               <div className="text-[10px] text-stone-400">Hoạt động</div>
//               <div className="text-sm font-semibold text-emerald-700">
//                 {numberLabel(card.active)}
//               </div>
//             </div>
//           </button>
//         ))}
//       </div>

//       {/* Main management panels */}
//       <div className="grid items-start gap-4 xl:grid-cols-[1.15fr_0.85fr]">
//         <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
//           <PanelHeader
//             icon={<Boxes size={19} />}
//             title="Danh mục sản phẩm"
//             description="Danh mục hiển thị trên website"
//             actionLabel="Thêm danh mục"
//             onAction={() => {
//               setError("");
//               setEditingCategoryId(null);
//               setCategoryDraft({ name: "", sortOrder: items.length });
//               setIsCreatingCategory(true);
//             }}
//           />
//           <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
//             <span className="text-[11px] text-stone-500">
//               {filteredCategories.length} danh mục
//             </span>
//             <label className="relative block sm:w-56">
//               <Search
//                 size={14}
//                 className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
//               />
//               <input
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-8 pr-3 text-xs outline-none focus:border-red-300"
//                 placeholder="Tìm danh mục, màu, nhãn..."
//               />
//             </label>
//           </div>
//           <div className="overflow-x-auto">
//             <table className="w-full min-w-[560px] border-collapse text-left text-xs">
//               <thead>
//                 <tr className="border-y border-stone-100 bg-[#faf8f5] text-[10px] uppercase tracking-wide text-stone-500">
//                   <th className="w-10 px-3 py-3">#</th>
//                   <th className="px-3 py-3">Thông tin danh mục</th>
//                   <th className="px-3 py-3">Slug</th>
//                   <th className="px-3 py-3 text-center">Số SP</th>
//                   <th className="px-3 py-3">Trạng thái</th>
//                   <th className="px-3 py-3 text-center">Thao tác</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {isCreatingCategory && (
//                   <tr className="border-b border-stone-100 bg-red-50/40">
//                     <td className="px-3 py-3 text-stone-400">+</td>
//                     <td className="px-3 py-3">
//                       <div className="grid min-w-[150px] gap-1.5">
//                         <input
//                           autoFocus
//                           value={categoryDraft.name}
//                           onChange={(e) =>
//                             setCategoryDraft((d) => ({
//                               ...d,
//                               name: e.target.value,
//                             }))
//                           }
//                           onKeyDown={(e) => {
//                             if (e.key === "Enter") {
//                               e.preventDefault();
//                               void saveCategory();
//                             }
//                             if (e.key === "Escape")
//                               setIsCreatingCategory(false);
//                           }}
//                           className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-red-300"
//                           placeholder="Tên danh mục mới"
//                           aria-label="Tên danh mục mới"
//                         />
//                         <label className="flex items-center gap-2 text-[10px] text-stone-500">
//                           Thứ tự
//                           <input
//                             type="number"
//                             min={0}
//                             step={1}
//                             value={categoryDraft.sortOrder}
//                             onChange={(e) =>
//                               setCategoryDraft((d) => ({
//                                 ...d,
//                                 sortOrder: Number(e.target.value),
//                               }))
//                             }
//                             className="w-20 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-red-300"
//                             aria-label="Thứ tự danh mục mới"
//                           />
//                         </label>
//                       </div>
//                     </td>
//                     <td className="px-3 py-3 text-stone-400">Tự tạo</td>
//                     <td className="px-3 py-3 text-center text-stone-400">—</td>
//                     <td className="px-3 py-3 text-stone-400">Mặc định</td>
//                     <td className="px-3 py-3 text-center">
//                       <div className="inline-flex gap-1">
//                         <button
//                           type="button"
//                           disabled={saving}
//                           onClick={() => void saveCategory()}
//                           className="rounded-md bg-[#c92830] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
//                         >
//                           Tạo
//                         </button>
//                         <button
//                           type="button"
//                           disabled={saving}
//                           onClick={() => {
//                             setIsCreatingCategory(false);
//                             setCategoryDraft({ name: "", sortOrder: 0 });
//                           }}
//                           className="rounded-md px-2 py-1 text-[10px] text-stone-500 hover:bg-stone-100 disabled:opacity-50"
//                         >
//                           Hủy
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 )}
//                 {filteredCategories.map((x, i) => (
//                   <tr
//                     key={x.id}
//                     className="border-b border-stone-100 last:border-0 hover:bg-[#fdfbf9]"
//                   >
//                     <td className="px-3 py-3 text-stone-400">{i + 1}</td>
//                     <td className="px-3 py-3">
//                       {editingCategoryId === x.id ? (
//                         <>
//                           <input
//                             value={categoryDraft.name}
//                             onChange={(e) =>
//                               setCategoryDraft((d) => ({
//                                 ...d,
//                                 name: e.target.value,
//                               }))
//                             }
//                             className="w-full min-w-[120px] rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-red-300"
//                             aria-label="Tên danh mục"
//                           />
//                           <label className="mt-1 flex items-center gap-2 text-[10px] text-stone-500">
//                             Thứ tự
//                             <input
//                               type="number"
//                               min={0}
//                               step={1}
//                               value={categoryDraft.sortOrder}
//                               onChange={(e) =>
//                                 setCategoryDraft((d) => ({
//                                   ...d,
//                                   sortOrder: Number(e.target.value),
//                                 }))
//                               }
//                               className="w-20 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-red-300"
//                               aria-label="Thứ tự danh mục"
//                             />
//                           </label>
//                         </>
//                       ) : (
//                         <div className="font-semibold text-stone-800">
//                           {x.name}
//                         </div>
//                       )}
//                     </td>
//                     <td className="px-3 py-3">
//                       <code className="rounded bg-stone-100 px-2 py-1 text-[10px] text-stone-500">
//                         {x.slug}
//                       </code>
//                     </td>
//                     <td className="px-3 py-3 text-center">
//                       <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-600">
//                         {numberLabel(
//                           products.filter((p) => p.category_id === x.id).length,
//                         )}
//                       </span>
//                     </td>
//                     <td className="px-3 py-3">
//                       <button
//                         type="button"
//                         role="switch"
//                         aria-checked={x.is_active}
//                         aria-label={`${x.is_active ? "Tắt" : "Bật"} danh mục ${x.name}`}
//                         disabled={saving}
//                         onClick={() =>
//                           void runAction(
//                             () => rpcSetCategoryActive(x.id, !x.is_active),
//                             "Không thể đổi trạng thái danh mục.",
//                             x.is_active
//                               ? "Đã tắt danh mục."
//                               : "Đã bật danh mục.",
//                           )
//                         }
//                         className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${x.is_active ? "bg-[#e5252a]" : "bg-stone-300"}`}
//                       >
//                         <span
//                           className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${x.is_active ? "translate-x-[18px]" : "translate-x-0.5"}`}
//                         />
//                       </button>
//                     </td>
//                     <td className="px-3 py-3 text-center">
//                       {editingCategoryId === x.id ? (
//                         <div className="inline-flex gap-1">
//                           <button
//                             type="button"
//                             disabled={saving}
//                             onClick={() => void saveCategory()}
//                             className="rounded-md bg-[#c92830] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
//                           >
//                             Lưu
//                           </button>
//                           <button
//                             type="button"
//                             onClick={() => setEditingCategoryId(null)}
//                             className="rounded-md px-2 py-1 text-[10px] text-stone-500 hover:bg-stone-100"
//                           >
//                             Hủy
//                           </button>
//                         </div>
//                       ) : (
//                         <button
//                           type="button"
//                           title="Chỉnh sửa danh mục"
//                           onClick={() => {
//                             setIsCreatingCategory(false);
//                             setEditingCategoryId(x.id);
//                             setCategoryDraft({
//                               name: x.name,
//                               sortOrder: x.sort_order ?? 0,
//                             });
//                           }}
//                           className="rounded-md p-1.5 text-slate-400 transition hover:bg-stone-100 hover:text-[#c92830]"
//                         >
//                           <Pencil size={14} />
//                         </button>
//                       )}
//                     </td>
//                   </tr>
//                 ))}
//                 {!filteredCategories.length && (
//                   <tr>
//                     <td
//                       colSpan={6}
//                       className="px-4 py-8 text-center text-stone-400"
//                     >
//                       Không tìm thấy danh mục.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </section>

//         <div className="grid min-w-0 gap-4">
//           <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
//             <PanelHeader
//               icon={<Palette size={19} />}
//               title="Màu sắc sản phẩm"
//               description="Màu dùng để phân loại sản phẩm"
//               actionLabel="Thêm màu sắc"
//               onAction={() => {
//                 setError("");
//                 setEditingColorId(null);
//                 setIsCreatingColor(true);
//                 setColorDraft({
//                   name: "",
//                   hexCode: "#FFFFFF",
//                   sortOrder: colors.length,
//                 });
//               }}
//             />
//             <div className="overflow-x-auto">
//               <table className="w-full min-w-[420px] border-collapse text-left text-xs">
//                 <thead>
//                   <tr className="border-y border-stone-100 bg-[#faf8f5] text-[10px] uppercase tracking-wide text-stone-500">
//                     <th className="px-3 py-3">#</th>
//                     <th className="px-3 py-3">Màu sắc</th>
//                     <th className="px-3 py-3">Mã màu</th>
//                     <th className="px-3 py-3 text-center">Số SP</th>
//                     <th className="px-3 py-3">Trạng thái</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {isCreatingColor && (
//                     <tr className="border-b border-stone-100 bg-red-50/40">
//                       <td className="px-3 py-3 text-stone-400">+</td>
//                       <td className="px-3 py-3">
//                         <input
//                           autoFocus
//                           value={colorDraft.name}
//                           onChange={(e) =>
//                             setColorDraft((d) => ({
//                               ...d,
//                               name: e.target.value,
//                             }))
//                           }
//                           className="w-24 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-red-300"
//                           placeholder="Tên màu mới"
//                           aria-label="Tên màu mới"
//                         />
//                       </td>
//                       <td className="px-3 py-3">
//                         <div className="flex items-center gap-1">
//                           <input
//                             type="color"
//                             value={colorDraft.hexCode}
//                             onChange={(e) =>
//                               setColorDraft((d) => ({
//                                 ...d,
//                                 hexCode: e.target.value.toUpperCase(),
//                               }))
//                             }
//                             className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
//                             aria-label="Chọn mã màu mới"
//                           />
//                           <span className="font-mono text-[10px] text-stone-500">
//                             {colorDraft.hexCode}
//                           </span>
//                         </div>
//                         <label className="mt-1 flex items-center gap-1 text-[10px] text-stone-500">
//                           Thứ tự{" "}
//                           <input
//                             type="number"
//                             min={0}
//                             step={1}
//                             value={colorDraft.sortOrder}
//                             onChange={(e) =>
//                               setColorDraft((d) => ({
//                                 ...d,
//                                 sortOrder: Number(e.target.value),
//                               }))
//                             }
//                             className="w-14 rounded border border-stone-200 px-1 py-1"
//                           />
//                         </label>
//                       </td>
//                       <td className="px-3 py-3 text-center">—</td>
//                       <td className="px-3 py-3">
//                         <div className="flex flex-wrap gap-1">
//                           <button
//                             type="button"
//                             disabled={saving}
//                             onClick={() => void saveColor()}
//                             className="rounded-md bg-[#c92830] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
//                           >
//                             Tạo
//                           </button>
//                           <button
//                             type="button"
//                             onClick={() => setIsCreatingColor(false)}
//                             className="rounded-md px-2 py-1 text-[10px] text-stone-500 hover:bg-stone-100"
//                           >
//                             Hủy
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   )}
//                   {filteredColors.map((x, i) => (
//                     <tr
//                       key={x.id}
//                       className="border-b border-stone-100 last:border-0 hover:bg-[#fdfbf9]"
//                     >
//                       <td className="px-3 py-3 text-stone-400">{i + 1}</td>
//                       <td className="px-3 py-3">
//                         {editingColorId === x.id ? (
//                           <input
//                             value={colorDraft.name}
//                             onChange={(e) =>
//                               setColorDraft((d) => ({
//                                 ...d,
//                                 name: e.target.value,
//                               }))
//                             }
//                             className="w-24 rounded-md border border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-red-300"
//                             aria-label="Tên màu"
//                           />
//                         ) : (
//                           <span className="inline-flex items-center gap-2 font-medium text-stone-700">
//                             <span
//                               className="h-3.5 w-3.5 rounded-full border border-black/10"
//                               style={{
//                                 backgroundColor: x.hex_code || "#e7e5e4",
//                               }}
//                             />
//                             {x.name}
//                           </span>
//                         )}
//                       </td>
//                       <td className="px-3 py-3">
//                         {editingColorId === x.id ? (
//                           <div className="flex items-center gap-1">
//                             <input
//                               type="color"
//                               value={
//                                 /^#[0-9A-Fa-f]{6}$/.test(colorDraft.hexCode)
//                                   ? colorDraft.hexCode
//                                   : "#e7e5e4"
//                               }
//                               onChange={(e) =>
//                                 setColorDraft((d) => ({
//                                   ...d,
//                                   hexCode: e.target.value.toUpperCase(),
//                                 }))
//                               }
//                               className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
//                               aria-label="Chọn mã màu"
//                             />
//                             <input
//                               value={colorDraft.hexCode}
//                               onChange={(e) =>
//                                 setColorDraft((d) => ({
//                                   ...d,
//                                   hexCode: e.target.value,
//                                 }))
//                               }
//                               className="w-[78px] rounded-md border border-stone-200 px-1.5 py-1.5 font-mono text-[10px] outline-none focus:border-red-300"
//                               aria-label="Mã HEX"
//                             />
//                           </div>
//                         ) : (
//                           <code className="rounded bg-stone-100 px-2 py-1 text-[10px] text-stone-500">
//                             {x.hex_code || "—"}
//                           </code>
//                         )}
//                       </td>
//                       <td className="px-3 py-3 text-center">
//                         <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-600">
//                           {numberLabel(
//                             products.filter((p) => p.color_id === x.id).length,
//                           )}
//                         </span>
//                       </td>
//                       <td className="px-3 py-3">
//                         <div className="flex items-center gap-2">
//                           <button
//                             type="button"
//                             role="switch"
//                             aria-checked={x.is_active}
//                             aria-label={`${x.is_active ? "Tắt" : "Bật"} màu ${x.name}`}
//                             disabled={saving}
//                             onClick={() =>
//                               void runAction(
//                                 () => rpcSetColorActive(x.id, !x.is_active),
//                                 "Không thể đổi trạng thái màu.",
//                                 x.is_active
//                                   ? "Đã tắt màu sắc."
//                                   : "Đã bật màu sắc.",
//                               )
//                             }
//                             className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${x.is_active ? "bg-[#e5252a]" : "bg-stone-300"}`}
//                           >
//                             <span
//                               className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${x.is_active ? "translate-x-[18px]" : "translate-x-0.5"}`}
//                             />
//                           </button>
//                           {editingColorId === x.id ? (
//                             <div className="inline-flex gap-1">
//                               <button
//                                 type="button"
//                                 disabled={saving}
//                                 onClick={() => void saveColor()}
//                                 className="rounded-md bg-[#c92830] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
//                               >
//                                 Lưu
//                               </button>
//                               <button
//                                 type="button"
//                                 onClick={() => setEditingColorId(null)}
//                                 className="rounded-md px-2 py-1 text-[10px] text-stone-500 hover:bg-stone-100"
//                               >
//                                 Hủy
//                               </button>
//                             </div>
//                           ) : (
//                             <button
//                               type="button"
//                               title="Chỉnh sửa màu"
//                               onClick={() => {
//                                 setIsCreatingColor(false);
//                                 setEditingColorId(x.id);
//                                 setColorDraft({
//                                   name: x.name,
//                                   hexCode: x.hex_code ?? "#FFFFFF",
//                                   sortOrder: x.sort_order ?? 0,
//                                 });
//                               }}
//                               className="rounded-md p-1.5 text-slate-400 hover:bg-stone-100 hover:text-[#c92830]"
//                             >
//                               <Pencil size={14} />
//                             </button>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                   {!filteredColors.length && (
//                     <tr>
//                       <td
//                         colSpan={5}
//                         className="px-3 py-8 text-center text-stone-400"
//                       >
//                         Không tìm thấy màu sắc.
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </section>

//           <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
//             <PanelHeader
//               icon={<Tag size={19} />}
//               title="Nhãn dán sản phẩm"
//               description="Nhãn hiển thị trên thẻ sản phẩm"
//               actionLabel="Thêm nhãn dán"
//               onAction={() => {
//                 setError("");
//                 setEditingBadgeId(null);
//                 setIsCreatingBadge(true);
//                 setBadgeDraft({
//                   name: "",
//                   backgroundColor: "#FEE2E2",
//                   textColor: "#991B1B",
//                   sortOrder: badges.length,
//                 });
//               }}
//             />
//             <div className="overflow-x-auto">
//               <table className="w-full min-w-[450px] border-collapse text-left text-xs">
//                 <thead>
//                   <tr className="border-y border-stone-100 bg-[#faf8f5] text-[10px] uppercase tracking-wide text-stone-500">
//                     <th className="px-3 py-3">#</th>
//                     <th className="px-3 py-3">Tên nhãn</th>
//                     <th className="px-3 py-3">Màu nền</th>
//                     <th className="px-3 py-3">Màu chữ</th>
//                     <th className="px-3 py-3 text-center">Số SP</th>
//                     <th className="px-3 py-3">Trạng thái</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {isCreatingBadge && (
//                     <tr className="border-b border-stone-100 bg-red-50/40">
//                       <td className="px-3 py-3 text-stone-400">+</td>
//                       <td className="px-3 py-3">
//                         <input
//                           autoFocus
//                           value={badgeDraft.name}
//                           onChange={(e) =>
//                             setBadgeDraft((d) => ({
//                               ...d,
//                               name: e.target.value,
//                             }))
//                           }
//                           className="w-[78px] rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-red-300"
//                           placeholder="Tên nhãn"
//                           aria-label="Tên nhãn mới"
//                         />
//                       </td>
//                       <td className="px-3 py-3">
//                         <input
//                           type="color"
//                           value={badgeDraft.backgroundColor}
//                           onChange={(e) =>
//                             setBadgeDraft((d) => ({
//                               ...d,
//                               backgroundColor: e.target.value.toUpperCase(),
//                             }))
//                           }
//                           className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
//                           aria-label="Màu nền nhãn mới"
//                         />
//                       </td>
//                       <td className="px-3 py-3">
//                         <input
//                           type="color"
//                           value={badgeDraft.textColor}
//                           onChange={(e) =>
//                             setBadgeDraft((d) => ({
//                               ...d,
//                               textColor: e.target.value.toUpperCase(),
//                             }))
//                           }
//                           className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
//                           aria-label="Màu chữ nhãn mới"
//                         />
//                         <label className="mt-1 flex items-center gap-1 text-[10px] text-stone-500">
//                           Thứ tự{" "}
//                           <input
//                             type="number"
//                             min={0}
//                             step={1}
//                             value={badgeDraft.sortOrder}
//                             onChange={(e) =>
//                               setBadgeDraft((d) => ({
//                                 ...d,
//                                 sortOrder: Number(e.target.value),
//                               }))
//                             }
//                             className="w-14 rounded border border-stone-200 px-1 py-1"
//                           />
//                         </label>
//                       </td>
//                       <td className="px-3 py-3 text-center">—</td>
//                       <td className="px-3 py-3">
//                         <div className="flex flex-wrap gap-1">
//                           <button
//                             type="button"
//                             disabled={saving}
//                             onClick={() => void saveBadge()}
//                             className="rounded-md bg-[#c92830] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
//                           >
//                             Tạo
//                           </button>
//                           <button
//                             type="button"
//                             onClick={() => setIsCreatingBadge(false)}
//                             className="rounded-md px-2 py-1 text-[10px] text-stone-500 hover:bg-stone-100"
//                           >
//                             Hủy
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   )}
//                   {filteredBadges.map((x, i) => (
//                     <tr
//                       key={x.id}
//                       className="border-b border-stone-100 last:border-0 hover:bg-[#fdfbf9]"
//                     >
//                       <td className="px-3 py-3 text-stone-400">{i + 1}</td>
//                       <td className="px-3 py-3">
//                         {editingBadgeId === x.id ? (
//                           <input
//                             value={badgeDraft.name}
//                             onChange={(e) =>
//                               setBadgeDraft((d) => ({
//                                 ...d,
//                                 name: e.target.value,
//                               }))
//                             }
//                             className="w-[78px] rounded-md border border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-red-300"
//                             aria-label="Tên nhãn"
//                           />
//                         ) : (
//                           <span
//                             className="inline-flex max-w-[82px] rounded-md px-2 py-1 text-center text-[10px] font-bold"
//                             style={{
//                               backgroundColor: x.background_color,
//                               color: x.text_color,
//                             }}
//                           >
//                             {x.name}
//                           </span>
//                         )}
//                       </td>
//                       <td className="px-3 py-3">
//                         {editingBadgeId === x.id ? (
//                           <input
//                             type="color"
//                             value={badgeDraft.backgroundColor}
//                             onChange={(e) =>
//                               setBadgeDraft((d) => ({
//                                 ...d,
//                                 backgroundColor: e.target.value.toUpperCase(),
//                               }))
//                             }
//                             className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
//                             aria-label="Màu nền nhãn"
//                           />
//                         ) : (
//                           <code className="rounded bg-stone-100 px-2 py-1 text-[10px] text-stone-500">
//                             {x.background_color}
//                           </code>
//                         )}
//                       </td>
//                       <td className="px-3 py-3">
//                         {editingBadgeId === x.id ? (
//                           <input
//                             type="color"
//                             value={badgeDraft.textColor}
//                             onChange={(e) =>
//                               setBadgeDraft((d) => ({
//                                 ...d,
//                                 textColor: e.target.value.toUpperCase(),
//                               }))
//                             }
//                             className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
//                             aria-label="Màu chữ nhãn"
//                           />
//                         ) : (
//                           <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] text-stone-500">
//                             <span
//                               className="h-2.5 w-2.5 rounded-full"
//                               style={{ backgroundColor: x.text_color }}
//                             />
//                             {x.text_color}
//                           </span>
//                         )}
//                       </td>
//                       <td className="px-3 py-3 text-center">
//                         <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-600">
//                           {numberLabel(
//                             products.filter((p) => p.badge_id === x.id).length,
//                           )}
//                         </span>
//                       </td>
//                       <td className="px-3 py-3">
//                         <div className="flex items-center gap-2">
//                           <button
//                             type="button"
//                             role="switch"
//                             aria-checked={x.is_active}
//                             aria-label={`${x.is_active ? "Tắt" : "Bật"} nhãn ${x.name}`}
//                             disabled={saving}
//                             onClick={() =>
//                               void runAction(
//                                 () => rpcSetBadgeActive(x.id, !x.is_active),
//                                 "Không thể đổi trạng thái nhãn.",
//                                 x.is_active
//                                   ? "Đã tắt nhãn dán."
//                                   : "Đã bật nhãn dán.",
//                               )
//                             }
//                             className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${x.is_active ? "bg-[#e5252a]" : "bg-stone-300"}`}
//                           >
//                             <span
//                               className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${x.is_active ? "translate-x-[18px]" : "translate-x-0.5"}`}
//                             />
//                           </button>
//                           {editingBadgeId === x.id ? (
//                             <div className="inline-flex gap-1">
//                               <button
//                                 type="button"
//                                 disabled={saving}
//                                 onClick={() => void saveBadge()}
//                                 className="rounded-md bg-[#c92830] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
//                               >
//                                 Lưu
//                               </button>
//                               <button
//                                 type="button"
//                                 onClick={() => setEditingBadgeId(null)}
//                                 className="rounded-md px-2 py-1 text-[10px] text-stone-500 hover:bg-stone-100"
//                               >
//                                 Hủy
//                               </button>
//                             </div>
//                           ) : (
//                             <button
//                               type="button"
//                               title="Chỉnh sửa nhãn"
//                               onClick={() => {
//                                 setIsCreatingBadge(false);
//                                 setEditingBadgeId(x.id);
//                                 setBadgeDraft({
//                                   name: x.name,
//                                   backgroundColor: x.background_color,
//                                   textColor: x.text_color,
//                                   sortOrder: x.sort_order ?? 0,
//                                 });
//                               }}
//                               className="rounded-md p-1.5 text-slate-400 hover:bg-stone-100 hover:text-[#c92830]"
//                             >
//                               <Pencil size={14} />
//                             </button>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                   {!filteredBadges.length && (
//                     <tr>
//                       <td
//                         colSpan={6}
//                         className="px-3 py-8 text-center text-stone-400"
//                       >
//                         Không tìm thấy nhãn dán.
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </section>
//         </div>
//       </div>
//     </section>
//   );
// }
import { useEffect, useMemo, useState } from "react";
import { Boxes, RefreshCw, Search, Palette, Tag, Pencil } from "lucide-react";
import {
  listCategories,
  listColors,
  listBadges,
  rpcCreateCategory,
  rpcCreateColor,
  rpcCreateBadge,
  rpcUpdateCategory,
  rpcSetCategoryActive,
  rpcUpdateColor,
  rpcSetColorActive,
  rpcUpdateBadge,
  rpcSetBadgeActive,
  type Badge,
} from "../services/rpcContract";
import { listManageableProducts } from "../services/productService";
import type { Category, Color, Product } from "../types/database";
import { useToast } from "../components/layout/ToastProvider";

type Panel = "categories" | "colors" | "badges";

const numberLabel = (value: number) => value.toLocaleString("vi-VN");

function PanelHeader({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f0e9e1] px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-[#c92830]">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-stone-800">{title}</h2>
          <p className="mt-0.5 text-[11px] leading-4 text-stone-500">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={!onAction}
        onClick={onAction}
        title={
          onAction ? actionLabel : "Chức năng chỉnh sửa đang được hoàn thiện"
        }
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#c92830] px-3 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#b51f27] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="text-base leading-none">+</span>
        <span className="hidden sm:inline">{actionLabel}</span>
      </button>
    </div>
  );
}

export function CategoriesPage() {
  const toast = useToast();
  const [items, setItems] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState<Panel>("categories");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingColor, setIsCreatingColor] = useState(false);
  const [isCreatingBadge, setIsCreatingBadge] = useState(false);
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState({
    name: "",
    sortOrder: 0,
  });
  const [colorDraft, setColorDraft] = useState({
    name: "",
    hexCode: "",
    sortOrder: 0,
  });
  const [badgeDraft, setBadgeDraft] = useState({
    name: "",
    backgroundColor: "",
    textColor: "",
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  async function runAction(
    action: () => Promise<unknown>,
    fallbackMessage: string,
    successMessage: string,
  ): Promise<boolean> {
    setError("");
    setSaving(true);
    try {
      await action();
      toast.success(successMessage);
      // A successful write should not be reported as failed just because
      // refreshing the list failed. reload() keeps its own error visible.
      await reload();
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : fallbackMessage;
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveCategory() {
    const name = categoryDraft.name.trim();
    if (!name) {
      setError("Tên danh mục không được để trống.");
      toast.error("Tên danh mục không được để trống.");
      return;
    }

    const sortOrder = Number(categoryDraft.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setError("Thứ tự danh mục phải là số nguyên không âm.");
      toast.error("Thứ tự danh mục phải là số nguyên không âm.");
      return;
    }

    if (isCreatingCategory) {
      if (
        await runAction(
          () => rpcCreateCategory({ name, sortOrder }),
          "Không thể tạo danh mục.",
          "Đã tạo danh mục.",
        )
      ) {
        setIsCreatingCategory(false);
        setCategoryDraft({ name: "", sortOrder: 0 });
      }
      return;
    }

    if (!editingCategoryId) return;
    if (
      await runAction(
        () => rpcUpdateCategory({ id: editingCategoryId, name, sortOrder }),
        "Không thể cập nhật danh mục.",
        "Đã cập nhật danh mục.",
      )
    ) {
      setEditingCategoryId(null);
    }
  }

  async function saveColor() {
    const input = { ...colorDraft, name: colorDraft.name.trim() };
    if (!input.name) {
      setError("Tên màu không được để trống.");
      toast.error("Tên màu không được để trống.");
      return;
    }
    if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
      setError("Thứ tự màu phải là số nguyên không âm.");
      toast.error("Thứ tự màu phải là số nguyên không âm.");
      return;
    }
    const ok = await runAction(
      () =>
        isCreatingColor
          ? rpcCreateColor(input)
          : editingColorId
            ? rpcUpdateColor({ id: editingColorId, ...input })
            : Promise.reject(
                new Error("Không xác định được thao tác màu sắc."),
              ),
      "Không thể lưu màu sắc.",
      isCreatingColor ? "Đã tạo màu sắc." : "Đã cập nhật màu sắc.",
    );
    if (ok) {
      setEditingColorId(null);
      setIsCreatingColor(false);
      setColorDraft({ name: "", hexCode: "#FFFFFF", sortOrder: colors.length });
    }
  }

  async function saveBadge() {
    const input = { ...badgeDraft, name: badgeDraft.name.trim() };
    if (!input.name) {
      setError("Tên nhãn dán không được để trống.");
      toast.error("Tên nhãn dán không được để trống.");
      return;
    }
    if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
      setError("Thứ tự nhãn dán phải là số nguyên không âm.");
      toast.error("Thứ tự nhãn dán phải là số nguyên không âm.");
      return;
    }
    const ok = await runAction(
      () =>
        isCreatingBadge
          ? rpcCreateBadge(input)
          : editingBadgeId
            ? rpcUpdateBadge({ id: editingBadgeId, ...input })
            : Promise.reject(
                new Error("Không xác định được thao tác nhãn dán."),
              ),
      "Không thể lưu nhãn dán.",
      isCreatingBadge ? "Đã tạo nhãn dán." : "Đã cập nhật nhãn dán.",
    );
    if (ok) {
      setEditingBadgeId(null);
      setIsCreatingBadge(false);
      setBadgeDraft({
        name: "",
        backgroundColor: "#FEE2E2",
        textColor: "#991B1B",
        sortOrder: badges.length,
      });
    }
  }

  async function reload(): Promise<boolean> {
    setError("");
    setLoading(true);
    try {
      const [categoryData, colorData, badgeData, productData] =
        await Promise.all([
          listCategories(),
          listColors(),
          listBadges(),
          listManageableProducts(),
        ]);
      setItems(categoryData);
      setColors(colorData);
      setBadges(badgeData);
      setProducts(productData);
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không tải được dữ liệu danh mục và phân loại.",
      );
      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const filteredCategories = useMemo(
    () =>
      items.filter(
        (x) =>
          x.name.toLowerCase().includes(query.toLowerCase()) ||
          x.slug.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, query],
  );

  const filteredColors = useMemo(
    () =>
      colors.filter((x) => x.name.toLowerCase().includes(query.toLowerCase())),
    [colors, query],
  );

  const filteredBadges = useMemo(
    () =>
      badges.filter((x) => x.name.toLowerCase().includes(query.toLowerCase())),
    [badges, query],
  );

  const activeCategories = items.filter((x) => x.is_active).length;
  const activeColors = colors.filter((x) => x.is_active).length;
  const activeBadges = badges.filter((x) => x.is_active).length;

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#c92d35]">
            CATALOGUE SETTINGS
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
            Danh mục &amp; Phân Loại
          </h1>
          <p className="mt-1.5 text-sm text-stone-500">
            Quản lý danh mục, màu sắc và nhãn dán hiển thị trên sản phẩm.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Danh mục",
            count: items.length,
            active: activeCategories,
            icon: <Boxes size={18} />,
            target: "categories" as Panel,
          },
          {
            label: "Màu sắc",
            count: colors.length,
            active: activeColors,
            icon: <Palette size={18} />,
            target: "colors" as Panel,
          },
          {
            label: "Nhãn dán",
            count: badges.length,
            active: activeBadges,
            icon: <Tag size={18} />,
            target: "badges" as Panel,
          },
        ].map((card) => (
          <button
            key={card.target}
            type="button"
            onClick={() => setPanel(card.target)}
            className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left transition ${
              panel === card.target
                ? "border-red-200 ring-1 ring-red-100"
                : "border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-[#c92d35]">
              {card.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-stone-500">{card.label}</div>
              <div className="mt-0.5 text-xl font-bold text-stone-900">
                {numberLabel(card.count)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-stone-400">Hoạt động</div>
              <div className="text-sm font-semibold text-emerald-700">
                {numberLabel(card.active)}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Main management panels */}
      <div className="grid items-start gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <PanelHeader
            icon={<Boxes size={19} />}
            title="Danh mục sản phẩm"
            description="Danh mục hiển thị trên website"
            actionLabel="Thêm danh mục"
            onAction={() => {
              setError("");
              setEditingCategoryId(null);
              setCategoryDraft({ name: "", sortOrder: items.length });
              setIsCreatingCategory(true);
            }}
          />
          <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
            <span className="text-[11px] text-stone-500">
              {filteredCategories.length} danh mục
            </span>
            <label className="relative block sm:w-56">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-8 pr-3 text-xs outline-none focus:border-red-300"
                placeholder="Tìm danh mục, màu, nhãn..."
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-y border-stone-100 bg-[#faf8f5] text-[10px] uppercase tracking-wide text-stone-500">
                  <th className="w-10 px-3 py-3">#</th>
                  <th className="px-3 py-3">Thông tin danh mục</th>
                  <th className="px-3 py-3">Slug</th>
                  <th className="px-3 py-3 text-center">Số SP</th>
                  <th className="px-3 py-3">Trạng thái</th>
                  <th className="px-3 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isCreatingCategory && (
                  <tr className="border-b border-stone-100 bg-red-50/40">
                    <td className="px-3 py-3 text-stone-400">+</td>
                    <td className="px-3 py-3">
                      <div className="grid min-w-[150px] gap-1.5">
                        <input
                          autoFocus
                          value={categoryDraft.name}
                          onChange={(e) =>
                            setCategoryDraft((d) => ({
                              ...d,
                              name: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void saveCategory();
                            }
                            if (e.key === "Escape")
                              setIsCreatingCategory(false);
                          }}
                          className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-red-300"
                          placeholder="Tên danh mục mới"
                          aria-label="Tên danh mục mới"
                        />
                        <label className="flex items-center gap-2 text-[10px] text-stone-500">
                          Thứ tự
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={categoryDraft.sortOrder}
                            onChange={(e) =>
                              setCategoryDraft((d) => ({
                                ...d,
                                sortOrder: Number(e.target.value),
                              }))
                            }
                            className="w-20 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-red-300"
                            aria-label="Thứ tự danh mục mới"
                          />
                        </label>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-stone-400">Tự tạo</td>
                    <td className="px-3 py-3 text-center text-stone-400">—</td>
                    <td className="px-3 py-3 text-stone-400">Mặc định</td>
                    <td className="px-3 py-3 text-center">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void saveCategory()}
                          className="rounded-md bg-[#c92830] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                        >
                          Tạo
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            setIsCreatingCategory(false);
                            setCategoryDraft({ name: "", sortOrder: 0 });
                          }}
                          className="rounded-md px-2 py-1 text-[10px] text-stone-500 hover:bg-stone-100 disabled:opacity-50"
                        >
                          Hủy
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredCategories.map((x, i) => (
                  <tr
                    key={x.id}
                    className="border-b border-stone-100 last:border-0 hover:bg-[#fdfbf9]"
                  >
                    <td className="px-3 py-3 text-stone-400">{i + 1}</td>
                    <td className="px-3 py-3">
                      {editingCategoryId === x.id ? (
                        <>
                          <input
                            value={categoryDraft.name}
                            onChange={(e) =>
                              setCategoryDraft((d) => ({
                                ...d,
                                name: e.target.value,
                              }))
                            }
                            className="w-full min-w-[120px] rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-red-300"
                            aria-label="Tên danh mục"
                          />
                          <label className="mt-1 flex items-center gap-2 text-[10px] text-stone-500">
                            Thứ tự
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={categoryDraft.sortOrder}
                              onChange={(e) =>
                                setCategoryDraft((d) => ({
                                  ...d,
                                  sortOrder: Number(e.target.value),
                                }))
                              }
                              className="w-20 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs outline-none focus:border-red-300"
                              aria-label="Thứ tự danh mục"
                            />
                          </label>
                        </>
                      ) : (
                        <div className="font-semibold text-stone-800">
                          {x.name}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <code className="rounded bg-stone-100 px-2 py-1 text-[10px] text-stone-500">
                        {x.slug}
                      </code>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-600">
                        {numberLabel(
                          products.filter((p) => p.category_id === x.id).length,
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={x.is_active}
                        aria-label={`${x.is_active ? "Tắt" : "Bật"} danh mục ${x.name}`}
                        disabled={saving}
                        onClick={() =>
                          void runAction(
                            () => rpcSetCategoryActive(x.id, !x.is_active),
                            "Không thể đổi trạng thái danh mục.",
                            x.is_active
                              ? "Đã tắt danh mục."
                              : "Đã bật danh mục.",
                          )
                        }
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${x.is_active ? "bg-[#e5252a]" : "bg-stone-300"}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${x.is_active ? "translate-x-[18px]" : "translate-x-0.5"}`}
                        />
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {editingCategoryId === x.id ? (
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void saveCategory()}
                            className="rounded-md bg-[#c92830] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryId(null)}
                            className="rounded-md px-2 py-1 text-[10px] text-stone-500 hover:bg-stone-100"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          title="Chỉnh sửa danh mục"
                          onClick={() => {
                            setIsCreatingCategory(false);
                            setEditingCategoryId(x.id);
                            setCategoryDraft({
                              name: x.name,
                              sortOrder: x.sort_order ?? 0,
                            });
                          }}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-stone-100 hover:text-[#c92830]"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!filteredCategories.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-stone-400"
                    >
                      Không tìm thấy danh mục.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid min-w-0 gap-4">
          <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <PanelHeader
              icon={<Palette size={19} />}
              title="Màu sắc sản phẩm"
              description="Màu dùng để phân loại sản phẩm"
              actionLabel="Thêm màu sắc"
              onAction={() => {
                setError("");
                setEditingColorId(null);
                setIsCreatingColor(true);
                setColorDraft({
                  name: "",
                  hexCode: "#FFFFFF",
                  sortOrder: colors.length,
                });
              }}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-y border-stone-100 bg-[#faf8f5] text-[10px] uppercase tracking-wide text-stone-500">
                    <th className="px-3 py-3">#</th>
                    <th className="px-3 py-3">Màu sắc</th>
                    <th className="px-3 py-3">Mã màu</th>
                    <th className="px-3 py-3 text-center">Số SP</th>
                    <th className="px-3 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {isCreatingColor && (
                    <tr className="border-b border-stone-100 bg-red-50/40">
                      <td className="px-3 py-3 text-stone-400">+</td>
                      <td className="px-3 py-3">
                        <input
                          autoFocus
                          value={colorDraft.name}
                          onChange={(e) =>
                            setColorDraft((d) => ({
                              ...d,
                              name: e.target.value,
                            }))
                          }
                          className="w-24 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-red-300"
                          placeholder="Tên màu mới"
                          aria-label="Tên màu mới"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="color"
                            value={colorDraft.hexCode}
                            onChange={(e) =>
                              setColorDraft((d) => ({
                                ...d,
                                hexCode: e.target.value.toUpperCase(),
                              }))
                            }
                            className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                            aria-label="Chọn mã màu mới"
                          />
                          <span className="font-mono text-[10px] text-stone-500">
                            {colorDraft.hexCode}
                          </span>
                        </div>
                        <label className="mt-1 flex items-center gap-1 text-[10px] text-stone-500">
                          Thứ tự{" "}
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={colorDraft.sortOrder}
                            onChange={(e) =>
                              setColorDraft((d) => ({
                                ...d,
                                sortOrder: Number(e.target.value),
                              }))
                            }
                            className="w-14 rounded border border-stone-200 px-1 py-1"
                          />
                        </label>
                      </td>
                      <td className="px-3 py-3 text-center">—</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void saveColor()}
                            className="rounded-md bg-[#c92830] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                          >
                            Tạo
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCreatingColor(false)}
                            className="rounded-md px-2 py-1 text-[10px] text-stone-500 hover:bg-stone-100"
                          >
                            Hủy
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredColors.map((x, i) => (
                    <tr
                      key={x.id}
                      className="border-b border-stone-100 last:border-0 hover:bg-[#fdfbf9]"
                    >
                      <td className="px-3 py-3 text-stone-400">{i + 1}</td>
                      <td className="px-3 py-3">
                        {editingColorId === x.id ? (
                          <input
                            value={colorDraft.name}
                            onChange={(e) =>
                              setColorDraft((d) => ({
                                ...d,
                                name: e.target.value,
                              }))
                            }
                            className="w-24 rounded-md border border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-red-300"
                            aria-label="Tên màu"
                          />
                        ) : (
                          <span className="inline-flex items-center gap-2 font-medium text-stone-700">
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-black/10"
                              style={{
                                backgroundColor: x.hex_code || "#e7e5e4",
                              }}
                            />
                            {x.name}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {editingColorId === x.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={
                                /^#[0-9A-Fa-f]{6}$/.test(colorDraft.hexCode)
                                  ? colorDraft.hexCode
                                  : "#e7e5e4"
                              }
                              onChange={(e) =>
                                setColorDraft((d) => ({
                                  ...d,
                                  hexCode: e.target.value.toUpperCase(),
                                }))
                              }
                              className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                              aria-label="Chọn mã màu"
                            />
                            <input
                              value={colorDraft.hexCode}
                              onChange={(e) =>
                                setColorDraft((d) => ({
                                  ...d,
                                  hexCode: e.target.value,
                                }))
                              }
                              className="w-[78px] rounded-md border border-stone-200 px-1.5 py-1.5 font-mono text-[10px] outline-none focus:border-red-300"
                              aria-label="Mã HEX"
                            />
                          </div>
                        ) : (
                          <code className="rounded bg-stone-100 px-2 py-1 text-[10px] text-stone-500">
                            {x.hex_code || "—"}
                          </code>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-600">
                          {numberLabel(
                            products.filter((p) => p.color_id === x.id).length,
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={x.is_active}
                            aria-label={`${x.is_active ? "Tắt" : "Bật"} màu ${x.name}`}
                            disabled={saving}
                            onClick={() =>
                              void runAction(
                                () => rpcSetColorActive(x.id, !x.is_active),
                                "Không thể đổi trạng thái màu.",
                                x.is_active
                                  ? "Đã tắt màu sắc."
                                  : "Đã bật màu sắc.",
                              )
                            }
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${x.is_active ? "bg-[#e5252a]" : "bg-stone-300"}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${x.is_active ? "translate-x-[18px]" : "translate-x-0.5"}`}
                            />
                          </button>
                          {editingColorId === x.id ? (
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void saveColor()}
                                className="rounded-md bg-[#c92830] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingColorId(null)}
                                className="rounded-md px-2 py-1 text-[10px] text-stone-500 hover:bg-stone-100"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              title="Chỉnh sửa màu"
                              onClick={() => {
                                setIsCreatingColor(false);
                                setEditingColorId(x.id);
                                setColorDraft({
                                  name: x.name,
                                  hexCode: x.hex_code ?? "#FFFFFF",
                                  sortOrder: x.sort_order ?? 0,
                                });
                              }}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-stone-100 hover:text-[#c92830]"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredColors.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-stone-400"
                      >
                        Không tìm thấy màu sắc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <PanelHeader
              icon={<Tag size={19} />}
              title="Nhãn dán sản phẩm"
              description="Nhãn hiển thị trên thẻ sản phẩm"
              actionLabel="Thêm nhãn dán"
              onAction={() => {
                setError("");
                setEditingBadgeId(null);
                setIsCreatingBadge(true);
                setBadgeDraft({
                  name: "",
                  backgroundColor: "#FEE2E2",
                  textColor: "#991B1B",
                  sortOrder: badges.length,
                });
              }}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[450px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-y border-stone-100 bg-[#faf8f5] text-[10px] uppercase tracking-wide text-stone-500">
                    <th className="px-3 py-3">#</th>
                    <th className="px-3 py-3">Tên nhãn</th>
                    <th className="px-3 py-3">Màu nền</th>
                    <th className="px-3 py-3">Màu chữ</th>
                    <th className="px-3 py-3 text-center">Số SP</th>
                    <th className="px-3 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {isCreatingBadge && (
                    <tr className="border-b border-stone-100 bg-red-50/40">
                      <td className="px-3 py-3 text-stone-400">+</td>
                      <td className="px-3 py-3">
                        <input
                          autoFocus
                          value={badgeDraft.name}
                          onChange={(e) =>
                            setBadgeDraft((d) => ({
                              ...d,
                              name: e.target.value,
                            }))
                          }
                          className="w-[78px] rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-red-300"
                          placeholder="Tên nhãn"
                          aria-label="Tên nhãn mới"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="color"
                          value={badgeDraft.backgroundColor}
                          onChange={(e) =>
                            setBadgeDraft((d) => ({
                              ...d,
                              backgroundColor: e.target.value.toUpperCase(),
                            }))
                          }
                          className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                          aria-label="Màu nền nhãn mới"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="color"
                          value={badgeDraft.textColor}
                          onChange={(e) =>
                            setBadgeDraft((d) => ({
                              ...d,
                              textColor: e.target.value.toUpperCase(),
                            }))
                          }
                          className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                          aria-label="Màu chữ nhãn mới"
                        />
                        <label className="mt-1 flex items-center gap-1 text-[10px] text-stone-500">
                          Thứ tự{" "}
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={badgeDraft.sortOrder}
                            onChange={(e) =>
                              setBadgeDraft((d) => ({
                                ...d,
                                sortOrder: Number(e.target.value),
                              }))
                            }
                            className="w-14 rounded border border-stone-200 px-1 py-1"
                          />
                        </label>
                      </td>
                      <td className="px-3 py-3 text-center">—</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void saveBadge()}
                            className="rounded-md bg-[#c92830] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                          >
                            Tạo
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCreatingBadge(false)}
                            className="rounded-md px-2 py-1 text-[10px] text-stone-500 hover:bg-stone-100"
                          >
                            Hủy
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredBadges.map((x, i) => (
                    <tr
                      key={x.id}
                      className="border-b border-stone-100 last:border-0 hover:bg-[#fdfbf9]"
                    >
                      <td className="px-3 py-3 text-stone-400">{i + 1}</td>
                      <td className="px-3 py-3">
                        {editingBadgeId === x.id ? (
                          <input
                            value={badgeDraft.name}
                            onChange={(e) =>
                              setBadgeDraft((d) => ({
                                ...d,
                                name: e.target.value,
                              }))
                            }
                            className="w-[78px] rounded-md border border-stone-200 px-2 py-1.5 text-xs outline-none focus:border-red-300"
                            aria-label="Tên nhãn"
                          />
                        ) : (
                          <span
                            className="inline-flex max-w-[82px] rounded-md px-2 py-1 text-center text-[10px] font-bold"
                            style={{
                              backgroundColor: x.background_color,
                              color: x.text_color,
                            }}
                          >
                            {x.name}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {editingBadgeId === x.id ? (
                          <input
                            type="color"
                            value={badgeDraft.backgroundColor}
                            onChange={(e) =>
                              setBadgeDraft((d) => ({
                                ...d,
                                backgroundColor: e.target.value.toUpperCase(),
                              }))
                            }
                            className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                            aria-label="Màu nền nhãn"
                          />
                        ) : (
                          <code className="rounded bg-stone-100 px-2 py-1 text-[10px] text-stone-500">
                            {x.background_color}
                          </code>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {editingBadgeId === x.id ? (
                          <input
                            type="color"
                            value={badgeDraft.textColor}
                            onChange={(e) =>
                              setBadgeDraft((d) => ({
                                ...d,
                                textColor: e.target.value.toUpperCase(),
                              }))
                            }
                            className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                            aria-label="Màu chữ nhãn"
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] text-stone-500">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: x.text_color }}
                            />
                            {x.text_color}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-600">
                          {numberLabel(
                            products.filter((p) => p.badge_id === x.id).length,
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={x.is_active}
                            aria-label={`${x.is_active ? "Tắt" : "Bật"} nhãn ${x.name}`}
                            disabled={saving}
                            onClick={() =>
                              void runAction(
                                () => rpcSetBadgeActive(x.id, !x.is_active),
                                "Không thể đổi trạng thái nhãn.",
                                x.is_active
                                  ? "Đã tắt nhãn dán."
                                  : "Đã bật nhãn dán.",
                              )
                            }
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${x.is_active ? "bg-[#e5252a]" : "bg-stone-300"}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${x.is_active ? "translate-x-[18px]" : "translate-x-0.5"}`}
                            />
                          </button>
                          {editingBadgeId === x.id ? (
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void saveBadge()}
                                className="rounded-md bg-[#c92830] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingBadgeId(null)}
                                className="rounded-md px-2 py-1 text-[10px] text-stone-500 hover:bg-stone-100"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              title="Chỉnh sửa nhãn"
                              onClick={() => {
                                setIsCreatingBadge(false);
                                setEditingBadgeId(x.id);
                                setBadgeDraft({
                                  name: x.name,
                                  backgroundColor: x.background_color,
                                  textColor: x.text_color,
                                  sortOrder: x.sort_order ?? 0,
                                });
                              }}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-stone-100 hover:text-[#c92830]"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredBadges.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-stone-400"
                      >
                        Không tìm thấy nhãn dán.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
