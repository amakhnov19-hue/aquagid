/**
 * AdminApp.js
 * Главный компонент панели администратора
 */

if (!window.AquaGid) window.AquaGid = {};

AquaGid.AdminApp = class {
    constructor() {
        this.checkAuth();
    }
    
    async checkAuth() {
        const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
        
        if (!token) {
            this.showLoginPage();
            return;
        }
        
        // Можно добавить проверку токена на сервере
        this.currentView = 'dashboard';
        this.init();
    }
    
    showLoginPage() {
        const app = document.getElementById('app');
        if (!app) return;
        
        app.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div style="background: white; border-radius: 24px; padding: 40px; max-width: 400px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                    <h1 style="text-align: center; margin-bottom: 30px; color: #1e293b; font-size: 28px;">🔐 Вход в админ-панель</h1>
                    <form id="loginForm">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #334155;">Логин</label>
                            <input type="text" id="username" required style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 16px;">
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #334155;">Пароль</label>
                            <input type="password" id="password" required style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 16px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                            <input type="checkbox" id="remember" checked style="width: auto;">
                            <label style="margin: 0; font-weight: normal;">Запомнить меня</label>
                        </div>
                        <div id="loginError" style="color: #dc2626; font-size: 14px; margin-top: 8px; display: none; text-align: center;"></div>
                        <button type="submit" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer;">Войти</button>
                    </form>
                </div>
            </div>
        `;
        
        this.attachLoginEvents();
    }
    
    attachLoginEvents() {
        const form = document.getElementById('loginForm');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember').checked;
            
            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Ошибка входа');
                }
                
                const data = await response.json();
                
                if (remember) {
                    localStorage.setItem('admin_token', data.token);
                } else {
                    sessionStorage.setItem('admin_token', data.token);
                }
                
                // Перезагружаем страницу
                window.location.reload();
                
            } catch (error) {
                const errorEl = document.getElementById('loginError');
                errorEl.textContent = error.message;
                errorEl.style.display = 'block';
                setTimeout(() => {
                    errorEl.style.display = 'none';
                }, 3000);
            }
        });
    }
    
    init() {
        this.render();
        this.loadView('dashboard');
    }
    
    render() {
        const app = document.getElementById('app');
        if (!app) return;
        
        app.innerHTML = `
            <div class="admin-app" style="display: flex; height: 100vh;">
                <div class="sidebar" style="width: 280px; background: #1f2937; color: white; display: flex; flex-direction: column;">
                    <div style="padding: 24px 20px; border-bottom: 1px solid #374151;">
                        <div style="font-size: 20px; font-weight: 600;">⚓ AquaGid</div>
                        <div style="font-size: 12px; color: #9ca3af;">Админ-панель</div>
                    </div>
                    <div style="flex: 1; padding: 20px 0;">
                        ${this.renderMenuItem('dashboard', '📊', 'Дашборд')}
                        ${this.renderMenuItem('managers', '👥', 'Менеджеры')}
                        ${this.renderMenuItem('boats', '🚤', 'Катера')}
                        ${this.renderMenuItem('bookings', '📅', 'Бронирования')}
                        ${this.renderMenuItem('settings', '⚙️', 'Настройки')}
                    </div>
                    <div style="padding: 20px; border-top: 1px solid #374151;">
                        <button onclick="localStorage.removeItem('admin_token'); sessionStorage.removeItem('admin_token'); window.location.reload();" style="width: 100%; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer;">🚪 Выйти</button>
                    </div>
                </div>
                <div class="main-content" style="flex: 1; overflow-y: auto; background: #f3f4f6;">
                    <div id="admin-content" style="padding: 24px;"></div>
                </div>
            </div>
        `;
        
        this.attachMenuEvents();
    }
    
    renderMenuItem(view, icon, label) {
        const isActive = this.currentView === view;
        return `
            <div class="menu-item" data-view="${view}" style="
                padding: 12px 20px;
                margin: 4px 8px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 12px;
                background: ${isActive ? '#374151' : 'transparent'};
                color: ${isActive ? 'white' : '#9ca3af'};
            ">
                <span style="font-size: 20px;">${icon}</span>
                <span>${label}</span>
            </div>
        `;
    }
    
    attachMenuEvents() {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = item.dataset.view;
                this.switchView(view);
            });
        });
    }
    
    switchView(view) {
        this.currentView = view;
        this.render();
        this.loadView(view);
    }
    
    loadView(view) {
        const content = document.getElementById('admin-content');
        if (!content) return;
        
        content.innerHTML = '<div style="text-align: center; padding: 40px;">Загрузка...</div>';
        
        switch(view) {
            case 'dashboard':
                this.loadScript('js/components/dashboard/Dashboard.js', () => {
                    new AquaGid.Dashboard('admin-content');
                });
                break;
            case 'managers':
                this.loadScript('js/components/managers/Managers.js', () => {
                    new AquaGid.Managers('admin-content');
                });
                break;
            default:
                content.innerHTML = '<div style="text-align: center; padding: 40px;">Раздел в разработке</div>';
        }
    }
    
    loadScript(src, callback) {
        const script = document.createElement('script');
        script.src = src;
        script.onload = callback;
        document.head.appendChild(script);
    }
}

// Автозапуск
document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AquaGid.AdminApp();
});