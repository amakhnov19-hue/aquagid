// app.js — основная логика админки

let currentView = 'dashboard';

async function loadView(view) {
    const content = document.getElementById('content');
    content.innerHTML = '<div class="loading">Загрузка...</div>';
    
    switch(view) {
        case 'dashboard':
            await renderDashboard(content);
            break;
        case 'managers':
            await renderManagers(content);
            break;
        case 'invites':
            await renderInvites(content);
            break;
        case 'settings':
            await renderSettings(content);
            break;
        case 'diagnostics':
            content.innerHTML = `<iframe src="/diagnostics" style="width:100%;height:calc(100vh - 120px);border:none;border-radius:8px;"></iframe>`;
            break;
        case 'documents':
            await renderDocuments(content);
            break;
        case 'chat':
            await renderChat(content);
            break;                    
        default:
            content.innerHTML = '<div class="card">Раздел в разработке</div>';
    }
}

async function renderDashboard(container) {
    container.innerHTML = `
        <div class="card">
            <h2>📊 Дашборд</h2>
            <p>Добро пожаловать в админ-панель!</p>
        </div>
    `;
}

async function renderManagers(container) {
    try {
        const managers = await getManagers();
        
        container.innerHTML = `
            <div class="card">
                <h2>👥 Менеджеры</h2>
                <div style="overflow-x: auto;">
                    <table class="data-table">
                        <thead>
                            <tr><th>ID</th><th>Имя</th><th>Телефон</th><th>Метод расчёта</th><th>Статус</th><th>Действия</th></tr>
                        </thead>
                        <tbody>
                            ${managers.map(m => `
                                <tr data-manager-id="${m.id}">
                                    <td>${m.id}</td>
                                    <td>${this?.escapeHtml ? this.escapeHtml(m.name || '—') : m.name || '—'}</td>
                                    <td>
                                        <a href="tel:${m.phone || ''}" class="phone-link" data-phone="${m.phone || ''}" style="text-decoration: none; color: #3b82f6;">
                                            ${m.phone || '—'}
                                        </a>
                                        <button class="copy-phone-btn" data-phone="${m.phone || ''}" style="margin-left: 8px; padding: 2px 6px; background: #e5e7eb; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">📋</button>
                                    </td>
                                    <td>
                                        <select class="pricing-method-select" data-manager-id="${m.id}" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #d1d5db;">
                                            <option value="percent" ${m.pricing_method === 'percent' ? 'selected' : ''}>Процентный (%)</option>
                                            <option value="margin" ${m.pricing_method === 'margin' ? 'selected' : ''}>Фиксированная маржа</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button class="status-toggle" data-manager-id="${m.id}" data-status="${m.status}" style="background: none; border: none; cursor: pointer;">
                                            <span class="status-dot ${m.status === 'active' ? 'status-green' : 'status-red'}"></span>
                                        </button>
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-view-manager" data-manager-id="${m.id}">📋 Подробнее</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Прямая привязка кнопок Подробнее
        document.querySelectorAll('.btn-view-manager').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const managerId = parseInt(btn.getAttribute('data-manager-id'));
                try {
                    const managers = await getManagers();
                    const manager = managers.find(m => m.id === managerId);
                    if (manager && window.ManagerCard) {
                        new window.ManagerCard(manager).show();
                    } else if (manager && !window.ManagerCard) {
                        console.error('ManagerCard не загружен, перезагрузите страницу');
                        alert('Ошибка: компонент не загружен. Обновите страницу.');
                    } else {
                        console.error('Менеджер не найден');
                    }
                } catch (error) {
                    console.error('Ошибка:', error);
                }
            });
        });
        
        // Обработчики для копирования телефона
        document.querySelectorAll('.copy-phone-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const phone = btn.getAttribute('data-phone');
                if (phone) {
                    try {
                        await navigator.clipboard.writeText(phone);
                        alert(`📱 Телефон ${phone} скопирован`);
                    } catch (err) {
                        alert('Не удалось скопировать');
                    }
                }
            });
        });
        
        // Обработчики для изменения метода расчёта
        document.querySelectorAll('.pricing-method-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const managerId = parseInt(select.getAttribute('data-manager-id'));
                const newMethod = select.value;
                if (confirm(`Изменить метод расчёта предоплаты на "${newMethod === 'percent' ? 'Процентный' : 'Фиксированная маржа'}"?`)) {
                    try {
                        const token = localStorage.getItem('admin_token');
                        const response = await fetch(`/api/admin/managers/${managerId}/pricing-method`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ pricing_method: newMethod })
                        });
                        if (!response.ok) throw new Error('Ошибка');
                        alert('✅ Метод расчёта обновлён');
                        loadView('managers');
                    } catch (error) {
                        alert('❌ Ошибка обновления');
                    }
                } else {
                    select.value = select.getAttribute('data-old-value') || 'percent';
                }
                select.setAttribute('data-old-value', select.value);
            });
            select.setAttribute('data-old-value', select.value);
        });
        
        // Обработчики для статуса (кликабельный значок)
        document.querySelectorAll('.status-toggle').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const managerId = parseInt(btn.getAttribute('data-manager-id'));
                const currentStatus = btn.getAttribute('data-status');
                const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
                
                // Проверяем наличие бронирований
                try {
                    const token = localStorage.getItem('admin_token');
                    const response = await fetch(`/api/admin/managers/${managerId}/bookings-check`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await response.json();
                    const hasActiveBookings = data.has_active_bookings || false;
                    const bookingsCount = data.active_bookings_count || 0;
                    
                    let confirmMessage = `Изменить статус на "${newStatus === 'active' ? 'Активен' : 'Заблокирован'}"?`;
                    if (hasActiveBookings && newStatus === 'blocked') {
                        confirmMessage = `⚠️ У менеджера есть ${bookingsCount} активных бронирований!\n\nБлокировка не повлияет на существующие бронирования, но менеджер не сможет создавать новые.\n\nПродолжить?`;
                    }
                    
                    if (confirm(confirmMessage)) {
                        const updateResponse = await fetch(`/api/admin/managers/${managerId}/status`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ status: newStatus })
                        });
                        if (!updateResponse.ok) throw new Error('Ошибка');
                        alert(`✅ Статус изменён на "${newStatus === 'active' ? 'Активен' : 'Заблокирован'}"`);
                        loadView('managers');
                    }
                } catch (error) {
                    console.error('Ошибка:', error);
                    alert('❌ Ошибка при проверке бронирований');
                }
            });
        });
        
    } catch (error) {
        container.innerHTML = `<div class="card error">Ошибка: ${error.message}</div>`;
    }
}

async function renderInvites(container) {
    container.innerHTML = `
        <div class="card">
            <h2>✉️ Создать приглашение</h2>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="invitePhone" placeholder="+7XXXXXXXXXX" style="flex: 1; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px;">
                <button class="btn btn-primary" onclick="createInviteLink()">Создать ссылку</button>
                <button class="btn btn-secondary" id="clearInvitePhoneBtn" style="background: #6b7280; color: white;">✖️ Очистить</button>
            </div>
            <div id="inviteResult" style="margin-top: 16px; display: none;">
                <p>Ссылка для регистрации:</p>
                <code id="inviteUrl" style="background: #f3f4f6; padding: 8px; display: block; word-break: break-all;"></code>
                <button class="btn btn-sm" onclick="copyInviteUrl()">📋 Копировать</button>
            </div>
        </div>
    `;
    
    // Добавляем обработчик для кнопки очистки
    const clearBtn = document.getElementById('clearInvitePhoneBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const phoneInput = document.getElementById('invitePhone');
            if (phoneInput) {
                phoneInput.value = '';
                phoneInput.focus();
            }
            // Также скрываем предыдущий результат
            const inviteResult = document.getElementById('inviteResult');
            if (inviteResult) {
                inviteResult.style.display = 'none';
            }
        });
    }
}

async function renderSettings(container) {
    const token = localStorage.getItem('admin_token');
    
    container.innerHTML = `
        <div class="card">
            <h2>⚙️ Глобальные настройки</h2>
            <div class="settings-loading">⏳ Загрузка настроек...</div>
        </div>
    `;
    
    try {
        const response = await fetch('/api/admin/global-settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const settings = await response.json();
        
        container.innerHTML = `
            <div class="card">
                <h2>⚙️ Глобальные настройки</h2>
                <form id="globalSettingsForm" class="settings-form">
                    <div class="form-group">
                        <label>Начало сезона:</label>
                        <input type="date" id="season_start" value="${settings.season_start || ''}" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Конец сезона:</label>
                        <input type="date" id="season_end" value="${settings.season_end || ''}" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Начало работы:</label>
                        <input type="time" id="work_start" value="${settings.work_start || '11:00'}" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Конец работы:</label>
                        <input type="time" id="work_end" value="${settings.work_end || '23:30'}" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Макс. длительность (часы):</label>
                        <input type="number" id="max_duration" value="${settings.max_duration || 8}" min="1" max="12" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Перерыв (минуты):</label>
                        <input type="number" id="break_minutes" value="${settings.break_minutes || 30}" min="0" max="120" step="15" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Мин. длительность (часы):</label>
                        <input type="number" id="min_duration" value="${settings.min_duration || 1}" min="1" max="4" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Предоплата по умолчанию (%):</label>
                        <input type="number" id="default_prepayment_percent" value="${settings.default_prepayment_percent || 20}" min="0" max="100" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Шаг слотов времени (минуты):</label>
                        <input type="number" id="slot_step_minutes" value="${settings.slot_step_minutes || 30}" min="15" max="60" step="15" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Максимум фото на катер:</label>
                        <input type="number" id="max_photos_per_boat" value="${settings.max_photos_per_boat || 5}" min="1" max="10" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Длительность анимаций (мс):</label>
                        <input type="number" id="animation_duration_ms" value="${settings.animation_duration_ms || 300}" min="0" max="1000" step="50" class="form-input">
                    </div>
                    <button type="submit" class="btn-save-settings">💾 Сохранить настройки</button>
                </form>
            </div>
        `;
        
        const form = document.getElementById('globalSettingsForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    season_start: document.getElementById('season_start').value || null,
                    season_end: document.getElementById('season_end').value || null,
                    work_start: document.getElementById('work_start').value,
                    work_end: document.getElementById('work_end').value,
                    max_duration: parseInt(document.getElementById('max_duration').value),
                    break_minutes: parseInt(document.getElementById('break_minutes').value),
                    min_duration: parseInt(document.getElementById('min_duration').value),
                    default_prepayment_percent: parseInt(document.getElementById('default_prepayment_percent').value),
                    slot_step_minutes: parseInt(document.getElementById('slot_step_minutes').value),
                    max_photos_per_boat: parseInt(document.getElementById('max_photos_per_boat').value),
                    animation_duration_ms: parseInt(document.getElementById('animation_duration_ms').value)                    
                };
                
                try {
                    const saveResponse = await fetch('/api/admin/global-settings', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(formData)
                    });
                    
                    if (!saveResponse.ok) throw new Error('Ошибка сохранения');
                    
                    alert('✅ Глобальные настройки сохранены');
                    await renderSettings(container);
                } catch (error) {
                    console.error('Ошибка:', error);
                    alert('❌ Ошибка сохранения настроек');
                }
            });
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = `<div class="card error">Ошибка загрузки настроек: ${error.message}</div>`;
    }
}

async function renderDocuments(container) {
    const token = localStorage.getItem('admin_token');
    
    container.innerHTML = `<div class="card"><h2>📄 Документы</h2><div class="loading">Загрузка...</div></div>`;
    
    try {
        const response = await fetch('/api/documents/admin/all', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const docs = data.documents || [];
        
        let html = `
            <div class="card">
                <h2>📄 Документы</h2>
                <p style="color:#6b7280;margin-bottom:16px;">Управление текстами для клиентов и менеджеров.</p>
                <table class="data-table">
                    <thead><tr><th>ID</th><th>Название</th><th>Клиент</th><th>Менеджер</th><th>Действия</th></tr></thead>
                    <tbody>
        `;
        
        docs.forEach(doc => {
            html += `
                <tr>
                    <td>${doc.id}</td>
                    <td><strong>${doc.title}</strong></td>
                    <td>${doc.show_in_client ? '✅' : '—'}</td>
                    <td>${doc.show_in_manager ? '✅' : '—'}</td>
                    <td>
                        <button class="btn btn-sm" onclick="openDocumentModal('edit', ${doc.id}, '${doc.title.replace(/'/g, "\\'")}', ${doc.show_in_client}, ${doc.show_in_manager})">✏️</button>
                        <button class="btn btn-sm" onclick="viewDocument(${doc.id})">👁</button>
                        <button class="btn btn-sm" style="background:#ef4444;color:white;" onclick="deleteDocument(${doc.id})">🗑</button>
                    </td>
                </tr>
            `;
        });
        
        html += `</tbody></table>
            <button class="btn btn-primary" style="margin-top:16px;" onclick="openDocumentModal('add')">➕ Добавить документ</button>
            </div>
            <div id="docPreview" class="card" style="display:none;margin-top:16px;"></div>
            <div id="documentModal" class="modal" style="display:none;"></div>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        container.innerHTML = `<div class="card error">Ошибка: ${error.message}</div>`;
    }
}

// === Модальное окно документа ===

window.openDocumentModal = function(mode, id, title, showClient, showManager) {
    const modal = document.getElementById('documentModal');
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="background:white;border-radius:12px;padding:24px;max-width:600px;width:100%;max-height:80vh;overflow-y:auto;">
            <h3>${mode === 'add' ? '➕ Новый документ' : '✏️ Редактировать'}</h3>
            
            <div class="form-group">
                <label>Название:</label>
                <input type="text" id="docTitle" value="${title || ''}" class="form-input" placeholder="Например: Оферта для клиентов">
            </div>
            
            <div class="form-group">
                <label>Где показывать:</label>
                <div style="display:flex;gap:16px;">
                    <label><input type="checkbox" id="docShowClient" ${showClient ? 'checked' : ''}> Клиентам</label>
                    <label><input type="checkbox" id="docShowManager" ${showManager ? 'checked' : ''}> Менеджерам</label>
                </div>
            </div>
            
            <div class="form-group">
                <label>Файл (.txt):</label>
                <div style="display:flex;gap:8px;align-items:center;">
                    <input type="text" id="docFileName" class="form-input" readonly placeholder="Файл не выбран" style="flex:1;">
                    <input type="file" id="docFileInput" accept=".txt" style="display:none;" onchange="onFileSelected(this)">
                    <button class="btn btn-secondary" onclick="document.getElementById('docFileInput').click()">📁 Выбрать</button>
                    <button class="btn btn-sm" style="background:#ef4444;color:white;" onclick="clearFile()">✖</button>
                </div>
            </div>
            
            <div class="form-group">
                <label>Предпросмотр:</label>
                <div id="docPreviewArea" style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;max-height:200px;overflow-y:auto;background:#f9fafb;min-height:60px;color:#9ca3af;">
                    Текст появится здесь после выбора файла
                </div>
            </div>
            
            <div style="display:flex;gap:8px;margin-top:16px;">
                <button class="btn btn-primary" onclick="saveDocument('${mode}', ${id || 0})">💾 Сохранить</button>
                <button class="btn btn-secondary" onclick="document.getElementById('documentModal').style.display='none'">Отмена</button>
            </div>
        </div>
    `;
    
    // Клик вне модалки — закрыть
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.style.display = 'none';
    });
};

window.onFileSelected = function(input) {
    const file = input.files[0];
    if (!file) return;
    
    document.getElementById('docFileName').value = file.name;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('docPreviewArea');
        preview.innerHTML = e.target.result.replace(/\n/g, '<br>');
        preview.style.color = '#333';
    };
    reader.readAsText(file);
};

window.clearFile = function() {
    document.getElementById('docFileName').value = '';
    document.getElementById('docFileInput').value = '';
    document.getElementById('docPreviewArea').innerHTML = 'Текст появится здесь после выбора файла';
    document.getElementById('docPreviewArea').style.color = '#9ca3af';
};

window.saveDocument = async function(mode, id) {
    const title = document.getElementById('docTitle').value.trim();
    if (!title) { alert('Введите название'); return; }
    
    const showClient = document.getElementById('docShowClient').checked;
    const showManager = document.getElementById('docShowManager').checked;
    
    if (!showClient && !showManager) {
        if (!confirm('Документ нигде не будет показан. Продолжить?')) return;
    }
    
    const fileInput = document.getElementById('docFileInput');
    const file = fileInput.files[0];
    
    let content = '';
    if (file) {
        content = await file.text();
    } else if (mode === 'edit') {
        // Без нового файла — оставляем старый контент
        content = '__KEEP__';
    }
    
    const token = localStorage.getItem('admin_token');
    const key = title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-zа-я0-9_]/g, '').substring(0, 50) + '_' + Date.now();
    
    let url, method, body;
    
    if (mode === 'add') {
        url = '/api/documents/admin';
        method = 'POST';
        body = { key, title, content, show_in_client: showClient, show_in_manager: showManager, sort_order: 0 };
    } else {
        url = `/api/documents/admin/${id}`;
        method = 'PUT';
        body = { title, show_in_client: showClient, show_in_manager: showManager };
        if (content !== '__KEEP__') body.content = content;
    }
    
    const response = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });
    
    if (response.ok) {
        document.getElementById('documentModal').style.display = 'none';
        alert('✅ Документ сохранён');
        loadView('documents');
    } else {
        const err = await response.json();
        alert('❌ Ошибка: ' + (err.detail || 'сохранения'));
    }
};

// === ЧАТ ПОДДЕРЖКИ ===

let currentDialog = null;

async function renderChat(container) {
    const token = localStorage.getItem('admin_token');
    
    container.innerHTML = `<div class="card"><h2>💬 Чат поддержки</h2><div class="loading">Загрузка...</div></div>`;
    
    try {
        const response = await fetch('/api/messages/admin/dialogs', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dialogs = await response.json();
        
        let html = `<div class="card"><h2>💬 Чат поддержки</h2>`;
        
        if (dialogs.length === 0) {
            html += `<p style="color:#6b7280;">Нет обращений</p></div>`;
        } else {
            html += `
                <div style="display:flex;gap:16px;">
                    <div style="width:300px;border-right:1px solid #e5e7eb;padding-right:16px;">
                        <h3>Диалоги</h3>
                        ${dialogs.map(d => `
                            <div class="dialog-item" onclick="openDialog('${d.sender_id}', '${d.sender_type}')" 
                                 style="padding:8px;border-radius:8px;cursor:pointer;margin-bottom:4px;background:${currentDialog === d.sender_id ? '#e0e7ff' : '#f9fafb'};">
                                <strong>${d.sender_id}</strong>
                                <span style="font-size:11px;color:${d.status === 'new' ? '#dc2626' : '#6b7280'};float:right;">${d.status}</span>
                                <div style="font-size:12px;color:#6b7280;">${d.last_message || ''}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div id="chatMessages" style="flex:1;">
                        <p style="color:#6b7280;">Выберите диалог</p>
                    </div>
                </div>
            </div>`;
        }
        
        container.innerHTML = html;

        // Подключаем WebSocket для админа
        if (!window._adminWs) {
            const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${location.host}/api/sync/ws/admin`;
            window._adminWs = new WebSocket(wsUrl);
            window._adminWs.onopen = () => console.log('✅ WebSocket админа подключён');
            window._adminWs.onmessage = (event) => {
                console.log('📩 Админ WebSocket:', event.data);
                if (event.data === 'new_chat_message') {
                    if (window._currentDialog) {
                        openDialog(window._currentDialog, 'client');
                    } else {
                        loadView('chat');
                    }
                }
            };
        }        
        
    } catch (error) {
        container.innerHTML = `<div class="card error">Ошибка: ${error.message}</div>`;
    }
}

window.openDialog = async function(senderId, senderType) {
    currentDialog = senderId;
    window._currentDialog = senderId;
    const token = localStorage.getItem('admin_token');
    
    const response = await fetch(`/api/messages?client_phone=${encodeURIComponent(senderId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const messages = await response.json();
    
    const msgContainer = document.getElementById('chatMessages');
    if (msgContainer) {
        msgContainer.innerHTML = `
            <h3>${senderId} (${senderType})</h3>
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;max-height:400px;overflow-y:auto;margin-bottom:12px;background:#f9fafb;">
                ${messages.reverse().map(m => `
                    <div style="margin-bottom:8px;text-align:${m.sender_type === 'admin' ? 'right' : 'left'};">
                        <div style="display:inline-block;padding:8px 12px;border-radius:12px;max-width:70%;background:${m.sender_type === 'admin' ? '#0066CC' : '#e5e7eb'};color:${m.sender_type === 'admin' ? 'white' : '#333'};">
                            ${m.body || m.title}
                        </div>
                        <div style="font-size:10px;color:#9ca3af;">${m.created_at ? new Date(m.created_at).toLocaleTimeString() : ''}</div>
                    </div>
                `).join('')}
            </div>
            <div style="display:flex;gap:8px;">
                <input type="text" id="adminChatInput" placeholder="Ответ..." style="flex:1;padding:8px;border:1px solid #d1d5db;border-radius:6px;">
                <button class="btn btn-primary" onclick="sendAdminReply('${senderId}')">➤</button>
            </div>
            <div style="margin-top:8px;">
                <button class="btn btn-sm" onclick="closeDialog('${senderId}')">✅ Закрыть диалог</button>
            </div>
        `;
    }
    
    // Обновляем подсветку в списке диалогов
    document.querySelectorAll('.dialog-item').forEach(el => {
        el.style.background = el.onclick?.toString().includes(senderId) ? '#e0e7ff' : '#f9fafb';
    });
};

window.sendAdminReply = async function(senderId) {
    const input = document.getElementById('adminChatInput');
    const message = input.value.trim();
    if (!message) return;
    
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
            body: message
        })
    });
    
    input.value = '';
    openDialog(senderId, 'client');
};

window.closeDialog = async function(senderId) {
    const token = localStorage.getItem('admin_token');
    await fetch(`/api/messages/admin/dialog/${senderId}/status?status=closed`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    alert('✅ Диалог закрыт');
    loadView('chat');
};

window.viewDocument = async function(id) {
    const token = localStorage.getItem('admin_token');
    const response = await fetch('/api/documents/admin/all', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    const doc = (data.documents || []).find(d => d.id === id);
    
    const preview = document.getElementById('docPreview');
    if (doc && preview) {
        preview.style.display = 'block';
        preview.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <h3>👁 ${doc.title}</h3>
                <button class="btn btn-sm" onclick="document.getElementById('docPreview').style.display='none'">✕</button>
            </div>
            <p style="color:#6b7280;font-size:12px;">Клиент: ${doc.show_in_client ? 'Да' : 'Нет'} | Менеджер: ${doc.show_in_manager ? 'Да' : 'Нет'}</p>
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-top:8px;max-height:400px;overflow-y:auto;background:#fff;">
                ${doc.content}
            </div>
        `;
    }
};

window.deleteDocument = async function(id) {
    if (!confirm('Удалить документ навсегда?')) return;
    const token = localStorage.getItem('admin_token');
    const response = await fetch(`/api/documents/admin/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
        alert('✅ Документ удалён');
        loadView('documents');
    } else {
        alert('❌ Ошибка удаления');
    }
};

window.createInviteLink = async function() {
    const phone = document.getElementById('invitePhone').value;
    if (!phone) {
        alert('Введите номер телефона');
        return;
    }
    
    try {
        const result = await createInvite(phone);
        const url = result.invite_url;
        document.getElementById('inviteUrl').textContent = url;
        document.getElementById('inviteResult').style.display = 'block';
    } catch (error) {
        alert('Ошибка: ' + error.message);
    }
};

window.copyInviteUrl = function() {
    const url = document.getElementById('inviteUrl').textContent;
    navigator.clipboard.writeText(url);
    alert('Ссылка скопирована');
};

document.querySelector('.nav').addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item');
    if (!item) return;
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');
    currentView = item.dataset.view;
    loadView(currentView);
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    logout();
});

loadView('dashboard');