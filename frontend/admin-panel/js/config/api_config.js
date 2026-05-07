// Конфигурация API для админки
const API_CONFIG = {
    // Базовый URL API
    baseURL: 'http://46.229.215.40:8082/api',
    
    // Эндпоинты
    endpoints: {
        auth: {
            login: '/auth/token',
            me: '/auth/me',
            register: '/auth/register'
        },
        managers: {
            list: '/managers',
            get: (id) => `/managers/${id}`,
            create: '/managers',
            update: (id) => `/managers/${id}`,
            delete: (id) => `/managers/${id}`
        },
        boats: {
            list: '/boats',
            get: (id) => `/boats/${id}`,
            create: '/boats',
            update: (id) => `/boats/${id}`,
            delete: (id) => `/boats/${id}`
        },
        bookings: {
            list: '/bookings',
            get: (id) => `/bookings/${id}`,
            create: '/bookings',
            cancel: (id) => `/bookings/${id}/cancel`,
            stats: '/bookings/stats/prepayments'
        }
    },
    
    // Методы для работы с токеном
    getToken: function() {
        return localStorage.getItem('aquagid_token');
    },
    
    setToken: function(token) {
        localStorage.setItem('aquagid_token', token);
    },
    
    removeToken: function() {
        localStorage.removeItem('aquagid_token');
    },
    
    // Заголовки для запросов
    getHeaders: function() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }
};

// Делаем глобальным
window.API_CONFIG = API_CONFIG;

console.log('✅ API_CONFIG загружен');