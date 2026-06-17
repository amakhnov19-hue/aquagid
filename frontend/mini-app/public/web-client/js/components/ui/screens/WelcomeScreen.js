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

                
        // Проверка возврата после оплаты
        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get('payment');
        if (paymentStatus === 'success') {
            window.history.replaceState({}, '', window.location.pathname);
            setTimeout(() => window.AquaGid.UnifiedScreens.showSuccessScreen(), 500);
            return;
        }
        if (paymentStatus === 'fail') {
            window.history.replaceState({}, '', window.location.pathname);
            setTimeout(() => alert('😔 Оплата не прошла. Попробуйте ещё раз.'), 500);
        }
        
        // Загружаем уведомления клиента
        this.loadClientNotifications();
        
        // Проверяем статус push-уведомлений
        setTimeout(() => {
            const textEl = document.getElementById('push-notif-text');
            if (textEl && localStorage.getItem('push_subscribed') === '1') {
                textEl.textContent = '🔔 Уведомления включены';
            }
        }, 100);
        
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
                            📅 Начни с выбора даты
                        </button>
                        
                        <button class="btn btn-primary" onclick="window.AquaGid.UnifiedScreens.startBooking('fromBoat')" style="background: #C8A27A;">
                            🚤 Начни с выбора катера
                        </button>
                        
                        <button class="btn btn-primary" onclick="window.AquaGid.UnifiedScreens.startBooking('quick')" style="background: #ff6b35">
                            ⚡ Ближайший свободный катер
                        </button>
                    </div>

                    <!-- Кнопка Уведомления -->
                    <div class="notifications-client" style="background: #6b7280; border-radius: 10px; padding: 12px 14px; margin: 15px 0; cursor: pointer; text-align: center;" onclick="(() => { const phone = localStorage.getItem('clientPhone'); if (!phone) { const p = prompt('Введите номер телефона:'); if (p) { localStorage.setItem('clientPhone', p.replace(/\D/g, '')); location.reload(); } return; } new NotificationCenter({userType:'client', userId: phone}).open(); })()">
                        <span style="color: #fff; font-size: 15px; font-weight: 600;">🔔 Уведомления <span id="client-notif-badge" style="background:#dc3545;color:#fff;border-radius:10px;padding:2px 7px;font-size:12px;margin-left:6px;display:none;"></span></span>
                    </div>
                    
                    <!-- Кнопка Мои бронирования -->
                    <button class="btn-home btn-bookings" onclick="window.AquaGid.UnifiedScreens.showMyBookings()">
                        📋 Мои бронирования
                    </button>
                    <p style="font-size: 11px; color: #888; text-align: center; margin-top: 8px;">
                        Просмотр, отмена и управление бронированиями
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
        const phone = localStorage.getItem('clientPhone');
        if (!phone) return;
        
        try {
            const resp = await fetch(`/api/notifications/count?user_type=client&user_id=${phone}`);
            const data = await resp.json();
            const count = data.count || 0;
            const badge = document.getElementById('client-notif-badge');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline-block' : 'none';
            }
        } catch (e) {
            console.error('Ошибка загрузки счётчика:', e);
        }
    }
    
    toggleClientNotifications() {
        const list = document.getElementById('client-notif-list');
        if (!list) return;
        
        const isOpening = list.style.display === 'none';
        
        if (isOpening) {
            history.pushState({ screen: 'notifications' }, '', window.location.pathname);
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

    static enablePush() {
        if (window.PushNotifications) {
            const userId = localStorage.getItem('clientPhone') || 'guest';
            const textEl = document.getElementById('push-notif-text');
            const isSubscribed = localStorage.getItem('push_subscribed') === '1';
            
            if (isSubscribed) {
                // Отключаем (пока просто алерт)
                alert('Для отключения уведомлений зайдите в настройки браузера');
                return;
            }
            
            PushNotifications.subscribe('client', userId).then(ok => {
                if (ok) {
                    localStorage.setItem('push_subscribed', '1');
                    if (textEl) textEl.textContent = '🔔 Уведомления включены';
                    alert('✅ Уведомления включены!');
                } else {
                    alert('❌ Не удалось включить уведомления');
                }
            });
        }
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
        const phone = localStorage.getItem('userPhone');
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