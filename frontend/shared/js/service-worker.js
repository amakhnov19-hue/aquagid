// Service Worker для PWA-уведомлений AquaGid
var CACHE_NAME = 'aquagid-v8';

self.addEventListener('push', function(event) {
    if (!event.data) return;
    var data = event.data.json();
    
    // Показываем уведомление
    event.waitUntil(
        self.registration.showNotification(data.title || 'АкваГид', {
            body: data.body || '',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            vibrate: [200, 100, 200],
            data: { url: data.url || '/' },
            tag: 'aquagid'
        })
    );
    
    // Отправляем сообщение всем вкладкам для обновления счётчика
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(function(clients) {
            clients.forEach(function(client) {
                client.postMessage({ type: 'update-badge' });
            });
        })
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});

self.addEventListener('install', function(event) { self.skipWaiting(); });
self.addEventListener('activate', function(event) { event.waitUntil(clients.claim()); });