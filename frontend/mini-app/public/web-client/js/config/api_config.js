// Конфигурация API для админки
(function() {
    // Берём базовый URL из domains.js
    const baseURL = window.AQUAGID_DOMAINS ? window.AQUAGID_DOMAINS.API + '/api' : 'https://admin.experimental.24aquabooking.ru/api';
    
    window.API_CONFIG = {
        // Базовый URL API
        baseURL: baseURL,
        
        // Эндпоинты
        endpoints: {
            auth: {
                login: '/admin/login',
                me: '/auth/me',
                register: '/auth/register'
            },
            managers: {
                list: '/admin/managers',
                get: (id) => `/admin/managers/${id}`,
                create: '/admin/managers',
                update: (id) => `/admin/managers/${id}`,
                delete: (id) => `/admin/managers/${id}`
            },
            boats: {
                list: '/admin/boats',
                get: (id) => `/admin/boats/${id}`,
                create: '/admin/boats',
                update: (id) => `/admin/boats/${id}`,
                delete: (id) => `/admin/boats/${id}`
            },
            bookings: {
                list: '/admin/bookings',
                get: (id) => `/admin/bookings/${id}`,
                create: '/admin/bookings',
                cancel: (id) => `/admin/bookings/${id}/cancel`,
                stats: '/admin/bookings/stats/prepayments'
            }
        },
        
        // Методы для работы с токеном
        getToken: function() {
            return localStorage.getItem('admin_token');
        },
        
        setToken: function(token) {
            localStorage.setItem('admin_token', token);
        },
        
        removeToken: function() {
            localStorage.removeItem('admin_token');
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
    
    console.log('✅ API_CONFIG загружен, baseURL:', window.API_CONFIG.baseURL);
})();