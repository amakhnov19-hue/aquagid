/**
 * PaymentService — единый сервис для работы с платежами.
 * Только обрабатывает платёж, НЕ создаёт бронирование.
 * Бронирование уже создано бэкендом до оплаты (статус pending).
 */
class PaymentService {
    constructor() {
        this.gateway = new DummyGateway({
            successRate: 100,
            delay: 1500
        });
        
        this.currentPaymentId = null;
    }
    
    /**
     * Обработка платежа
     * @param {number} amount - сумма предоплаты
     * @param {Object} bookingData - данные бронирования (уже созданного)
     * @param {Object} clientData - данные клиента
     * @returns {Promise<Object>} - результат {success, bookingId, paymentId}
     */
    async processPayment(amount, bookingData, clientData) {
        console.log('💳 [PaymentService] Начало обработки платежа', { amount, bookingData, clientData });
        
        try {
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
            
            // Бронь уже создана как pending, меняем статус на active
            const bookingId = bookingData.bookingId || (window.AquaGid?.UnifiedScreens?.booking?.bookingId);
            if (bookingId) {
                try {
                    await fetch(`/api/bookings/${bookingId}/confirm-payment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'active' })
                    });
                    console.log('✅ Статус брони изменён на active:', bookingId);
                } catch (e) {
                    console.error('❌ Ошибка смены статуса:', e);
                }
            }
            
            return {
                success: true,
                bookingId: bookingId,
                paymentId: paymentResult.paymentId,
                amount: amount,
                transactionId: paymentResult.transactionId
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
     * Получить название платёжного шлюза
     */
    getGatewayName() {
        return this.gateway?.constructor?.name || 'DummyGateway';
    }
}

if (typeof window !== 'undefined') {
    window.PaymentService = PaymentService;
}