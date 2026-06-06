/**
 * NotificationCenter — независимый центр уведомлений
 * Подключается в любом кабинете (клиент, менеджер, админ)
 */
class NotificationCenter {
    constructor(options = {}) {
        this.userType = options.userType || 'client';
        this.userId = options.userId || 'guest';
        this.container = null;
    }

    async open() {
        // Удаляем старое окно если есть
        const old = document.getElementById('notif-center-modal');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'notif-center-modal';
        modal.className = 'notif-center-overlay';
        modal.innerHTML = `
            <div class="notif-center-window">
                <div class="notif-center-header">
                    <span>🔔 Уведомления</span>
                    <button id="notif-center-close">✕</button>
                </div>
                <div class="notif-center-body" id="notif-center-list">
                    ⏳ Загрузка...
                </div>
                <div class="notif-center-footer">
                    <button id="notif-center-subscribe">🔔 Включить push-уведомления</button>
                    <button id="notif-center-clear">🗑 Очистить все</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('notif-center-close').onclick = () => modal.remove();
        document.getElementById('notif-center-subscribe').onclick = () => this.subscribe();
        document.getElementById('notif-center-clear').onclick = () => this.clearAll();

        await this.loadList();
    }

    async loadList() {
        const list = document.getElementById('notif-center-list');
        const subBtn = document.getElementById('notif-center-subscribe');
        
        try {
            const resp = await fetch(`/api/notifications?user_type=${this.userType}&user_id=${this.userId}&limit=20`);
            const data = await resp.json();
            const notifs = data.notifications || [];

            if (notifs.length === 0) {
                list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Нет уведомлений</div>';
            } else {
                list.innerHTML = notifs.map(n => `
                    <div class="notif-center-item ${n.is_read ? '' : 'unread'}" onclick="NotificationCenter.markRead(${n.id}, '${this.userType}')">
                        <div class="notif-center-title">${n.title}</div>
                        <div class="notif-center-body">${n.body || ''}</div>
                        <div class="notif-center-time">${new Date(n.created_at).toLocaleString()}</div>
                    </div>
                `).join('');
            }

            // Статус подписки
            const subbed = localStorage.getItem('push_subscribed') === '1';
            subBtn.textContent = subbed ? '✅ Уведомления включены' : '🔔 Включить push-уведомления';
            subBtn.style.background = subbed ? '#10b981' : '#0066CC';
        } catch(e) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Ошибка загрузки</div>';
        }
    }

    static async markRead(id, userType) {
        await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
        document.getElementById('notif-center-close')?.click();
        console.log('markRead вызван:', id, userType);
        // Переходим в бронирования
        if (userType === 'manager' && window.AquaGid?.ManagerApp) {
            window.AquaGid.ManagerApp.switchSection('bookings');
        } else if (userType === 'client' && window.AquaGid?.UnifiedScreens) {
            window.AquaGid.UnifiedScreens.showMyBookings();
        }
    }

    async subscribe() {
        if (!window.PushNotifications) {
            alert('Push-уведомления не поддерживаются');
            return;
        }
        const ok = await PushNotifications.subscribe(this.userType, this.userId);
        if (ok) {
            localStorage.setItem('push_subscribed', '1');
            this.loadList();
        }
    }

    async clearAll() {
        if (!confirm('Удалить все уведомления?')) return;
        await fetch(`/api/notifications/clear?user_type=${this.userType}&user_id=${this.userId}`, { method: 'DELETE' });
        this.loadList();
        // Обновляем дашборд
        if (typeof loadView === 'function') {
            loadView('dashboard');
        }
    }
}

window.NotificationCenter = NotificationCenter;