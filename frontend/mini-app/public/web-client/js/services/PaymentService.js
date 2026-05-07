/**
 * Единый сервис для работы с платежами
 * Абстрагирует конкретный платёжный шлюз
 */
class PaymentService {
    constructor() {
        // ТЕСТОВЫЙ РЕЖИМ: используем DummyGateway
        // Для перехода на реальный шлюз (Т-Банк, Сбер и т.д.):
        // 1. Создать класс RealGateway extends PaymentGateway
        // 2. Заменить строку ниже на new RealGateway(config)
        this.gateway = new DummyGateway({
            successRate: 100,
            delay: 1500
        });
        
        this.currentPaymentId = null;
    }
    
    /**
     * Основной метод оплаты + создания бронирования
     * @param {number} amount - сумма предоплаты
     * @param {Object} bookingData - данные бронирования
     * @param {Object} clientData - данные клиента
     * @returns {Promise<Object>} - результат {success, bookingId, paymentId}
     */
    async processPayment(amount, bookingData, clientData) {
        console.log('💳 [PaymentService] Начало обработки платежа', { amount, bookingData, clientData });
        
        try {
            // ШАГ 1: Обработка платежа через шлюз
            const paymentResult = await this.gateway.processPayment(amount, clientData, bookingData);
            
            if (!paymentResult.success) {
                console.error('❌ [PaymentService] Платёж не удался:', paymentResult.error);
                return {
                    success: false,
                    error: paymentResult.error,
                    paymentId: null,
                    bookingId: null
                };
            }
            
            console.log('✅ [PaymentService] Платёж успешен:', paymentResult);
            this.currentPaymentId = paymentResult.paymentId;
            
            // ШАГ 2: Создаём бронирование на сервере (передаём статус из результата оплаты)
            const bookingResult = await this.createBooking(
                bookingData, 
                clientData, 
                paymentResult.paymentId,
                'active'  // <-- вместо 'confirmed'
            );
            
            if (!bookingResult.success) {
                console.error('❌ [PaymentService] Ошибка создания бронирования:', bookingResult.error);
                return {
                    success: false,
                    error: 'Бронирование не создано: ' + bookingResult.error,
                    paymentId: paymentResult.paymentId,
                    bookingId: null
                };
            }
            
            console.log('✅ [PaymentService] Бронирование создано:', bookingResult.bookingId);
            
            // ШАГ 3: Сохраняем данные в localStorage и глобальный объект
            if (window.AquaGid?.UnifiedScreens?.booking) {
                window.AquaGid.UnifiedScreens.booking.bookingId = bookingResult.bookingId;
                window.AquaGid.UnifiedScreens.booking.paymentId = paymentResult.paymentId;
            }
            
            return {
                success: true,
                bookingId: bookingResult.bookingId,
                paymentId: paymentResult.paymentId,
                amount: amount,
                transactionId: paymentResult.transactionId,
                bookingData: bookingResult.bookingData
            };
            
        } catch (error) {
            console.error('❌ [PaymentService] Критическая ошибка:', error);
            return {
                success: false,
                error: error.message || 'Неизвестная ошибка',
                paymentId: null,
                bookingId: null
            };
        }
    }
    
    /**
     * Создание бронирования на сервере
     */
    async createBooking(bookingData, clientData, paymentId) {
        try {
            const payload = {
                boat_id: bookingData.boatId,
                booking_date: bookingData.date,
                start_time: bookingData.time,
                duration_minutes: bookingData.duration * 60,
                client_name: clientData.name,
                client_phone: clientData.phone,
                client_email: clientData.email || '',
                client_telegram: clientData.telegram || '',
                client_messenger_type: clientData.messengerType || '',
                client_messenger_contact: clientData.messengerContact || '',
                payment_id: paymentId,
                prepayment_amount: bookingData.prepaymentAmount || 0,
                status: 'active'
            };
            
            console.log('📡 [PaymentService] Отправка запроса на создание бронирования:', payload);
            
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            
            return {
                success: true,
                bookingId: result.id,
                bookingData: result
            };
            
        } catch (error) {
            console.error('❌ [PaymentService] Ошибка создания бронирования:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Получить текущий платёжный шлюз
     */
    getGatewayName() {
        return this.gateway.getName ? this.gateway.getName() : 'Unknown';
    }
    
    /**
     * Проверить статус платежа (для будущих доработок)
     */
    async checkPaymentStatus(paymentId) {
        if (this.gateway.checkPaymentStatus) {
            return await this.gateway.checkPaymentStatus(paymentId);
        }
        return { success: false, error: 'Метод не поддерживается' };
    }
}

window.PaymentService = PaymentService;