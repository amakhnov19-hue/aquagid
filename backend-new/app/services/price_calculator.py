"""
Единый калькулятор цен AquaGid.
Вся логика расчёта — здесь. При изменении метода — меняется только этот файл.
"""

def calculate(price_per_hour: float, hours: float, prepayment_percent: int, referral_discount_percent: int = 0) -> dict:
    """
    Возвращает словарь с рассчитанными суммами.
    
    Args:
        price_per_hour: цена за час (устанавливает менеджер)
        hours: длительность в часах
        prepayment_percent: процент предоплаты (устанавливает админ, по умолчанию 15)
        referral_discount_percent: скидка на комиссию по реферальной программе (0 = нет скидки)
    
    Returns:
        {
            "total_price": полная стоимость,
            "prepayment_amount": сумма предоплаты,
            "prepayment_percent": процент предоплаты,
            "referral_discount_percent": применённая реферальная скидка,
            "referral_discount_amount": сумма реферальной скидки
        }
    """
    if prepayment_percent < 0 or prepayment_percent > 100:
        raise ValueError("Процент предоплаты должен быть от 0 до 100")
    if referral_discount_percent < 0 or referral_discount_percent > 100:
        raise ValueError("Процент реферальной скидки должен быть от 0 до 100")
    
    total_price = price_per_hour * hours
    prepayment_amount = total_price * prepayment_percent / 100
    
    # Реферальная скидка — процент от предоплаты
    referral_discount_amount = prepayment_amount * referral_discount_percent / 100
    final_prepayment = prepayment_amount - referral_discount_amount
    
    return {
        "total_price": round(total_price, 2),
        "prepayment_amount": round(final_prepayment, 2),
        "prepayment_percent": prepayment_percent,
        "referral_discount_percent": referral_discount_percent,
        "referral_discount_amount": round(referral_discount_amount, 2)
    }