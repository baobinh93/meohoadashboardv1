import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

type ToastKind = "success" | "error" | "warning" | "info";
type ToastInput = {
  kind: ToastKind;
  title?: string;
  message: string;
  duration?: number;
};
type ToastItem = ToastInput & { id: number };
type ToastApi = {
  showToast: (toast: ToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);
const styles: Record<
  ToastKind,
  {
    icon: typeof CheckCircle2;
    iconClass: string;
    barClass: string;
    title: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
    barClass: "bg-emerald-500",
    title: "Thành công",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-red-600",
    barClass: "bg-red-500",
    title: "Có lỗi xảy ra",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-600",
    barClass: "bg-amber-500",
    title: "Cảnh báo",
  },
  info: {
    icon: Info,
    iconClass: "text-sky-600",
    barClass: "bg-sky-500",
    title: "Thông tin",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const showToast = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.random();
    const item: ToastItem = { ...toast, id };
    setToasts((current) => [...current.slice(-3), item]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      showToast,
      success: (message, title) =>
        showToast({ kind: "success", message, title }),
      error: (message, title) =>
        showToast({ kind: "error", message, title, duration: 6000 }),
      warning: (message, title) =>
        showToast({ kind: "warning", message, title, duration: 5000 }),
      info: (message, title) => showToast({ kind: "info", message, title }),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-5 sm:top-5"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const config = styles[toast.kind];
          const Icon = config.icon;
          return (
            <ToastCard
              key={toast.id}
              toast={toast}
              Icon={Icon}
              config={config}
              onClose={() => removeToast(toast.id)}
            />
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  Icon,
  config,
  onClose,
}: {
  toast: ToastItem;
  Icon: typeof CheckCircle2;
  config: { iconClass: string; barClass: string; title: string };
  onClose: () => void;
}) {
  useEffect(() => {
    const duration = toast.duration ?? (toast.kind === "error" ? 6000 : 3500);
    if (duration <= 0) return;
    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [toast.duration, toast.kind, onClose]);

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className="pointer-events-auto overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_12px_35px_rgba(28,25,23,0.14)] animate-in slide-in-from-right-3"
    >
      <div className="flex items-start gap-3 p-3.5">
        <Icon size={21} className={`mt-0.5 shrink-0 ${config.iconClass}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900">
            {toast.title ?? config.title}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-stone-600">
            {toast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="rounded-md p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
        >
          <X size={16} />
        </button>
      </div>
      <div className={`h-0.5 ${config.barClass}`} />
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context)
    throw new Error("useToast phải được dùng bên trong ToastProvider.");
  return context;
}
