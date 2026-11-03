import {
  ChevronLeft,
  ChevronRight,
  Flower2,
  X,
  LayoutDashboard,
  Package,
  Tags,
  Settings,
  UserRound,
  ReceiptText,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

// Các trang điều hướng chính
const navigation = [
  { to: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { to: "/products", label: "Sản phẩm", icon: Package },
  { to: "/orders", label: "Đơn hàng", icon: ReceiptText },
];

// Các trang chỉ dành cho Admin
const adminNavigation = [
  { to: "/categories", label: "Danh mục & Phân loại", icon: Tags },
];

type SidebarProps = {
  mobileOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export default function Sidebar({ mobileOpen, onOpen, onClose }: SidebarProps) {
  // Lấy thông tin tài khoản và quyền từ AuthContext
  const { user, profile, isAdmin, roleLoading } = useAuth();

  // Chỉ hiển thị menu quản trị khi đã xác định được quyền Admin
  const visibleNavigation = [
    ...navigation,
    ...(isAdmin && !roleLoading ? adminNavigation : []),
  ];

  return (
    <>
      {/* Lớp phủ: mobile và tablet */}
      <button
        type="button"
        aria-label="Đóng menu"
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ease-in-out xl:hidden ${
          mobileOpen
            ? "visible opacity-100"
            : "invisible pointer-events-none opacity-0"
        }`}
      />

      {/* Wrapper chung: sidebar và nút gạt trượt cùng nhau */}
      <div
        className={`fixed inset-y-0 left-0 z-50 h-dvh w-[min(280px,80vw)]
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          xl:sticky xl:top-0 xl:z-auto xl:h-screen xl:w-62.5
          xl:shrink-0 xl:translate-x-0`}
      >
        {/* Sidebar */}
        <aside
          id="admin-sidebar"
          className="flex h-full w-full flex-col overflow-y-auto bg-[#211f1e] px-4 py-5 text-white xl:w-[250px]"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c92d35]">
              <Flower2 size={22} />
            </div>

            <div className="min-w-0">
              <div className="text-lg font-bold tracking-tight">Mèo Hoa</div>
            </div>

            <button
              type="button"
              aria-label="Đóng menu"
              onClick={onClose}
              className="ml-auto rounded-lg p-1 text-stone-300 transition hover:bg-stone-700 xl:hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tiêu đề điều hướng */}
          <div className="mb-2 mt-10 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-stone-500">
            Quản lý cửa hàng
          </div>

          {/* Điều hướng */}
          <nav className="grid gap-1.5">
            {visibleNavigation.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/dashboard"}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition ${
                    isActive
                      ? "bg-[#c92d35] text-white shadow-lg shadow-red-950/20"
                      : "text-stone-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={17} />
                <span>{label}</span>
                <ChevronRight className="ml-auto opacity-50" size={14} />
              </NavLink>
            ))}
          </nav>

          {/* Tài khoản ở cuối Sidebar */}
          <div className="mt-auto border-t border-white/10 pt-5">
            <div className="flex items-center gap-3 px-1">
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#c92d35]">
                <UserRound size={15} strokeWidth={2} />
              </div>

              {/* Thông tin người dùng */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold leading-tight text-white">
                  {profile?.full_name || (isAdmin ? "Admin" : "Nhân viên")}
                </div>

                <div
                  className="mt-1 truncate text-[11px] leading-tight text-stone-400"
                  title={user?.email ?? ""}
                >
                  {user?.email}
                </div>
              </div>

              {/* Nút điều hướng Cài đặt */}
              <NavLink
                to="/settings"
                aria-label="Cài đặt tài khoản"
                title="Cài đặt tài khoản"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-stone-400 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Settings size={17} strokeWidth={2} />
              </NavLink>
            </div>
          </div>
        </aside>

        {/* Nút gạt: luôn đi cùng wrapper */}
        <button
          type="button"
          aria-label={mobileOpen ? "Đóng sidebar" : "Mở sidebar"}
          aria-controls="admin-sidebar"
          aria-expanded={mobileOpen}
          onClick={mobileOpen ? onClose : onOpen}
          className="absolute left-full top-1/2 z-60 flex h-12 w-7
            -translate-y-1/2 items-center justify-center
            rounded-r-xl border border-l-0 border-white/10
            bg-[#211f1e] text-stone-200 shadow-md
            transition-colors duration-200
            hover:bg-[#302c2a] hover:text-white xl:hidden"
        >
          {mobileOpen ? (
            <ChevronLeft size={20} strokeWidth={2} />
          ) : (
            <ChevronRight size={20} strokeWidth={2} />
          )}
        </button>
      </div>
    </>
  );
}
