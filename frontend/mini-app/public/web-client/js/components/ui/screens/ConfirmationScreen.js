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
        console.log('📅 booking.date:', this.app.booking.date);
        console.log('⏰ booking.time:', this.app.booking.time);
        console.log('🚤 booking.boat:', this.app.booking.boat);

        console.log('✅ ConfirmationScreen.show START');
        
        if (!this.container) return;
        this.container.classList.remove('loading');
        
        const booking = window.AquaGid.UnifiedScreens.booking;
        const boat = booking.boat;
        
        // Рассчитываем стоимость через PricingService
        const durationMinutes = booking.duration_minutes || (booking.duration || 0) * 60;
        const fullBoat = this.app.booking.boat || boat;
        const { totalPrice, prepaymentAmount } = PricingService.calculate(fullBoat, durationMinutes);
        console.log('💰 DEBUG totalPrice:', totalPrice, 'prepaymentAmount:', prepaymentAmount);
        console.log('💰 DEBUG fullBoat:', fullBoat?.name, 'open_price:', fullBoat?.open_price, 'agent_price:', fullBoat?.agent_price, 'pricing_method:', fullBoat?.pricing_method);

        const remainingAmount = totalPrice - prepaymentAmount;

        // Копируем manager_* из полного объекта катера
        if (fullBoat) {
            window.AquaGid.UnifiedScreens.booking.boat.manager_name = fullBoat.manager_name;
            window.AquaGid.UnifiedScreens.booking.boat.manager_company = fullBoat.manager_company;
            window.AquaGid.UnifiedScreens.booking.boat.manager_phone = fullBoat.manager_phone;
            window.AquaGid.UnifiedScreens.booking.boat.manager_messengers = fullBoat.manager_messengers;
        }

        // Сохраняем правильную предоплату для PaymentService
        if (window.AquaGid?.UnifiedScreens?.booking) {
            window.AquaGid.UnifiedScreens.booking.totalPrice = totalPrice;
            window.AquaGid.UnifiedScreens.booking.prepaymentAmount = prepaymentAmount;
            window.AquaGid.UnifiedScreens.booking.prepayment_amount = prepaymentAmount;
        }

        const html = `
            <div class="screen confirmation-screen">
                <!-- Заголовок -->
                <h2 class="screen-title">✅ Подтверждение бронирования</h2>
                
                <!-- Кнопка В начало -->
                <div class="home-button-container">
                    <button class="btn-home" onclick="window.AquaGid.UnifiedScreens.showWelcomeScreen()">
                        🏠 В начало
                    </button>
                </div>
                
                <!-- Детали бронирования -->
                <div class="booking-details-card">
                    <h3>📋 Детали бронирования</h3>
                    
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
                        <span class="detail-label">👥 Вместимость:</span>
                        <span class="detail-value">до ${boat.capacity} чел</span>
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
                
                <!-- Данные клиента -->
                <div class="client-data-card">
                    <h3>👤 Ваши данные</h3>
                    
                    <div class="input-group">
                        <label for="client-name">Имя *</label>
                        <input type="text" id="client-name" class="client-input" placeholder="Введите ваше имя" value="${booking.client?.name || ''}">
                    </div>
                    
                    <div class="input-group">
                        <label for="client-phone">Телефон *</label>
                        <input type="tel" id="client-phone" class="client-input" placeholder="+7 (___) ___-__-__" value="${booking.client?.phone || ''}">
                    </div>

                    <div class="input-group">
                        <label for="client-messenger">Мессенджер для связи</label>
                        <div style="display: flex; gap: 8px;">
                            <select id="client-messenger-type" class="client-input" style="flex: 1; min-width: 0;">
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
                    
                    <div class="agreement-checkbox">
                        <input type="checkbox" id="agreement-check">
                        <label for="agreement-check">
                            Я согласен с 
                            <a href="/docs/offer.html" target="_blank">условиями бронирования</a> и 
                            <a href="/docs/privacy.html" target="_blank">политикой обработки данных</a>
                        </label>
                    </div>
                </div>
                
                <!-- БЛОК ОПЛАТЫ (через платежный модуль) -->
                ${window.paymentUI?.renderPaymentBlock(prepaymentAmount, {
                    onSuccess: (result) => {
                        console.log('💰 ОПЛАТА УСПЕШНА, result:', result);
                        console.log('💰 window.currentConfirmationScreen:', window.currentConfirmationScreen);
                        console.log('💰 Вызываем confirmBooking()...');
                        if (window.currentConfirmationScreen) {
                            window.currentConfirmationScreen.confirmBooking();
                        } else {
                            console.error('❌ currentConfirmationScreen не найден!');
                        }
                    },
                    onError: (error) => console.log('Ошибка оплаты', error)
                }) || '<div class="error">Платежный модуль не загружен</div>'}
                
            </div>
        `;
        
        this.container.innerHTML = html;

        // Восстанавливаем сохранённые данные
        setTimeout(() => {
            this.loadSavedData();
            
            const fields = ['client-name', 'client-phone', 'client-email', 'client-messenger-contact'];
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('input', () => this.validateForm());
            });
            document.getElementById('agreement-check')?.addEventListener('change', () => this.validateForm());
            
            this.validateForm();
        }, 50);
        
        window.currentConfirmationScreen = this;
        
        console.log('✅ ConfirmationScreen.show END');
        // Очищаем чекбокс при загрузке экрана
        const agreementCheck = document.getElementById('agreement-check');
        if (agreementCheck) agreementCheck.checked = false;
    }

    validateForm() {
        const name = document.getElementById('client-name')?.value.trim();
        const phone = document.getElementById('client-phone')?.value.trim();
        const email = document.getElementById('client-email')?.value.trim();
        const messengerType = document.getElementById('client-messenger-type')?.value;
        const messengerContact = document.getElementById('client-messenger-contact')?.value.trim();
        const agreement = document.getElementById('agreement-check')?.checked;
        
        if (name || phone) {
            localStorage.setItem('clientName', name || '');
            localStorage.setItem('clientPhone', phone || '');
            localStorage.setItem('clientEmail', email || '');
            localStorage.setItem('clientMessengerType', messengerType || '');
            localStorage.setItem('clientMessengerContact', messengerContact || '');
        }
        
        const nameValid = name && name.length > 1;
        const phoneValid = phone && phone.replace(/\D/g, '').length >= 10;
        const agreementValid = agreement;
        const isValid = nameValid && phoneValid && agreementValid;
        
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
        
        const name = document.getElementById('client-name')?.value.trim();
        const phone = document.getElementById('client-phone')?.value.trim();
        const email = document.getElementById('client-email')?.value.trim();
        const messengerType = document.getElementById('client-messenger-type')?.value;
        const messengerContact = document.getElementById('client-messenger-contact')?.value.trim();
        const agreement = document.getElementById('agreement-check')?.checked;
        
        if (!name) {
            alert('Пожалуйста, введите имя');
            return;
        }
        
        if (!phone || phone.replace(/\D/g, '').length < 10) {
            alert('Пожалуйста, введите корректный номер телефона');
            return;
        }
        
        if (!agreement) {
            alert('Необходимо согласие с условиями бронирования');
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
                client_phone: phone,
                client_email: email,
                client_messenger_type: messengerType,
                client_messenger_contact: messengerContact
            };
            
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });
            
            if (!response.ok) throw new Error('Ошибка создания бронирования');
            
            const result = await response.json();
            booking.bookingId = result.id;
            
            this.clearClientData();
            
            // Обновляем только нужные поля из API, сохраняя полный объект boat
            if (window.AquaGid?.UnifiedScreens?.booking) {
                window.AquaGid.UnifiedScreens.booking.bookingId = result.id;
                window.AquaGid.UnifiedScreens.booking.total_price = result.total_price;
                window.AquaGid.UnifiedScreens.booking.prepayment_amount = result.prepayment_amount;
                window.AquaGid.UnifiedScreens.booking.id = result.id;
            }

            // window.AquaGid.UnifiedScreens.showSuccessScreen(); // Вызывается после оплаты с данными
            
            console.log('🔍 Пытаемся обновить номер бронирования:', result.id);
            console.log('🔍 window.currentSuccessScreen в момент попытки:', window.currentSuccessScreen);

            // Ждём появления SuccessScreen с проверкой каждые 100мс
            let attempts = 0;
            const waitForSuccessScreen = setInterval(() => {
                attempts++;
                console.log(`🔍 Попытка ${attempts}: currentSuccessScreen =`, window.currentSuccessScreen);
                
                if (window.currentSuccessScreen) {
                    console.log('✅ Нашли SuccessScreen, обновляем номер:', result.id);
                    window.currentSuccessScreen.updateBookingNumber(result.id);
                    clearInterval(waitForSuccessScreen);
                }
                
                if (attempts >= 20) {
                    console.error('❌ Не удалось найти SuccessScreen после 20 попыток');
                    clearInterval(waitForSuccessScreen);
                }
            }, 100);
            
        } catch (error) {
            console.error('❌ Ошибка:', error);
            alert('Произошла ошибка при бронировании. Попробуйте ещё раз.');
            
            const payButton = document.querySelector('.payment-button, .btn-pay, [id*="pay"]');
            if (payButton) {
                payButton.disabled = false;
                payButton.textContent = '💳 Оплатить предоплату';
            }
        }
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
        
        const agreementCheck = document.getElementById('agreement-check');
        if (agreementCheck) agreementCheck.checked = false;
        
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