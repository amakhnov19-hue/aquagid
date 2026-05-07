/**
 * AquaGid Event Bus - Единая система событий для всего приложения
 * Используется в: manager-panel, admin-panel, client
 * Версия: 1.0.0
 */

(function(global) {
    'use strict';
    
    class EventBus {
        constructor() {
            this.events = {};
            this.debug = true; // В production поставить false
        }
        
        /**
         * Подписаться на событие
         * @param {string} event - Название события (например 'calendar:updated')
         * @param {function} callback - Функция-обработчик
         * @param {object} context - Контекст вызова (обычно this компонента)
         */
        on(event, callback, context = null) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            
            const handler = {
                callback,
                context,
                id: Date.now() + Math.random()
            };
            
            this.events[event].push(handler);
            
            if (this.debug) {
                console.log(`📡 [EventBus] Подписка на "${event}"`, 
                    context?.constructor?.name || 'global');
            }
            
            return handler.id; // Возвращаем ID для возможности отписки
        }
        
        /**
         * Отписаться от события
         * @param {string} event - Название события
         * @param {number} handlerId - ID обработчика (возвращается из on)
         */
        off(event, handlerId) {
            if (!this.events[event]) return;
            
            this.events[event] = this.events[event].filter(h => h.id !== handlerId);
            
            if (this.debug) {
                console.log(`📡 [EventBus] Отписка от "${event}"`, handlerId);
            }
        }
        
        /**
         * Отправить событие
         * @param {string} event - Название события
         * @param {any} data - Данные события
         */
        emit(event, data = null) {
            if (!this.events[event]) {
                if (this.debug) {
                    console.warn(`📡 [EventBus] Нет подписчиков на "${event}"`);
                }
                return;
            }
            
            if (this.debug) {
                console.log(`📡 [EventBus] Отправка "${event}"`, data);
            }
            
            // Копируем массив, чтобы избежать проблем при удалении во время итерации
            const handlers = [...this.events[event]];
            
            handlers.forEach(handler => {
                try {
                    if (handler.context) {
                        handler.callback.call(handler.context, data);
                    } else {
                        handler.callback(data);
                    }
                } catch (error) {
                    console.error(`❌ [EventBus] Ошибка в обработчике "${event}":`, error);
                }
            });
        }
        
        /**
         * Подписаться на событие один раз
         */
        once(event, callback, context = null) {
            const handlerId = this.on(event, (data) => {
                callback.call(context, data);
                this.off(event, handlerId);
            }, context);
            
            return handlerId;
        }
        
        /**
         * Очистить все подписки (использовать осторожно!)
         */
        clear(event = null) {
            if (event) {
                delete this.events[event];
                if (this.debug) {
                    console.log(`📡 [EventBus] Очищены подписки на "${event}"`);
                }
            } else {
                this.events = {};
                if (this.debug) {
                    console.log(`📡 [EventBus] Очищены ВСЕ подписки`);
                }
            }
        }
        
        /**
         * Включить/выключить отладку
         */
        setDebug(enabled) {
            this.debug = enabled;
        }
        
        /**
         * Получить список активных событий
         */
        getActiveEvents() {
            return Object.keys(this.events).map(event => ({
                event,
                listeners: this.events[event].length
            }));
        }
    }
    
    // Создаём глобальный экземпляр
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.events = new EventBus();
    
    // Экспортируем для использования в модулях
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = global.AquaGid.events;
    }
    
})(typeof window !== 'undefined' ? window : global);
