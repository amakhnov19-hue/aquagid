/**
 * Экран успешного бронирования
 */
class SuccessScreen extends ScreenBase {
    constructor(mainApp) {
        super(mainApp);
    }

    /**
     * Показывает экран успеха
     */
    show(options = {}) {
        console.log('🎉 SuccessScreen.show START');
        console.log('options:', options);
        console.log('fromMyBookings:', options.fromMyBookings);
        
        if (!this.container) return;
        const fromMyBookings = options.fromMyBookings || false;
        const booking = options.booking || window.AquaGid.UnifiedScreens.booking;
        const boat = booking.boat;
        
        // Берём готовые суммы из БД (если их нет — используем старый расчёт как fallback)
        const totalPrice = booking.total_price || (parseFloat(boat.price_per_hour) * (booking.duration_minutes / 60));
        const prepaymentAmount = booking.prepayment_amount || 0;
        const remainingAmount = totalPrice - prepaymentAmount;

        // Форматируем дату
        const bookingDate = new Date(booking.booking_date);
        const bookingTime = booking.start_time?.slice(0, 5) || '';
        const formattedDate = bookingDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long'
        });
        
        // Данные судовладельца из катера
        const managerName = boat.manager_name || '';
        const managerCompany = boat.manager_company || '';
        const managerPhone = boat.manager_phone || '';
        const managerMessengers = boat.manager_messengers || {};
        const ownerDisplay = managerCompany || managerName || 'судовладелец';
        
        // Крестик только если открыто из Моих бронирований
        const closeButton = fromMyBookings ? `
            <div class="success-header">
                <button class="close-btn" onclick="window.AquaGid.UnifiedScreens.hideSuccessScreen()">✕</button>
            </div>
        ` : '';
        
        const html = `
            <div class="screen success-screen">
                <div class="success-card">
                    ${closeButton}
                    
                    <!-- Заголовок -->
                    <div class="success-icon">🌅</div>
                    <h2 class="success-title">Всё готово!</h2>
                    
                    <!-- Номер бронирования -->
                    <div class="booking-number-box">
                        <span class="booking-label">Твой номер бронирования:</span>
                        <span class="booking-number">${booking.bookingId || booking.id || 'загружается...'}</span>
                    </div>
                    
                    <!-- Информация -->
                    <div class="booking-info">
                        <p><strong>${booking.client_name || 'Дорогой клиент'}</strong>, ждём тебя</p>
                        <p>📅 ${formattedDate} в ${bookingTime}</p>
                        <p>🚤 Катер <strong>${escapeHtml(boat.name)}</strong></p>
                        <p>📍 ${boat.boarding_address || 'адрес уточняется'}</p>
                    </div>
                    
                    <!-- Оплата -->
                    <div class="payment-summary">
                        <div>💳 Предоплата: <strong>${prepaymentAmount.toLocaleString()} ₽</strong></div>
                        <div>💰 Остаток: <strong>${remainingAmount.toLocaleString()} ₽</strong> — капитану на месте</div>
                    </div>
                    
                    <!-- Контакты судовладельца -->
                    <div class="owner-contact">
                        <div class="owner-title">🚢 Судовладелец</div>
                        ${managerCompany ? `<div class="owner-company">${managerCompany}</div>` : ''}
                        ${managerName ? `<div class="owner-name">👤 ${managerName}</div>` : ''}
                        ${managerPhone ? `<div class="owner-phone" style="cursor: pointer;" onclick="window.location.href='tel:${managerPhone}'">📞 ${managerPhone}</div>` : ''}
                        ${Object.keys(managerMessengers).length > 0 ? `
                        <div class="owner-messengers">
                            <div class="owner-note">Написать судовладельцу:</div>
                            <div class="messenger-container">
                                ${Object.entries(managerMessengers).map(([type, contact]) => 
                                    window.MessengerService.getButtonHTML(type, contact, '')
                                ).join('')}
                            </div>
                        </div>
                        ` : ''}
                        <div class="owner-note">По всем вопросам обращайтесь к судовладельцу</div>
                    </div>
                    
                    <!-- Кнопки -->
                    <button class="btn-route" onclick="window.AquaGid.UnifiedScreens.navigateToPier()">
                        🗺️ Маршрут до причала
                    </button>
                    
                    <button class="btn-home" onclick="window.AquaGid.UnifiedScreens.showWelcomeScreen()">
                        🏠 На главную
                    </button>
                    
                    <div class="team-signature">
                        🌊 Команда АкваГид СПб
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        window.currentSuccessScreen = this;

        // Показать чек-лист тестирования (только для новых броней, не из истории)
        if (!fromMyBookings && booking.bookingId && window.TestChecklist) {
            setTimeout(() => window.TestChecklist.show(booking.bookingId), 800);
        }
        
        console.log('🎉 SuccessScreen.show END');
    }
    
    /**
     * Обновить номер бронирования
     */
    updateBookingNumber(bookingId) {
        const bookingSpan = document.querySelector('.booking-number');
        if (bookingSpan) {
            bookingSpan.textContent = bookingId;
        }
    }
}

window.SuccessScreen = SuccessScreen;