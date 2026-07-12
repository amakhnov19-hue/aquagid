// Конфигурация API для клиента
(function() {
    const baseURL = window.AQUAGID_DOMAINS ? window.AQUAGID_DOMAINS.API + '/api' : '/api';
    
    window.API_CONFIG = {
        baseURL: baseURL,
        
        endpoints: {
            bookings: {
                list: '/bookings',
                get: (id) => `/bookings/${id}`,
                create: '/bookings',
                cancel: (id) => `/bookings/${id}/cancel`,
                stats: '/bookings/stats/prepayments'
            }
        },
        
        getToken: function() {
            return localStorage.getItem('client_token');
        },
        
        getHeaders: function() {
            return {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
        }
    };
    
    console.log('✅ API_CONFIG загружен, baseURL:', window.API_CONFIG.baseURL);
})();