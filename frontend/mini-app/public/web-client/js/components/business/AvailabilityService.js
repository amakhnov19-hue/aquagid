/**
 * Сервис проверки доступности
 * Единое место для всей логики:
 * - время работы
 * - доступные слоты
 * - максимальная длительность
 * - фильтрация катеров
 */
class AvailabilityService {
    constructor() {
        this.constants = window.APP_CONSTANTS;
    }

    /**
     * Проверить, можно ли начать рейс в указанное время
     */
    canStartAt(date, time) {
        const [hours, minutes] = time.split(':').map(Number);
        const startDateTime = new Date(date);
        startDateTime.setHours(hours, minutes, 0, 0);
        
        const now = new Date();
        const workEnd = new Date(date);
        workEnd.setHours(
            this.constants.TIME.WORK_END_HOUR,
            this.constants.TIME.WORK_END_MINUTE,
            0, 0
        );
        
        // Нельзя начать раньше открытия
        if (hours < this.constants.TIME.WORK_START_HOUR) return false;
        
        // Нельзя начать позже последнего старта
        if (hours > this.constants.TIME.LAST_START_HOUR) return false;
        if (hours === this.constants.TIME.LAST_START_HOUR && minutes > 0) return false;
        
        // Для сегодняшней даты - нельзя начать в прошлом
        if (this.isToday(date) && startDateTime < now) return false;
        
        return true;
    }

    /**
     * Получить доступные слоты времени для даты и катера
     * @param {string} date - дата в формате YYYY-MM-DD
     * @param {number} boatId - ID катера (опционально, если не указан - вернет все слоты)
     */
    async getAvailableTimeSlots(date, boatId = null) {
        try {
            // Если указан катер, используем API для проверки слотов для этого катера
            if (boatId) {
                const response = await fetch(`/api/availability/available-slots?boat_id=${boatId}&booking_date=${date}`);
                const data = await response.json();
                
                if (data.success && data.slots) {
                    return data.slots;
                }
            } else {
                // Если катер не указан, используем API для получения глобальных слотов
                const response = await fetch(`/api/availability/available-slots-global?booking_date=${date}`);
                const data = await response.json();
                
                if (data.success && data.slots) {
                    return data.slots;
                }
            }
            
            // Если API не вернул данные, возвращаем пустой массив
            return [];
            
        } catch (error) {
            console.error('Ошибка загрузки слотов:', error);
            return [];
        }
    }

    /**
     * Отфильтровать катера по доступности
     */
    filterAvailableBoats(boats, date, time, duration) {
        // TODO: здесь будет запрос к API
        return boats.filter(boat => true);
    }

    /**
     * Проверить, является ли дата сегодняшней
     */
    isToday(date) {
        const today = new Date();
        const checkDate = new Date(date);
        return today.toDateString() === checkDate.toDateString();
    }

    /**
     * Получить максимальную длительность для быстрого бронирования (сейчас)
     */
    async getMaxDuration(date, time, boatId = null) {
        const [hours, minutes] = time.split(':').map(Number);
        const currentMinutes = hours * 60 + minutes;
        
        const workEnd = new Date(date);
        workEnd.setHours(
            this.constants.TIME.WORK_END_HOUR,
            this.constants.TIME.WORK_END_MINUTE,
            0, 0
        );
        const endMinutes = workEnd.getHours() * 60 + workEnd.getMinutes();
        
        // Максимум по рабочему дню
        let maxMinutes = endMinutes - currentMinutes;
        
        // Если указан катер, нужно учесть бронирования
        if (boatId) {
            try {
                // Получаем свободные слоты для этого катера
                const response = await fetch(`/api/availability/available-slots?boat_id=${boatId}&booking_date=${date}`);
                const data = await response.json();
                
                if (data.success && data.slots) {
                    // Генерируем все возможные слоты
                    const allSlots = this.constants.getTimeSlots();
                    const freeSlotsSet = new Set(data.slots);
                    
                    // Находим следующий занятый слот после текущего времени
                    let nextBusyMinutes = Infinity;
                    for (let slot of allSlots) {
                        const [slotHour, slotMin] = slot.split(':').map(Number);
                        const slotMinutes = slotHour * 60 + slotMin;
                        
                        if (slotMinutes > currentMinutes && !freeSlotsSet.has(slot)) {
                            nextBusyMinutes = Math.min(nextBusyMinutes, slotMinutes);
                            break;
                        }
                    }
                    
                    if (nextBusyMinutes !== Infinity) {
                        const availableMinutes = nextBusyMinutes - currentMinutes;
                        if (availableMinutes < maxMinutes) {
                            maxMinutes = availableMinutes;
                        }
                    }
                }
            } catch (error) {
                console.error('Ошибка проверки занятых слотов:', error);
            }
        }
        
        // Переводим в часы, округляем вниз до ближайших 30 минут
        const maxHours = Math.floor(maxMinutes / 60);
        const maxRemainingMinutes = Math.floor((maxMinutes % 60) / 30) * 30;
        
        return maxHours + (maxRemainingMinutes / 60);
    }

    /**
     * Конвертировать время "чч:мм" в минуты
     */
    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Получить максимальную длительность для быстрого бронирования (сейчас)
     */
    async getMaxDurationForNow() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // Округляем время вверх до ближайшего доступного слота
        const nextSlot = await this.getNextAvailableSlot(today, currentTime);
        if (!nextSlot) return 0;
        
        return this.getMaxDuration(today, nextSlot);
    }

    /**
     * Получить ближайший доступный слот
     */
    async getNextAvailableSlot(date, currentTime) {
        const slots = await this.getAvailableTimeSlots(date);
        if (slots.length === 0) return null;
        
        // Конвертируем в минуты для сравнения
        const currentMinutes = this.timeToMinutes(currentTime);
        
        for (let slot of slots) {
            const slotMinutes = this.timeToMinutes(slot);
            if (slotMinutes >= currentMinutes) {
                return slot;
            }
        }
        
        return null;
    }

    /**
     * Получить минимальную доступную длительность для катера в указанное время
     */
    async getMinDuration(date, time, boatId) {
        try {
            // Получаем доступные слоты для катера
            const slots = await this.getAvailableTimeSlots(date, boatId);
            
            // Находим слот с указанным временем
            const targetSlot = slots.find(slot => slot === time);
            if (!targetSlot) {
                console.log(`⚠️ Слот ${time} не найден для катера ${boatId}`);
                return 1;
            }
            
            // Получаем доступные длительности для этого слота
            const response = await fetch(`/api/availability/available-durations?boat_id=${boatId}&booking_date=${date}&start_time=${time}`);
            const data = await response.json();
            
            if (data.success && data.durations && data.durations.length > 0) {
                // Возвращаем минимальную доступную длительность
                return Math.min(...data.durations);
            }
            
            // Если API не вернул данные, используем стандартную минимальную длительность (1 час)
            return 1;
            
        } catch (error) {
            console.error('Ошибка получения минимальной длительности:', error);
            return 1;
        }
    }
}

// Создаём глобальный экземпляр
if (!window.AquaGid) window.AquaGid = {};
window.AquaGid.AvailabilityService = new AvailabilityService();
console.log('✅ AvailabilityService загружен');