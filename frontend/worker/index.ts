const sw = self as any;

sw.addEventListener('push', (event: any) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Uygun Musun?';
    const options: any = {
      body: data.body || 'Yeni bir bildiriminiz var!',
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/icon-192x192.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: data.tag || `duo-ping-${Date.now()}`,
      renotify: true,
      requireInteraction: false,
      data: {
        url: data.url || '/',
      },
    };

    event.waitUntil(sw.registration.showNotification(title, options));
  } catch (err) {
    console.error('[ServiceWorker] Push event error:', err);
  }
});

sw.addEventListener('notificationclick', (event: any) => {
  event.notification.close();

  const targetUrl: string = event.notification.data?.url || '/';

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: any[]) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(targetUrl)) {
          return client.focus();
        }
      }
      if (sw.clients.openWindow) {
        return sw.clients.openWindow(targetUrl);
      }
    })
  );
});
