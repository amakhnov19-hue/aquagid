// /frontend/mini-app/public/js/components/ui/MyBookings.js
// Версия: 1.0.0
// Назначение: Личный кабинет клиента с бронированиями

(function(global) {
    'use strict';
    
    const VERSION = '20260225_01';
    
    const BOOKING_STATUS = {
        PENDING: 'pending',
        PAID: 'paid',
        CONFIRMED: 'confirmed',
        ACTIVE: 'active',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        REFUNDED: 'refunded',
        NO_SHOW: 'no_show'
    };
    
    const STATUS_LABELS = {
        [BOOKING_STATUS.PENDING]: '⏳ Ожидает оплаты',
        [BOOKING_STATUS.PAID]: '💰 Оплачено',
        [BOOKING_STATUS.CONFIRMED]: '✅ Подтверждено',
        [BOOKING_STATUS.ACTIVE]: '🚤 Предстоит',
        [BOOKING_STATUS.COMPLETED]: '⭐ Завершено',
        [BOOKING_STATUS.CANCELLED]: '❌ Отменено',
        [BOOKING_STATUS.REFUNDED]: '💸 Возврат',
        [BOOKING_STATUS.NO_SHOW]: '👤 Не явка'
    };
    
    class MyBookings {
        constructor() {
            this.version = VERSION;
            this.bookings = [];
            this.filter = 'active';
            this.loading = false;
            this.error = null;
        }
        
        /**
         * Загрузить бронирования клиента (ВРЕМЕННО - с тестовыми данными)
         */
        async loadBookings(filter = 'active') {
            this.loading = true;
            this.filter = filter;
            this.error = null;
            this.render(); // Сразу показываем загрузку
            
            try {
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const allTestBookings = [
                    // ... тестовые данные ...
                ];
                
                if (filter === 'active') {
                    this.bookings = allTestBookings.filter(b => 
                        ['active', 'pending', 'paid', 'confirmed'].includes(b.status)
                    );
                } else {
                    this.bookings = allTestBookings.filter(b => 
                        ['completed', 'cancelled', 'refunded', 'no_show'].includes(b.status)
                    );
                }
                
                console.log(`Загружено ${this.bookings.length} бронирований (тестовые данные)`);
                this.loading = false;
                this.render(); // ОБЯЗАТЕЛЬНО! Перерисовываем с данными
                
            } catch (error) {
                console.error('Ошибка загрузки бронирований:', error);
                this.error = error.message;
                this.loading = false;
                this.render(); // ОБЯЗАТЕЛЬНО! Перерисовываем с ошибкой
            }
        }
        
        /**
         * Отменить бронирование (ВРЕМЕННО - просто меняем статус)
         */
        async cancelBooking(bookingId) {
            if (!confirm('Вы уверены, что хотите отменить бронирование?')) {
                return;
            }
            
            try {
                // Ищем бронирование
                const booking = this.bookings.find(b => b.id === bookingId);
                if (!booking) return;
                
                const bookingDate = new Date(booking.date);
                const now = new Date();
                const hoursUntil = (bookingDate - now) / (1000 * 60 * 60);
                
                // Меняем статус
                if (hoursUntil > 24) {
                    booking.status = 'cancelled';
                    if (global.AquaGid?.DesignSystem) {
                        global.AquaGid.DesignSystem.ui.showNotification(
                            '✅ Бронирование отменено. Деньги будут возвращены в течение 3-7 дней.', 
                            'success'
                        );
                    }
                } else {
                    booking.status = 'no_show';
                    if (global.AquaGid?.DesignSystem) {
                        global.AquaGid.DesignSystem.ui.showNotification(
                            '❌ Отмена невозможна (менее 24 часов до начала). Деньги не возвращаются.', 
                            'error'
                        );
                    }
                }
                
                // Обновляем отображение
                this.render();
                
            } catch (error) {
                console.error('Ошибка отмены:', error);
            }
        }
        
        /**
         * Рендер компонента
         */
        render(containerId = 'my-bookings-container') {
            console.log('render() called', {
                loading: this.loading,
                error: this.error,
                bookingsCount: this.bookings.length,
                filter: this.filter
            });
            let container = document.getElementById(containerId);
            if (!container) {
                container = document.createElement('div');
                container.id = containerId;
                document.body.appendChild(container);
            }
            
            // ПОКАЗЫВАЕМ ЗАГРУЗКУ
            if (this.loading) {
                container.innerHTML = `
                    <div class="my-bookings loading">
                        <div class="loader"></div>
                        <p>Загрузка бронирований...</p>
                    </div>
                `;
                return;
            }
            
            // ПОКАЗЫВАЕМ ОШИБКУ
            if (this.error) {
                container.innerHTML = `
                    <div class="my-bookings error">
                        <div class="error-icon">❌</div>
                        <h3>Ошибка загрузки</h3>
                        <p>${this.error}</p>
                        <button onclick="AquaGid.MyBookings.loadBookings('${this.filter}')">
                            Повторить
                        </button>
                    </div>
                `;
                return;
            }
            
            // ПОКАЗЫВАЕМ СПИСОК БРОНИРОВАНИЙ
            const html = `
                <div class="my-bookings">
                    <div class="bookings-header">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h2>📋 Мои бронирования</h2>
                            <button class="close-btn" onclick="document.getElementById('my-bookings-container').style.display = 'none';">✕</button>
                        </div>
                        <div class="bookings-tabs">
                            <button class="tab ${this.filter === 'active' ? 'active' : ''}" 
                                    onclick="AquaGid.MyBookings.loadBookings('active')">
                                🚤 Активные (${this.countActive()})
                            </button>
                            <button class="tab ${this.filter === 'history' ? 'active' : ''}" 
                                    onclick="AquaGid.MyBookings.loadBookings('history')">
                                📜 История (${this.countHistory()})
                            </button>
                        </div>
                    </div>
                    
                    <div class="bookings-list">
                        ${this.renderBookingsList()}
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
        }
        
        /**
         * Рендер списка бронирований
         */
        renderBookingsList() {
            if (this.bookings.length === 0) {
                return `
                    <div class="no-bookings">
                        <p>${this.filter === 'active' 
                            ? 'У вас нет активных бронирований' 
                            : 'История бронирований пуста'}</p>
                    </div>
                `;
            }
            
            return this.bookings.map(booking => this.renderBookingCard(booking)).join('');
        }
        
        /**
         * Карточка бронирования
         */
        renderBookingCard(booking) {
            const bookingDate = new Date(booking.date);
            const now = new Date();
            const hoursUntil = (bookingDate - now) / (1000 * 60 * 60);
            const canCancel = hoursUntil > 24 && booking.status === 'active';
            
            return `
                <div class="booking-card ${booking.status}">
                    <div class="booking-header">
                        <h3>🚤 ${booking.boat_name}</h3>
                        <span class="booking-status ${booking.status}">
                            ${this.getStatusLabel(booking.status)}
                        </span>
                    </div>
                    
                    <div class="booking-details">
                        <div class="detail-row">
                            <span class="detail-label">📅 Дата:</span>
                            <span class="detail-value">${bookingDate.toLocaleDateString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">⏰ Время:</span>
                            <span class="detail-value">${booking.time}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">⏱️ Длительность:</span>
                            <span class="detail-value">${booking.duration} ч</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">💰 Сумма:</span>
                            <span class="detail-value">${booking.total_amount} ₽</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">💳 Оплачено:</span>
                            <span class="detail-value">${booking.paid_amount} ₽</span>
                        </div>
                    </div>
                    
                    ${booking.notes ? `<div class="booking-notes">📝 ${booking.notes}</div>` : ''}
                    
                    <div class="booking-actions">
                        ${canCancel ? `
                            <button class="cancel-btn" onclick="AquaGid.MyBookings.cancelBooking(${booking.id})">
                                ❌ Отменить бронирование
                            </button>
                        ` : ''}
                        
                        ${booking.status === 'active' ? `
                            <button class="map-btn" onclick="AquaGid.UnifiedScreens.navigateToPier()">
                                🗺️ Маршрут до причала
                            </button>
                        ` : ''}
                    </div>
                    
                    ${!canCancel && booking.status === 'active' ? `
                        <div class="cancel-warning">
                            ⚠️ Отмена возможна не менее чем за 24 часа до начала
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        /**
         * Получить текстовую метку статуса
         */
        getStatusLabel(status) {
            const labels = {
                'pending': '⏳ Ожидает оплаты',
                'paid': '💰 Оплачено',
                'confirmed': '✅ Подтверждено',
                'active': '🚤 Предстоит',
                'completed': '⭐ Завершено',
                'cancelled': '❌ Отменено',
                'refunded': '💸 Возврат',
                'no_show': '👤 Не явка'
            };
            return labels[status] || status;
        }
        
        /**
         * Подсчет активных бронирований
         */
        countActive() {
            const activeStatuses = ['active', 'pending', 'paid', 'confirmed'];
            return this.bookings.filter(b => activeStatuses.includes(b.status)).length;
        }
        
        /**
         * Подсчет истории
         */
        countHistory() {
            const historyStatuses = ['completed', 'cancelled', 'refunded', 'no_show'];
            return this.bookings.filter(b => historyStatuses.includes(b.status)).length;
        }
    }
    
    // Создаём синглтон
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.MyBookings = new MyBookings();
    
})(typeof window !== 'undefined' ? window : global);