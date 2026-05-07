// config/domains.js
(function() {
    const hostname = window.location.hostname;
    let API_URL = 'https://experimental.24aquabooking.ru';
    let MANAGER_URL = 'https://manager.experimental.24aquabooking.ru';
    let ADMIN_URL = 'https://admin.experimental.24aquabooking.ru';
    
    if (hostname.includes('beta')) {
        API_URL = 'https://beta.24aquabooking.ru';
        MANAGER_URL = 'https://manager.beta.24aquabooking.ru';
        ADMIN_URL = 'https://admin.beta.24aquabooking.ru';
    } else if (hostname.includes('localhost') || hostname === '127.0.0.1') {
        API_URL = 'http://localhost:8082';
        MANAGER_URL = 'http://localhost:8082';
        ADMIN_URL = 'http://localhost:8082';
    }
    
    window.AQUAGID_DOMAINS = {
        API: API_URL,
        MANAGER: MANAGER_URL,
        ADMIN: ADMIN_URL
    };
    
    console.log('🌐 Домены загружены:', window.AQUAGID_DOMAINS);
})();
