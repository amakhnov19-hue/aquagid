/**
 * Логгер событий безопасности
 */
class SecurityLogger {
    static log(type, phone, details = {}) {
        const event = {
            timestamp: new Date().toISOString(),
            type: type,
            phone: phone || 'unknown',
            fingerprint: localStorage.getItem('userFingerprint'),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...details
        };
        
        // Сохраняем в localStorage для анализа
        const logs = JSON.parse(localStorage.getItem('securityLogs') || '[]');
        logs.push(event);
        // Храним только последние 100 событий
        if (logs.length > 100) logs.shift();
        localStorage.setItem('securityLogs', JSON.stringify(logs));
        
        // В консоль для отладки
        console.log('🔒 Security event:', event);
        
        // Можно отправить на сервер (добавим позже)
        // this.sendToServer(event);
    }
    
    static getLogs() {
        return JSON.parse(localStorage.getItem('securityLogs') || '[]');
    }
    
    static clearLogs() {
        localStorage.removeItem('securityLogs');
        console.log('🔒 Логи безопасности очищены');
    }
}

window.SecurityLogger = SecurityLogger;
console.log('✅ SecurityLogger загружен');
