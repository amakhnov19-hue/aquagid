/**
 * ChatService v1.0 — Единый чат для клиентов, менеджеров и админов
 */

(function(global) {
    'use strict';

    class ChatService {
        constructor(options = {}) {
            this.role = options.role || 'client'; // 'client' | 'manager' | 'admin'
            this.userId = options.userId || this.getUserId();
            this.userName = options.userName || '';
            this.apiBase = options.apiBase || '';
            this.messages = [];
            this.isOpen = false;
            this.unreadCount = 0;
            this.ws = null;
            this.container = null;
        }

        getUserId() {
            if (this.role === 'client') {
                return localStorage.getItem('clientPhone') || '';
            }
            if (this.role === 'manager') {
                return window.managerId || localStorage.getItem('managerId') || '';
            }
            if (this.role === 'admin') {
                return 'admin';
            }
            return '';
        }

        getUserName() {
            if (this.role === 'client') {
                return localStorage.getItem('clientName') || 'Гость';
            }
            if (this.role === 'manager') {
                return localStorage.getItem('managerName') || 'Менеджер';
            }
            if (this.role === 'admin') {
                return 'Поддержка';
            }
            return '';
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }

        formatTime(dateStr) {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const now = new Date();
            const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            if (date.toDateString() === now.toDateString()) return `Сегодня ${time}`;
            const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
            if (date.toDateString() === yesterday.toDateString()) return `Вчера ${time}`;
            return `${date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} ${time}`;
        }

        async requestPhone() {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.className = 'chat-phone-overlay';
                overlay.innerHTML = `
                    <div class="chat-phone-modal">
                        <div class="chat-phone-header">📱 Ваш телефон для связи</div>
                        <div class="chat-phone-body">
                            <input type="tel" id="chat-phone-input" class="chat-phone-input" placeholder="+7 (___) ___-__-__" autofocus>
                            <div class="chat-phone-hint">Введите номер в международном формате</div>
                        </div>
                        <div class="chat-phone-footer">
                            <button class="chat-phone-btn chat-phone-cancel">Отмена</button>
                            <button class="chat-phone-btn chat-phone-ok">Продолжить</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);
                const input = document.getElementById('chat-phone-input');
                overlay.querySelector('.chat-phone-ok').onclick = () => {
                    document.body.removeChild(overlay);
                    resolve(input.value.trim() || null);
                };
                overlay.querySelector('.chat-phone-cancel').onclick = () => {
                    document.body.removeChild(overlay);
                    resolve(null);
                };
                input.onkeydown = (e) => {
                    if (e.key === 'Enter') { overlay.querySelector('.chat-phone-ok').click(); }
                    if (e.key === 'Escape') { overlay.querySelector('.chat-phone-cancel').click(); }
                };
                setTimeout(() => input.focus(), 100);
            });
        }

        async ensureIdentity() {
            if (this.role === 'client') {
                if (!this.userId || !this.userName) {
                    const name = prompt('Ваше имя:');
                    if (!name) return false;
                    const phone = await this.requestPhone();
                    if (!phone) return false;
                    this.userId = phone.replace(/\D/g, '');
                    this.userName = name;
                    localStorage.setItem('clientPhone', this.userId);
                    localStorage.setItem('clientName', this.userName);
                }
            }
            if (this.role === 'manager') {
                this.userId = window.managerId || localStorage.getItem('managerId');
                this.userName = localStorage.getItem('managerName') || 'Менеджер';
            }
            if (this.role === 'admin') {
                this.userId = 'admin';
                this.userName = 'Поддержка';
            }
            return true;
        }

        connectWebSocket() {
            if (!this.userId) return;
            const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${location.host}/api/sync/ws/${this.userId}`;
            try {
                this.ws = new WebSocket(wsUrl);
                this.ws.onopen = () => console.log('✅ ChatService WS:', this.role);
                this.ws.onmessage = (e) => {
                    if ((e.data === 'new_chat_message' || e.data === 'update') && this.isOpen) {
                        this.loadHistory();
                    }
                };
                this.ws.onclose = () => console.log('🔌 ChatService WS closed');
            } catch (e) {
                console.warn('ChatService WS error:', e);
            }
        }

        async loadHistory() {
            if (!this.userId) return;
            try {
                const url = this.role === 'admin'
                    ? `/api/messages/admin/dialogs`
                    : `/api/messages?client_phone=${encodeURIComponent(this.userId)}`;
                const token = localStorage.getItem('admin_token') || localStorage.getItem('access_token') || '';
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const response = await fetch(url, { headers });
                const data = await response.json();
                const messages = Array.isArray(data) ? data.filter(m => m.type === 'chat') : [];
                if (messages.length > 0) {
                    this.messages = messages.reverse().map(m => ({
                        text: m.body || m.title,
                        type: m.sender_type === 'admin' || m.sender_type === 'manager' ? 'support' : 'user',
                        time: m.created_at
                    }));
                }
                this.renderMessages();
            } catch (e) {
                console.error('ChatService history error:', e);
            }
        }

        async sendMessage(text) {
            if (!text) return;
            const ok = await this.ensureIdentity();
            if (!ok) return;
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                this.connectWebSocket();
            }
            const token = localStorage.getItem('admin_token') || localStorage.getItem('access_token') || '';
            try {
                await fetch('/api/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        sender_type: this.role === 'admin' ? 'admin' : this.role === 'manager' ? 'manager' : 'client',
                        sender_id: String(this.userId),
                        receiver_type: this.role === 'admin' ? 'client' : 'admin',
                        receiver_id: this.role === 'admin' ? '0' : '0',
                        type: 'chat',
                        title: `Сообщение от ${this.userName}`,
                        body: text
                    })
                });
                this.messages.push({ text, type: 'user', time: new Date().toISOString() });
                this.renderMessages();
            } catch (e) {
                console.error('ChatService send error:', e);
            }
        }

        initForRole(role, userId, userName) {
            this.role = role;
            if (userId) this.userId = String(userId);
            if (userName) this.userName = userName;
        }

        async openModal() {
            await this.ensureIdentity();
            if (!this.ws) this.connectWebSocket();
            
            // Удаляем старую модалку
            const old = document.getElementById('chat-modal');
            if (old) old.remove();
            
            // Загружаем историю
            let historyHtml = '<div class="chat-service-msg support"><div class="chat-service-bubble">Здравствуйте! Чем могу помочь?</div></div>';
            try {
                const url = `/api/messages?client_phone=${encodeURIComponent(this.userId)}&type=chat`;
                const token = localStorage.getItem('access_token') || '';
                const response = await fetch(url, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                const data = await response.json();
                const messages = Array.isArray(data) ? data.filter(m => m.type === 'chat') : [];
                if (messages.length > 0) {
                    historyHtml = messages.reverse().map(m => `
                        <div class="chat-service-msg ${m.sender_type === 'admin' ? 'support' : 'user'}">
                            <div class="chat-service-bubble">${this.escapeHtml(m.body || m.title)}</div>
                            <div class="chat-service-time">${this.formatTime(m.created_at)}</div>
                        </div>
                    `).join('');
                }
            } catch(e) {}
            
            const modal = document.createElement('div');
            modal.id = 'chat-modal';
            modal.className = 'chat-modal-overlay';
            modal.innerHTML = `
                <div class="chat-modal-window">
                    <div class="chat-service-header">
                        <span>💬 Поддержка</span>
                        <button onclick="document.getElementById('chat-modal').remove(); AquaGid.ChatService.isOpen = false;">✕</button>
                    </div>
                    <div class="chat-service-messages" id="chat-modal-msgs">${historyHtml}</div>
                    <div class="chat-service-input">
                        <input type="text" id="chat-modal-inp" placeholder="Сообщение..." 
                            onkeypress="if(event.key==='Enter')AquaGid.ChatService.sendFromModal()">
                        <button onclick="AquaGid.ChatService.sendFromModal()">➤</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            this.isOpen = true;
            
            const msgs = document.getElementById('chat-modal-msgs');
            if (msgs) msgs.scrollTop = msgs.scrollHeight;
            setTimeout(() => document.getElementById('chat-modal-inp')?.focus(), 200);
        }

        sendFromModal() {
            const input = document.getElementById('chat-modal-inp');
            if (!input?.value.trim()) return;
            this.sendMessage(input.value.trim());
            input.value = '';
            // Обновляем сообщения
            setTimeout(() => this.refreshModalMessages(), 300);
        }

        async refreshModalMessages() {
            const msgs = document.getElementById('chat-modal-msgs');
            if (!msgs) return;
            try {
                const url = `/api/messages?client_phone=${encodeURIComponent(this.userId)}`;
                const token = localStorage.getItem('access_token') || '';
                const response = await fetch(url, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                const data = await response.json();
                const messages = Array.isArray(data) ? data.filter(m => m.type === 'chat') : [];
                if (messages.length > 0) {
                    msgs.innerHTML = messages.reverse().map(m => `
                        <div class="chat-service-msg ${m.sender_type === 'admin' || m.sender_type === 'manager' ? 'support' : 'user'}">
                            <div class="chat-service-bubble">${this.escapeHtml(m.body || m.title)}</div>
                            <div class="chat-service-time">${this.formatTime(m.created_at)}</div>
                        </div>
                    `).join('');
                    msgs.scrollTop = msgs.scrollHeight;
                }
            } catch(e) {}
        }

        // ========== АДМИНСКИЙ ЧАТ ==========
        
        async renderAdminChat(container) {
            this.role = 'admin';
            this.userId = 'admin';
            this.userName = 'Поддержка';
            this._currentDialog = null;
            
            const token = localStorage.getItem('admin_token');
            const isMobile = window.innerWidth < 768;
            
            container.innerHTML = `<div class="card"><h2>💬 Чат поддержки</h2><div class="loading">Загрузка...</div></div>`;
            
            try {
                const response = await fetch('/api/messages/admin/dialogs', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                const dialogs = Array.isArray(data) ? data.filter(d => d.sender_id !== '0') : [];
                const clientDialogs = dialogs.filter(d => d.sender_type === 'client');
                const managerDialogs = dialogs.filter(d => d.sender_type === 'manager');

                if (isMobile && this._currentDialog) {
                    container.innerHTML = `
                        <div class="card" id="chatMessages">
                            <button class="btn-back-chat" onclick="AquaGid.ChatService._currentDialog=null; AquaGid.ChatService.renderAdminChat(document.getElementById('content'));">← Назад к списку</button>
                            <p>Загрузка диалога...</p>
                        </div>`;
                    this._adminOpenDialog(this._currentDialog);
                    return;
                }

                let html = `<div class="card"><h2>💬 Чат поддержки</h2>`;

                const renderDialogItem = (d) => `
                    <div class="dialog-item" data-sid="${d.sender_id}" data-stype="${d.sender_type}"
                        style="padding:8px;border-radius:8px;cursor:pointer;margin-bottom:4px;
                                background:${this._currentDialog === d.sender_id ? '#e0e7ff' : d.status === 'new' ? '#fff3cd' : '#f9fafb'};">
                        <strong>${d.sender_name || d.sender_id}</strong>
                        <span style="font-size:11px;color:${d.status === 'new' ? '#dc2626' : '#6b7280'};float:right;">${d.status === 'new' ? '🆕' : '📖'}</span>
                        <div style="font-size:12px;color:#6b7280;">${this.escapeHtml(d.last_message || '')}</div>
                    </div>`;

                html += `
                    <div class="chat-layout" style="display:flex;gap:16px;">
                        <div class="chat-dialogs-list" style="width:${isMobile ? '100%' : '300px'};border-right:${isMobile ? 'none' : '1px solid #e5e7eb'};padding-right:${isMobile ? '0' : '16px'};">
                            <h3>👥 Клиенты</h3>
                            ${clientDialogs.length > 0 ? clientDialogs.map(renderDialogItem).join('') : '<p style="color:#6b7280;font-size:12px;">Нет обращений</p>'}
                            ${managerDialogs.length > 0 ? '<h3 style="margin-top:16px;">👔 Менеджеры</h3>' + managerDialogs.map(renderDialogItem).join('') : ''}
                        </div>
                        ${!isMobile ? `<div id="chatMessages" style="flex:1;"><p style="color:#6b7280;">Выберите диалог</p></div>` : ''}
                    </div></div>`;

                container.innerHTML = html;

                // Вешаем обработчики на диалоги
                container.querySelectorAll('.dialog-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const sid = item.dataset.sid;
                        const stype = item.dataset.stype;
                        this._adminOpenDialog(sid, stype);
                    });
                });

                // WebSocket
                if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                    this.connectWebSocket();
                }
                this.ws.onmessage = (e) => {
                    if (e.data === 'new_chat_message') {
                        if (this._currentDialog) {
                            this._adminOpenDialog(this._currentDialog);
                        } else {
                            this.renderAdminChat(document.getElementById('content'));
                        }
                    }
                };

            } catch (error) {
                container.innerHTML = `<div class="card error">Ошибка: ${error.message}</div>`;
            }
        }

        async _adminOpenDialog(senderId, senderType) {
            const token = localStorage.getItem('admin_token');
            const isMobile = window.innerWidth < 768;
            this._currentDialog = senderId;

            // Меняем статус
            fetch(`/api/messages/admin/dialog/${senderId}/status?status=viewed`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Цвет в списке
            document.querySelectorAll('.dialog-item').forEach(item => {
                if (item.dataset.sid === senderId) {
                    item.style.background = '#f9fafb';
                    const span = item.querySelector('span');
                    if (span) span.innerHTML = '📖';
                }
            });

            if (isMobile) {
                const content = document.getElementById('content');
                content.innerHTML = `
                    <div class="card" id="chatMessages">
                        <button class="btn-back-chat" onclick="AquaGid.ChatService._currentDialog=null; AquaGid.ChatService.renderAdminChat(document.getElementById('content'));">← Назад к списку</button>
                        <p>Загрузка...</p>
                    </div>`;
            }

            const response = await fetch(`/api/messages?client_phone=${encodeURIComponent(senderId)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const messages = await response.json();
            let clientName = (messages.find(m => m.sender_type === 'client' || m.sender_type === 'manager')?.title || '').replace('Сообщение от ', '') || 
    (senderType === 'manager' ? 'Менеджер' : 'Клиент');

            const msgContainer = document.getElementById('chatMessages');
            if (msgContainer) {
                msgContainer.innerHTML = `
                    ${isMobile ? `<button class="btn-close-chat" onclick="AquaGid.ChatService._currentDialog=null; AquaGid.ChatService.renderAdminChat(document.getElementById('content'));" style="float:right;background:none;border:none;font-size:20px;cursor:pointer;">✕</button>` : ''}
                    <h3>💬 ${this.escapeHtml(clientName)} <span style="font-size:14px;color:#6b7280;">${senderId}${senderType === 'manager' ? ' (менеджер)' : ''}</span>
                    </h3>
                    <div class="admin-chat-messages" style="max-height:${isMobile ? '60vh' : '400px'};">
                        ${messages.reverse().map(m => `
                            <div style="margin-bottom:8px;text-align:${m.sender_type === 'admin' ? 'right' : 'left'};">
                                <div style="display:inline-block;padding:8px 12px;border-radius:12px;max-width:70%;
                                            background:${m.sender_type === 'admin' ? '#0066CC' : '#e5e7eb'};
                                            color:${m.sender_type === 'admin' ? 'white' : '#333'};">
                                    ${this.escapeHtml(m.body || m.title)}
                                </div>
                                <div style="font-size:10px;color:#9ca3af;">${this.formatTime(m.created_at)}</div>
                            </div>`).join('')}
                    </div>
                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <input type="text" id="adminChatInput" placeholder="Ответ..." style="flex:1;padding:8px;border:1px solid #d1d5db;border-radius:6px;">
                        <button class="btn btn-primary" id="adminSendBtn">➤</button>
                    </div>
                    <div style="margin-top:8px;">
                        <button class="btn btn-sm" id="adminDeleteBtn" style="background:#dc2626;color:white;">❌ Удалить</button>
                    </div>`;

                document.getElementById('adminSendBtn').onclick = () => this._adminSendReply(senderId);
                document.getElementById('adminDeleteBtn').onclick = () => this._adminDeleteDialog(senderId);
            }

            document.querySelectorAll('.dialog-item').forEach(el => {
                if (el.dataset.sid === senderId) el.style.background = '#e0e7ff';
            });
        }

        async _adminSendReply(senderId) {
            const input = document.getElementById('adminChatInput');
            if (!input?.value.trim()) return;
            const token = localStorage.getItem('admin_token');
            await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    sender_type: 'admin',
                    sender_id: '0',
                    receiver_type: 'client',
                    receiver_id: senderId,
                    type: 'chat',
                    title: 'Ответ поддержки',
                    body: input.value.trim()
                })
            });
            input.value = '';
            this._adminOpenDialog(senderId);
        }

        async _adminDeleteDialog(senderId) {
            if (!confirm('Удалить диалог полностью?')) return;
            const token = localStorage.getItem('admin_token');
            await fetch(`/api/messages/dialog/${senderId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this._currentDialog = null;
            this.renderAdminChat(document.getElementById('content'));
        }

        render(container) {
            // Если уже отрендерен в этом контейнере — не дублируем
            if (container.querySelector('.chat-service')) return;
            this.container = container;
            container.innerHTML = `
                <div class="chat-service ${this.isOpen ? 'open' : ''}">
                    <button class="chat-service-btn" onclick="AquaGid.ChatService.toggle()">💬</button>
                    <div class="chat-service-window">
                        <div class="chat-service-header">
                            <span>💬 Поддержка</span>
                            <button onclick="AquaGid.ChatService.toggle()">✕</button>
                        </div>
                        <div class="chat-service-messages" id="chat-service-msgs">
                            <div class="chat-service-msg support">
                                <div class="chat-service-bubble">Здравствуйте! Чем могу помочь?</div>
                            </div>
                        </div>
                        <div class="chat-service-input">
                            <input type="text" id="chat-service-inp" placeholder="Сообщение..." onkeypress="if(event.key==='Enter'){AquaGid.ChatService.sendMessage(this.value);this.value=''}">
                            <button onclick="const i=document.getElementById('chat-service-inp'); AquaGid.ChatService.sendMessage(i.value); i.value=''">➤</button>
                        </div>
                    </div>
                </div>
            `;
        }

        renderMessages() {
            const container = document.getElementById('chat-service-msgs');
            if (!container) return;
            container.innerHTML = `
                <div class="chat-service-msg support">
                    <div class="chat-service-bubble">Здравствуйте! Чем могу помочь?</div>
                </div>
                ${this.messages.map(m => `
                    <div class="chat-service-msg ${m.type}">
                        <div class="chat-service-bubble">${this.escapeHtml(m.text)}</div>
                        <div class="chat-service-time">${this.formatTime(m.time)}</div>
                    </div>
                `).join('')}
            `;
            container.scrollTop = container.scrollHeight;
        }

        toggle() {
            this.isOpen = !this.isOpen;
            const window = document.querySelector('.chat-service-window');
            if (window) window.classList.toggle('open', this.isOpen);
            if (this.isOpen) {
                this.loadHistory();
                if (!this.ws) this.connectWebSocket();
            }
        }
    }

    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.ChatService = new ChatService();
})(typeof window !== 'undefined' ? window : global);