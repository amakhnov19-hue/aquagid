// ManagerCard.js - Карточка менеджера в админке

class ManagerCard {
    constructor(manager) {
        this.manager = manager;
        this.activeTab = 'info';
        this.boatsCache = null;
    }

    render() {
        return `
            <div class="manager-modal" id="managerModal">
                <div class="manager-modal__container">
                    <div class="manager-modal__header">
                        <h2 style="margin: 0; font-size: 20px;">👤 ${this.escapeHtml(this.manager.full_name || 'Менеджер')}</h2>
                        <button class="manager-modal__close" id="closeManagerModalBtn">✕</button>
                    </div>
                    <div class="manager-modal__tabs">
                        <button class="manager-tab ${this.activeTab === 'info' ? 'active' : ''}" data-tab="info">📋 Информация</button>
                        <button class="manager-tab ${this.activeTab === 'boats' ? 'active' : ''}" data-tab="boats">🚤 Катера</button>
                        <button class="manager-tab ${this.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">⚙️ Настройки</button>
                        <button class="manager-tab ${this.activeTab === 'chat' ? 'active' : ''}" data-tab="chat">💬 Чат</button>
                    </div>
                    <div class="manager-modal__content">
                        ${this.renderTabContent()}
                    </div>
                </div>
            </div>
        `;
    }

    renderTabContent() {
        switch (this.activeTab) {
            case 'info': return this.renderInfoTab();
            case 'boats': return '<div class="boats-loading">⏳ Загрузка катеров...</div>';
            case 'settings': return '<div class="settings-loading">⏳ Загрузка настроек...</div>';
            case 'chat': return '<div class="chat-placeholder">💬 Чат с менеджером (в разработке)</div>';
            default: return '';
        }
    }

    renderInfoTab() {
        const m = this.manager;
        return `
            <div class="info-tab">
                <div class="info-row"><span class="info-label">ID:</span> ${m.id}</div>
                <div class="info-row"><span class="info-label">ФИО:</span> ${this.escapeHtml(m.full_name) || '—'}</div>
                <div class="info-row"><span class="info-label">Компания:</span> ${this.escapeHtml(m.company_name) || '—'}</div>
                <div class="info-row"><span class="info-label">Телефон:</span> ${this.escapeHtml(m.phone) || '—'}</div>
                <div class="info-row"><span class="info-label">Email:</span> ${this.escapeHtml(m.email) || '—'}</div>
                <div class="info-row"><span class="info-label">Статус:</span> ${m.is_blocked ? '🔴 Заблокирован' : '🟢 Активен'}</div>
                <div class="info-row"><span class="info-label">Предоплата:</span> ${m.prepayment_percent || 20}%</div>
                <div class="info-row"><span class="info-label">Дата регистрации:</span> ${m.created_at ? new Date(m.created_at).toLocaleString() : '—'}</div>
                
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    ${m.is_blocked ? 
                        `<button class="btn-unblock" onclick="window.ManagerCardInstance.unblockManager(${m.id})" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">🔓 Разблокировать</button>` :
                        `<button class="btn-block" onclick="window.ManagerCardInstance.blockManager(${m.id})" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">🔒 Заблокировать</button>`
                    }
                </div>
            </div>
        `;
    }

    async loadBoats() {
        const container = document.querySelector('.manager-modal__content');
        if (!container) return;
        
        container.innerHTML = '<div class="boats-loading">⏳ Загрузка катеров...</div>';
        
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(`/api/admin/boats/manager/${this.manager.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Ошибка загрузки');
            
            const boats = await response.json();
            this.boatsCache = boats;
            
            if (!boats || boats.length === 0) {
                container.innerHTML = '<div class="empty-message">🚤 У менеджера нет катеров</div>';
                return;
            }
            
            let html = '<div class="boats-list">';
            boats.forEach(boat => {
                let pricingText = '';
                if (boat.pricing_method === 'percent') {
                    pricingText = `📈 Процентный (${boat.prepayment_percent || 20}%)`;
                } else if (boat.pricing_method === 'margin' || boat.pricing_method === 'fixed') {
                    pricingText = `💰 Фиксированная маржа`;
                } else {
                    pricingText = `❓ Неизвестный метод`;
                }
                
                const isActive = boat.is_active !== false;
                const statusBadge = isActive ? '🟢 Активен' : '🔴 Неактивен';
                const statusClass = isActive ? 'status-active' : 'status-blocked';
                
                html += `
                    <div class="boat-item" data-boat-id="${boat.id}" data-boat-name="${this.escapeHtml(boat.name)}" style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px; cursor: pointer;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <div style="font-weight: bold; font-size: 16px;">${this.escapeHtml(boat.name)}</div>
                            <button class="block-boat-btn" data-boat-id="${boat.id}" data-boat-name="${this.escapeHtml(boat.name)}" style="padding: 4px 12px; background: ${isActive ? '#ef4444' : '#10b981'}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                ${isActive ? '🔒 Деактивировать' : '🟢 Активировать'}
                            </button>
                        </div>
                        <div style="display: flex; gap: 16px; font-size: 14px; color: #666; margin-bottom: 8px; flex-wrap: wrap;">
                            <span>👥 ${boat.capacity || '—'} чел.</span>
                            <span>${pricingText}</span>
                            <span class="${statusClass}" style="font-size: 12px;">${statusBadge}</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
            
            document.querySelectorAll('.boat-item').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.classList.contains('block-boat-btn')) return;
                    const boatId = parseInt(card.getAttribute('data-boat-id'));
                    const boatName = card.getAttribute('data-boat-name');
                    this.showEditBoatForm(boatId, boatName);
                });
            });
            
            document.querySelectorAll('.block-boat-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const boatId = parseInt(btn.getAttribute('data-boat-id'));
                    const boatName = btn.getAttribute('data-boat-name');
                    const currentBoat = this.boatsCache?.find(b => b.id === boatId);
                    const newActiveState = !(currentBoat?.is_active !== false);
                    
                    const action = newActiveState ? 'активировать' : 'деактивировать';
                    const actionText = newActiveState ? '🟢 Активировать' : '🔴 Деактивировать';
                    
                    if (confirm(`${actionText} катер "${boatName}"?`)) {
                        try {
                            const response = await fetch(`/api/admin/boats/${boatId}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ is_active: newActiveState })
                            });
                            
                            if (!response.ok) throw new Error('Ошибка');
                            alert(`✅ Катер "${boatName}" ${action}`);
                            await this.loadBoats();
                        } catch (error) {
                            console.error('Ошибка:', error);
                            alert(`❌ Ошибка ${action === 'активировать' ? 'активации' : 'деактивации'} катера`);
                        }
                    }
                });
            });
            
        } catch (error) {
            console.error('Ошибка загрузки катеров:', error);
            container.innerHTML = '<div class="error-message">❌ Ошибка загрузки катеров</div>';
        }
    }

    async loadSettings() {
        const container = document.querySelector('.manager-modal__content');
        if (!container) return;
        
        container.innerHTML = '<div class="settings-loading">⏳ Загрузка настроек...</div>';
        
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(`/api/settings/${this.manager.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Ошибка загрузки');
            
            const settings = await response.json();
            
            container.innerHTML = `
                <div class="settings-tab">
                    <h3>⚙️ Настройки менеджера (только для чтения)</h3>
                    <div class="info-row"><span class="info-label">Сезон:</span> ${settings.season_start || '—'} — ${settings.season_end || '—'}</div>
                    <div class="info-row"><span class="info-label">Рабочее время:</span> ${settings.work_start || '—'} — ${settings.work_end || '—'}</div>
                    <div class="info-row"><span class="info-label">Макс. длительность:</span> ${settings.max_duration || '—'} ч</div>
                    <div class="info-row"><span class="info-label">Уведомления о новых бронях:</span> ${settings.notify_new_bookings ? '✅' : '❌'}</div>
                    <div class="info-row"><span class="info-label">Уведомления об отменах:</span> ${settings.notify_cancellations ? '✅' : '❌'}</div>
                    <div class="info-row"><span class="info-label">Уведомления об отзывах:</span> ${settings.notify_reviews ? '✅' : '❌'}</div>
                    <div class="info-row"><span class="info-label">Уведомления от админа:</span> ${settings.notify_admin ? '✅' : '❌'}</div>
                </div>
            `;
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
            container.innerHTML = '<div class="error-message">❌ Ошибка загрузки настроек</div>';
        }
    }

    async blockManager(managerId) {
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(`/api/admin/managers/${managerId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'blocked' })
            });
            
            if (!response.ok) throw new Error('Ошибка блокировки');
            
            alert('✅ Менеджер заблокирован');
            this.close();
            if (window.AdminApp) window.AdminApp.loadManagers();
        } catch (error) {
            console.error('Ошибка:', error);
            alert('❌ Ошибка блокировки');
        }
    }

    async unblockManager(managerId) {
        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(`/api/admin/managers/${managerId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'active' })
            });
            
            if (!response.ok) throw new Error('Ошибка разблокировки');
            
            alert('✅ Менеджер разблокирован');
            this.close();
            if (window.AdminApp) window.AdminApp.loadManagers();
        } catch (error) {
            console.error('Ошибка:', error);
            alert('❌ Ошибка разблокировки');
        }
    }

    showEditBoatForm(boatId, boatName) {
        const token = localStorage.getItem('access_token');
        
        const fetchBoat = async () => {
            const response = await fetch(`/api/admin/boats/manager/${this.manager.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const boats = await response.json();
            return boats.find(b => b.id === boatId);
        };
        
        fetchBoat().then(boatData => {
            if (!boatData) {
                alert('Катер не найден');
                return;
            }
            
            const modal = document.createElement('div');
            modal.id = 'editBoatModal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000;';
            
            const pricingMethod = boatData.pricing_method || 'percent';
            
            modal.innerHTML = `
                <div style="background: #ffffff; border-radius: 16px; padding: 28px; width: 520px; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.3); color: #1e293b;">
                    <h3 style="margin: 0 0 20px 0; font-size: 20px; color: #1e293b;">✏️ Редактировать катер: ${this.escapeHtml(boatName)}</h3>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Название (только чтение):</label>
                        <input type="text" id="editBoatName" value="${this.escapeHtml(boatData.name || '')}" readonly style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #f3f4f6; color: #1f2937; cursor: not-allowed;">
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Метод расчёта:</label>
                        <select id="editBoatPricingMethod" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff;">
                            <option value="percent" ${pricingMethod === 'percent' ? 'selected' : ''}>📈 Процентный (процент от цены)</option>
                            <option value="margin" ${pricingMethod === 'margin' ? 'selected' : ''}>💰 Фиксированная маржа</option>
                            <option value="fixed" ${pricingMethod === 'fixed' ? 'selected' : ''}>💰 Фиксированная (разница цен)</option>
                        </select>
                    </div>
                    
                    <div id="pricingFields" style="margin-bottom: 16px;"></div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Вместимость (только чтение):</label>
                        <input type="number" id="editBoatCapacity" value="${boatData.capacity || ''}" readonly style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #f3f4f6; color: #1f2937; cursor: not-allowed;">
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Краткое описание (только чтение):</label>
                        <textarea id="editBoatDescription" rows="3" readonly style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #f3f4f6; color: #1f2937; resize: vertical;">${this.escapeHtml(boatData.description_short || '')}</textarea>
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Адрес посадки (только чтение):</label>
                        <input type="text" id="editBoatAddress" value="${this.escapeHtml(boatData.boarding_address || '')}" readonly style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #f3f4f6; color: #1f2937; cursor: not-allowed;">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="editBoatIsActive" ${boatData.is_active !== false ? 'checked' : ''} style="width: 18px; height: 18px;">
                            <span style="font-weight: 600; color: #374151;">🟢 Катер активен (отображается клиентам)</span>
                        </label>
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="cancelEditBoatBtn" style="padding: 10px 20px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">Отмена</button>
                        <button id="saveEditBoatBtn" style="padding: 10px 20px; background: #0066CC; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">Сохранить</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const updatePricingFields = () => {
                const method = document.getElementById('editBoatPricingMethod').value;
                const container = document.getElementById('pricingFields');
                
                if (method === 'percent') {
                    container.innerHTML = `
                        <div style="margin-bottom: 14px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Цена за час (₽):</label>
                            <input type="number" id="editBoatPricePerHour" value="${boatData.price_per_hour || ''}" step="100" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff;">
                        </div>
                        <div style="margin-bottom: 14px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Процент предоплаты (%):</label>
                            <input type="number" id="editBoatPrepaymentPercent" value="${boatData.prepayment_percent || 20}" min="0" max="100" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff;">
                        </div>
                    `;
                } else {
                    container.innerHTML = `
                        <div style="margin-bottom: 14px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Открытая цена (для клиентов) (₽):</label>
                            <input type="number" id="editBoatOpenPrice" value="${boatData.open_price || ''}" step="100" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff;">
                        </div>
                        <div style="margin-bottom: 14px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Агентская цена (для нас) (₽):</label>
                            <input type="number" id="editBoatAgentPrice" value="${boatData.agent_price || ''}" step="100" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff;">
                        </div>
                    `;
                }
            };
            
            updatePricingFields();
            document.getElementById('editBoatPricingMethod').addEventListener('change', updatePricingFields);
            
            document.getElementById('cancelEditBoatBtn').addEventListener('click', () => {
                document.getElementById('editBoatModal')?.remove();
            });
            
            document.getElementById('saveEditBoatBtn').addEventListener('click', async () => {
                const method = document.getElementById('editBoatPricingMethod').value;
                const data = {
                    name: document.getElementById('editBoatName').value,
                    pricing_method: method,
                    capacity: parseInt(document.getElementById('editBoatCapacity').value) || null,
                    description_short: document.getElementById('editBoatDescription').value,
                    boarding_address: document.getElementById('editBoatAddress').value,
                    is_active: document.getElementById('editBoatIsActive').checked
                };
                
                if (method === 'percent') {
                    data.price_per_hour = parseFloat(document.getElementById('editBoatPricePerHour')?.value) || null;
                    data.approved_prepayment_percent = parseInt(document.getElementById('editBoatPrepaymentPercent')?.value) || 20;
                } else {
                    data.open_price = parseFloat(document.getElementById('editBoatOpenPrice')?.value) || null;
                    data.agent_price = parseFloat(document.getElementById('editBoatAgentPrice')?.value) || null;
                }
                
                try {
                    const response = await fetch(`/api/admin/boats/${boatId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(data)
                    });
                    
                    if (!response.ok) throw new Error('Ошибка сохранения');
                    
                    alert('✅ Катер обновлён');
                    document.getElementById('editBoatModal')?.remove();
                    await this.loadBoats();
                } catch (error) {
                    console.error('Ошибка:', error);
                    alert('❌ Ошибка сохранения');
                }
            });
        });
    }

    async show() {
        const existing = document.getElementById('managerModal');
        if (existing) existing.remove();
        
        document.body.insertAdjacentHTML('beforeend', this.render());
        
        const closeBtn = document.getElementById('closeManagerModalBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        const modal = document.getElementById('managerModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
        }
        
        document.querySelectorAll('.manager-tab').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tab = btn.getAttribute('data-tab');
                await this.switchTab(tab);
            });
        });
        
        if (this.activeTab === 'boats') {
            await this.loadBoats();
        }
        
        window.ManagerCardInstance = this;
    }
    
    async switchTab(tabId) {
        this.activeTab = tabId;
        
        document.querySelectorAll('.manager-tab').forEach(btn => {
            const tab = btn.getAttribute('data-tab');
            if (tab === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        const contentDiv = document.querySelector('.manager-modal__content');
        if (contentDiv) {
            contentDiv.innerHTML = this.renderTabContent();
            
            if (tabId === 'boats') {
                await this.loadBoats();
            } else if (tabId === 'settings') {
                await this.loadSettings();
            }
        }
    }
    
    close() {
        const modal = document.getElementById('managerModal');
        if (modal) modal.remove();
    }
    
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
}

if (typeof window !== 'undefined') {
    window.ManagerCard = ManagerCard;
}