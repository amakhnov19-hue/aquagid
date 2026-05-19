// /frontend/manager-panel/js/ManagerApp.js
// Версия: 1.0.1
// Назначение: Главный компонент ЛК Менеджера

(function(global) {
    'use strict';
    
    const VERSION = '20260225_01';
    
    // Разделы кабинета
    const SECTIONS = {
        DASHBOARD: 'dashboard',
        BOATS: 'boats',
        CALENDAR: 'calendar',
        BOOKINGS: 'bookings',
        CHAT: 'chat',
        SETTINGS: 'settings'
    };
    
    class ManagerApp {
        constructor() {
            this.version = VERSION;
            this.currentSection = SECTIONS.DASHBOARD;
            this.isRendered = false; // Флаг, чтобы не рендерить дважды
            this.managerId = null;
            
            // Проверяем, есть ли сохранённый токен
            const savedToken = localStorage.getItem('managerToken');
            this.isAuthenticated = savedToken ? true : false;

            // Если есть токен, загружаем данные менеджера из localStorage
            if (this.isAuthenticated) {
                this.manager = {
                    id: localStorage.getItem('managerId') || 19,
                    name: localStorage.getItem('managerName') || 'Менеджер',
                    company: localStorage.getItem('managerCompany') || 'ООО "Морские прогулки"',
                    telegram: localStorage.getItem('managerTelegram') || '',
                    email: localStorage.getItem('managerEmail') || '',
                    phone: localStorage.getItem('managerPhone') || '',
                    commission: 30,
                    subscription_until: '2026-12-31',
                    avatar: null
                };

                window.managerId = this.manager.id;

            } else {
                // Заглушка, пока нет авторизации
                this.manager = null;
            }
        }

        async loadManagerProfile() {
            if (!this.managerId) return;
            try {
                const response = await fetch(`/api/managers/${this.managerId}`);
                if (response.ok) {
                    const data = await response.json();
                    this.manager.name = data.full_name || this.manager.name;
                    localStorage.setItem('managerName', this.manager.name);
                }
            } catch (e) {
                console.warn('Не удалось загрузить профиль менеджера');
            }
        }

        connectWebSocket() {
            const managerId = this.managerId || window.managerId;
            if (!managerId) {
                console.warn('Нет managerId для WebSocket');
                return;
            }
            
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/api/sync/ws/${managerId}`;
            
            console.log('🔌 Подключение WebSocket:', wsUrl);
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket подключён');
                this.pingInterval = setInterval(() => {
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.ws.send('ping');
                    }
                }, 30000);
            };
            
            this.ws.onmessage = (event) => {
                if (event.data === 'update') {
                    console.log('🔄 Обновление календаря');
                    if (window.AquaGid?.ManagerCalendar) {
                        window.AquaGid.ManagerCalendar.loadCalendarData();
                    }

                    // Обновляем список бронирований
                    if (window.AquaGid?.ManagerBookings) {
                        window.AquaGid.ManagerBookings.loadBookings();
                    }

                    // Обновляем уведомления
                    if (window.AquaGid?.ManagerDashboard) {
                        window.AquaGid.ManagerDashboard.loadNotifications().then(() => {
                            window.AquaGid.ManagerDashboard.render();
                        });
                    }
                } else if (event.data === 'boats_updated') {
                    console.log('🚤 Обновление катеров');
                    if (window.AquaGid?.ManagerBoats) {
                        window.AquaGid.ManagerBoats.loadBoatsFromAPI();
                    }
                    if (window.AquaGid?.ManagerDashboard) {
                        window.AquaGid.ManagerDashboard.loadDashboardData();
                    }
                } else if (event.data === 'bookings_updated') {
                    console.log('📋 Обновление бронирований');
                    if (window.AquaGid?.ManagerDashboard) {
                        window.AquaGid.ManagerDashboard.loadDashboardData();
                    }
                    if (window.AquaGid?.ManagerBookings) {
                        window.AquaGid.ManagerBookings.render('bookings-container');
                    }
                    // Обновляем уведомления
                    if (window.AquaGid?.ManagerDashboard) {
                        window.AquaGid.ManagerDashboard.loadNotifications().then(() => {
                            window.AquaGid.ManagerDashboard.render();
                        });
                    }
                } else if (event.data === 'pong') {
                    // keep-alive
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket ошибка:', error);
            };
            
            this.ws.onclose = () => {
                console.log('🔌 WebSocket закрыт, переподключение через 5 сек...');
                clearInterval(this.pingInterval);
                setTimeout(() => this.connectWebSocket(), 5000);
            };
        }
        
        /**
         * Проверка наличия всех компонентов
         */
        checkComponents() {
            const required = ['ManagerDashboard', 'ManagerBoats', 'ManagerCalendar', 'ManagerBookings', 'ManagerSettings'];
            const missing = [];
            
            required.forEach(comp => {
                if (!global.AquaGid?.[`Manager${comp}`]) {
                    missing.push(comp);
                }
            });
            
            if (missing.length > 0) {
                console.warn(`⚠️ Отсутствуют компоненты: ${missing.join(', ')}`);
            } else {
                console.log('✅ Все компоненты менеджера загружены');
            }
        }
        
        /**
         * Инициализация приложения
         */
        init(containerId = 'manager-app') {
            // Проверяем, не отрендерено ли уже
            if (this.isRendered) {
                console.log('ManagerApp уже отрендерен, пропускаем');
                return;
            }
            
            // Получаем managerId из токена
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    this.managerId = payload.manager_id || payload.sub;
                    window.managerId = this.managerId;
                    console.log('✅ managerId установлен:', this.managerId);

                    // Подключаем WebSocket
                    this.connectWebSocket();
                    
                    // Загружаем профиль с сервера (имя и другие данные)
                    this.loadManagerProfile();                    
                } catch (e) {
                    console.error('❌ Ошибка парсинга токена:', e);
                }
            }

            // Проверяем, вернулись ли после OAuth
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('calendar_connected') === 'true') {
                // Убираем параметр из URL
                const newUrl = window.location.pathname + '?section=settings';
                window.history.replaceState({}, document.title, newUrl);
                
                // Ждём загрузки и открываем настройки
                setTimeout(() => {
                    if (window.AquaGid?.ManagerSettings) {
                        window.AquaGid.ManagerSettings.loadCalendarStatus();
                    }
                }, 1000);
            }
            
            this.render(containerId);
        }
        
        /**
         * Рендер главного экрана
         */
        render(containerId) {
            // Если уже отрендерено - выходим
            if (this.isRendered) {
                console.log('ManagerApp.render: уже отрендерен, пропускаем');
                return;
            }
            
            console.log('ManagerApp.render called', new Date().getTime());
            let container = document.getElementById(containerId);
            
            // Если контейнер не найден, создаем его
            if (!container) {
                container = document.createElement('div');
                container.id = containerId;
                document.body.appendChild(container);
            } else {
                // Если контейнер уже существует и имеет содержимое, проверяем, не отрендерено ли уже
                if (container.querySelector('.manager-app')) {
                    console.log('Контент уже есть в контейнере, пропускаем рендер');
                    this.isRendered = true;
                    return;
                }
            }
            
            // Текущее время и дата
            const now = new Date();
            const currentTime = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const currentDate = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
            
            container.innerHTML = `
                <div class="manager-app">
                    <!-- Шапка -->
                    <header class="manager-header">
                        <!-- Верхняя строка: дата слева, время справа -->
                        <div class="header-top">
                            <div class="date">${currentDate}</div>
                            <div class="time">${currentTime}</div>
                        </div>
                        
                        <!-- Основной блок: слева заголовок и приветствие, справа аватар -->
                        <div class="header-main">
                            <div class="title-block">
                                <h1>Аква Гид СПб</h1>
                                <div class="welcome-message">
                                    ${this.isAuthenticated ? `Добро пожаловать, ${this.manager.name}` : ''}
                                </div>
                            </div>
                            <div class="avatar-container" onclick="AquaGid.ManagerApp.openProfile()">
                                ${this.renderAvatar()}
                            </div>
                        </div>
                        
                        <!-- Строка меню: сендвич | календарь | настройки -->
                        <div class="menu-row">
                            <div class="menu-icon" onclick="AquaGid.ManagerApp.toggleMenu()">☰</div>
                            <div style="flex: 1;"></div>
                            <div class="calendar-icon" onclick="AquaGid.ManagerApp.switchSection('calendar')">📅 Календарь</div>
                            <div style="flex: 1;"></div>
                            <div class="settings-icon" onclick="AquaGid.ManagerApp.switchSection('settings')">⚙️</div>
                        </div>

                    </header>
                    
                    <!-- Контент -->
                    <main class="manager-content" id="manager-content">
                        ${this.renderCurrentSection()}
                    </main>
                </div>
            `;
            
            this.isRendered = true;

            // После рендера загружаем данные и подключаем компоненты
            setTimeout(async () => {
                if (this.currentSection === SECTIONS.DASHBOARD && global.AquaGid?.ManagerDashboard) {
                    await global.AquaGid.ManagerDashboard.loadDashboardData();
                    global.AquaGid.ManagerDashboard.render('dashboard-container');
                }
                if (this.currentSection === SECTIONS.BOATS && global.AquaGid?.ManagerBoats) {
                    global.AquaGid.ManagerBoats.render('boats-container');
                }
                if (this.currentSection === SECTIONS.CALENDAR && global.AquaGid?.ManagerCalendar) {
                    global.AquaGid.ManagerCalendar.render('calendar-container');
                }
            }, 0);
        }

        renderAvatar() {
            if (this.isAuthenticated) {
                return `
                    <div class="avatar">
                        <span class="avatar-id">ID:${this.manager.id}</span>
                    </div>
                `;
            } else {
                return `
                    <div class="avatar login">
                        <span>вход</span>
                    </div>
                `;
            }
        }

        /**
         * Рендер секции профиля
         */
        renderProfileSection() {
            if (!this.isAuthenticated) {
                return `
                    <div class="profile-prompt" onclick="AquaGid.ManagerApp.openProfile()">
                        👤 Нажмите на кнопку профиля для входа/регистрации
                    </div>
                `;
            } else {
                return `
                    <div class="profile-greeting" onclick="AquaGid.ManagerApp.openProfile()">
                        <div class="profile-id">ID: ${this.manager.id}</div>
                        <div class="welcome">Добро пожаловать, ${this.manager.name}</div>
                    </div>
                `;
            }
        }

        /**
         * Открыть профиль
         */
        openProfile() {
            if (!this.isAuthenticated) {
                this.showLogin();
            } else {
                // Используем новый компонент Profile
                if (window.AquaGid?.Profile) {
                    // Создаем модалку
                    const modal = document.createElement('div');
                    modal.className = 'auth-modal';
                    modal.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0,0,0,0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 9999;
                    `;
                    
                    const content = document.createElement('div');
                    content.style.cssText = `
                        background: white;
                        border-radius: 12px;
                        max-width: 500px;
                        width: 90%;
                        max-height: 90vh;
                        overflow-y: auto;
                    `;
                    
                    modal.appendChild(content);
                    document.body.appendChild(modal);
                    
                    new AquaGid.Profile(content, {
                        isModal: true,
                        onClose: () => modal.remove()
                    });
                }
            }
        }

        logout() {
            // Закрываем WebSocket
            if (this.ws) {
                clearInterval(this.pingInterval);
                this.ws.close();
                this.ws = null;
            }
            
            // Очищаем ВСЕ данные из localStorage
            localStorage.clear();
            
            // Сбрасываем состояние
            this.isAuthenticated = false;
            this.manager = null;
            window.managerId = null;
            
            // ПОЛНОСТЬЮ удаляем приложение из DOM
            const appContainer = document.getElementById('manager-app');
            if (appContainer) {
                appContainer.innerHTML = '';
            }
            
            // Очищаем глобальный объект
            window.AquaGid = { ManagerApp: this };
            
            // Сбрасываем флаг рендера
            this.isRendered = false;
            
            // Показываем форму входа
            this.showLogin();
        }

        /**
         * Показать страницу входа
         */
        showLogin() {
            // Очищаем контейнер перед показом формы входа
            const appContainer = document.getElementById('manager-app');
            if (appContainer) {
                appContainer.innerHTML = '';
            }

            const modal = document.createElement('div');
            modal.className = 'auth-modal';
            modal.innerHTML = `
                <div class="auth-content">
                    <h2>Вход в кабинет</h2>
                    <input type="text" placeholder="Логин" class="auth-input">
                    <div style="display:flex;gap:4px;width:100%;">
                        <input type="password" id="loginPassword" placeholder="Пароль" class="auth-input" style="flex:1;height:44px;box-sizing:border-box;">
                        <button onclick="const f=document.getElementById('loginPassword');f.type=f.type==='password'?'text':'password'" type="button" style="width:44px;height:44px;background:#f3f4f6;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;padding:0;box-sizing:border-box;">👁️</button>
                    </div>
                    <button class="auth-btn" onclick="AquaGid.ManagerApp.login()">Войти</button>
                    <p class="auth-link" style="color: #666; font-size: 13px; margin-top: 15px;">
                        Нет аккаунта? Свяжитесь с администратором:<br>
                        <a href="mailto:aquaguide24@mail.ru" style="color: #0066CC;">aquaguide24@mail.ru</a>
                    </p>
                </div>
            `;
            document.body.appendChild(modal);
        }

        showRegister() {
            const modal = document.createElement('div');
            modal.className = 'auth-modal';
            modal.innerHTML = `
                <div class="auth-content" style="max-width: 500px;">
                    <h2>Регистрация</h2>
                    <input type="text" placeholder="ФИО" id="regFullName" class="auth-input">
                    <input type="text" placeholder="Название компании" id="regCompany" class="auth-input">
                    <input type="email" placeholder="Email" id="regEmail" class="auth-input">
                    <input type="tel" placeholder="Телефон" id="regPhone" class="auth-input">
                    <input type="text" placeholder="Telegram (опционально)" id="regTelegram" class="auth-input">
                    <input type="password" placeholder="Пароль" id="regPassword" class="auth-input">
                    <div style="margin: 10px 0;">
                        <label>
                            <input type="checkbox" id="regConsent" checked> 
                            Я согласен с <a href="/docs/offer.html" target="_blank">условиями</a> и 
                            <a href="/docs/privacy.html" target="_blank">политикой обработки данных</a>
                        </label>
                    </div>
                    <button class="auth-btn" onclick="AquaGid.ManagerApp.doRegister()">Зарегистрироваться</button>
                    <p class="auth-link" onclick="AquaGid.ManagerApp.showLogin()">Уже есть аккаунт? Войти</p>
                    <button class="close-btn" onclick="this.parentElement.parentElement.remove()">✕</button>
                </div>
            `;
            document.body.appendChild(modal);
        }

        async doRegister() {
            const fullName = document.getElementById('regFullName')?.value;
            const company = document.getElementById('regCompany')?.value;
            const email = document.getElementById('regEmail')?.value;
            const phone = document.getElementById('regPhone')?.value;
            const telegram = document.getElementById('regTelegram')?.value;
            const password = document.getElementById('regPassword')?.value;
            const consent = document.getElementById('regConsent')?.checked;
            
            if (!fullName || !company || !email || !phone || !password) {
                alert('Заполните все обязательные поля');
                return;
            }
            
            if (!consent) {
                alert('Необходимо согласие с условиями');
                return;
            }
            
            try {
                const response = await fetch('/api/managers/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        full_name: fullName,
                        company_name: company,
                        email: email,
                        phone: phone,
                        telegram: telegram,
                        password: password,
                        consent_personal_data: true,
                        consent_terms: true
                    })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.detail || 'Ошибка регистрации');
                }
                
                alert(data.message);
                document.querySelector('.auth-modal')?.remove();
                this.showLogin();
                
            } catch (error) {
                console.error('Ошибка:', error);
                alert(error.message);
            }
        }

        /**
         * Вход
         */
        async login() {
            const modal = document.querySelector('.auth-modal');
            const inputs = modal.querySelectorAll('.auth-input');
            const login = inputs[0].value;
            const password = document.getElementById('loginPassword')?.value || inputs[1]?.value;
            
            try {
                const response = await fetch('/api/managers/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login, password })
                });
                
                if (!response.ok) throw new Error('Неверный логин или пароль');
                
                const data = await response.json();
                
                localStorage.setItem('managerToken', data.token);
                localStorage.setItem('access_token', data.token);
                localStorage.setItem('managerId', data.id);
                
                // Перезагружаем страницу для чистого старта
                window.location.href = '/';
                
            } catch (error) {
                console.error('Ошибка входа:', error);
                alert('Неверный логин или пароль');
            }
        }

        loadManagerData() {
            console.log('Загрузка данных менеджера...');
            
            if (window.AquaGid?.ManagerBoats) {
                window.AquaGid.ManagerBoats.loadBoatsFromAPI();
            }
            // if (window.AquaGid?.ManagerBookings) {
            //     window.AquaGid.ManagerBookings.loadBookings();  // ← убрали
            // }
            if (window.AquaGid?.ManagerDashboard) {
                window.AquaGid.ManagerDashboard.loadDashboardData();
                if (this.currentSection === SECTIONS.DASHBOARD) {
                    this.switchSection(SECTIONS.DASHBOARD);
                }
            }
            if (window.AquaGid?.ManagerCalendar) {
                window.AquaGid.ManagerCalendar.loadCalendarData();
            }
            if (window.AquaGid?.ManagerSettings) {
                window.AquaGid.ManagerSettings.loadSettings();
            }
        }

        /**
         * Тоггл меню
         */
        toggleMenu() {
            const menu = document.getElementById('side-menu');
            if (menu) {
                menu.remove();
            } else {
                const menuDiv = document.createElement('div');
                menuDiv.id = 'side-menu';
                menuDiv.innerHTML = `
                    <div class="menu-header">
                        <h3>Меню</h3>
                        <button onclick="this.parentElement.parentElement.remove()">✕</button>
                    </div>
                    <div class="menu-items">
                        <div class="menu-item" onclick="AquaGid.ManagerApp.switchSection('boats'); this.parentElement.parentElement.remove()">
                            🚤 Мои катера
                        </div>
                        <div class="menu-item" onclick="AquaGid.ManagerApp.switchSection('bookings'); this.parentElement.parentElement.remove()">
                            📋 Бронирования
                        </div>
                        <div class="menu-item" onclick="AquaGid.ManagerApp.switchSection('chat'); this.parentElement.parentElement.remove()">
                            💬 Чат
                        </div>
                        <div class="menu-item" onclick="AquaGid.ManagerApp.showDocuments(); this.parentElement.parentElement.remove()">
                            📜 Порядок работы с платформой
                        </div>
                    </div>
                `;
                document.body.appendChild(menuDiv);
                
            }
        }

        /**
         * Открыть чат
         */
        openChat() {
            const chatMenu = document.getElementById('chat-menu');
            if (chatMenu) {
                chatMenu.remove();
            } else {
                const menu = document.createElement('div');
                menu.id = 'chat-menu';
                menu.innerHTML = `
                    <div class="chat-menu-header">
                        <h3>Выберите чат</h3>
                        <button onclick="this.parentElement.parentElement.remove()">✕</button>
                    </div>
                    <div class="chat-menu-items">
                        <div class="chat-menu-item" onclick="AquaGid.ManagerApp.openManagersChat()">
                            👥 Чат менеджеров
                        </div>
                        <div class="chat-menu-item" onclick="AquaGid.ManagerApp.openAdminChat()">
                            👨‍💼 Чат с админом
                        </div>
                    </div>
                `;
                document.body.appendChild(menu);
            }
        }

        /**
         * Показать документы (Порядок работы с платформой)
         */
        showDocuments() {
            if (window.AquaGid?.Documentation) {
                window.AquaGid.Documentation.isManager = true;
                // Создаём контейнер для модалки (как в клиенте)
                let container = document.getElementById('documentation-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'documentation-container';
                    document.body.appendChild(container);
                }
                window.AquaGid.Documentation.render('documentation-container');
                window.AquaGid.Documentation.toggle();
            }
        }
        
        /**
         * Рендер кнопок навигации
         */
        renderNavButtons() {
            const buttons = [
                { id: SECTIONS.DASHBOARD, icon: '📊', label: 'Главная' },
                { id: SECTIONS.BOATS, icon: '🚤', label: 'Мои катера' },
                { id: SECTIONS.CALENDAR, icon: '📅', label: 'Календарь' },
                { id: SECTIONS.BOOKINGS, icon: '📋', label: 'Бронирования' },
                { id: SECTIONS.CHAT, icon: '💬', label: 'Чат' },
                { id: SECTIONS.SETTINGS, icon: '⚙️', label: 'Настройки' }
            ];
            
            return buttons.map(btn => `
                <button class="nav-btn ${this.currentSection === btn.id ? 'active' : ''}" 
                        onclick="AquaGid.ManagerApp.switchSection('${btn.id}')">
                    ${btn.icon} ${btn.label}
                </button>
            `).join('');
        }
        
        /**
         * Переключение между разделами
         */
        async switchSection(sectionId) {
            // Если мы уже в календаре и сейчас дневной вид — возвращаемся в месяц
            if (sectionId === SECTIONS.CALENDAR && 
                this.currentSection === SECTIONS.CALENDAR && 
                global.AquaGid?.ManagerCalendar?.currentView === 'day') {
                global.AquaGid.ManagerCalendar.showMonthView();
                return;
            }
            console.log('switchSection called with:', sectionId, 'SECTIONS.DASHBOARD:', SECTIONS.DASHBOARD);
            this.currentSection = sectionId;
            
            // Обновляем кнопки
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-tab') === sectionId) {
                    btn.classList.add('active');
                }
            });
            
            // Обновляем контент
            const content = document.getElementById('manager-content');
            if (content) {
                content.innerHTML = this.renderCurrentSection();
                
                // Если переключились на Dashboard - загружаем данные и рендерим
                if (sectionId === SECTIONS.DASHBOARD && global.AquaGid?.ManagerDashboard) {
                    await global.AquaGid.ManagerDashboard.loadDashboardData();
                    setTimeout(() => {
                        global.AquaGid.ManagerDashboard.render('dashboard-container');
                    }, 0);
                }

                // Если переключились на Boats - рендерим его
                if (sectionId === SECTIONS.BOATS && global.AquaGid?.ManagerBoats) {
                    setTimeout(() => {
                        global.AquaGid.ManagerBoats.render('boats-container');
                    }, 0);
                }

                // Если переключились на Calendar - рендерим его
                if (sectionId === SECTIONS.CALENDAR) {
                console.log('Переключение на календарь, проверяем наличие...');
                
                // Загружаем данные перед рендером
                if (sectionId === SECTIONS.CALENDAR) {
                    console.log('Переключение на календарь, проверяем наличие...');
                    
                    // Создаём календарь, если его нет
                    if (!global.AquaGid?.ManagerCalendar) {
                        const container = document.getElementById('calendar-container');
                        
                        // Получаем managerId из токена
                        let managerId = this.managerId;
                        if (!managerId) {
                            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
                            if (token) {
                                try {
                                    const payload = JSON.parse(atob(token.split('.')[1]));
                                    managerId = payload.manager_id || payload.sub;
                                    this.managerId = managerId;
                                    window.managerId = managerId;
                                } catch (e) {
                                    console.error('Ошибка парсинга токена:', e);
                                    managerId = 19; // fallback для разработки
                                }
                            } else {
                                managerId = 19; // fallback для разработки
                            }
                        }
                        
                        console.log('📌 Создаём календарь с managerId:', managerId);
                        global.AquaGid = global.AquaGid || {};
                        global.AquaGid.ManagerCalendar = new ManagerCalendar(container, managerId);
                    }
                    
                    // Загружаем данные перед рендером
                    await global.AquaGid.ManagerCalendar.loadCalendarData();
                    console.log('Данные календаря загружены');
                    setTimeout(() => {
                        global.AquaGid.ManagerCalendar.render('calendar-container');
                    }, 0);
                }
            }

                if (sectionId === SECTIONS.BOOKINGS && global.AquaGid?.ManagerBookings) {
                    console.log('Вызов render для бронирований');
                    setTimeout(async () => {
                        await global.AquaGid.ManagerBookings.loadBookings();
                        global.AquaGid.ManagerBookings.render('bookings-container');
                    }, 100);
                }

                if (sectionId === SECTIONS.SETTINGS && global.AquaGid?.ManagerSettings) {
                    setTimeout(() => {
                        global.AquaGid.ManagerSettings.render('settings-container');
                    }, 0);
                }
            }

            // Кнопка закрытия теперь в каждом разделе отдельно
            if (sectionId !== SECTIONS.DASHBOARD) {
                const existingBtn = document.querySelector('.btn-close-screen');
                if (existingBtn) existingBtn.remove();
            }
        }
        
        /**
         * Рендер текущего раздела
         */
        renderCurrentSection() {
            switch(this.currentSection) {
                case SECTIONS.DASHBOARD:
                    return this.renderDashboard();
                case SECTIONS.BOATS:
                        return this.renderBoats();
                case SECTIONS.CALENDAR:
                    return this.renderCalendar();
                case SECTIONS.BOOKINGS:
                        return '<div id="bookings-container"></div>';
                case SECTIONS.CHAT:
                    return '<div class="section-placeholder">💬 Раздел "Чат" (будет подключен Chat.js)</div>';
                case SECTIONS.SETTINGS:
                    return '<div id="settings-container"></div>';
                default:
                    return this.renderDashboard();
            }
        }

        /**
         * Рендер Dashboard
         */
        renderDashboard() {
            return '<div id="dashboard-container"></div>';
        }
        
        /**
         * Рендер раздела с катерами
         */
        renderBoats() {
            return '<div id="boats-container"></div>';
        }
        
        /**
         * Рендер раздела с календарем
         */
        renderCalendar() {
            return '<div id="calendar-container"></div>';
        }
        
        renderBookings() {
            return `<div class="section-placeholder">📋 Раздел "Бронирования" (будет подключен Bookings.js)</div>`;
        }
        
        renderChat() {
            return `<div class="section-placeholder">💬 Раздел "Чат" (будет подключен Chat.js)</div>`;
        }
        
        renderSettings() {
            return `<div class="section-placeholder">⚙️ Раздел "Настройки" (будет подключен Settings.js)</div>`;
        }
    }
    
    // Создаём синглтон
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.ManagerApp = new ManagerApp();
    
})(typeof window !== 'undefined' ? window : window);