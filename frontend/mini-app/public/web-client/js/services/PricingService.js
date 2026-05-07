/**
 * PricingService — единый сервис расчёта цен и предоплаты.
 * Все компоненты используют только его.
 */
class PricingService {
    /**
     * Рассчитать стоимость бронирования.
     * @param {Object} boat - объект катера из API
     * @param {number} durationMinutes - длительность в минутах
     * @returns {{ totalPrice: number, prepaymentAmount: number, pricePerHour: number }}
     */
    static calculate(boat, durationMinutes) {
        const durationHours = (durationMinutes || 0) / 60;
        if (!boat || !durationHours) return { totalPrice: 0, prepaymentAmount: 0, pricePerHour: 0 };
        
        let pricePerHour, totalPrice, prepaymentAmount;
        
        if (boat.pricing_method === 'margin' && boat.open_price && boat.agent_price) {
            pricePerHour = boat.open_price;
            totalPrice = pricePerHour * durationHours;
            prepaymentAmount = Math.round((boat.open_price - boat.agent_price) * durationHours);
        } else {
            pricePerHour = boat.price_per_hour || 0;
            totalPrice = pricePerHour * durationHours;
            const percent = boat.prepayment_percent || 20;
            prepaymentAmount = Math.round(totalPrice * percent / 100);
        }
        
        return { totalPrice, prepaymentAmount, pricePerHour };
    }
}

if (typeof window !== 'undefined') {
    window.PricingService = PricingService;
}

