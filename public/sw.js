const BADGE_DB_NAME = "meohoa-push-db";
const BADGE_STORE_NAME = "settings";
const BADGE_KEY = "unread-count";

function openBadgeDB() {
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

async function setSystemBadge(count) {
  try {
    if (count > 0 && self.navigator.setAppBadge) {
      await self.navigator.setAppBadge(count);
    } else if (count === 0 && self.navigator.clearAppBadge) {
      await self.navigator.clearAppBadge();
    } else {
      console.warn("[Push Badge] Badging API không được hỗ trợ.");
    }
  } catch (error) {
    console.error("[Push Badge] Không thể cập nhật badge:", error);
  }
}

async function updateBadgeCount(increment = false) {
  const db = await openBadgeDB();

  try {
    const transaction = db.transaction(BADGE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(BADGE_STORE_NAME);

    const current = await new Promise((resolve, reject) => {
      const request = store.get(BADGE_KEY);
      request.onsuccess = () => resolve(Number(request.result) || 0);
      request.onerror = () => reject(request.error);
    });

    const next = increment ? current + 1 : 0;

    store.put(next, BADGE_KEY);

    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });

    await setSystemBadge(next);

    return next;
  } finally {
    db.close();
  }
}

async function notifyOpenClients(count) {
  const windowClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of windowClients) {
    client.postMessage({
      type: "PUSH_BADGE_UPDATED",
      count,
    });
  }
}

// Nhận Push mới.
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};

      try {
        data = event.data ? event.data.json() : {};
      } catch {
        data = {
          body: event.data ? event.data.text() : "Bạn có đơn hàng mới.",
        };
      }

      const title = data.title || "Mèo Hoa Admin";

      const options = {
        body: data.body || "Bạn có đơn hàng mới.",
        icon: "/admin-phone-logo.png",
        badge: "/admin-phone-logo.png",
        data: {
          url: data.url || "/dashboard",
        },
      };

      let count = 0;

      try {
        count = await updateBadgeCount(true);
        await notifyOpenClients(count);
      } catch (error) {
        console.error("[Push Badge] Lỗi cập nhật số lượng:", error);
      }

      // Luôn hiển thị thông báo kể cả khi badge gặp lỗi.
      await self.registration.showNotification(title, options);
    })(),
  );
});

// Nhấn vào thông báo.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/dashboard",
    self.location.origin,
  ).href;

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin)) {
            return client.navigate(targetUrl).then((page) => page?.focus());
          }
        }

        return clients.openWindow(targetUrl);
      }),
  );
});

// Nhận yêu cầu xóa badge khi Admin vào /orders.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CLEAR_PUSH_BADGE") return;

  event.waitUntil(
    (async () => {
      try {
        const count = await updateBadgeCount(false);
        await notifyOpenClients(count);

        const response = {
          type: "PUSH_BADGE_CLEARED",
          count,
        };

        if (event.ports?.[0]) {
          event.ports[0].postMessage(response);
        } else {
          event.source?.postMessage(response);
        }
      } catch (error) {
        console.error("[Push Badge] Không thể xóa badge:", error);

        event.ports?.[0]?.postMessage({
          type: "PUSH_BADGE_CLEAR_FAILED",
          message: String(error),
        });
      }
    })(),
  );
});
