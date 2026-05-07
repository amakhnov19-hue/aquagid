// Типы событий AquaGid для всего приложения
(function(global) {
    'use strict';
    
    global.AquaGid.EventTypes = {
        // Календарь
        CALENDAR_CONNECTED: 'calendar:connected',
        CALENDAR_DISCONNECTED: 'calendar:disconnected',
        CALENDAR_UPDATED: 'calendar:updated',
        
        // Бронирования
        BOOKING_CREATED: 'booking:created',
        BOOKING_UPDATED: 'booking:updated',
        BOOKING_CANCELLED: 'booking:cancelled',
        
        // Катера
        BOAT_CREATED: 'boat:created',
        BOAT_UPDATED: 'boat:updated',
        BOAT_DELETED: 'boat:deleted',
        
        // Дашборд
        DASHBOARD_REFRESH: 'dashboard:refresh',
        STATS_UPDATED: 'stats:updated',
        
        // Настройки
        SETTINGS_UPDATED: 'settings:updated'
    };
    
    console.log('✅ EventTypes загружены');
    
})(typeof window !== 'undefined' ? window : global);
