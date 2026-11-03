import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import {
  updateMyPassword,
  updateMyProfileName,
} from "../services/profileService";
import { useToast } from "../components/layout/ToastProvider";

export default function SettingsPage() {
  const { user, profile, profileLoading, refreshProfile, signOut } = useAuth();

  const toast = useToast();

  // Profile
  const [fullName, setFullName] = useState("");

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading states
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Load profile name
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
    }
  }, [profile]);

  // Role label
  const roleLabel =
    profile?.role === "admin"
      ? "Quản trị viên"
      : profile?.role === "staff"
        ? "Nhân viên"
        : (profile?.role ?? "Chưa xác định");

  // Save profile name
  async function handleSaveName() {
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      toast.error("Tên hiển thị không được để trống.");
      return;
    }

    if (trimmedName.length > 100) {
      toast.error("Tên hiển thị không được vượt quá 100 ký tự.");
      return;
    }

    try {
      setSavingName(true);

      await updateMyProfileName(trimmedName);
      await refreshProfile();

      setFullName(trimmedName);

      toast.success("Đã cập nhật tên hiển thị thành công.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật thông tin tài khoản.",
      );
    } finally {
      setSavingName(false);
    }
  }

  // Change password
  async function handleChangePassword() {
    if (newPassword.length < 8) {
      toast.error("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setSavingPassword(true);

      await updateMyPassword(newPassword);

      setNewPassword("");
      setConfirmPassword("");

      toast.success("Đã đổi mật khẩu thành công.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thể đổi mật khẩu.",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  // Sign out
  async function handleSignOut() {
    const confirmed = window.confirm("Bạn có chắc chắn muốn đăng xuất?");

    if (!confirmed) return;

    try {
      setLoggingOut(true);
      await signOut();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể đăng xuất.");

      setLoggingOut(false);
    }
  }

  if (profileLoading) {
    return (
      <div className="py-12 text-center text-sm text-stone-500">
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page heading */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#c92d35]">
          SETTINGS
        </div>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
          Cài đặt tài khoản
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Quản lý thông tin cá nhân và bảo mật tài khoản của Mèo Hoa.
        </p>
      </div>

      {/* Account information */}
      <section className="rounded-2xl border border-[#e8dfd5] bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f7f1ec] text-[#794640]">
            <UserRound size={21} />
          </div>

          <div>
            <h2 className="font-semibold text-stone-800">
              Thông tin tài khoản
            </h2>

            <p className="text-xs text-stone-500">
              Cập nhật thông tin cá nhân của bạn.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Full name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">
              Tên hiển thị
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              placeholder="Nhập tên hiển thị"
              className="w-full rounded-xl border border-[#e8dfd5] bg-[#fffdfa] px-4 py-3 text-sm outline-none transition focus:border-[#a58a73] focus:ring-2 focus:ring-[#a58a73]/10"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">
              Email
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-[#e8dfd5] bg-stone-50 px-4 py-3">
              <Mail size={17} className="shrink-0 text-stone-400" />

              <span className="min-w-0 truncate text-sm text-stone-600">
                {user?.email ?? "Không có email"}
              </span>

              <span className="ml-auto shrink-0 text-xs text-stone-400">
                Không thể chỉnh sửa
              </span>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">
              Vai trò
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-[#e8dfd5] bg-stone-50 px-4 py-3">
              <ShieldCheck size={17} className="text-[#a58a73]" />

              <span className="text-sm text-stone-600">{roleLabel}</span>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end border-t border-[#eee7df] pt-5">
            <button
              type="button"
              onClick={handleSaveName}
              disabled={savingName || profileLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#794640] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#603731] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={16} />

              {savingName ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </section>

      {/* Change password */}
      <section className="rounded-2xl border border-[#e8dfd5] bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f7f1ec] text-[#794640]">
            <LockKeyhole size={21} />
          </div>

          <div>
            <h2 className="font-semibold text-stone-800">Đổi mật khẩu</h2>

            <p className="text-xs text-stone-500">
              Mật khẩu mới cần có ít nhất 8 ký tự.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* New password */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">
              Mật khẩu mới
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Nhập mật khẩu mới"
                className="w-full rounded-xl border border-[#e8dfd5] bg-[#fffdfa] px-4 py-3 pr-12 text-sm outline-none transition focus:border-[#a58a73] focus:ring-2 focus:ring-[#a58a73]/10"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">
              Xác nhận mật khẩu mới
            </label>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
                className="w-full rounded-xl border border-[#e8dfd5] bg-[#fffdfa] px-4 py-3 pr-12 text-sm outline-none transition focus:border-[#a58a73] focus:ring-2 focus:ring-[#a58a73]/10"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Change password button */}
          <div className="flex justify-end border-t border-[#eee7df] pt-5">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={savingPassword || !newPassword || !confirmPassword}
              className="inline-flex items-center gap-2 rounded-xl bg-[#794640] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#603731] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LockKeyhole size={16} />

              {savingPassword ? "Đang cập nhật..." : "Đổi mật khẩu"}
            </button>
          </div>
        </div>
      </section>

      {/* Logout */}
      <section className="flex flex-col gap-4 rounded-2xl border border-red-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-semibold text-stone-800">Đăng xuất tài khoản</h2>

          <p className="mt-1 text-sm text-stone-500">
            Kết thúc phiên đăng nhập hiện tại trên thiết bị này.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={loggingOut}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          <LogOut size={17} />

          {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
      </section>
    </div>
  );
}
