/**
 * НЕЗЫБЛЕМЫЕ КОНСТАНТЫ ПРИЛОЖЕНИЯ
 * Версия: 1.2
 * Дата: 2026-03-14
 * 
 * ⚠️ Только технические константы!
 * Бизнес-логика (сезоны, цены и т.д.) - в админке и БД
 */

console.log('✅ Constants.js загружен, версия 1.2');

const APP_CONSTANTS = {
    // ========== ВРЕМЯ РАБОТЫ ==========
    // Эти параметры могут быть разными для разных городов/причалов,
    // но пока оставим как технические константы
    TIME: {
        WORK_START_HOUR: 11,        // С 11:00 можно начинать рейсы
        WORK_END_HOUR: 23,          // До 23:00 катер может быть в работе
        WORK_END_MINUTE: 30,         // 23:30 - время окончания работы
        
        LAST_START_HOUR: 22,         // Последний рейс можно начать в 22:00
        LAST_START_MINUTE: 0,         // ровно в 22:00 (не 22:30)
        
        SLOT_STEP_MINUTES: 30,        // Интервал между рейсами 30 минут
    },

    // ========== ПРОДОЛЖИТЕЛЬНОСТЬ ==========
    DURATION: {
        POPULAR: [1, 1.5, 2, 2.5, 3, 5],  // Самые популярные варианты
        MIN_HOURS: 1,                       // Минимум 1 час
        MAX_HOURS: 8,                       // Максимум 8 часов
        CUSTOM_STEP_MINUTES: 30,             // Шаг для своей длительности
    },

    // ========== КАТЕРА ==========
    BOATS: {
        // Фотографии
        MAX_PHOTOS_PER_BOAT: 5,                 // Судовладелец может загрузить 5 фото
        GALLERY_PHOTOS_COUNT: 5,                 // В галерее показываем все 5
        
        // Приоритет загрузки (для производительности)
        PREVIEW_PHOTOS_COUNT: 3,                  // В карточке показываем 3 фото
        IMAGE_LOAD_PRIORITY: {
            FIRST_SCREEN: 3,                       // Первые 3 катера грузятся сразу
            DELAY_MS: 500                           // Остальные - через 0.5 секунды
        }
    },

    // ========== ПЛАТЕЖИ ==========
    PAYMENT: {
        TEST_MODE: true,                           // Пока тестируем
        CURRENCY: 'RUB',                           // Рубли
        CURRENCY_SYMBOL: '₽',                      // Значок рубля
        TEST_PAYMENT_DELAY: 1500,                  // Имитация оплаты
        PREPAYMENT_PERCENT: 20,                    // 20% предоплата по умолчанию
    },

    // ========== НАПОМИНАНИЯ ==========
    REMINDERS: {
        ENABLED: true,                              // Включить напоминания
        METHODS: ['sms', 'telegram'],                // Способы: смс и телеграм
        TIMES: [3, 1, 0],                            // За 3 дня, за 1 день, в день рейса
        MESSAGES: {
            '3': 'Через 3 дня у вас запланирована прогулка на катере',
            '1': 'Завтра вас ждет прогулка!',
            '0': 'Сегодня ваш рейс! Приятного отдыха 🌊'
        }
    },

    // ========== ИНТЕРФЕЙС ==========
    UI: {
        ANIMATION_DURATION: 300,                    // Анимации 0.3 сек
        LOADING_DELAY: 100,                          // Задержка перед показом загрузки
        TOAST_DURATION: 3000,                        // Уведомления на 3 сек
        PHONE_FORMAT: '+7 (___) ___-__-__',          // Формат телефона
    }
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

/**
 * Получить все доступные слоты времени
 */
APP_CONSTANTS.getTimeSlots = function() {
    const slots = [];
    const { WORK_START_HOUR, LAST_START_HOUR } = this.TIME;
    
    for (let hour = WORK_START_HOUR; hour <= LAST_START_HOUR; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < LAST_START_HOUR) {
            slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
    }
    return slots;
};

/**
 * Форматировать длительность для отображения
 */
APP_CONSTANTS.formatDuration = function(hours) {
    return hours % 1 === 0 ? `${hours} ч` : `${hours} ч`;
};

// Защита от изменений
Object.freeze(APP_CONSTANTS);
window.APP_CONSTANTS = APP_CONSTANTS;

