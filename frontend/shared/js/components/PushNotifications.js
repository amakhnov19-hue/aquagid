/**
 * PushNotifications — PWA-уведомления для всех кабинетов
 */
class PushNotifications {
    static async subscribe(userType, userId) {
        console.log('🔔 subscribe START');
        if (!('serviceWorker' in navigator)) {
            console.log('❌ нет serviceWorker');
            return false;
        }
        if (!('PushManager' in window)) {
            console.log('❌ нет PushManager');
            return false;
        }
        
        try {
            console.log('📣 Запрашиваем разрешение...');
            const permission = await Notification.requestPermission();
            console.log('📣 Разрешение:', permission);
            if (permission !== 'granted') {
                console.log('❌ Разрешение не получено');
                return false;
            }
            
            const registration = await navigator.serviceWorker.ready;
            console.log('📣 Service Worker готов');
            
            const vapidPublicKey = 'BAVabRbjzmctlbtSOv0Ljb6epFEfQk33VhFhiT7KvTJi5B_evZc58r4VChs4M5pqTrMj4ixURHo6H8-Dr0LyLjI';
            console.log('📣 Подписываемся...');
            
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });
            
            console.log('📣 Подписка получена:', subscription);
            
            // Отправляем на сервер
            const resp = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription: subscription.toJSON(),
                    user_type: userType,
                    user_id: String(userId)
                })
            });
            console.log('📣 Сервер ответил:', resp.status);
            
            return true;
        } catch (e) {
            console.error('❌ Ошибка:', e.message, e);
            return false;
        }
    }
    
    static async sendNotification(title, body, url) {
        if (!('serviceWorker' in navigator)) return;
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
            body: body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            vibrate: [200, 100, 200],
            data: { url: url || '/' },
            tag: 'aquagid'
        });
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    console.log('Base64 after padding:', base64, 'length:', base64.length);
    const rawData = atob(base64);
    console.log('Raw data length:', rawData.length);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

window.PushNotifications = PushNotifications;