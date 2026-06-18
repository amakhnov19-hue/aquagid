// domains.js для ЛК менеджера
(function() {
    const hostname = window.location.hostname;
    let API_URL = 'https://manager.experimental.24aquabooking.ru';
    
    if (hostname.includes('beta')) {
        API_URL = 'https://manager.beta.24aquabooking.ru';
    } else {
        API_URL = 'https://manager.24aquabooking.ru';
    }
    
    window.AQUAGID_DOMAINS = {
        API: API_URL
    };
    
    console.log('🌐 Домены менеджера загружены:', window.AQUAGID_DOMAINS);
})();

