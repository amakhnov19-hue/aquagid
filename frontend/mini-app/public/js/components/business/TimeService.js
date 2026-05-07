// /frontend/mini-app/public/js/components/business/TimeService.js
// Версия: 1.0.0
// Назначение: Все расчеты времени для бронирования

(function(global) {
    'use strict';
    
    const VERSION = '20260224_01';
    
    class TimeService {
        constructor() {
            this.version = VERSION;
            
            // Константы
            this.WORK_START = 11; // 11:00
            this.WORK_END = 22;   // 22:00 (последний рейс)
            this.TRAVEL_TIME = 20; // минут пешком до причала
            this.BREAK_TIME = 30;  // минут между рейсами
            this.SLOT_MINUTES = 30; // шаг слотов
        }
        
        /**
         * Рассчитать ближайшие доступные слоты для клиента
         * @param {Date} currentTime - текущее время
         * @returns {Object} - объект с массивами слотов
         */
        calculateNearestSlots(currentTime = new Date()) {
            // Время прибытия = текущее + дорога
            const arrivalTime = new Date(currentTime);
            arrivalTime.setMinutes(currentTime.getMinutes() + this.TRAVEL_TIME);
            
            // Генерируем все слоты на сегодня
            const allSlots = this.generateTimeSlots();
            
            // Конвертируем в минуты для сравнения
            const arrivalMinutes = arrivalTime.getHours() * 60 + arrivalTime.getMinutes();
            
            // Находим будущие слоты
            const futureSlots = allSlots.filter(slot => {
                const [hours, minutes] = slot.split(':').map(Number);
                const slotMinutes = hours * 60 + minutes;
                return slotMinutes >= arrivalMinutes;
            });
            
            if (futureSlots.length === 0) {
                // Если сегодня нет слотов, берем завтра с 11:00
                return {
                    primary: '11:00',
                    secondary: '11:30',
                    isNextDay: true
                };
            }
            
            // Ближайший слот
            const nearestSlot = futureSlots[0];
            const [nearestHours, nearestMinutes] = nearestSlot.split(':').map(Number);
            const nearestMinutesTotal = nearestHours * 60 + nearestMinutes;
            
            // Разница во времени
            const diffMinutes = nearestMinutesTotal - arrivalMinutes;
            
            // Применяем правило 10 минут
            if (diffMinutes <= 10 && futureSlots.length > 1) {
                // Предлагаем этот и следующий
                return {
                    primary: nearestSlot,
                    secondary: futureSlots[1],
                    hasChoice: true,
                    diffMinutes
                };
            } else {
                // Только этот слот
                return {
                    primary: nearestSlot,
                    secondary: null,
                    hasChoice: false,
                    diffMinutes
                };
            }
        }
        
        /**
         * Сгенерировать все временные слоты на сегодня
         * @returns {Array} - массив строк вида "14:30"
         */
        generateTimeSlots() {
            const slots = [];
            
            for (let hour = this.WORK_START; hour <= this.WORK_END; hour++) {
                // Добавляем :00
                slots.push(`${hour.toString().padStart(2, '0')}:00`);
                
                // Добавляем :30, но не для последнего часа (22:30 нельзя)
                if (hour < this.WORK_END) {
                    slots.push(`${hour.toString().padStart(2, '0')}:30`);
                }
            }
            
            return slots;
        }
        
        /**
         * Проверить, доступно ли время с учетом рабочего дня и перерывов
         * @param {string} startTime - "14:30"
         * @param {number} durationHours - длительность в часах
         * @returns {boolean}
         */
        isTimeAvailable(startTime, durationHours) {
            const [startHour, startMin] = startTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;
            const durationMinutes = durationHours * 60;
            const endMinutes = startMinutes + durationMinutes + this.BREAK_TIME;
            
            const endHour = Math.floor(endMinutes / 60);
            
            // Проверяем, что рейс заканчивается до WORK_END
            return endHour <= this.WORK_END;
        }
        
        /**
         * Форматировать время для отображения
         * @param {string} time - "14:30"
         * @returns {string}
         */
        formatTimeForDisplay(time) {
            return time; // Пока просто возвращаем
        }
        
        /**
         * Получить читаемое описание разницы во времени
         * @param {number} diffMinutes
         * @returns {string}
         */
        getDiffDescription(diffMinutes) {
            if (diffMinutes <= 0) return 'успеваете впритык';
            if (diffMinutes <= 5) return 'едва успеваете';
            if (diffMinutes <= 10) return 'успеваете';
            if (diffMinutes <= 20) return 'есть время';
            return 'в запасе много времени';
        }
        
        /**
         * Проверить, является ли время рабочим
         * @param {string} time - "14:30"
         * @returns {boolean}
         */
        isWorkingTime(time) {
            const [hours] = time.split(':').map(Number);
            return hours >= this.WORK_START && hours <= this.WORK_END;
        }
    }
    
    // Создаём синглтон
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.TimeService = new TimeService();
    
})(typeof window !== 'undefined' ? window : global);