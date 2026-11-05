
import { supabase } from "../lib/supabase";

export type PushSubscriptionStatus = {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
};

function getApplicationServerKey(): ArrayBuffer {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error("Thiếu VITE_VAPID_PUBLIC_KEY trong .env.local");
  }

  const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
  const base64 = publicKey.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const binary = atob(base64);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer as ArrayBuffer;
}

export function getPushSupport(): PushSubscriptionStatus {
  const supported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  if (!supported) {
    return {
      supported: false,
      permission: "unsupported",
      subscribed: false,
    };
  }

  return {
    supported: true,
    permission: Notification.permission,
    subscribed: false,
  };
}

export async function getPushStatus(): Promise<PushSubscriptionStatus> {
  const status = getPushSupport();

  if (!status.supported) return status;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  return {
    ...status,
    subscribed: Boolean(subscription),
  };
}

export async function enablePushNotifications(userId: string) {
  if (!userId) {
    throw new Error("Không xác định được tài khoản Admin.");
  }

  const support = getPushSupport();

  if (!support.supported) {
    throw new Error("Trình duyệt không hỗ trợ Push Notification.");
  }

  // Permission must be requested from a user interaction
  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Bạn đã chặn quyền thông báo. Hãy bật lại trong cài đặt trình duyệt."
        : "Bạn chưa cấp quyền nhận thông báo.",
    );
  }

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: getApplicationServerKey(),
    });
  }

  const json = subscription.toJSON();

  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Không lấy được thông tin Push Subscription.");
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "endpoint",
      },
    );

  if (error) throw error;

  return subscription;
}

export async function disablePushNotifications() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Trình duyệt không hỗ trợ Service Worker.");
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) return;

  const endpoint = subscription.endpoint;

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) throw error;

  const unsubscribed = await subscription.unsubscribe();

  if (!unsubscribed) {
    throw new Error("Không thể tắt Push Subscription trên thiết bị.");
  }
}
