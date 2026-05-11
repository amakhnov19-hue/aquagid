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
        // Загружается из API (global_settings)
        _loaded: false,
        work_start: '09:00',
        work_end: '24:00',
        slot_step_minutes: 30,
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
    const [startH, startM] = (this.TIME.work_start || '09:00').split(':').map(Number);
    const [endH, endM] = (this.TIME.work_end || '24:00').split(':').map(Number);
    const step = this.TIME.slot_step_minutes || 30;
    
    // Последний рейс = конец работы - 1 час - 30 минут уборки
    const lastStartMinutes = endH * 60 + endM - 60 - 30;
    const lastStartH = Math.floor(lastStartMinutes / 60);
    const lastStartM = lastStartMinutes % 60;
    
    const slots = [];
    let currentMinutes = startH * 60 + startM;
    const endMinutes = lastStartH * 60 + lastStartM;
    
    while (currentMinutes <= endMinutes) {
        const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
        const m = (currentMinutes % 60).toString().padStart(2, '0');
        slots.push(`${h}:${m}`);
        currentMinutes += step;
    }
    return slots;
};

APP_CONSTANTS.loadFromAPI = async function() {
    try {
        const resp = await fetch('/api/admin/global-settings/public');
        if (resp.ok) {
            const settings = await resp.json();
            if (settings.work_start) this.TIME.work_start = settings.work_start;
            if (settings.work_end) this.TIME.work_end = settings.work_end;
            if (settings.slot_step_minutes) this.TIME.slot_step_minutes = settings.slot_step_minutes;
            this.TIME._loaded = true;
            console.log('✅ Константы загружены из API:', this.TIME);
        }
    } catch (e) {
        console.warn('⚠️ Не удалось загрузить константы из API, используем defaults');
    }
};

/**
 * Форматировать длительность для отображения
 */
APP_CONSTANTS.formatDuration = function(hours) {
    return hours % 1 === 0 ? `${hours} ч` : `${hours} ч`;
};

// Загружаем настройки из API
APP_CONSTANTS.loadFromAPI();

window.APP_CONSTANTS = APP_CONSTANTS;

