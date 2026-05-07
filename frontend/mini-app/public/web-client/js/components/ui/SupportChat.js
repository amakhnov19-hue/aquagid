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
            
            // Если открыли и есть непрочитанные - сбрасываем счётчик
            if (this.isOpen && this.unreadCount > 0) {
                this.unreadCount = 0;
                this.updateBadge();
            }
        }
        
        /**
         * Отправить сообщение
         */
        sendMessage() {
            const input = document.getElementById('support-chat-input');
            const message = input.value.trim();
            
            if (!message) return;
            
            // Добавляем сообщение пользователя
            this.addMessage(message, 'user');
            input.value = '';
            
            // Имитация ответа поддержки (для теста)
            setTimeout(() => {
                this.addMessage('Спасибо за сообщение! Мы ответим в ближайшее время.', 'support');
            }, 1000);
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
         * Добавить стили для чата
         */
        injectStyles() {
            const styleId = 'support-chat-styles';
            
            // Удаляем предыдущие стили если есть
            const oldStyle = document.getElementById(styleId);
            if (oldStyle) oldStyle.remove();
            
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .support-chat {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 9999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .support-chat__button {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: #0066CC;
                    color: white;
                    border: none;
                    box-shadow: 0 4px 12px rgba(0,102,204,0.3);
                    cursor: pointer;
                    font-size: 24px;
                    position: relative;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                
                .support-chat__button:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 16px rgba(0,102,204,0.4);
                }
                
                .support-chat__badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #DC3545;
                    color: white;
                    border-radius: 50%;
                    width: 22px;
                    height: 22px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid white;
                }
                
                .support-chat__window {
                    position: absolute;
                    bottom: 80px;
                    right: 0;
                    width: 320px;
                    height: 450px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                }
                
                .support-chat__window.open {
                    display: flex;
                }
                
                .support-chat__header {
                    background: #0066CC;
                    color: white;
                    padding: 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .support-chat__title {
                    font-weight: 600;
                    font-size: 16px;
                }
                
                .support-chat__close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    opacity: 0.8;
                }
                
                .support-chat__close:hover {
                    opacity: 1;
                }
                
                .support-chat__messages {
                    flex: 1;
                    padding: 15px;
                    overflow-y: auto;
                    background: #f5f5f5;
                }
                
                .support-chat__message {
                    display: flex;
                    margin-bottom: 15px;
                    gap: 8px;
                }
                
                .support-chat__message--user {
                    justify-content: flex-end;
                }
                
                .support-chat__avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: #e0e0e0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                }
                
                .support-chat__bubble {
                    max-width: 70%;
                    padding: 10px 12px;
                    border-radius: 16px;
                    background: white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    word-wrap: break-word;
                }
                
                .support-chat__message--support .support-chat__bubble {
                    background: white;
                    border-bottom-left-radius: 4px;
                }
                
                .support-chat__message--user .support-chat__bubble {
                    background: #0066CC;
                    color: white;
                    border-bottom-right-radius: 4px;
                }
                
                .support-chat__input {
                    padding: 12px;
                    background: white;
                    border-top: 1px solid #eee;
                    display: flex;
                    gap: 8px;
                }
                
                .support-chat__input input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 20px;
                    outline: none;
                    font-size: 14px;
                }
                
                .support-chat__input input:focus {
                    border-color: #0066CC;
                }
                
                .support-chat__input button {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: #0066CC;
                    color: white;
                    border: none;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .support-chat__input button:hover {
                    background: #0052a3;
                }
                
                @media (max-width: 480px) {
                    .support-chat__window {
                        width: calc(100vw - 40px);
                        height: 60vh;
                        right: 20px;
                    }
                }
            `;
            
            document.head.appendChild(style);
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
    }
    
    // Создаём синглтон
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.SupportChat = new SupportChat();
    
})(typeof window !== 'undefined' ? window : global);

// Экспорт для ES6 модулей
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SupportChat: global.AquaGid.SupportChat };
}