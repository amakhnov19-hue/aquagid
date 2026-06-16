/**
 * Экран подтверждения бронирования
 */
class ConfirmationScreen extends ScreenBase {
    constructor(mainApp) {
        super(mainApp);
    }

    /**
     * Показывает экран подтверждения
     */
    show() {
        console.log('✅ ConfirmationScreen.show START');
        
        if (!this.container) return;
        this.container.classList.remove('loading');
        
        // Если есть предыдущая pending-бронь — отменяем её
        const prevBookingId = window.AquaGid?.UnifiedScreens?.booking?.bookingId;
        if (prevBookingId) {
            console.log('🗑 Отмена предыдущей pending-брони:', prevBookingId);
            fetch(`/api/bookings/${prevBookingId}`, { method: 'DELETE' }).catch(() => {});
            window.AquaGid.UnifiedScreens.booking.bookingId = null;
        }
        
        const booking = window.AquaGid.UnifiedScreens.booking;
        const boat = booking.boat;
        const fullBoat = this.app.booking.boat || boat;
        
        // Копируем manager_* из полного объекта катера
        if (fullBoat) {
            window.AquaGid.UnifiedScreens.booking.boat.manager_name = fullBoat.manager_name;
            window.AquaGid.UnifiedScreens.booking.boat.manager_company = fullBoat.manager_company;
            window.AquaGid.UnifiedScreens.booking.boat.manager_phone = fullBoat.manager_phone;
            window.AquaGid.UnifiedScreens.booking.boat.manager_messengers = fullBoat.manager_messengers;
        }

        // Шаг 1: Форма ввода данных клиента
        const html = `
            <div class="screen confirmation-screen">
                <h2 class="screen-title">📋 Данные для бронирования</h2>
                
                <div class="home-button-container">
                    <button class="btn-home" onclick="window.AquaGid.UnifiedScreens.showWelcomeScreen()">
                        🏠 В начало
                    </button>
                </div>
                
                <div class="booking-details-card">
                    <h3>🚤 ${boat.name}</h3>
                    <div class="detail-row">
                        <span class="detail-label">📅 Дата:</span>
                        <span class="detail-value">${new Date(booking.date).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">⏰ Время:</span>
                        <span class="detail-value">${booking.time}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">⏱️ Длительность:</span>
                        <span class="detail-value">${booking.duration} ч</span>
                    </div>
                </div>
                
                <div class="client-data-card">
                    <h3>👤 Ваши данные</h3>
                    
                    <div class="input-group">
                        <label for="client-name">Имя *</label>
                        <input type="text" id="client-name" class="client-input" placeholder="Введите ваше имя" value="${booking.client?.name || localStorage.getItem('clientName') || ''}">
                    </div>

                    <div class="input-group">
                        <label for="client-passengers">Количество гостей</label>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <select id="client-passengers" class="client-input" style="flex: 1;">
                                <option value="0" selected>Выберите</option>
                                ${Array.from({length: booking.boat?.capacity || 1}, (_, i) => i + 1).map(n => 
                                    `<option value="${n}">${n} чел.</option>`
                                ).join('')}
                            </select>
                            <span style="color: #666; font-size: 13px; white-space: nowrap;">до ${booking.boat?.capacity || '—'} чел.</span>
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="client-phone">Телефон *</label>
                        <input type="tel" id="client-phone" class="client-input" placeholder="+7 (___) ___-__-__" value="${booking.client?.phone || localStorage.getItem('clientPhone') || ''}">
                    </div>

                    <div class="input-group">
                        <label for="client-messenger">Мессенджер для связи</label>
                        <div style="display: flex; gap: 8px;">
                            <select id="client-messenger-type" class="client-input" style="flex: 1; min-width: 0;" onchange="document.getElementById('client-messenger-contact').value = '';">
                                <option value="">Не выбран</option>
                                <option value="telegram" ${booking.client?.messengerType === 'telegram' ? 'selected' : ''}>✈️ Telegram</option>
                                <option value="max" ${booking.client?.messengerType === 'max' ? 'selected' : ''}>💬 Макс</option>
                            </select>
                            <input type="text" id="client-messenger-contact" class="client-input" placeholder="@username или номер" value="${booking.client?.messengerContact || ''}" style="flex: 2; min-width: 0;">
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="client-email">Email (для чека)</label>
                        <input type="email" id="client-email" class="client-input" placeholder="example@mail.ru" value="${booking.client?.email || ''}">
                    </div>
                    
                    ${!localStorage.getItem('clientPhone') ? `
                    <div style="background:#f8f9fa;border-radius:12px;padding:16px;margin-top:16px;text-align:left;font-size:13px;border:1px solid #e0e0e0;">
                        <p style="font-weight:600;margin:0 0 12px;">📜 Условия использования</p>
                        <label style="display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;cursor:pointer;">
                            <input type="checkbox" id="confirm-terms" style="margin-top:2px;">
                            <span>Принимаю условия <a href="javascript:void(0)" onclick="history.pushState({screen:'docs'},'',window.location.pathname); window.AquaGid.Documentation.toggle();" style="color:#0066cc;">Договора оферты</a> и даю <a href="javascript:void(0)" onclick="history.pushState({screen:'docs'},'',window.location.pathname); window.AquaGid.Documentation.toggle();" style="color:#0066cc;">Согласие на обработку ПД</a></span>
                        </label>
                        <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;">
                            <input type="checkbox" id="confirm-geo" style="margin-top:2px;">
                            <span>Согласен на определение местоположения для поиска ближайшего катера</span>
                        </label>
                    </div>
                    ` : ''}
                    
                    <div style="display: flex; justify-content: center; margin-top: 16px;">
                        <button class="btn-confirm" onclick="window.currentConfirmationScreen.confirmBooking()">
                            ✅ Подтвердить и перейти к оплате
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        window.currentConfirmationScreen = this;
        console.log('✅ ConfirmationScreen.show END (шаг 1: форма данных)');
    }

    validateForm() {
        const name = document.getElementById('client-name')?.value.trim();
        const phone = document.getElementById('client-phone')?.value.trim();
        const email = document.getElementById('client-email')?.value.trim();
        const messengerType = document.getElementById('client-messenger-type')?.value;
        const messengerContact = document.getElementById('client-messenger-contact')?.value.trim();
        
        if (name || phone) {
            localStorage.setItem('clientName', name || '');
            localStorage.setItem('clientPhone', phone || '');
            localStorage.setItem('clientEmail', email || '');
            localStorage.setItem('clientMessengerType', messengerType || '');
            localStorage.setItem('clientMessengerContact', messengerContact || '');
        }
        
        const nameValid = name && name.length > 1;
        const phoneValid = phone && phone.replace(/\D/g, '').length >= 10;
        const passengers = document.getElementById('client-passengers')?.value;
        const passengersValid = passengers && parseInt(passengers) > 0;
        const isValid = nameValid && phoneValid && passengersValid;
        
        const payButton = document.querySelector('.payment-button, .btn-pay, [id*="pay"], .pay-button');
        if (payButton) {
            payButton.disabled = !isValid;
            payButton.style.opacity = isValid ? '1' : '0.5';
        }
        
        return isValid;
    }

    loadSavedData() {
        const savedName = localStorage.getItem('clientName');
        const savedPhone = localStorage.getItem('clientPhone');
        const savedEmail = localStorage.getItem('clientEmail');
        const savedMessengerType = localStorage.getItem('clientMessengerType');
        const savedMessengerContact = localStorage.getItem('clientMessengerContact');
        
        if (savedName) document.getElementById('client-name').value = savedName;
        if (savedPhone) document.getElementById('client-phone').value = savedPhone;
        if (savedEmail) document.getElementById('client-email').value = savedEmail;
        if (savedMessengerType) document.getElementById('client-messenger-type').value = savedMessengerType;
        if (savedMessengerContact) document.getElementById('client-messenger-contact').value = savedMessengerContact;
    }

    async confirmBooking() {
        console.log('✅ Подтверждение бронирования');

        // Проверка согласий для неавторизованных
        if (!localStorage.getItem('clientPhone')) {
            const terms = document.getElementById('confirm-terms')?.checked;
            const geo = document.getElementById('confirm-geo')?.checked;
            if (!terms || !geo) {
                alert('⚠️ Примите условия использования');
                return;
            }
            // Сохраняем согласия в БД
            const phone = document.getElementById('client-phone')?.value?.replace(/\D/g, '') || '';
            const name = document.getElementById('client-name')?.value || '';
            if (phone) {
                for (const type of ['terms', 'pd', 'geo']) {
                    try {
                        await fetch('/api/consent/give', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_type: 'client', user_id: phone, consent_type: type, client_name: name })
                        });
                    } catch(e) {}
                }
            }
            localStorage.setItem('aquagid-docs-accepted', '1');
            localStorage.setItem('aquagid-pd-accepted', '1');
            localStorage.setItem('aquagid-geo-accepted', '1');
        }
        
        const name = document.getElementById('client-name')?.value.trim();
        const phone = document.getElementById('client-phone')?.value.trim();
        const email = document.getElementById('client-email')?.value.trim();
        const messengerType = document.getElementById('client-messenger-type')?.value;
        const messengerContact = document.getElementById('client-messenger-contact')?.value.trim();
        
        if (!name) {
            alert('Пожалуйста, введите имя');
            return;
        }
        
        if (!phone || phone.replace(/\D/g, '').length < 10) {
            alert('Пожалуйста, введите корректный номер телефона');
            return;
        }
        
        const passengers = parseInt(document.getElementById('client-passengers')?.value) || 0;
        if (!passengers || passengers < 1) {
            alert('Пожалуйста, выберите количество гостей');
            return;
        }
        
        const booking = window.AquaGid.UnifiedScreens.booking;
        booking.client = { name, phone, email, messengerType, messengerContact };
        
        localStorage.setItem('clientName', name);
        localStorage.setItem('clientPhone', phone);
        localStorage.setItem('clientEmail', email || '');
        localStorage.setItem('clientMessengerType', messengerType || '');
        localStorage.setItem('clientMessengerContact', messengerContact || '');
        
        try {
            const payButton = document.querySelector('.payment-button, .btn-pay, [id*="pay"]');
            if (payButton) {
                payButton.disabled = true;
                payButton.textContent = '⏳ Отправка...';
            }

            console.log('📤 messengerType:', messengerType, 'messengerContact:', messengerContact);
            
            const bookingData = {
                boat_id: booking.boatId,
                booking_date: booking.date,
                start_time: booking.time,
                duration_minutes: booking.duration * 60,
                client_name: name,
                client_passengers: parseInt(document.getElementById('client-passengers')?.value) || 1,
                client_phone: phone,
                client_email: email,
                client_messenger_type: messengerType,
                client_messenger_contact: messengerContact,
                ref_code: localStorage.getItem('aquagid-ref') || null
            };
            
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });
            
            if (!response.ok) throw new Error('Ошибка создания бронирования');
            
            const result = await response.json();
            
            // Сохраняем все данные из API в глобальный объект
            if (window.AquaGid?.UnifiedScreens?.booking) {
                window.AquaGid.UnifiedScreens.booking.id = result.id;
                window.AquaGid.UnifiedScreens.booking.bookingId = result.id;
                window.AquaGid.UnifiedScreens.booking.total_price = result.total_price;
                window.AquaGid.UnifiedScreens.booking.prepayment_amount = result.prepayment_amount;
                window.AquaGid.UnifiedScreens.booking.client_name = result.client_name;
                window.AquaGid.UnifiedScreens.booking.client.passengers = passengers;
                window.AquaGid.UnifiedScreens.booking.client_phone = result.client_phone;
                window.AquaGid.UnifiedScreens.booking.booking_date = result.booking_date;
                window.AquaGid.UnifiedScreens.booking.start_time = result.start_time;
                window.AquaGid.UnifiedScreens.booking.created_at = result.created_at;
            }
            
            // Шаг 2: Показываем детали брони с точными суммами + платёжный блок
            this.showPaymentStep(result);
            
        } catch (error) {
            console.error('❌ Ошибка:', error);
            alert('Произошла ошибка при бронировании. Попробуйте ещё раз.');
        }
    }

    showPaymentStep(apiResult) {
        const booking = window.AquaGid.UnifiedScreens.booking;
        const boat = booking.boat;
        const totalPrice = apiResult.total_price;
        const prepaymentAmount = apiResult.prepayment_amount;
        const remainingAmount = totalPrice - prepaymentAmount;
        
        const clientName = apiResult.client_name || booking.client?.name || '';
        const clientPhone = apiResult.client_phone || booking.client?.phone || '';

        // Сохраняем bookingId в глобальный объект для PaymentService
        if (window.AquaGid?.UnifiedScreens?.booking) {
            window.AquaGid.UnifiedScreens.booking.bookingId = apiResult.id;
        }
        
        const html = `
            <div class="screen confirmation-screen">
                <h2 class="screen-title">✅ Проверьте данные</h2>
                
                <div class="home-button-container">
                    <button class="btn-home" onclick="window.AquaGid.UnifiedScreens.showWelcomeScreen()">
                        🏠 В начало
                    </button>
                </div>
                
                <div class="booking-details-card">
                    <h3>📋 Детали бронирования №${apiResult.id}</h3>
                    
                    <div class="detail-row">
                        <span class="detail-label">🚤 Катер:</span>
                        <span class="detail-value">${boat.name}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">📅 Дата:</span>
                        <span class="detail-value">${new Date(booking.date).toLocaleDateString('ru-RU')}</span>
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
                        <span class="detail-label">👥 Всего гостей:</span>
                        <span class="detail-value">${booking.client?.passengers || '—'} чел.</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">👤 Имя:</span>
                        <span class="detail-value">${clientName}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">📞 Телефон:</span>
                        <span class="detail-value">${clientPhone}</span>
                    </div>

                    <div class="detail-row">
                        <span class="detail-label">💬 Мессенджер:</span>
                        <span class="detail-value">${apiResult.client_messenger_type || booking.client?.messengerType || '—'} ${apiResult.client_messenger_contact || booking.client?.messengerContact || ''}</span>
                    </div>

                    <div style="margin-top: 12px;">
                        <button onclick="window.currentConfirmationScreen.show()" style="width: 100%; padding: 12px; font-size: 15px; border-radius: 8px; border: none; background: #f97316; color: white; cursor: pointer; font-weight: bold;">
                            ✏️ Исправить данные
                        </button>
                    </div>
                    
                    <div class="detail-row total">
                        <span class="detail-label">💰 Полная стоимость:</span>
                        <span class="detail-value">${totalPrice.toLocaleString()} ₽</span>
                    </div>
                    
                    <div class="detail-row prepayment">
                        <span class="detail-label">💳 Предоплата:</span>
                        <span class="detail-value">${prepaymentAmount.toLocaleString()} ₽</span>
                    </div>
                    
                    <div class="detail-row remaining">
                        <span class="detail-label">💵 Остаток на месте:</span>
                        <span class="detail-value">${remainingAmount.toLocaleString()} ₽</span>
                    </div>
                </div>

                <div style="width: 100%;">
                    ${window.paymentUI?.renderPaymentBlock(prepaymentAmount, {
                        onSuccess: async (paymentResult) => {
                            console.log('💰 Оплата успешна:', paymentResult);
                            const bookingId = apiResult.id;  // ← вот правильный ID!
                            console.log('🔄 confirm-payment bookingId:', bookingId);
                            if (bookingId) {
                                try {
                                    await fetch(`/api/bookings/${bookingId}/confirm-payment`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ status: 'active' })
                                    });
                                } catch (e) {
                                    console.error('Ошибка смены статуса:', e);
                                }
                            }
                            this.clearClientData();
                            if (window.AquaGid?.ManagerDashboard) {
                                window.AquaGid.ManagerDashboard.loadDashboardData();
                            }
                            window.AquaGid.UnifiedScreens.showSuccessScreen();
                        },
                        onError: (error) => {
                            console.log('Ошибка оплаты:', error);
                            alert('Оплата не прошла. Попробуйте ещё раз.');
                        }
                    }) || '<div class="error">Платёжный модуль не загружен</div>'}
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        window.currentConfirmationScreen = this;
    }

    clearClientData() {
        console.log('🧹 clearClientData ВЫЗВАН');
        
        const nameField = document.getElementById('client-name');
        const phoneField = document.getElementById('client-phone');
        const emailField = document.getElementById('client-email');
        const telegramField = document.getElementById('client-telegram');
        
        if (nameField) nameField.value = '';
        if (phoneField) phoneField.value = '';
        if (emailField) emailField.value = '';
        if (telegramField) telegramField.value = '';
        
        localStorage.removeItem('clientName');
        localStorage.removeItem('clientPhone');
        localStorage.removeItem('clientEmail');
        localStorage.removeItem('clientTelegram');
        
        if (window.AquaGid?.UnifiedScreens?.booking) {
            window.AquaGid.UnifiedScreens.booking.client = {};
            window.AquaGid.UnifiedScreens.booking.bookingId = null;
        }
        
        const payButton = document.querySelector('.payment-button, .btn-pay, [id*="pay"]');
        if (payButton) {
            payButton.disabled = true;
            payButton.style.opacity = '0.5';
        }
    }
}

window.ConfirmationScreen = ConfirmationScreen;