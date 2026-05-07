// Сервис для работы с бронированиями
const BookingService = {
    // Проверка готовности API клиента
    _checkClient() {
        if (!window.apiClient) {
            throw new Error('apiClient не инициализирован');
        }
        return window.apiClient;
    },
    
    // Получить список бронирований с фильтрацией
    async getAll(params = {}) {
        const client = this._checkClient();
        const queryParams = new URLSearchParams();
        
        if (params.manager_id) queryParams.append('manager_id', params.manager_id);
        if (params.boat_id) queryParams.append('boat_id', params.boat_id);
        if (params.date_from) queryParams.append('date_from', params.date_from);
        if (params.date_to) queryParams.append('date_to', params.date_to);
        
        const url = API_CONFIG.endpoints.bookings.list + 
                   (queryParams.toString() ? `?${queryParams}` : '');
        
        return client.get(url);
    },
    
    // Получить бронирование по ID
    async getById(id) {
        const client = this._checkClient();
        return client.get(API_CONFIG.endpoints.bookings.get(id));
    },
    
    // Создать новое бронирование
    async create(bookingData) {
        const client = this._checkClient();
        return client.post(API_CONFIG.endpoints.bookings.create, bookingData);
    },
    
    // Отменить бронирование
    async cancel(id) {
        const client = this._checkClient();
        return client.put(API_CONFIG.endpoints.bookings.cancel(id), {});
    },
    
    // Получить статистику по предоплатам
    async getPrepaymentStats(params = {}) {
        const client = this._checkClient();
        const queryParams = new URLSearchParams();
        
        if (params.manager_id) queryParams.append('manager_id', params.manager_id);
        if (params.date_from) queryParams.append('date_from', params.date_from);
        if (params.date_to) queryParams.append('date_to', params.date_to);
        
        const url = API_CONFIG.endpoints.bookings.stats + 
                   (queryParams.toString() ? `?${queryParams}` : '');
        
        return client.get(url);
    }
};

window.BookingService = BookingService;
console.log('✅ BookingService загружен');
