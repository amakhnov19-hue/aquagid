// Конфигурация API для админки
(function() {
    const baseURL = window.AQUAGID_DOMAINS ? window.AQUAGID_DOMAINS.API + '/api' : 'https://admin.experimental.24aquabooking.ru/api';
    
    window.API_CONFIG = {
        baseURL: baseURL,
        
        endpoints: {
            auth: {
                login: '/admin/login'
            },
            managers: {
                list: '/admin/managers'
            }
        },
        
        getToken: function() {
            return TokenService ? TokenService.getToken() : localStorage.getItem('admin_token');
        },
        
        setToken: function(token) {
            localStorage.setItem('admin_token', token);
        },
        
        removeToken: function() {
            localStorage.removeItem('admin_token');
        },
        
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

