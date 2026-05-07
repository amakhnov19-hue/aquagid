/**
 * Тестовый платежный шлюз (заглушка для разработки)
 */
class DummyGateway extends PaymentGateway {
    constructor(config = {}) {
        super(config);
        this.name = 'DummyGateway';
        this.successRate = config.successRate || 100; // % успешных платежей
        this.delay = config.delay || 1500; // имитация задержки
    }

    async processPayment(amount, clientData, bookingData) {
        console.log('🧪 DummyGateway.processPayment', { amount, clientData, bookingData });
        
        // Имитация задержки сети
        await new Promise(resolve => setTimeout(resolve, this.delay));
        
        // Имитация случайной ошибки (если successRate < 100)
        const random = Math.random() * 100;
        if (random > this.successRate) {
            return {
                success: false,
                error: 'Ошибка оплаты (тестовая ошибка)',
                paymentId: null
            };
        }
        
        return {
            success: true,
            paymentId: 'dummy_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            transactionId: 'TRX' + Math.floor(Math.random() * 1000000),
            amount: amount,
            message: 'Оплата прошла успешно (тестовый режим)',
            timestamp: new Date().toISOString()
        };
    }

    async checkPaymentStatus(paymentId) {
        console.log('🧪 DummyGateway.checkPaymentStatus', paymentId);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
            success: true,
            paymentId: paymentId,
            status: 'completed',
            message: 'Платеж подтвержден'
        };
    }

    getPaymentMethods() {
        return ['card', 'test'];
    }
}

window.DummyGateway = DummyGateway;
