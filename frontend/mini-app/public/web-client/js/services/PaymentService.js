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
            const bookingId = bookingData.bookingId || (window.AquaGid?.UnifiedScreens?.booking?.bookingId);
            const isBeta = window.location.hostname.includes('beta');
            
            // На бете — имитация платежа
            if (isBeta) {
                const dummyResult = await this.gateway.processPayment(amount, clientData, bookingData);
                console.log('🧪 Тестовый платёж:', dummyResult);
                
                // Дёргаем вебхук для подтверждения
                try {
                    await fetch(`/api/test/webhook/tbank?order_id=${bookingId}`, { method: 'POST' });
                } catch(e) {}
                
                return { success: true, bookingId, paymentId: dummyResult.paymentId };
            }
            
            // Продакшен — реальный платёж
            const response = await fetch('/api/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking_id: bookingId,
                    amount: amount,
                    description: `Бронирование #${bookingId}`,
                    client_name: clientData.name || '',
                    client_phone: clientData.phone || '',
                    client_email: clientData.email || ''
                })
            });

            const paymentResult = await response.json();

            if (!paymentResult.success) {
                return { success: false, error: paymentResult.error };
            }

            if (paymentResult.payment_url) {
                window.open(paymentResult.payment_url, '_blank');
                return { success: true, bookingId, paymentId: paymentResult.payment_id, redirect: true };
            }

            return { success: true, bookingId, paymentId: paymentResult.payment_id };
            
        } catch (error) {
            console.error('❌ [PaymentService] Критическая ошибка:', error);
            return { success: false, error: error.message };
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