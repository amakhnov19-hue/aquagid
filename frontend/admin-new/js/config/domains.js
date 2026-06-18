// domains.js для админки
(function() {
    const hostname = window.location.hostname;
    let API_URL = 'https://admin.experimental.24aquabooking.ru';
    
    if (hostname.includes('beta')) {
        API_URL = 'https://admin.beta.24aquabooking.ru';
    } else if (hostname.includes('localhost')) {
        API_URL = 'http://localhost:8082';
    } else {
        API_URL = 'https://admin.24aquabooking.ru';
    }
    
    window.AQUAGID_DOMAINS = {
        API: API_URL
    };
    
    console.log('🌐 Домены админки загружены:', window.AQUAGID_DOMAINS);
})();

