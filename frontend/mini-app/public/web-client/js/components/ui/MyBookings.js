/**
 * Компонент "Мои бронирования"
 * Используется в клиентском ЛК
 */
(function(global) {
    'use strict';
    
    class MyBookings {
        constructor() {
            this.bookings = [];
            this.allBookings = [];
            this.loading = false;
            this.error = null;
            this.filter = 'active';
        }
        
        /**
         * Загрузить бронирования
         */
        async loadBookings(filter = 'active') {
            this.loading = true;
            this.filter = filter;
            this.error = null;
            this.render();
            
            try {
                console.log('🚀 loadBookings START');
                console.log('📱 phone from localStorage:', localStorage.getItem('clientPhone'));
                console.log('🖨️ saved fingerprint:', localStorage.getItem('userFingerprint'));
                
                let phone = localStorage.getItem('clientPhone');
                const savedFingerprint = localStorage.getItem('userFingerprint');
                const expires = localStorage.getItem('userExpires');
                
                // Проверяем срок хранения
                if (expires && new Date(expires) < new Date()) {
                    console.log('📅 Срок хранения истёк');
                    localStorage.clear();
                    phone = null;
                }
                
                // Проверяем fingerprint
                if (phone) {
                    console.log('🔍 ВХОДИМ В БЛОК ПРОВЕРКИ FINGERPRINT');
                    console.log('🔍 Проверяем fingerprint...');
                    const currentFingerprint = await window.BrowserFingerprint.generate();
                    console.log('🖨️ Сохранённый fingerprint:', savedFingerprint?.substring(0, 8));
                    console.log('🖨️ Текущий fingerprint:', currentFingerprint.substring(0, 8));
                    
                    if (savedFingerprint && savedFingerprint !== currentFingerprint) {
                        console.log('⚠️ Fingerprint не совпадает! Сбрасываем данные.');
                        window.SecurityLogger.log('fingerprint_mismatch', phone, {
                            saved: savedFingerprint.substring(0, 8),
                            current: currentFingerprint.substring(0, 8)
                        });
                        
                        localStorage.removeItem('clientPhone');
                        localStorage.removeItem('userFingerprint');
                        localStorage.removeItem('userExpires');
                        phone = null;
                    } else {
                        console.log('✅ Fingerprint совпадает');
                    }
                }
                
                // Если нет телефона — показываем форму ввода
                if (!phone) {
                    this.loading = false;
                    this.render();
                    return;
                }
                
                // Загружаем бронирования с сервера
                const encodedPhone = encodeURIComponent(phone);
                const response = await fetch(`/api/bookings/client/${encodedPhone}`);
                
                if (!response.ok) {
                    throw new Error('Ошибка загрузки бронирований');
                }
                
                const bookings = await response.json();
                console.log(`✅ Загружено ${bookings.length} бронирований с сервера`);
                
                // Преобразуем данные в формат компонента
                this.allBookings = bookings.map(b => ({
                    id: b.id,
                    boat_id: b.boat_id,
                    boat_name: b.boat?.name || `Катер #${b.boat_id}`,
                    date: b.booking_date,
                    time: b.start_time ? b.start_time.slice(0, 5) : '',
                    duration: b.duration_minutes / 60,
                    total_amount: b.total_price,
                    prepayment_amount: b.prepayment_amount || 0,
                    status: b.status,
                    client_name: b.client_name || 'Дорогой клиент',
                    cancellation_requested: b.cancellation_requested || false,
                    notes: '',
                    // Добавляем данные катера
                    capacity: b.boat?.capacity,
                    // Добавляем данные судовладельца
                    manager_name: b.boat?.manager_name,
                    manager_company: b.boat?.manager_company,
                    manager_phone: b.boat?.manager_phone,
                    manager_messengers: b.boat?.manager_messengers || {},
                    boarding_address: b.boat?.boarding_address,
                }));
                
                // Фильтрация по статусу
                let filtered;
                if (this.filter === 'active') {
                    filtered = this.allBookings.filter(b => b.status === 'active');
                } else {
                    filtered = this.allBookings.filter(b => b.status === 'completed');
                }
                
                this.bookings = filtered;
                this.loading = false;
                this.render();
                
            } catch (error) {
                console.error('❌ Ошибка загрузки бронирований:', error);
                this.error = error.message;
                this.loading = false;
                this.render();
            }
        }
        
        /**
         * Отменить бронирование
         */
        async cancelBooking(bookingId) {
            if (!confirm('Вы уверены, что хотите отменить бронирование?')) {
                return;
            }
            
            try {
                const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
                    method: 'POST'
                });
                
                if (!response.ok) {
                    throw new Error('Ошибка отмены бронирования');
                }
                
                const result = await response.json();
                
                alert('✅ Бронирование отменено');
                
                // Обновляем список
                await this.loadBookings(this.filter);
                
            } catch (error) {
                console.error('❌ Ошибка отмены:', error);
                alert('❌ Ошибка при отмене бронирования');
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
                        <div class="loading-spinner">⏳</div>
                        <p>Загрузка бронирований...</p>
                    </div>
                `;
                return;
            }
            
            // ПОКАЗЫВАЕМ ОШИБКУ
            if (this.error) {
                container.innerHTML = `
                    <div class="my-bookings error">
                        <p>❌ ${this.error}</p>
                        <button onclick="AquaGid.MyBookings.loadBookings('${this.filter}')">
                            Повторить
                        </button>
                    </div>
                `;
                return;
            }
            
            // ПОКАЗЫВАЕМ ФОРМУ ВВОДА ТЕЛЕФОНА (если нет номера)
            const phone = localStorage.getItem('clientPhone');
            // Если телефон уже есть в аккаунте — не показываем форму ввода
            if (!phone) {
                container.innerHTML = `
                    <div class="my-bookings phone-input">
                        <div class="phone-form">
                            <label>Введите номер телефона для поиска бронирований</label>
                            <input type="tel" id="booking-phone" placeholder="+7 (___) ___-__-__">
                            <button onclick="AquaGid.MyBookings.searchByPhone()">Найти</button>
                        </div>
                    </div>
                `;
                return;
            }
            
            // ПОКАЗЫВАЕМ СПИСОК БРОНИРОВАНИЙ
            const maskedPhone = phone.replace(/(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/, '+$1 ($2) $3-$4-$5');
            
            const html = `
                <div class="my-bookings">
                    <div class="bookings-header">
                        <span style="color:#666;font-size:13px;">📱 ${maskedPhone}</span>
                    </div>
                    
                    <div class="bookings-tabs">
                        <button class="tab ${this.filter === 'active' ? 'active' : ''}" 
                                onclick="AquaGid.MyBookings.loadBookings('active')">
                            🚤 Активные (${this.countActive()})
                        </button>
                        <button class="tab ${this.filter === 'history' ? 'active' : ''}" 
                                onclick="AquaGid.MyBookings.loadBookings('history')">
                            📜 История (скоро)
                        </button>
                    </div>
                    
                    <div class="bookings-list">
                        ${this.renderBookingsList()}
                    </div>
                </div>
            `;
            
            container.innerHTML = html;

            // Обработчики для кнопок подтверждения отмены
            container.querySelectorAll('.btn-confirm-cancel').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const bookingId = parseInt(btn.getAttribute('data-booking-id'));
                    const phone = localStorage.getItem('clientPhone');
                    
                    if (!phone) {
                        alert('Не найден номер телефона');
                        return;
                    }
                    
                    if (confirm('Вы подтверждаете отмену бронирования? Отмена окончательная.')) {
                        try {
                            const response = await fetch(`/api/bookings/${bookingId}/confirm-cancellation`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ phone: phone })
                            });
                            
                            if (!response.ok) {
                                const error = await response.json();
                                throw new Error(error.detail || 'Ошибка подтверждения отмены');
                            }
                            
                            alert('✅ Бронирование отменено');
                            await this.loadBookings(this.filter);
                        } catch (error) {
                            console.error('Ошибка:', error);
                            alert('❌ Ошибка при отмене бронирования: ' + error.message);
                        }
                    }
                });
            });
        }
        
        /**
         * Поиск по номеру телефона
         */
        async searchByPhone() {
            const phoneInput = document.getElementById('booking-phone');
            if (!phoneInput) return;
            
            let phone = phoneInput.value.trim();
            if (!phone) {
                if (window.AquaGid?.DesignSystem) {
                    window.AquaGid.DesignSystem.ui.showNotification(
                        'Введите номер телефона', 
                        'warning'
                    );
                }
                return;
            }
            
            // Нормализуем номер
            phone = phone.replace(/[^0-9]/g, '');
            if (phone.length === 10) {
                phone = '7' + phone;
            }
            if (phone.length !== 11) {
                alert('Введите корректный номер телефона (10 или 11 цифр)');
                return;
            }
            
            // Сохраняем телефон и fingerprint
            localStorage.setItem('clientPhone', phone);            
            const fingerprint = await window.BrowserFingerprint.generate();
            localStorage.setItem('userFingerprint', fingerprint);
            
            // Устанавливаем срок хранения (до конца сезона)
            const seasonEnd = new Date();
            seasonEnd.setMonth(9); // октябрь
            seasonEnd.setDate(31);
            localStorage.setItem('userExpires', seasonEnd.toISOString());
            
            this.loadBookings('active');
        }
        
        /**
         * Подсчет активных бронирований
         */
        countActive() {
            return this.allBookings.filter(b => b.status === 'active').length;
        }
        
        /**
         * Подсчет истории
         */
        countHistory() {
            return this.allBookings.filter(b => b.status === 'completed').length;
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
            const bookingDate = new Date(booking.date + 'T' + booking.time);
            const bookingStart = bookingDate;
            const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 3600000);
            const now = new Date();
            const hoursUntil = (bookingStart - now) / (1000 * 60 * 60);
            const isCompleted = bookingEnd < now && booking.status === 'active';
            const displayStatus = isCompleted ? 'completed' : booking.status;
            
            const canCancel = hoursUntil > 24 && !isCompleted;
            const hasCancellationRequest = booking.cancellation_requested === true && !isCompleted;
            
            return `
                <div class="booking-card ${displayStatus}" data-booking-id="${booking.id}">
                    <div class="booking-header" onclick="AquaGid.MyBookings.showDetails(${booking.id})" style="cursor:pointer;">
                        <h3>🚤 ${booking.boat_name}</h3>
                        <span class="booking-status ${booking.status}">
                            ${this.getStatusLabel(displayStatus)}
                        </span>
                    </div>
                    
                    <div class="booking-details" onclick="AquaGid.MyBookings.showDetails(${booking.id})" style="cursor:pointer;">
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
                            <span class="detail-label">💰 Полная стоимость:</span>
                            <span class="detail-value">${(booking.total_price || booking.total_amount || 0).toLocaleString()} ₽</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">💳 Предоплата:</span>
                            <span class="detail-value">${(booking.prepayment_amount || 0).toLocaleString()} ₽</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">💵 Остаток на месте:</span>
                            <span class="detail-value">${((booking.total_price || booking.total_amount || 0) - (booking.prepayment_amount || 0)).toLocaleString()} ₽</span>
                        </div>
                    </div>
                    
                    ${hasCancellationRequest ? `
                        <div class="cancellation-request-block">
                            <div class="warning-message">
                                ⚠️ Вам поступило предложение аннулировать бронирование
                            </div>
                            <button class="btn-confirm-cancel" data-booking-id="${booking.id}" onclick="event.stopPropagation()">
                                ✅ Подтвердить отмену
                            </button>
                            <div class="cancel-hint">
                                Нажимать после разговора с <strong>${booking.manager_name || 'менеджером'}</strong>
                                <a href="tel:${booking.manager_phone}" class="manager-phone-link">
                                    📞 ${booking.manager_phone || 'позвонить'}
                                </a>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${canCancel && !hasCancellationRequest ? `
                        <div class="booking-cancel-link">
                            <a href="#" onclick="AquaGid.MyBookings.showCancelModal(${booking.id}); return false;">
                                Отменить бронирование
                            </a>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        /**
         * Получить текст статуса
         */
        getStatusLabel(status) {
            const statuses = {
                'active': '✅ Активно',
                'completed': '<span style="color: #ef4444;">✅ Завершено</span>',
                'cancelled': '❌ Отменено'
            };
            return statuses[status] || status;
        }

        showCancelModal(bookingId) {
            const cancelBooking = new window.AquaGid.CancelBooking(bookingId, () => {
                this.loadBookings(this.filter);
            });
            cancelBooking.show();
        }

        /**
         * Показать детали бронирования (экран успеха)
         */
        showBookingDetails(bookingId) {
            history.pushState({ screen: 'bookingdetail' }, '', window.location.pathname);
            const booking = this.allBookings.find(b => b.id == bookingId);
            if (!booking) {
                console.error('Бронирование не найдено:', bookingId);
                return;
            }
            
            if (window.AquaGid?.UnifiedScreens) {
                window.AquaGid.UnifiedScreens.booking = {
                    id: booking.id,
                    bookingId: booking.id,
                    boat: {
                        id: booking.boat_id,
                        name: booking.boat_name,
                        capacity: booking.capacity,
                        price_per_hour: booking.total_amount / booking.duration,
                        manager_name: booking.manager_name,
                        manager_company: booking.manager_company,
                        manager_phone: booking.manager_phone,
                        boarding_address: booking.boarding_address
                    },
                    date: booking.date,
                    time: booking.time,
                    duration: booking.duration,
                    client: {
                        name: booking.client_name,
                        phone: booking.client_phone
                    },
                    total_amount: booking.total_amount
                };
                
                console.log('Вызываем showSuccessScreen с параметром:', { fromMyBookings: true });
                window.AquaGid.UnifiedScreens.showSuccessScreen({ fromMyBookings: true });
            }
        }

        showDetails(bookingId) {
            const booking = this.bookings.find(b => b.id === bookingId);
            if (!booking) {
                console.error('Бронирование не найдено:', bookingId);
                return;
            }
            
            // Преобразуем в формат, который ждёт SuccessScreen
            const viewData = {
                ...booking,
                client_name: booking.client_name || booking.clientName || 'Дорогой клиент',
                booking_date: booking.booking_date || booking.date,
                start_time: booking.start_time || booking.time + ':00',
                duration_minutes: booking.duration_minutes || (booking.duration * 60) || 0,
                total_price: booking.total_price || booking.total_amount || 0,
                prepayment_amount: booking.prepayment_amount || 0,
                boat: {
                    ...booking.boat,
                    id: booking.boat?.id || booking.boat_id,
                    name: booking.boat?.name || booking.boat_name,
                    capacity: booking.boat?.capacity || booking.capacity,
                    boarding_address: booking.boat?.boarding_address || booking.boarding_address,
                    manager_name: booking.boat?.manager_name || booking.manager_name,
                    manager_company: booking.boat?.manager_company || booking.manager_company,
                    manager_phone: booking.boat?.manager_phone || booking.manager_phone,
                    manager_messengers: booking.boat?.manager_messengers || booking.manager_messengers || {},                    
                }
            };
            
            if (window.AquaGid?.UnifiedScreens) {
                window.AquaGid.UnifiedScreens.booking = viewData;
                window.AquaGid.UnifiedScreens.showSuccessScreen({ fromMyBookings: true });
            }
        }
    }
    
    // Создаём глобальный экземпляр
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.MyBookings = new MyBookings();
    
})(typeof window !== 'undefined' ? window : global);