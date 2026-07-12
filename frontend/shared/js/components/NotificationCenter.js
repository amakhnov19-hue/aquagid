/**
 * NotificationCenter v2.1 — Центр уведомлений
 * Логика:
 * - Все уведомления новые (без подсветки is_read)
 * - При клике: переход по url → удаление уведомления → счётчик -1
 * - Типы: бронирование → раздел "Бронирования", сообщение → чат
 */
class NotificationCenter {
    constructor(options = {}) {
        this.userType = options.userType || 'client';
        this.userId = options.userId || 'guest';
    }

    async open() {
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
                <div class="notif-center-footer" style="display:flex;gap:8px;">
                    <button id="notif-center-subscribe">🔔 Включить push-уведомления</button>
                    <button id="notif-center-clear" style="background:#c62828;color:#fff;">🗑 Очистить все</button>
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
            const resp = await fetch(`/api/notifications?user_type=${this.userType}&user_id=${this.userId}&limit=50`);
            const data = await resp.json();
            const notifs = data.notifications || [];

            if (notifs.length === 0) {
                list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Нет уведомлений</div>';
            } else {
                list.innerHTML = notifs.map(n => {
                    const safeUrl = (n.url || '').replace(/'/g, "\\'");
                    return `
                        <div class="notif-center-item" 
                             onclick="window._nc.handleClick(${n.id}, '${safeUrl}')">
                            <div class="notif-center-title">${this.esc(n.title)}</div>
                            <div class="notif-center-body-text">${this.esc(n.body || '')}</div>
                            <div class="notif-center-time">${new Date(n.created_at).toLocaleString()}</div>
                        </div>
                    `;
                }).join('');
                window._nc = this;
            }

            const subbed = localStorage.getItem('push_subscribed') === '1';
            subBtn.textContent = subbed ? '✅ Уведомления включены' : '🔔 Включить push-уведомления';
            subBtn.style.background = subbed ? '#10b981' : '#0066CC';
        } catch(e) {
            list.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Ошибка загрузки</div>';
        }
    }

    async clearAll() {
        if (!confirm('Удалить ВСЕ уведомления?')) return;
        await fetch(`/api/notifications?user_type=${this.userType}&user_id=${this.userId}`, { method: 'DELETE' });
        this.loadList();
        this.updateBadge();
        // Обновляем клиентский badge
        const clientBadge = document.getElementById('client-notif-badge');
        if (clientBadge) {
            clientBadge.textContent = '0';
            clientBadge.style.display = 'none';
        }
    }

    async handleClick(id, url) {
        await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
        document.getElementById('notif-center-close')?.click();
        await this.updateBadge();

        if (url) {
            if (this.userType === 'manager' && window.AquaGid?.ManagerApp) {
                if (url.includes('chat') || url.includes('message')) {
                    AquaGid.ManagerApp.switchSection('chat');
                } else {
                    AquaGid.ManagerApp.switchSection('bookings');
                }
            } else if (this.userType === 'admin') {
                if (url.includes('chat') || url.includes('message')) {
                    if (typeof loadView === 'function') loadView('chat');
                } else {
                    if (typeof loadView === 'function') loadView('dashboard');
                }
            } else if (this.userType === 'client' && window.AquaGid?.UnifiedScreens) {
                if (url.includes('chat') || url.includes('message')) {
                    if (window.AquaGid.ChatService?.toggle) {
                        AquaGid.ChatService.toggle();
                    }
                } else {
                    AquaGid.UnifiedScreens.showMyBookings();
                }
            }
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

    async updateBadge() {
        try {
            const resp = await fetch(`/api/notifications/count?user_type=${this.userType}&user_id=${this.userId}`);
            const data = await resp.json();
            const count = data.count || 0;
            const badge = document.getElementById('notif-badge');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }
            return count;
        } catch(e) {
            console.error('updateBadge error:', e);
        }
    }

    esc(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

window.NotificationCenter = NotificationCenter;