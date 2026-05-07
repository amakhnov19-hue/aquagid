// /frontend/mini-app/public/js/components/core/APIClient.js
// Версия: 1.0.0
// Назначение: Работа с API, кэширование, обработка ошибок

(function(global) {
    'use strict';
    
    const VERSION = '20260225_01';
    
    class APIClient {
        constructor() {
            this.version = VERSION;
            this.baseUrl = this.detectBaseUrl();
            this.cache = new Map();
            this.pendingRequests = new Map();
        }
        
        /**
         * Определяем базовый URL в зависимости от окружения
         */
        detectBaseUrl() {
            const host = window.location.host;
            
            // Experimental
            if (host.includes('experimental')) {
                return 'https://dev.24aquabooking.ru/api'; // пока используем dev API
            }
            // Development
            if (host.includes('dev')) {
                return 'https://dev.24aquabooking.ru/api';
            }
            // Production
            return 'https://24aquabooking.ru/api';
        }
        
        /**
         * GET запрос с кэшированием
         */
        async get(endpoint, params = {}, options = {}) {
            const url = this.buildUrl(endpoint, params);
            const cacheKey = url;
            
            // Проверяем кэш
            if (!options.skipCache && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < 60000) { // 1 минута
                    return cached.data;
                }
            }
            
            // Проверяем, нет ли уже такого же запроса в процессе
            if (this.pendingRequests.has(cacheKey)) {
                return this.pendingRequests.get(cacheKey);
            }
            
            // Выполняем запрос
            const promise = this._fetch(url, options);
            this.pendingRequests.set(cacheKey, promise);
            
            try {
                const data = await promise;
                
                // Сохраняем в кэш
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
                
                return data;
            } finally {
                this.pendingRequests.delete(cacheKey);
            }
        }
        
        /**
         * POST запрос
         */
        async post(endpoint, data = {}, options = {}) {
            const url = this.baseUrl + endpoint;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: JSON.stringify(data)
            });
            
            return this.handleResponse(response);
        }
        
        /**
         * Внутренний метод fetch
         */
        async _fetch(url, options = {}) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });
                
                return this.handleResponse(response);
            } catch (error) {
                console.error('API Error:', error);
                throw new Error(`Network error: ${error.message}`);
            }
        }
        
        /**
         * Обработка ответа
         */
        async handleResponse(response) {
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `HTTP error ${response.status}`);
            }
            
            const data = await response.json();
            
            // Проверяем структуру ответа (у нас обычно { success: true, data: ... })
            if (data.success === false) {
                throw new Error(data.error || 'Unknown error');
            }
            
            return data.data || data;
        }
        
        /**
         * Построить URL с параметрами
         */
        buildUrl(endpoint, params) {
            const url = new URL(this.baseUrl + endpoint, window.location.origin);
            
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, value);
                }
            });
            
            return url.toString();
        }
        
        /**
         * Очистить кэш
         */
        clearCache() {
            this.cache.clear();
        }
        
        /**
         * Удалить конкретный элемент из кэша
         */
        invalidateCache(endpoint) {
            for (const key of this.cache.keys()) {
                if (key.includes(endpoint)) {
                    this.cache.delete(key);
                }
            }
        }
        
        // ========== СПЕЦИАЛИЗИРОВАННЫЕ МЕТОДЫ ДЛЯ НАШЕГО API ==========
        
        /**
         * Получить все катера
         */
        async getAllBoats() {
            return this.get('/booking/available-boats');
        }
        
        /**
         * Получить катера рядом (для быстрой ветки)
         */
        async getNearbyBoats(lat, lon) {
            return this.get('/booking/available-boats', { lat, lon });
        }
        
        /**
         * Получить доступные слоты для катера
         */
        async getAvailableSlots(boatId, date) {
            return this.get('/booking/available-slots', { boat_id: boatId, date });
        }
        
        /**
         * Получить доступные катера по параметрам
         */
        async getAvailableBoats(date, time, duration) {
            return this.get('/booking/available-boats', { date, time, duration });
        }
        
        /**
         * Создать бронирование
         */
        async createBooking(bookingData) {
            return this.post('/booking/create', bookingData);
        }
        
        /**
         * Получить информацию о катере
         */
        async getBoatDetails(boatId) {
            return this.get(`/booking/boat/${boatId}`);
        }
    }
    
    // Создаём синглтон
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.APIClient = new APIClient();
    
})(typeof window !== 'undefined' ? window : global);