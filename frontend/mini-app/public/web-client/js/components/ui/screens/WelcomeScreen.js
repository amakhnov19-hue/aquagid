/**
 * Экран приветствия с крупными кнопками
 * Точная копия из монолита (без кнопок связаться и отзыв)
 */
class WelcomeScreen extends ScreenBase {
    constructor(mainApp) {
        super(mainApp);
    }

    /**
     * Показывает экран приветствия
     */
    show() {
        console.log('👋 WelcomeScreen.show START');
        
        if (!this.container) {
            console.error('❌ container not found!');
            return;
        }
        
        this.container.classList.remove('loading');
        
        // Загружаем уведомления клиента
        this.loadClientNotifications();
        
        const html = `
            <div class="screen welcome-screen">
                <div class="container">
                    <h1>🚤 Аква Гид СПб</h1>
                    <p style="text-align: center; margin-bottom: 25px; color: #666">
                        Прогулки на катерах по рекам и каналам Санкт-Петербурга
                    </p>
                    
                    <!-- Основные действия -->
                    <div class="main-actions">
                        <button class="btn btn-primary" onclick="window.AquaGid.UnifiedScreens.startBooking('fromDate')">
                            📅 Выбери дату
                        </button>
                        
                        <button class="btn btn-primary" onclick="window.AquaGid.UnifiedScreens.startBooking('fromBoat')">
                            🚤 Выбери катер
                        </button>
                        
                        <button class="btn btn-primary" onclick="window.AquaGid.UnifiedScreens.startBooking('quick')" style="background: #ff6b35">
                            ⚡ Ближайший катер
                        </button>
                    </div>
                    
                    <!-- Панель уведомлений -->
                    <div class="notifications-client" style="background: #6b6b6b; border-radius: 10px; padding: 8px 14px; margin: 15px 0; cursor: pointer;" onclick="window.AquaGid.UnifiedScreens.welcomeScreen.toggleClientNotifications()">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                            <span style="color: #fff; font-size: 15px; font-weight: 600;">🔔 Уведомления</span>
                            <span id="client-notif-badge" style="color: #ff6b35; font-size: 15px; font-weight: 700;">0</span>
                        </div>
                        <div id="client-notif-list" style="display: none; margin-top: 8px;"></div>
                    </div>
                    
                    <!-- Кнопка Мои бронирования -->
                    <button class="btn-home btn-bookings" onclick="window.AquaGid.UnifiedScreens.showMyBookings()">
                        📋 Мои бронирования
                    </button>
                    <p style="font-size: 11px; color: #888; text-align: center; margin-top: 8px;">
                        Просмотр, отмена и управление бронированиями
                    </p>

                    <!-- Кнопка документации -->
                    <button class="btn-home btn-documentation" onclick="window.AquaGid.Documentation.toggle()">
                        📜 Условия, права и согласия
                    </button>
                    <p style="font-size: 11px; color: #888; text-align: center; margin-top: 8px;">
                        Договор оферты, политика конфиденциальности, согласие на обработку ПД — всё по 152-ФЗ
                    </p>
                    
                    <!-- Информационный блок -->
                    <div class="info-block">
                        <p style="font-size: 12px; color: #888; text-align: center; margin-top: 20px;">
                            🕒 Ежедневно с <span id="work-time-display">09:00 до 24:00</span><br>
                            ⚓ Посадка с набережных СПб
                        </p>
                    </div>

                    <!-- Кнопка полной перезагрузки -->
                    <div style="text-align:center;margin-top:16px;">
                        <a href="javascript:void(0)" onclick="window.location.reload(true)" 
                            style="display:inline-block;padding:8px 20px;background:none;color:#9ca3af;border:1px solid #e5e7eb;border-radius:20px;text-decoration:none;font-size:13px;">
                            🔄 Полная перезагрузка
                        </a>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        console.log('👋 WelcomeScreen.show END');
        
        // Обновляем время работы из констант
        setTimeout(() => {
            const el = document.getElementById('work-time-display');
            if (el && window.APP_CONSTANTS?.TIME) {
                el.textContent = `${window.APP_CONSTANTS.TIME.work_start || '09:00'} до ${window.APP_CONSTANTS.TIME.work_end || '24:00'}`;
            }
        }, 500);
        
    }

    async loadClientNotifications() {
        let phone = localStorage.getItem('userPhone') || localStorage.getItem('clientPhone');
        if (!phone) return;
        
        // Нормализуем: добавляем + если начинается с 7
        if (phone.startsWith('7') && !phone.startsWith('+')) {
            phone = '+' + phone;
        }
        
        try {
            const response = await fetch(`/api/messages?client_phone=${encodeURIComponent(phone)}`);
            if (response.ok) {
                this.clientNotifications = await response.json();
                const unread = this.clientNotifications.filter(n => !n.is_read).length;
                const badge = document.getElementById('client-notif-badge');
                if (badge) badge.textContent = unread;
            }

        } catch (e) {
            console.error('Ошибка загрузки уведомлений:', e);
        }
    }
    
    toggleClientNotifications() {
        const list = document.getElementById('client-notif-list');
        if (!list) return;
        
        const isOpening = list.style.display === 'none';
        
        if (isOpening) {
            // При открытии всегда показываем новые
            this._showingHistory = false;
        }
        
        if (isOpening && this.clientNotifications) {
            const unread = this.clientNotifications.filter(n => !n.is_read);
            const all = this.clientNotifications;
            const showingHistory = this._showingHistory || false;
            const items = showingHistory ? all : unread;
            
            list.innerHTML = `
                <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                    <button onclick="AquaGid.UnifiedScreens.welcomeScreen.markAllReadClient(); event.stopPropagation();" style="flex: 1; min-width: 0; padding: 6px 8px; background: #2e7d32; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: normal; line-height: 1.2; text-align: center;">✅ Прочитано</button>
                    <button onclick="AquaGid.UnifiedScreens.welcomeScreen.toggleHistoryClient(); event.stopPropagation();" style="flex: 1; min-width: 0; padding: 6px 8px; background: #555; color: #ddd; border: 1px solid #777; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: normal; line-height: 1.2; text-align: center;">${showingHistory ? '🆕 Новые' : '📋 История'}</button>
                    <button onclick="AquaGid.UnifiedScreens.welcomeScreen.clearHistoryClient(); event.stopPropagation();" style="flex: 1; min-width: 0; padding: 6px 8px; background: #5c2020; color: #f99; border: 1px solid #944; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: normal; line-height: 1.2; text-align: center;">🗑️ Очистить историю</button>
                </div>
                <div id="client-notif-content">
                    ${items.length === 0 
                        ? '<div style="color: #999; padding: 8px 0;">' + (showingHistory ? 'История пуста' : 'Нет новых уведомлений') + '</div>'
                        : items.map(n => `
                            <div style="padding: 8px 0; border-bottom: 1px solid #555; color: #ddd; cursor: pointer;" onclick="AquaGid.UnifiedScreens.showMyBookings()">
                                <div style="font-weight: 600; color: #fff;">${n.is_read ? '📖' : '🔵'} ${n.title}</div>
                                <div style="font-size: 13px;">${n.body}</div>
                                <div style="font-size: 11px; color: #999;">${new Date(n.created_at).toLocaleString('ru-RU')}</div>
                            </div>
                        `).join('')
                    }
                </div>
            `;
        }
        
        list.style.display = isOpening ? 'block' : 'none';
    }

    async markAllReadClient() {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        for (const n of this.clientNotifications) {
            if (!n.is_read) {
                await fetch(`/api/messages/${n.id}/read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                n.is_read = true;
            }
        }
        this.loadClientNotifications();
        this.toggleClientNotifications(); // закрыть
        setTimeout(() => this.toggleClientNotifications(), 50); // открыть обновлённый
    }
    
    toggleHistoryClient() {
        this._showingHistory = !this._showingHistory;
        const list = document.getElementById('client-notif-list');
        if (list) {
            list.style.display = 'none';
            setTimeout(() => this.toggleClientNotifications(), 50);
        }
    }
    
    async clearHistoryClient() {
        if (!confirm('Удалить все прочитанные уведомления?')) return;
        const phone = localStorage.getItem('userPhone') || localStorage.getItem('clientPhone');
        if (!phone) return;
        
        try {
            const response = await fetch(`/api/messages/history?client_phone=${encodeURIComponent(phone)}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                this.clientNotifications = this.clientNotifications.filter(n => !n.is_read);
                this._showingHistory = false;
                const list = document.getElementById('client-notif-list');
                if (list) {
                    list.style.display = 'none';
                    setTimeout(() => this.toggleClientNotifications(), 50);
                }
                this.loadClientNotifications();
            }
        } catch (e) {
            console.error('Ошибка очистки истории:', e);
        }
    }
}

window.WelcomeScreen = WelcomeScreen;