/**
 * Базовый класс для всех экранов
 * Содержит общие методы и утилиты
 */
class ScreenBase {
    constructor(mainApp) {
        this.app = mainApp; // ссылка на UnifiedScreens
        this.container = document.getElementById('app');
    }

    /**
     * Обновляет информацию о выборе
     */
    updateSelectionInfo() {
        const selectionContainer = document.getElementById('selection-info');
        if (!selectionContainer) return;
        selectionContainer.innerHTML = this.renderSelectionInfo();
    }

    /**
     * Отрисовывает информацию о выбранных параметрах
     */
    renderSelectionInfo() {
        console.log('📝 renderSelectionInfo');
        const parts = [];
        
        // Проверяем, что это ветка развода мостов
        const isBridgesRide = this.app?.currentFlow === 'bridges';
        
        if (isBridgesRide) {
            parts.push('🌉 Развод мостов');
            parts.push('⏰ 23:30 - 01:30');
        } else {
            if (this.app.booking?.boat) {
                const boatName = typeof this.app.booking.boat === 'object' ? this.app.booking.boat.name : 'Катер';
                parts.push(`🚤 ${boatName}`);
            }
            
            if (this.app.booking?.date) {
                const date = new Date(this.app.booking.date + 'T12:00:00');
                const formattedDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                parts.push(`📅 ${formattedDate}`);
            }
            
            if (this.app.booking?.time) {
                parts.push(`⏰ ${this.app.booking.time}`);
            }
            
            if (this.app.booking?.duration) {
                const hours = this.app.booking.duration;
                const displayText = hours % 1 === 0 ? `${hours} ч` : `${hours} ч`;
                parts.push(`⌛ ${displayText}`);
            }
        }
        
        if (parts.length === 0) {
            return '<div class="selection-header">Ты выбрал:</div><div class="selection-placeholder">пока ничего</div>';
        }
        
        return `<div class="selection-header">Ты выбрал:</div><div class="selection-info">${parts.join(' • ')}</div>`;
    }

    /**
     * Заглушка для фото
     */
    getPlaceholderImage(boat) {
        if (!boat) return this.getDefaultPlaceholder();
        
        if (boat.photos?.length > 0) return boat.photos[0];
        if (boat.image) return boat.image;
        if (boat.photo) return boat.photo;
        
        const colors = ['667eea', '5a67d8', '4c51bf', '434190', '3c366b'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const name = boat.name || 'Катер';
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%23${color}'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='24' font-family='Arial'%3E${encodeURIComponent(name)}%3C/text%3E%3C/svg%3E`;
    }

    getDefaultPlaceholder() {
        return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'200\' viewBox=\'0 0 400 200\'%3E%3Crect width=\'400\' height=\'200\' fill=\'%23667eea\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'white\' font-size=\'24\' font-family=\'Arial\'%3E%D0%9D%D0%B5%D1%82%20%D1%84%D0%BE%D1%82%D0%BE%3C/text%3E%3C/svg%3E';
    }

    /**
     * Запасные даты
     */
    getFallbackDates(days = 30) {
        const dates = [];
        const today = new Date();
        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
    }

    /**
     * Запасной список времени (из глобальных констант)
     */
    getFallbackTimes() {
        // Используем константы из APP_CONSTANTS
        if (window.APP_CONSTANTS) {
            return APP_CONSTANTS.getTimeSlots();
        }
        
        // fallback на случай, если константы не загрузились
        const times = [];
        for (let hour = 11; hour <= 22; hour++) {
            times.push(`${hour.toString().padStart(2, '0')}:00`);
            if (hour < 22) times.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        return times;
    }

    /**
     * Запасная длительность
     */
    getFallbackDurations() {
        return [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
    }

    /**
     * Навигация до причала
     */
    navigateToPier(pierCoordinates = '59.9398,30.3146') {
        const url = `yandexnavi://build_route_on_map?lat_to=${pierCoordinates.split(',')[0]}&lon_to=${pierCoordinates.split(',')[1]}`;
        window.location.href = url;
        setTimeout(() => {
            window.open(`https://yandex.ru/maps/?rtext=~${pierCoordinates}&rtp=to`, '_blank');
        }, 500);
    }
}

// Делаем глобальным
window.ScreenBase = ScreenBase;
