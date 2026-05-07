/**
 * MessengerService v1.0
 * Единый сервис для работы с мессенджерами (Telegram, Макс)
 */

const MessengerService = {
    // Конфигурация мессенджеров
    config: {
        telegram: {
            label: 'Telegram',
            icon: '✈️',
            color: '#0088cc',
            urlTemplate: 'tg://resolve?domain={contact}',
        },
        max: {
            label: 'Макс',
            icon: '💬',
            color: '#7B68EE',
            urlTemplate: 'https://max.ru/{contact}'
        }
    },

    /**
     * Получить ссылку для открытия чата
     * @param {string} type - 'telegram' или 'max'
     * @param {string} contact - username или номер
     * @returns {string|null}
     */
    getLink(type, contact) {
        if (!type || !contact) return null;
        const cfg = this.config[type];
        if (!cfg) return null;
        // Убираем @ для Telegram
        let cleanContact = contact;
        if (type === 'telegram') {
            cleanContact = contact.replace(/^@/, '');
        }
        return cfg.urlTemplate.replace('{contact}', cleanContact);
    },

    /**
     * Получить иконку мессенджера
     * @param {string} type
     * @returns {string}
     */
    getIcon(type) {
        return this.config[type]?.icon || '💬';
    },

    /**
     * Получить название мессенджера
     * @param {string} type
     * @returns {string}
     */
    getLabel(type) {
        return this.config[type]?.label || 'Мессенджер';
    },

    /**
     * Получить цвет кнопки
     * @param {string} type
     * @returns {string}
     */
    getColor(type) {
        return this.config[type]?.color || '#333';
    },

    /**
     * Получить HTML-кнопку для связи
     * @param {string} type
     * @param {string} contact
     * @param {string} cssClass - дополнительный CSS класс
     * @returns {string}
     */
    getButtonHTML(type, contact, cssClass = '') {
        const link = this.getLink(type, contact);
        if (!link) return '';
        
        const icon = this.getIcon(type);
        const label = this.getLabel(type);
        const color = this.getColor(type);
        
        return `
            <a href="tg://resolve?domain=${contact.replace(/^@/, '')}" 
                target="_blank" 
                onclick="setTimeout(()=>{window.open('https://t.me/${contact.replace(/^@/, '')}','_blank')},1000)"
                rel="noopener noreferrer"
                class="messenger-btn ${cssClass}"
                style="background-color: ${color}; color: white; text-decoration: none; display: inline-block; padding: 10px 20px; border-radius: 8px; font-size: 16px; font-family: sans-serif; text-align: center;">
                    ${icon} Написать в ${label}
            </a>
        `;
    },

    /**
     * Проверить, поддерживается ли мессенджер
     * @param {string} type
     * @returns {boolean}
     */
    isSupported(type) {
        return type in this.config;
    }
};

// Глобальная ссылка
window.MessengerService = MessengerService;

// Экспорт для модульной системы (если используется)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessengerService;
}
