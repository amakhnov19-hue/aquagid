/**
 * PricingService — единый сервис расчёта цен.
 * Все расчёты выполняются на бэкенде через price_calculator.py.
 * Фронтенд только получает готовые суммы из API.
 */
class PricingService {
    /**
     * Получить суммы бронирования (из API, не считает сам).
     * @param {Object} booking - объект бронирования из API (содержит total_price и prepayment_amount)
     * @returns {{ totalPrice: number, prepaymentAmount: number }}
     */
    static getFromBooking(booking) {
        return {
            totalPrice: booking?.total_price || 0,
            prepaymentAmount: booking?.prepayment_amount || 0
        };
    }
}

if (typeof window !== 'undefined') {
    window.PricingService = PricingService;
}