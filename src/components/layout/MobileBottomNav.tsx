import { LayoutDashboard, Package, ShoppingBag, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

type MobileBottomNavProps = {
  pendingOrdersCount?: number;
};

const navigation = [
  {
    to: "/",
    label: "Tổng Quan",
    icon: LayoutDashboard,
    matches: (pathname: string) => pathname === "/",
  },
  {
    to: "/products",
    label: "Sản Phẩm",
    icon: Package,
    matches: (pathname: string) => pathname.startsWith("/products"),
  },
  {
    to: "/orders",
    label: "Đơn Hàng",
    icon: ShoppingBag,
    matches: (pathname: string) => pathname.startsWith("/orders"),
  },
  {
    to: "/settings",
    label: "Cài Đặt",
    icon: Settings,
    matches: (pathname: string) => pathname.startsWith("/settings"),
  },
];

export default function MobileBottomNav({
  pendingOrdersCount = 0,
}: MobileBottomNavProps) {
  const location = useLocation();

  return (
    <nav
      aria-label="Điều hướng chính trên điện thoại"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e9e0d7] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(41,37,36,0.04)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid h-[66px] max-w-xl grid-cols-4">
        {navigation.map(({ to, label, icon: Icon, matches }) => {
          const active = matches(location.pathname);
          const showOrderCount = to === "/orders" && pendingOrdersCount > 0;

          return (
            <NavLink
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 transition ${
                active ? "text-[#c92830]" : "text-stone-500"
              }`}
            >
              <span className="relative">
                <Icon size={23} strokeWidth={active ? 2.4 : 1.9} />

                {showOrderCount && (
                  <span className="absolute -right-3 -top-2 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#c92830] px-1 text-[9px] font-bold text-white ring-2 ring-white">
                    {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
                  </span>
                )}
              </span>

              <span
                className={`text-[10px] ${
                  active ? "font-bold" : "font-medium"
                }`}
              >
                {label}
              </span>

              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#c92830]" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
