
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

// ==========================================
// PUSH NOTIFICATION
// ==========================================

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

// ==========================================
// PUSH BADGE - INDEXED DB
// ==========================================

const BADGE_DB_NAME = "meohoa-push-db";
const BADGE_STORE_NAME = "settings";
const BADGE_KEY = "unread-count";

function openBadgeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BADGE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(BADGE_STORE_NAME)) {
        db.createObjectStore(BADGE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getPushBadgeCount(): Promise<number> {
  const db = await openBadgeDB();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(BADGE_STORE_NAME, "readonly");
      const request = transaction
        .objectStore(BADGE_STORE_NAME)
        .get(BADGE_KEY);

      request.onsuccess = () => {
        resolve(Number(request.result) || 0);
      };

      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function clearPushBadgeCount(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;

  if (!registration.active) return;

  const channel = new MessageChannel();

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error("Không nhận được phản hồi từ Service Worker."));
    }, 5000);

    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeout);
      channel.port1.close();

      if (event.data?.type === "PUSH_BADGE_CLEARED") {
        resolve();
      } else {
        reject(new Error("Không thể xóa Push Badge."));
      }
    };

    registration.active!.postMessage(
      { type: "CLEAR_PUSH_BADGE" },
      [channel.port2],
    );
  });
}
