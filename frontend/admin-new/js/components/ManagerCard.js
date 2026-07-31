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
                <button class="btn-delete" onclick="window.ManagerCardInstance.deleteManager(${m.id})" style="background: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">🗑 Удалить менеджера</button>
                <div class="info-row"><span class="info-label">Предоплата:</span> ${m.prepayment_percent || 20}%</div>
                <div class="info-row"><span class="info-label">Реферальный код:</span> ${this.escapeHtml(m.referral_code) || '—'}</div>
                <div class="info-row"><span class="info-label">Скидка по рефералу:</span> ${m.referral_discount_percent || 10}%</div>
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
        
        const token = localStorage.getItem('admin_token');
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
                pricingText = `${(boat.price_per_hour || 0).toLocaleString()} ₽/час`;
                
                const isActive = boat.is_active !== false;
                const statusBadge = isActive ? '🟢 Активен' : '🔴 Неактивен';
                const statusClass = isActive ? 'status-active' : 'status-blocked';
                
                html += `
                    <div class="boat-item" data-boat-id="${boat.id}" data-boat-name="${this.escapeHtml(boat.name)}" style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px; cursor: pointer;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <div style="font-weight: bold; font-size: 16px;">${this.escapeHtml(boat.name)}</div>
                            <div style="font-size: 12px; color: #3b82f6; margin: 4px 0;">
                                🔗 <a href="https://24aquabooking.ru/${boat.slug}" target="_blank" style="color: #3b82f6; text-decoration: underline;">
                                    https://24aquabooking.ru/${boat.slug}
                                </a>
                            </div>
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

        const token = localStorage.getItem('admin_token');

        // Загружаем список платёжных аккаунтов
        setTimeout(async () => {
            const paSelect = document.getElementById('paymentAccountSelect');
            if (!paSelect) return;
            try {
                const resp = await fetch('/api/payment-accounts', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await resp.json();
                (data.accounts || []).forEach(acc => {
                    const option = document.createElement('option');
                    option.value = acc.id;
                    option.textContent = `${acc.name} (${acc.bank})`;
                    if (acc.id === this.manager.payment_account_id) option.selected = true;
                    paSelect.appendChild(option);
                });
            } catch(e) {}
        }, 200);
        
        try {
            const response = await fetch(`/api/settings/${this.manager.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Ошибка загрузки');
            
            const settings = await response.json();
            
            container.innerHTML = `
                <div class="settings-tab">
                    <h3>⚙️ Настройки менеджера</h3>

                    <div class="settings-section" style="margin-top: 16px;">
                        <h4 style="margin-bottom: 12px;">💳 Платёжный аккаунт</h4>
                        <div class="form-group">
                            <label>Принимать оплату через:</label>
                            <select id="paymentAccountSelect" class="form-input">
                                <option value="">🏠 По умолчанию (текущая система)</option>
                            </select>
                        </div>
                        <button class="btn-save-settings" onclick="window.ManagerCardInstance.savePaymentAccount()">💾 Сохранить платёжный аккаунт</button>
                        <div id="paSaveStatus" style="margin-top: 8px; font-size: 13px;"></div>
                    </div>
                    
                    <div class="settings-section" style="margin-top: 16px;">
                        <h4 style="margin-bottom: 12px;">🔗 Реферальная программа</h4>
                        <div class="form-group">
                            <label>Реферальный код:</label>
                            <input type="text" id="refCode" class="form-input" value="${this.escapeHtml(this.manager.referral_code || '')}" placeholder="Например: mysite2024">
                        </div>
                        <div id="refLinkBlock" style="margin-top: 8px; display: ${this.manager.referral_code ? 'block' : 'none'};">
                            <label style="font-weight: 600; font-size: 13px;">🔗 Реферальная ссылка:</label>
                            <div style="display: flex; gap: 8px; margin-top: 4px;">
                                <input type="text" id="refLink" class="form-input" value="https://beta.24aquabooking.ru/?ref=${this.escapeHtml(this.manager.referral_code || '')}" readonly style="flex: 1; font-size: 12px;">
                                <button onclick="navigator.clipboard.writeText(document.getElementById('refLink').value); alert('✅ Ссылка скопирована!');" style="padding: 6px 12px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: nowrap;">📋 Копировать</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Скидка по рефералу (%):</label>
                            <input type="number" id="refDiscount" class="form-input" value="${this.manager.referral_discount_percent || 10}" min="0" max="100">
                        </div>
                        <div class="form-group">
                            <label>Режим показа катеров:</label>
                            <select id="refMode" class="form-input">
                                <option value="all_boats" ${(this.manager.referral_mode || 'all_boats') === 'all_boats' ? 'selected' : ''}>🌐 Все катера (скидка больше)</option>
                                <option value="own_only" ${this.manager.referral_mode === 'own_only' ? 'selected' : ''}>🚤 Только свои катера (скидка меньше)</option>
                            </select>
                            <small style="color: #666; display: block; margin-top: 4px;">Как показывать катера при переходе по реферальной ссылке</small>
                        </div>
                        <button class="btn-save-settings" onclick="window.ManagerCardInstance.saveReferralSettings()">💾 Сохранить реферальные настройки</button>
                        <div id="refSaveStatus" style="margin-top: 8px; font-size: 13px;"></div>
                    </div>
                    
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                    
                    <h4 style="margin-bottom: 12px;">📋 Основные настройки (только чтение)</h4>
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

    async savePaymentAccount() {
        const token = localStorage.getItem('admin_token');
        const paSelect = document.getElementById('paymentAccountSelect');
        const payment_account_id = paSelect?.value || null;
        const status = document.getElementById('paSaveStatus');
        
        try {
            const resp = await fetch(`/api/managers/${this.manager.id}/payment-account`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ payment_account_id: payment_account_id ? parseInt(payment_account_id) : null })
            });
            if (resp.ok) {
                status.innerHTML = '✅ Сохранено';
                this.manager.payment_account_id = payment_account_id ? parseInt(payment_account_id) : null;
            } else {
                status.innerHTML = '❌ Ошибка';
            }
        } catch(e) {
            status.innerHTML = '❌ Ошибка';
        }
    }

    async saveReferralSettings() {
        const token = localStorage.getItem('admin_token');
        const refCode = document.getElementById('refCode')?.value?.trim() || '';
        const refDiscount = parseInt(document.getElementById('refDiscount')?.value) || 10;
        
        const status = document.getElementById('refSaveStatus');
        
        try {
            const response = await fetch(`/api/admin/managers/${this.manager.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    referral_code: refCode || null,
                    referral_discount_percent: refDiscount,
                    referral_mode: document.getElementById('refMode')?.value || 'all_boats'
                })
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Ошибка сохранения');
            }
            
            // Обновляем локальные данные
            this.manager.referral_code = refCode || null;
            // Обновляем ссылку
            const refLinkBlock = document.getElementById('refLinkBlock');
            const refLink = document.getElementById('refLink');
            if (refLinkBlock && refLink) {
                if (refCode) {
                    refLinkBlock.style.display = 'block';
                    refLink.value = `https://beta.24aquabooking.ru/?ref=${refCode}`;
                } else {
                    refLinkBlock.style.display = 'none';
                }
            }
            this.manager.referral_discount_percent = refDiscount;
            this.manager.referral_mode = document.getElementById('refMode')?.value || 'all_boats';
            
            if (status) {
                status.innerHTML = '<span style="color: #10b981;">✅ Настройки сохранены</span>';
                setTimeout(() => { status.innerHTML = ''; }, 2000);
            }
        } catch (error) {
            if (status) {
                status.innerHTML = `<span style="color: #ef4444;">❌ ${error.message}</span>`;
            }
        }
    }

    async blockManager(managerId) {
        const token = localStorage.getItem('admin_token');
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
            loadView('managers');
        } catch (error) {
            console.error('Ошибка:', error);
            alert('❌ Ошибка блокировки');
        }
    }

    async unblockManager(managerId) {
        const token = localStorage.getItem('admin_token');
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

    async deleteManager(managerId) {
        if (!confirm('⚠️ Вы уверены? Менеджер и ВСЕ его катера будут удалены безвозвратно!')) return;
        
        const token = localStorage.getItem('admin_token');
        try {
            const response = await fetch(`/api/admin/managers/${managerId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Ошибка удаления');
            
            alert('✅ Менеджер и его катера удалены');
            this.close();
            loadView('managers');
        } catch (error) {
            console.error('Ошибка:', error);
            alert('❌ Ошибка удаления менеджера');
        }
    }

    showEditBoatForm(boatId, boatName) {
        const token = localStorage.getItem('admin_token');
        
        const fetchBoat = async () => {
            const response = await fetch(`/api/admin/boats/manager/${this.manager.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const boats = await response.json();
            return boats.find(b => b.id === boatId);
        };
        
        const fetchGlobalPercent = async () => {
            try {
                const resp = await fetch('/api/admin/global-settings', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resp.ok) {
                    const settings = await resp.json();
                    return settings.default_prepayment_percent || 15;
                }
            } catch (e) {}
            return 15;
        };
        
        Promise.all([fetchBoat(), fetchGlobalPercent()]).then(([boatData, globalPercent]) => {
            if (!boatData) {
                alert('Катер не найден');
                return;
            }
            
            const modal = document.createElement('div');
            modal.id = 'editBoatModal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 10000;';
            
            modal.innerHTML = `
                <div style="background: #ffffff; border-radius: 16px; padding: 28px; width: 520px; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.3); color: #1e293b;">
                    <h3 style="margin: 0 0 20px 0; font-size: 20px;">🚤 ${this.escapeHtml(boatName)}</h3>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Цена за час:</label>
                        <input type="text" value="${(boatData.price_per_hour || 0).toLocaleString()} ₽" readonly style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #f3f4f6; color: #1f2937;">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Цена за час:</label>
                        <input type="text" value="${(boatData.price_per_hour || 0).toLocaleString()} ₽" readonly style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #f3f4f6; color: #1f2937;">
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Процент предоплаты:</label>
                        <input type="text" value="${globalPercent}% (глобальная)" readonly style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #f3f4f6; color: #1f2937;">
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Вместимость:</label>
                        <input type="text" value="${boatData.capacity || '—'} чел." readonly style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #f3f4f6; color: #1f2937;">
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Адрес посадки:</label>
                        <input type="text" value="${this.escapeHtml(boatData.boarding_address || '—')}" readonly style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #f3f4f6; color: #1f2937;">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-weight: 600; color: #374151;">Статус:</span>
                            <span style="color: ${boatData.is_active !== false ? '#2e7d32' : '#c62828'}; font-weight: 600;">${boatData.is_active !== false ? '🟢 Активен' : '🔴 Неактивен'}</span>
                        </label>
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="cancelEditBoatBtn" style="padding: 10px 20px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;">Закрыть</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            document.getElementById('cancelEditBoatBtn').addEventListener('click', () => {
                document.getElementById('editBoatModal')?.remove();
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