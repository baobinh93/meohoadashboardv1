import { FormEvent, useState } from "react";
import { Flower2, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đăng nhập thất bại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f5f1] p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-[420px] rounded-2xl border border-stone-200 bg-white p-7 shadow-xl shadow-stone-900/5 sm:p-9"
      >
        {/* Logo */}
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-xl bg-[#c92d35] text-white">
          <Flower2 size={25} />
        </div>

        {/* Heading */}
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#c92d35]">
          MÈO HOA · WORKSPACE
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">
          Chào mừng trở lại
        </h1>

        <p className="mt-2 text-sm leading-6 text-stone-500">
          Đăng nhập để quản lý cửa hàng Mèo Hoa.
        </p>

        {/* Error */}
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {/* Email */}
        <label className="mt-6 grid gap-2 text-xs font-semibold text-stone-700">
          Email
          <input
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-3 text-base outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
        </label>

        {/* Password */}
        <label className="mt-4 grid gap-2 text-xs font-semibold text-stone-700">
          Mật khẩu
          <div className="relative">
            <input
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-3 pr-11 text-base outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-stone-400 hover:text-stone-700"
            >
              {showPassword ? (
                <EyeOff size={19} strokeWidth={1.8} />
              ) : (
                <Eye size={19} strokeWidth={1.8} />
              )}
            </button>
          </div>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#c92d35] px-4 py-3 text-sm font-semibold text-white hover:bg-[#ad2028] disabled:opacity-60"
        >
          <LockKeyhole size={16} />
          {busy ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-stone-400">
          Chỉ dành cho tài khoản được cấp quyền.
        </p>
      </form>
    </main>
  );
}
