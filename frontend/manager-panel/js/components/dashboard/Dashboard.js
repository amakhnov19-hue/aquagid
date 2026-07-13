// /frontend/manager-panel/js/components/dashboard/Dashboard.js
// Версия: 2.0.0
// Назначение: Информативный дашборд с быстрым доступом к броням, катерам и календарю

(function(global) {
    'use strict';
    
    const VERSION = '20260419_01';
    
    class ManagerDashboard {
        constructor() {
            this.version = VERSION;
            this.stats = {
                today_upcoming: 0,
                attention_bookings: 0,
                new_bookings: 0,
                active_total: 0,
                total_boats: 0,
                active_boats: 0,
                maintenance_boats: 0,
                blocked_boats: 0
            };

            this.calendarConnected = false;
            this.calendarName = '';
            this.bookings = [];
            this.boats = [];
            this.notifications = [];

            // Сохраняем ссылку на экземпляр в глобальном объекте
            if (!window.AquaGid) window.AquaGid = {};
            window.AquaGid.ManagerDashboard = this;

            // Подписываемся на события календаря
            if (window.AquaGid?.events) {
                window.AquaGid.events.on(
                    window.AquaGid.EventTypes.CALENDAR_UPDATED,
                    (data) => {
                        console.log('📅 Dashboard получил CALENDAR_UPDATED:', data);
                        this.calendarConnected = data.connected;
                        this.calendarName = data.name;
                        this.render();
                    },
                    this
                );
            }

            // Подписываемся на WebSocket для обновления дашборда
            setTimeout(() => {
                const ws = window.AquaGid?.ManagerApp?.ws;
                if (ws) {
                    const original = ws.onmessage;
                    ws.onmessage = (e) => {
                        if (original) original(e);
                        if (e.data === 'new_chat_message' || e.data === 'bookings_updated') {
                            this.loadDashboardData();
                        }
                    };
                }
            }, 1000);

            // Слушаем push-уведомления для мгновенного обновления счётчика
            if ('serviceWorker' in navigator && !window._swListenerAdded) {
                window._swListenerAdded = true;
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data?.type === 'update-badge') {
                        if (window.AquaGid?.ManagerDashboard) {
                            window.AquaGid.ManagerDashboard.render();
                        }
                    }
                });
            }
        }

        async loadDashboardData() {
            // Кеширование на 30 секунд
            if (this._lastLoad && (Date.now() - this._lastLoad) < 30000) {
                this.render();
                return;
            }
            this._lastLoad = Date.now();
            
            const managerId = window.managerId;
            if (!managerId) return;
            
            const token = localStorage.getItem('managerToken') || localStorage.getItem('access_token') || localStorage.getItem('token');
            
            try {
                // 1. Загружаем бронирования
                const bookingsRes = await fetch(`/api/bookings?manager_id=${managerId}`);
                const bookings = bookingsRes.ok ? await bookingsRes.json() : [];
                
                // 2. Загружаем катера (нужны для проверки поломок)
                const boatsRes = await fetch(`/api/boats?manager_id=${managerId}`);
                const boats = boatsRes.ok ? await boatsRes.json() : [];
                this.boats = boats;
                console.log('boats with breakdown:', boats.filter(b => b.is_breakdown));                
                
                // 3. ID сломанных катеров
                let brokenBoatIds = new Set(
                    boats.filter(b => b.is_breakdown).map(b => b.id)
                );
                console.log('brokenBoatIds:', [...brokenBoatIds]);
                
                // 4. Добавляем флаги для каждой брони
                this.bookings = bookings.map(b => ({
                    ...b,
                    isNew: !b.viewed_at,
                    needsAttention: b.cancellation_requested === true || brokenBoatIds.has(b.boat_id),
                }));
                
                // 5. Подсчёт статистики
                const today = new Date().toISOString().split('T')[0];
                const now = new Date();
                
                let todayUpcoming = 0;
                let activeTotal = 0;
                let attentionBookings = 0;  // вместо attentionBoats
                
                this.bookings.forEach(b => {
                    if (b.status !== 'active') return;
                    const start = new Date(b.booking_date + 'T' + b.start_time);
                    const end = new Date(start.getTime() + b.duration_minutes * 60000);
                    if (end <= now) return;
                    
                    activeTotal++;
                    if (b.booking_date === today && start > now) todayUpcoming++;
                    if (brokenBoatIds.has(b.boat_id)) attentionBookings++;  // считаем брони
                });
                
                const newBookings = this.bookings.filter(b => b.isNew && b.status === 'active').length;
                
                // 6. Катера
                const totalBoats = boats.length;
                const activeBoats = boats.filter(b => b.is_active === true).length;
                const maintenanceBoats = boats.filter(b => b.has_maintenance === true).length;
                const blockedBoats = boats.filter(b => b.is_active === false && b.is_breakdown === false).length;
                
                this.stats = {
                    today_upcoming: todayUpcoming,
                    attention_bookings: attentionBookings,
                    new_bookings: newBookings,
                    active_total: activeTotal,
                    total_boats: totalBoats,
                    active_boats: activeBoats,
                    maintenance_boats: maintenanceBoats,
                    blocked_boats: blockedBoats
                };
                
                await this.loadCalendarStatus();
                console.log('stats:', JSON.stringify(this.stats));
                this.render();
                await this.loadNotifications();
                
            } catch (error) {
                console.error('Ошибка загрузки дашборда:', error);
            }
        }

        async loadNotifications() {
            const managerId = window.managerId;
            if (!managerId) return;
            
            try {
                const token = localStorage.getItem('access_token') || localStorage.getItem('token');
                const response = await fetch(`/api/notifications?user_type=manager&user_id=${managerId}&limit=50`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    this.notifications = data.notifications || [];
                    console.log(`🔔 Загружено ${this.notifications.length} уведомлений`);
                }
            } catch (e) {
                console.error('Ошибка загрузки уведомлений:', e);
                this.notifications = [];
            }
        }

        async refreshAllCalendars() {
            const managerId = window.managerId || localStorage.getItem('managerId');
            try {
                const resp = await fetch(`/api/sync/google/refresh-all/${managerId}`, { method: 'POST' });
                const data = await resp.json();
                if (data.success) {
                    alert(`✅ Календари обновлены!\nОбновлено: ${data.refreshed.length}\nИмпортировано броней: ${data.imported}`);
                    await this.loadCalendarStatus();
                }
            } catch(e) {
                alert('❌ Ошибка обновления календарей');
            }
        }

        renderCalendarList() {
            if (!this.calendarList || this.calendarList.length === 0) {
                return '<div style="padding:8px;color:#9ca3af;font-size:13px;">Нет подключенных календарей</div>';
            }
            return this.calendarList.map(c => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;font-size:13px;">
                    <span>🚤 ${c.name || 'Катер #' + c.boat_id}</span>
                    <span style="color:${c.connected ? '#10b981' : '#ef4444'};font-weight:500;">${c.connected ? 'подключен' : 'отключен'}</span>
                </div>
            `).join('');
        }        

        async loadCalendarStatus() {
            const managerId = window.managerId;
            if (!managerId) return;
            
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            
            try {
                // Получаем список всех календарей лодок
                const boatsResp = await fetch(`/api/boats?manager_id=${managerId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const boats = await boatsResp.json();
                
                // Загружаем статус для каждого катера
                this.calendarList = [];
                for (const boat of boats) {
                    try {
                        const calResp = await fetch(`/api/boat-calendars/calendars/${boat.id}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const calData = await calResp.json();
                        this.calendarList.push({
                            boat_id: boat.id,
                            name: boat.name,
                            connected: calData.calendars && calData.calendars.length > 0
                        });
                    } catch(e) {
                        this.calendarList.push({
                            boat_id: boat.id,
                            name: boat.name,
                            connected: false
                        });
                    }
                }
                
                this.calendarConnected = this.calendarList.some(c => c.connected);
                
                this.render();
            } catch (error) {
                console.error('❌ Ошибка загрузки статуса календаря:', error);
            }
        }
        
        async render(containerId) {
            if (!containerId) containerId = 'dashboard-container';
            const container = document.getElementById(containerId);
            if (!container) return;

            // Загружаем реальный счётчик уведомлений
            let realUnreadCount = 0;
            console.log('Загружаем счётчик для менеджера...');
            try {
                const resp = await fetch('/api/notifications/count?user_type=manager&user_id=' + (window.managerId || '86'));
                const data = await resp.json();
                realUnreadCount = data.count || 0;
                console.log('Счётчик загружен:', realUnreadCount);
            } catch(e) {}
            
            container.innerHTML = `
                <div class="dashboard-v2">
                    <!-- Панель Уведомлений -->
                    <div class="dashboard-panel notifications-panel">
                        <div class="panel-header" onclick="new NotificationCenter({userType:'manager', userId: window.managerId}).open()" style="cursor: pointer; display: flex; align-items: center; gap: 10px; position: relative;">
                            <span class="panel-icon">🔔</span>
                            <span class="panel-title">Уведомления</span>
                            ${realUnreadCount > 0 ? `<span style="position: absolute; top: -4px; right: -4px; background: #4caf50; color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">${realUnreadCount}</span>` : ''}
                        </div>
                        <button onclick="event.stopPropagation(); fetch('/api/notifications?user_type=manager&user_id=' + window.managerId, {method:'DELETE'}).then(() => location.reload())" style="margin-top:8px;padding:6px 12px;background:#ef4444;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;">🗑 Очистить все</button>
                    </div>
                    
                    <!-- Панель Бронирования -->
                    <div class="dashboard-panel bookings-panel" onclick="AquaGid.ManagerApp.switchSection('bookings')">
                        <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="panel-title" style="display: flex; align-items: center; gap: 8px;">📋 Активные бронирования</span>
                            ${this.stats.new_bookings > 0 ? `<span class="badge-new" style="background:#4caf50;color:#fff;border-radius:12px;padding:2px 10px;font-size:13px;font-weight:700;">+${this.stats.new_bookings}</span>` : ''}
                        </div>
                        <div class="panel-stats" style="display: flex; gap: 16px; margin-top: 8px; font-size: 14px; color: #64748b;">
                            ${this.stats.attention_bookings > 0 ? `<span title="Бронирований сломанных катеров">⚠️ ${this.stats.attention_bookings} требуют внимания</span>` : ''}
                            ${this.stats.today_upcoming > 0 ? `<span title="Бронирований на сегодня">📅 Сегодня: ${this.stats.today_upcoming}</span>` : ''}
                            ${this.stats.active_total > 0 ? `<span title="Всего активных бронирований">📋 Всего: ${this.stats.active_total}</span>` : ''}
                            ${this.stats.attention_bookings === 0 && this.stats.today_upcoming === 0 && this.stats.active_total === 0 ? `<span>Нет активных бронирований</span>` : ''}
                        </div>
                    </div>
                    
                    <!-- Панель Катера -->
                    <div class="dashboard-panel boats-panel">
                        <div class="panel-header">
                            <span class="panel-icon">🚤</span>
                            <span class="panel-title">Мои катера</span>
                        </div>
                        <table class="bookings-table" style="width: 100%; table-layout: fixed; font-size: 14px; margin: 0;">
                            <thead>
                                <tr>
                                    <th style="text-align: left; padding: 6px 10px;">Название</th>
                                    <th style="text-align: right; padding: 6px 10px; width: 130px;">Статус</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.boats.map((b, i) => {
                                    let icon, color, bg = i % 2 === 0 ? '#fafafa' : '#fff';
                                    if (b.is_breakdown) { icon = '✖️ Поломка'; color = '#9c27b0'; }
                                    else if (b.has_maintenance) { icon = '🔧 ТО'; color = '#1565c0'; }
                                    else if (b.is_refueling) { icon = '⛽ Заправка'; color = '#e65100'; }
                                    else if (!b.is_active) { icon = '✖️ Блок'; color = '#c62828'; }
                                    else { icon = '✅ Активен'; color = '#2e7d32'; }
                                    return `<tr style="background: ${bg}; cursor: pointer;" onclick="AquaGid.ManagerApp.switchSection('boats')">
                                        <td style="text-align: left; padding: 6px 10px;">${b.name}</td>
                                        <td style="text-align: right; padding: 6px 10px; color: ${color}; font-weight: 600;">${icon}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                        <div class="panel-footer" onclick="AquaGid.ManagerApp.switchSection('boats')" style="cursor: pointer;">
                            <span>🚤 Управление катерами →</span>
                        </div>
                    </div>
                    
                    <!-- Статус Google Calendar -->
                    <div class="dashboard-panel calendar-panel">
                        <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span class="panel-icon">📅</span>
                                <span class="panel-title">Google Календари</span>
                            </div>
                        </div>
                        <div id="calendarList" style="padding:8px 0;">
                            ${this.renderCalendarList()}
                        </div>
                        <div class="panel-footer" onclick="event.stopPropagation(); AquaGid.Dashboard.refreshAllCalendars()" style="cursor: pointer;">
                            <span>🔄 Обновить календари →</span>
                        </div>
                    </div>
                    <div style="text-align:center;margin-top:16px;">
                        <button onclick="window.location.reload(true)" 
                            style="padding:8px 20px;background:none;color:#9ca3af;border:1px solid #e5e7eb;border-radius:20px;cursor:pointer;font-size:13px;">
                            🔄 Полная перезагрузка
                        </button>
                    </div>
                </div>
            `;
            
            // Добавляем стили для новых классов
            if (!document.getElementById('dashboard-v2-styles')) {
                const style = document.createElement('style');
                style.id = 'dashboard-v2-styles';
                style.textContent = `
                    .dashboard-v2 { display: flex; flex-direction: column; gap: 16px; padding: 16px; }
                    .dashboard-panel { background: white; border-radius: 20px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
                    .dashboard-panel:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
                    .panel-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
                    .panel-icon { font-size: 24px; }
                    .panel-title { font-size: 18px; font-weight: 600; color: #1e293b; }
                    .new-badge { background: #e0f2e0; color: #2e7d32; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-left: auto; }
                    .attention-badge { background: #fff3e0; color: #e65100; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
                    .panel-stats { display: flex; flex-wrap: wrap; gap: 16px 24px; margin-bottom: 16px; }
                    .boats-stats { display: grid; grid-template-columns: 1fr 1fr; }
                    .stat-item { display: flex; flex-direction: column; }
                    .stat-value { font-size: 28px; font-weight: 700; color: #1e293b; }
                    .stat-label { font-size: 13px; color: #64748b; }
                    .stat-item.attention .stat-value { color: #e65100; }
                    .stat-item.active .stat-value { color: #2e7d32; }
                    .stat-item.maintenance .stat-value { color: #f59e0b; }
                    .stat-item.blocked .stat-value { color: #dc2626; }
                    .panel-footer { display: flex; justify-content: flex-end; font-size: 14px; color: #0066CC; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 8px; }
                    .calendar-status-badge { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
                    .calendar-status-badge.connected { background: #e8f5e9; color: #2e7d32; }
                    .calendar-status-badge.disconnected { background: #f1f5f9; color: #64748b; }
                    .calendar-info { margin: 12px 0; font-size: 14px; color: #475569; }
                `;
                document.head.appendChild(style);
            }
        }

        async markAllRead() {
            const managerId = window.managerId;
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            
            for (const n of this.notifications) {
                if (!n.is_read) {
                    await fetch(`/api/messages/${n.id}/read`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    n.is_read = true;
                }
            }
            this.render();
        }

        async clearHistory() {
            if (!confirm('Удалить все прочитанные уведомления?')) return;
            
            const managerId = window.managerId;
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            
            try {
                const response = await fetch(`/api/notifications/clear?user_type=manager&user_id=${managerId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    // Удаляем прочитанные из локального массива
                    this.notifications = this.notifications.filter(n => !n.is_read);
                    this.render();
                }
            } catch (e) {
                console.error('Ошибка очистки истории:', e);
            }
        }

        showHistory() {
            const content = document.getElementById('notif-content');
            if (!content) return;
            
            content.innerHTML = this.notifications.slice(0, 20).map(n => `
                <div class="notification-item" style="padding: 8px 0; border-bottom: 1px solid #eee; ${!n.is_read ? 'background: #f0f8ff;' : ''}">
                    <div style="font-weight: 600;">${n.title}</div>
                    <div style="font-size: 13px; color: #666;">${n.body}</div>
                    <div style="font-size: 11px; color: #999;">${new Date(n.created_at).toLocaleString('ru-RU')} · ${n.is_read ? '✅ прочитано' : '🆕 новое'}</div>
                </div>
            `).join('') || '<div style="color: #999; padding: 10px 0;">Нет уведомлений</div>';
        }

        toggleNotifications() {
            const list = document.getElementById('notification-list');
            if (list) {
                list.style.display = list.style.display === 'none' ? 'block' : 'none';
            }
        }
    }
    
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.ManagerDashboard = new ManagerDashboard();
    
})(typeof window !== 'undefined' ? window : global);