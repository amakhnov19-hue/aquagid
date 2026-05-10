"""
Единый калькулятор цен AquaGid.
Вся логика расчёта — здесь. При изменении метода — меняется только этот файл.
"""

def calculate(price_per_hour: float, hours: float, prepayment_percent: int) -> dict:
    """
    Возвращает словарь с рассчитанными суммами.
    
    Args:
        price_per_hour: цена за час (устанавливает менеджер)
        hours: длительность в часах
        prepayment_percent: процент предоплаты (устанавливает админ, по умолчанию 15)
    
    Returns:
        {
            "total_price": полная стоимость,
            "prepayment_amount": сумма предоплаты,
            "prepayment_percent": процент предоплаты
        }
    """
    if prepayment_percent < 0 or prepayment_percent > 100:
        raise ValueError("Процент предоплаты должен быть от 0 до 100")
    
    total_price = price_per_hour * hours
    prepayment_amount = total_price * prepayment_percent / 100
    
    return {
        "total_price": round(total_price, 2),
        "prepayment_amount": round(prepayment_amount, 2),
        "prepayment_percent": prepayment_percent
    }
