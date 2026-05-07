/**
 * Абстрактный класс для платежных шлюзов
 */
class PaymentGateway {
    constructor(config = {}) {
        this.config = config;
        this.name = 'BaseGateway';
    }

    /**
     * Обработка платежа
     * @param {number} amount - сумма в рублях
     * @param {Object} clientData - данные клиента {name, phone, email}
     * @param {Object} bookingData - данные бронирования {boatId, date, time, duration}
     * @returns {Promise<Object>} результат платежа
     */
    async processPayment(amount, clientData, bookingData) {
        throw new Error('Метод processPayment должен быть переопределен');
    }

    /**
     * Проверка статуса платежа
     * @param {string} paymentId - идентификатор платежа
     * @returns {Promise<Object>} статус платежа
     */
    async checkPaymentStatus(paymentId) {
        throw new Error('Метод checkPaymentStatus должен быть переопределен');
    }

    /**
     * Получение доступных методов оплаты
     * @returns {Array} список методов оплаты
     */
    getPaymentMethods() {
        return ['card'];
    }

    /**
     * Название шлюза
     */
    getName() {
        return this.name;
    }
}

window.PaymentGateway = PaymentGateway;
