import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { ToastProvider } from "../components/layout/ToastProvider";

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f7f5f1] text-stone-800 md:flex">
        <Sidebar
          mobileOpen={mobileOpen}
          onOpen={() => setMobileOpen(true)}
          onClose={() => setMobileOpen(false)}
        />

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-375 p-4 pb-24 pt-16 sm:p-6 sm:pb-24 sm:pt-16 lg:p-8">
            <Outlet />
          </div>
        </main>

        <MobileBottomNav />
      </div>
    </ToastProvider>
  );
}
