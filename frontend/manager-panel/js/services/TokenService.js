// TokenService.js для менеджера
(function(global) {
    class TokenService {
        constructor() {
            // Пытаемся найти токен в любом из возможных ключей
            this.tokenKey = this.findTokenKey();
        }
        
        findTokenKey() {
            if (localStorage.getItem('managerToken')) return 'managerToken';
            if (localStorage.getItem('token')) return 'token';
            if (localStorage.getItem('admin_token')) return 'admin_token';
            return 'managerToken'; // по умолчанию
        }
        
        setToken(token) {
            if (!token) return;
            localStorage.setItem('managerToken', token);
            localStorage.setItem('token', token); // для совместимости
        }
        
        getToken() {
            return localStorage.getItem('managerToken') || 
                   localStorage.getItem('token') || 
                   localStorage.getItem('admin_token');
        }
        
        removeToken() {
            localStorage.removeItem('managerToken');
            localStorage.removeItem('token');
            localStorage.removeItem('admin_token');
        }
        
        isTokenValid() {
            const token = this.getToken();
            if (!token) return false;
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.exp > Date.now() / 1000;
            } catch (e) {
                return false;
            }
        }
    }
    
    global.TokenService = new TokenService();
})(window);