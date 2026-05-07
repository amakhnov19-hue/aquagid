/**
 * Генерация уникального отпечатка браузера
 * Незаметно для пользователя
 */
class BrowserFingerprint {
    static async generate() {
        const components = [];
        
        // 1. Базовые характеристики (всегда доступны)
        components.push(navigator.userAgent);
        components.push(navigator.language);
        components.push(screen.colorDepth);
        components.push(screen.width + 'x' + screen.height);
        components.push(new Date().getTimezoneOffset());
        components.push(navigator.hardwareConcurrency || 'unknown');
        components.push(navigator.platform || 'unknown');
        
        // 2. Canvas fingerprinting (незаметно)
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(0, 0, 100, 50);
            ctx.fillStyle = '#069';
            ctx.fillText('AquaGid', 2, 15);
            const canvasHash = canvas.toDataURL();
            components.push(canvasHash);
        } catch (e) {
            components.push('canvas-disabled');
        }
        
        // 3. WebGL fingerprint (если доступно)
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const renderer = gl.getParameter(gl.RENDERER);
                const vendor = gl.getParameter(gl.VENDOR);
                components.push(renderer + vendor);
            }
        } catch (e) {
            components.push('webgl-disabled');
        }
        
        // 4. Список плагинов (что установлено в браузере)
        try {
            const plugins = [];
            for (let i = 0; i < navigator.plugins.length; i++) {
                plugins.push(navigator.plugins[i].name);
            }
            components.push(plugins.join(','));
        } catch (e) {
            components.push('plugins-disabled');
        }
        
        // 5. Создаём хеш
        const fingerprint = components.join('~~~');
        const hash = await this.hashString(fingerprint);
        
        return hash;
    }
    
    static async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }
}

window.BrowserFingerprint = BrowserFingerprint;
console.log('✅ Fingerprint загружен');
