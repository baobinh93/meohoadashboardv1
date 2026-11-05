self.addEventListener("push", (event) => {
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
    body: data.body || "Bạn có đơn hàng mới cần xử lý.",
    icon: "/admin-phone-logo.png",
    badge: "/admin-phone-logo.png",
    data: {
      url: data.url || "/dashboard",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

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
