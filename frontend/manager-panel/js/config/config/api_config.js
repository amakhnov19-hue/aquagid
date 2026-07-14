// api_config.js для ЛК менеджера
(function() {
    const baseURL = window.AQUAGID_DOMAINS ? window.AQUAGID_DOMAINS.API + '/api' : 'https://manager.experimental.24aquabooking.ru/api';
    
    window.API_CONFIG = {
        baseURL: baseURL,
        getToken: function() {
            return localStorage.getItem('token');
        }
    };
    
    console.log('✅ API_CONFIG менеджера загружен, baseURL:', baseURL);
})();

