/**
 * Конфигурация платежной системы
 */
const PaymentConfig = {
    // Какой шлюз использовать
    activeGateway: 'dummy', // 'dummy', 'bank', 'crypto'
    
    // Настройки шлюзов
    gateways: {
        dummy: {
            class: 'DummyGateway',
            config: {
                successRate: 100, // 100% успешных платежей
                delay: 1500 // задержка 1.5 сек
            }
        },
        bank: {
            class: 'BankAPIGateway',
            config: {
                apiUrl: 'https://api.bank.ru/payments',
                merchantId: 'your_merchant_id',
                secretKey: 'your_secret_key'
            }
        }
    },
    
    // Способы оплаты по умолчанию
    defaultMethods: ['card'],
    
    // Валюта
    currency: 'RUB'
};

// Инициализация платежного шлюза
function initPaymentGateway() {
    const config = PaymentConfig.gateways[PaymentConfig.activeGateway];
    
    if (!config) {
        console.error('❌ Платежный шлюз не настроен');
        return null;
    }
    
    let gateway = null;
    
    switch (PaymentConfig.activeGateway) {
        case 'dummy':
            gateway = new DummyGateway(config.config);
            break;
        // case 'bank':
        //     gateway = new BankAPIGateway(config.config);
        //     break;
        default:
            gateway = new DummyGateway(config.config);
    }
    
    window.paymentUI = new PaymentUI(gateway);
    console.log(`✅ Платежный шлюз инициализирован: ${gateway.getName()}`);
    
    return gateway;
}

// Делаем глобальным
window.PaymentConfig = PaymentConfig;
window.initPaymentGateway = initPaymentGateway;

