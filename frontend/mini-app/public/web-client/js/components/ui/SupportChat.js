// /frontend/mini-app/public/js/components/ui/SupportChat.js
// Версия: 1.0.0
// Назначение: Чат с поддержкой для всех экранов

(function(global) {
    'use strict';
    
    const VERSION = '20260223_01';
    
    class SupportChat {
        constructor() {
            this.version = VERSION;
            this.isOpen = false;
            this.messages = [];
            this.unreadCount = 0;
            
            // Настройки (можно будет менять через конфиг)
            this.config = {
                supportName: 'Поддержка АкваГидСПб',
                supportAvatar: '🤵',
                welcomeMessage: 'Здравствуйте! Чем могу помочь?',
                placeholderText: 'Напишите сообщение...',
                apiEndpoint: '/api/support/chat'  // для будущей интеграции
            };
        }
        
        /**
         * Создаёт HTML структуру чата
         */
        render(containerId = 'support-chat-container') {
            // Проверим, есть ли DesignSystem
            if (!global.AquaGid || !global.AquaGid.DesignSystem) {
                console.warn('DesignSystem not loaded, styles might be missing');
            }
            
            // Создаём контейнер если его нет
            let container = document.getElementById(containerId);
            if (!container) {
                container = document.createElement('div');
                container.id = containerId;
                document.body.appendChild(container);
            }
            
            // HTML структура чата
            container.innerHTML = `
                <div class="support-chat">
                    <button class="support-chat__button" onclick="window.AquaGid.SupportChat.toggle()">
                        💬
                        ${this.unreadCount > 0 ? `<span class="support-chat__badge">${this.unreadCount}</span>` : ''}
                    </button>
                    
                    <div class="support-chat__window ${this.isOpen ? 'open' : ''}">
                        <div class="support-chat__header">
                            <span class="support-chat__title">${this.config.supportName}</span>
                            <button class="support-chat__close" onclick="window.AquaGid.SupportChat.toggle()">✕</button>
                        </div>
                        
                        <div class="support-chat__messages" id="support-chat-messages">
                            <div class="support-chat__message support-chat__message--support">
                                <div class="support-chat__avatar">${this.config.supportAvatar}</div>
                                <div class="support-chat__bubble">${this.config.welcomeMessage}</div>
                            </div>
                            ${this.renderMessages()}
                        </div>
                        
                        <div class="support-chat__input">
                            <input 
                                type="text" 
                                placeholder="${this.config.placeholderText}"
                                id="support-chat-input"
                                onkeypress="if(event.key === 'Enter') window.AquaGid.SupportChat.sendMessage()"
                            >
                            <button onclick="window.AquaGid.SupportChat.sendMessage()">➤</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Добавляем стили
            this.injectStyles();
            
            return container;
        }
        
        /**
         * Открыть/закрыть чат
         */
        toggle() {
            this.isOpen = !this.isOpen;
            const chatWindow = document.querySelector('.support-chat__window');
            if (chatWindow) {
                chatWindow.classList.toggle('open', this.isOpen);
            }
            
            if (this.isOpen) {
                history.pushState({ screen: 'chat' }, '', window.location.pathname);
                this.loadHistory().then(() => {
                    const msgContainer = document.getElementById('support-chat-messages');
                    if (msgContainer) {
                        msgContainer.innerHTML = `
                            <div class="support-chat__message support-chat__message--support">
                                <div class="support-chat__avatar">${this.config.supportAvatar}</div>
                                <div class="support-chat__bubble">${this.config.welcomeMessage}</div>
                            </div>
                            ${this.renderMessages()}
                        `;
                        msgContainer.scrollTop = msgContainer.scrollHeight;
                    }
                });
                
                if (this.unreadCount > 0) {
                    this.unreadCount = 0;
                    this.updateBadge();
                }
            }
        }

        connectWebSocket() {
            const clientPhone = localStorage.getItem('clientPhone');
            if (!clientPhone) {
                console.log('⏳ WebSocket: ждём телефон');
                return;
            }
            
            const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${location.host}/api/sync/ws/${clientPhone}`;
            
            console.log('🔌 WebSocket подключение:', wsUrl);
            
            try {
                this.ws = new WebSocket(wsUrl);
                this.ws.onopen = () => console.log('✅ WebSocket чата подключён');
                this.ws.onmessage = (event) => {
                    console.log('📩 WebSocket:', event.data);
                    if (event.data === 'new_chat_message' && this.isOpen) {
                        this.loadHistory().then(() => {
                            const msgContainer = document.getElementById('support-chat-messages');
                            if (msgContainer) {
                                msgContainer.innerHTML = `
                                    <div class="support-chat__message support-chat__message--support">
                                        <div class="support-chat__avatar">${this.config.supportAvatar}</div>
                                        <div class="support-chat__bubble">${this.config.welcomeMessage}</div>
                                    </div>
                                    ${this.renderMessages()}
                                `;
                                msgContainer.scrollTop = msgContainer.scrollHeight;
                            }
                        });
                    }
                };
            } catch (e) {
                console.warn('WebSocket error:', e);
            }
        }        
        
        /**
         * Отправить сообщение админу
         */
        async sendMessage() {
            const input = document.getElementById('support-chat-input');
            const message = input.value.trim();
            if (!message) return;
            
            let clientPhone = localStorage.getItem('clientPhone');
            let clientName = localStorage.getItem('clientName');
            
            // Если нет данных — запрашиваем один раз
            if (!clientPhone || !clientName) {
                const name = prompt('Ваше имя:');
                if (!name) return;
                // Показываем модальное окно для ввода телефона
                const phone = await this.showPhoneModal();
                if (!phone) return;

                clientPhone = phone.replace(/\D/g, '');
                if (clientPhone.length < 10) {
                    alert('Введите корректный телефон (минимум 10 цифр)');
                    return;
                }
                
                localStorage.setItem('clientPhone', clientPhone);
                localStorage.setItem('clientName', name);
                clientName = name;
                
                // Обновляем приветствие
                this.config.welcomeMessage = `Здравствуйте, ${name}! Чем могу помочь?`;
            }
            
            // Подключаем WebSocket если ещё не подключён
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                this.connectWebSocket();
            }
            
            // Добавляем локально
            this.addMessage(message, 'user');
            input.value = '';
            
            // Отправляем на сервер
            try {
                await fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sender_type: 'client',
                        sender_id: clientPhone,
                        receiver_type: 'admin',
                        receiver_id: '0',
                        type: 'chat',
                        title: `Сообщение от ${clientName}`,
                        body: message
                    })
                });
            } catch (error) {
                console.error('Ошибка отправки:', error);
                this.addMessage('❌ Ошибка отправки.', 'support');
            }
        }
        
        /**
         * Загрузить историю с сервера
         */
        async loadHistory() {
            const clientPhone = localStorage.getItem('clientPhone');
            if (!clientPhone) return;
            
            try {
                const response = await fetch(`/api/messages?client_phone=${encodeURIComponent(clientPhone)}`);
                const messages = await response.json();
                
                if (messages.length > 0) {
                    this.messages = [];
                    messages.reverse().forEach(msg => {
                        this.messages.push({
                            text: msg.body || msg.title,
                            type: msg.sender_type === 'client' ? 'user' : 'support',
                            timestamp: msg.created_at
                        });
                    });
                }
                
                // Приветствие с именем
                const clientName = localStorage.getItem('clientName');
                if (clientName) {
                    this.config.welcomeMessage = `Здравствуйте, ${clientName}! Чем могу помочь?`;
                }
            } catch (error) {
                console.error('Ошибка загрузки истории:', error);
            }
        }
        
        /**
         * Добавить сообщение в чат
         */
        addMessage(text, type = 'user') {
            const messagesContainer = document.getElementById('support-chat-messages');
            if (!messagesContainer) return;
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `support-chat__message support-chat__message--${type}`;
            
            if (type === 'support') {
                messageDiv.innerHTML = `
                    <div class="support-chat__avatar">${this.config.supportAvatar}</div>
                    <div class="support-chat__bubble">${text}</div>
                `;
            } else {
                messageDiv.innerHTML = `
                    <div class="support-chat__bubble">${text}</div>
                    <div class="support-chat__avatar">👤</div>
                `;
            }
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Если чат закрыт, увеличиваем счётчик непрочитанных
            if (!this.isOpen && type === 'support') {
                this.unreadCount++;
                this.updateBadge();
            }
            
            // Сохраняем в историю
            this.messages.push({ text, type, timestamp: new Date() });
        }
        
        /**
         * Обновить бейдж с непрочитанными
         */
        updateBadge() {
            const button = document.querySelector('.support-chat__button');
            if (!button) return;
            
            const existingBadge = button.querySelector('.support-chat__badge');
            if (this.unreadCount > 0) {
                if (existingBadge) {
                    existingBadge.textContent = this.unreadCount;
                } else {
                    const badge = document.createElement('span');
                    badge.className = 'support-chat__badge';
                    badge.textContent = this.unreadCount;
                    button.appendChild(badge);
                }
            } else if (existingBadge) {
                existingBadge.remove();
            }
        }
        
        /**
         * Отобразить историю сообщений
         */
        renderMessages() {
            return this.messages.map(msg => {
                if (msg.type === 'support') {
                    return `
                        <div class="support-chat__message support-chat__message--support">
                            <div class="support-chat__avatar">${this.config.supportAvatar}</div>
                            <div class="support-chat__bubble">${msg.text}</div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="support-chat__message support-chat__message--user">
                            <div class="support-chat__bubble">${msg.text}</div>
                            <div class="support-chat__avatar">👤</div>
                        </div>
                    `;
                }
            }).join('');
        }
        
        /**
         * Стили подгружаются через index.html (css/support-chat.css)
         */
        injectStyles() {
            // Стили теперь в отдельном файле, подключаемом в index.html
        }
        
        /**
         * Очистить историю сообщений
         */
        clearHistory() {
            this.messages = [];
            this.unreadCount = 0;
            this.updateBadge();
            this.render();
        }
        
        /**
         * Настроить API endpoint
         */
        setApiEndpoint(endpoint) {
            this.config.apiEndpoint = endpoint;
        }

        /**
         * Показывает модальное окно для ввода телефона
         * @returns {Promise<string|null>} - телефон или null если отмена
         */
        async showPhoneModal() {
            return new Promise((resolve) => {
                // Создаём оверлей
                const overlay = document.createElement('div');
                overlay.className = 'phone-modal-overlay';
                overlay.innerHTML = `
                    <div class="phone-modal">
                        <div class="phone-modal-header">📱 Ваш телефон для связи</div>
                        <div class="phone-modal-body">
                            <input type="tel" 
                                id="phone-modal-input" 
                                class="phone-modal-input" 
                                placeholder="+7 (___) ___-__-__" 
                                autofocus>
                            <div class="phone-modal-hint">Введите номер в международном формате</div>
                        </div>
                        <div class="phone-modal-footer">
                            <button class="phone-modal-btn phone-modal-cancel">Отмена</button>
                            <button class="phone-modal-btn phone-modal-ok">Продолжить</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);

                const input = document.getElementById('phone-modal-input');
                const okBtn = overlay.querySelector('.phone-modal-ok');
                const cancelBtn = overlay.querySelector('.phone-modal-cancel');

                // Обработка подтверждения
                const submit = () => {
                    const value = input.value.trim();
                    document.body.removeChild(overlay);
                    resolve(value || null);
                };

                // Обработка отмены
                const cancel = () => {
                    document.body.removeChild(overlay);
                    resolve(null);
                };

                okBtn.addEventListener('click', submit);
                cancelBtn.addEventListener('click', cancel);
                
                // Enter — подтвердить, Escape — отменить
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') submit();
                    if (e.key === 'Escape') cancel();
                });

                // Фокус на поле
                setTimeout(() => input.focus(), 100);
            });
        }
    }
    
    // Создаём синглтон
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.SupportChat = new SupportChat();
    
})(typeof window !== 'undefined' ? window : global);

// Экспорт для ES6 модулей
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SupportChat: global.AquaGid.SupportChat };
}