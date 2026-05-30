/**
 * UI компонент для отображения платежных блоков
 * Использует единый PaymentService
 */
class PaymentUI {
    constructor() {
        this.paymentService = null;
        this.currentPaymentId = null;
    }
    
    /**
     * Инициализация с PaymentService
     */
    init(paymentService) {
        this.paymentService = paymentService;
        console.log('✅ PaymentUI инициализирован с PaymentService');
    }
    
    /**
     * Отрендерить блок оплаты
     * @param {number} amount - сумма к оплате
     * @param {Object} callbacks - колбэки {onSuccess, onError, onStart}
     * @returns {string} HTML блок
     */
    renderPaymentBlock(amount, callbacks = {}) {
        const gatewayName = this.paymentService?.getGatewayName() || 'DummyGateway';
        
        return `
            <div class="payment-block" data-gateway="${gatewayName}">
                <div class="payment-header">
                    <h3>💳 Для подтверждения бронирования</h3>
                </div>
                
                <div class="payment-amount">
                    <span class="amount-label">Сумма предоплаты:</span>
                    <span class="amount-value">${amount.toLocaleString()} ₽</span>
                </div>
                
                <div class="payment-methods">
                    <span class="payment-method">💳 Банковская карта</span>
                </div>
                
                <div class="payment-note">
                    <p>🔒 Безопасная оплата</p>
                    <p class="small">Данные карты вводятся на защищённой странице банка</p>
                </div>
                
                <button class="payment-button" onclick="window.paymentUI.processPayment(${amount}, this)">
                    Оплатить ${amount.toLocaleString()} ₽
                </button>
                
                <div class="payment-status" style="display: none;"></div>
            </div>
        `;
    }
    
    /**
     * Обработка платежа
     */
    async processPayment(amount, buttonElement) {
        if (!this.paymentService) {
            this.showError('Платежный сервис не инициализирован');
            return;
        }
        
        // Блокируем кнопку
        const originalText = buttonElement.textContent;
        buttonElement.disabled = true;
        buttonElement.textContent = '⏳ Обработка...';
        
        // Показываем статус
        this.showStatus('Подготовка платежа...', 'info');
        
        try {
            // Получаем данные из формы и бронирования
            const clientData = this.getClientData();
            const bookingData = this.getBookingData();
            
            if (!bookingData.boatId) {
                throw new Error('Не найдены данные бронирования');
            }
            
            this.showStatus('Обработка платежа...', 'info');
            
            // Вызываем PaymentService (он объединяет оплату + создание бронирования)
            const result = await this.paymentService.processPayment(amount, bookingData, clientData);
            
            if (result.success) {
                this.currentPaymentId = result.paymentId;
                
                // Если платёж перенаправлен на внешнюю страницу — ждём возврата
                if (result.redirect) {
                    this.showStatus('⏳ Ожидание оплаты на внешней странице...', 'info');
                    return;
                }
                
                this.showStatus('✅ Платёж успешно выполнен!', 'success');
                
                console.log('💰 [PaymentUI] Успешный платёж, bookingId:', result.bookingId);
                
                // Сохраняем данные оплаты
                this.savePaymentData(result);

                console.log('result.bookingData:', result.bookingData)
                console.log('result.bookingData.prepayment_amount:', result.bookingData?.prepayment_amount)
                
                // Обновляем только нужные поля, сохраняя полный объект boat
                if (result.bookingData && window.AquaGid?.UnifiedScreens) {
                    const b = window.AquaGid.UnifiedScreens.booking;
                    if (b) {
                        b.id = result.bookingData.id;
                        b.total_price = result.bookingData.total_price;
                        b.prepayment_amount = result.bookingData.prepayment_amount;
                        b.created_at = result.bookingData.created_at;
                        b.booking_date = result.bookingData.booking_date;
                        b.start_time = result.bookingData.start_time;
                        b.duration_minutes = result.bookingData.duration_minutes;
                        b.status = result.bookingData.status;
                    }
                }
                console.log('📦 booking before show:', window.AquaGid?.UnifiedScreens?.booking);
                // Переходим на экран успеха
                setTimeout(() => {
                    if (window.AquaGid?.UnifiedScreens?.showSuccessScreen) {
                        window.AquaGid.UnifiedScreens.showSuccessScreen();
                    }
                }, 500);
                
            } else {
                this.showError(result.error || 'Ошибка оплаты');
            }
        } catch (error) {
            console.error('❌ Ошибка платежа:', error);
            this.showError(error.message || 'Ошибка соединения с платежной системой');
        } finally {
            buttonElement.disabled = false;
            buttonElement.textContent = originalText;
        }
    }
    
    /**
     * Получить данные клиента из формы
     */
    getClientData() {
        return {
            name: document.getElementById('client-name')?.value?.trim() || '',
            phone: document.getElementById('client-phone')?.value?.trim() || '',
            email: document.getElementById('client-email')?.value?.trim() || '',
            telegram: document.getElementById('client-telegram')?.value?.trim() || '',
            messengerType: document.getElementById('client-messenger-type')?.value || '',
            messengerContact: document.getElementById('client-messenger-contact')?.value?.trim() || ''
        };
    }
    
    /**
     * Получить данные бронирования
     */
    getBookingData() {
        const booking = window.AquaGid?.UnifiedScreens?.booking;
        const boat = booking?.boat;
        
        return {
            boatId: boat?.id,
            boatName: boat?.name,
            date: booking?.date,
            time: booking?.time,
            duration: booking?.duration,
            totalPrice: booking?.totalPrice || 0,
            prepaymentAmount: booking?.prepaymentAmount || booking?.prepayment_amount || 0
        };
    }
    
    /**
     * Показать статус
     */
    showStatus(message, type = 'info') {
        const statusDiv = document.querySelector('.payment-status');
        if (statusDiv) {
            const colors = {
                info: '#2196F3',
                success: '#4CAF50',
                error: '#F44336'
            };
            statusDiv.style.display = 'block';
            statusDiv.style.backgroundColor = colors[type] + '20';
            statusDiv.style.color = colors[type];
            statusDiv.style.padding = '10px';
            statusDiv.style.borderRadius = '6px';
            statusDiv.style.marginTop = '10px';
            statusDiv.style.textAlign = 'center';
            statusDiv.textContent = message;
        }
    }
    
    /**
     * Показать ошибку
     */
    showError(message) {
        this.showStatus('❌ ' + message, 'error');
    }
    
    /**
     * Сохранить данные оплаты
     */
    savePaymentData(paymentResult) {
        const booking = window.AquaGid?.UnifiedScreens?.booking;
        if (booking) {
            booking.payment = {
                id: paymentResult.paymentId,
                bookingId: paymentResult.bookingId,
                amount: paymentResult.amount,
                timestamp: new Date().toISOString(),
                gateway: this.paymentService?.getGatewayName()
            };
        }
        
        localStorage.setItem('lastPayment', JSON.stringify({
            bookingId: paymentResult.bookingId,
            paymentId: paymentResult.paymentId,
            timestamp: new Date().toISOString()
        }));
    }
}

window.PaymentUI = PaymentUI;