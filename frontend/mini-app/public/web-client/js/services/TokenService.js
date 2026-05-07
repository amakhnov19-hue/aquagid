// TokenService.js для клиентского сайта
(function(global) {
    class TokenService {
        constructor() {
            this.storageKey = 'userToken';
        }
        
        setToken(token) {
            if (!token) return;
            localStorage.setItem(this.storageKey, token);
        }
        
        getToken() {
            return localStorage.getItem(this.storageKey);
        }
        
        removeToken() {
            localStorage.removeItem(this.storageKey);
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

