/**
 * Managers.js
 * Управление менеджерами (подключено к реальному API)
 * Версия: 2.0.0
 */

if (!window.AquaGid) window.AquaGid = {};

AquaGid.Managers = class {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        // Состояние
        this.managers = [];
        this.filteredManagers = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.isLoading = true;
        this.error = null;
        
        // Загружаем данные
        this.loadManagers();
    }
    
    async loadManagers() {
        this.isLoading = true;
        this.error = null;
        this.render(); // показываем загрузку
        
        try {
            // Временно отключаем проверку авторизации для разработки
            const token = API_CONFIG.getToken();
            if (!token) {
            throw new Error('Не авторизован. Пожалуйста, войдите в систему.');
            }
            
            // Загружаем менеджеров через сервис
            this.managers = await ManagerService.getAll();
            this.filteredManagers = [...this.managers];
            this.isLoading = false;
            
            // Загружаем дополнительную статистику (количество катеров у каждого менеджера)
            await this.loadManagersStats();
            
        } catch (error) {
            this.error = error.message;
            this.isLoading = false;
            
            // Если ошибка авторизации - показываем кнопку входа
            if (error.message.includes('401') || error.message.includes('авторизован')) {
                this.showLoginPrompt();
            }
        }
        
        this.render();
    }
    
    async loadManagersStats() {
        // TODO: загрузить количество катеров для каждого менеджера
        // Пока оставляем заглушку
        this.managers = this.managers.map(m => ({
            ...m,
            boatsCount: Math.floor(Math.random() * 5) + 1 // временно
        }));
        this.filteredManagers = [...this.managers];
    }
    
    render() {
        if (this.isLoading) {
            this.renderLoading();
            return;
        }
        
        if (this.error) {
            this.renderError();
            return;
        }
        
        this.container.innerHTML = `
            <div style="max-width: 1400px; margin: 0 auto;">
                <!-- Заголовок с кнопкой обновления -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h1 style="font-size: 28px; font-weight: 600; color: #111827;">Менеджеры</h1>
                    <button id="refresh-managers" style="
                        padding: 8px 16px;
                        background: white;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        🔄 Обновить
                    </button>
                </div>

                <!-- Фильтры и поиск -->
                <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
                    ${this.renderFilters()}
                    <div style="flex: 1; min-width: 300px;">
                        <input type="text" 
                               id="search-manager" 
                               placeholder="🔍 Поиск по имени, компании, телефону..."
                               value="${this.searchQuery}"
                               style="
                                   width: 100%;
                                   padding: 10px 16px;
                                   border: 2px solid #e5e7eb;
                                   border-radius: 8px;
                                   font-size: 14px;
                               ">
                    </div>
                </div>

                <!-- Статистика по менеджерам -->
                ${this.renderStats()}

                <!-- Список менеджеров -->
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    ${this.filteredManagers.map(m => this.renderManagerCard(m)).join('')}
                </div>
                
                ${this.filteredManagers.length === 0 ? this.renderEmptyState() : ''}
            </div>
        `;

        // После рендера загружаем таблицы катеров для каждого менеджера
        setTimeout(() => {
            this.managers.forEach(manager => {
                this.renderBoatsTable(manager.id);
            });
        }, 100);
        
        this.attachEvents();
    }
    
    renderLoading() {
        this.container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 400px;">
                <div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
                    <h3>Загрузка менеджеров...</h3>
                </div>
            </div>
        `;
    }
    
    renderError() {
        this.container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 400px;">
                <div style="text-align: center; max-width: 400px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <h3 style="color: #ef4444; margin-bottom: 8px;">Ошибка загрузки</h3>
                    <p style="color: #6b7280; margin-bottom: 16px;">${this.error}</p>
                    <button onclick="window.location.reload()" style="
                        padding: 8px 16px;
                        background: #4f46e5;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                    ">
                        🔄 Попробовать снова
                    </button>
                </div>
            </div>
        `;
    }
    
    showLoginPrompt() {
        // Не удаляем токен, а просто редиректим на вход
        window.location.href = '/';
    }
    
    renderFilters() {
        const counts = {
            all: this.managers.length,
            active: this.managers.filter(m => m.status === 'active').length,
            pending: this.managers.filter(m => m.status === 'pending').length,
            blocked: this.managers.filter(m => m.status === 'blocked').length
        };
        
        const filters = [
            { id: 'all', label: 'Все', count: counts.all },
            { id: 'active', label: 'Активные', count: counts.active },
            { id: 'pending', label: 'На проверке', count: counts.pending },
            { id: 'blocked', label: 'Заблокированные', count: counts.blocked }
        ];
        
        return filters.map(f => `
            <button class="filter-btn" data-filter="${f.id}" style="
                padding: 8px 16px;
                background: ${this.currentFilter === f.id ? '#4f46e5' : 'white'};
                color: ${this.currentFilter === f.id ? 'white' : '#374151'};
                border: 1px solid ${this.currentFilter === f.id ? '#4f46e5' : '#e5e7eb'};
                border-radius: 20px;
                cursor: pointer;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                ${f.label}
                <span style="
                    background: ${this.currentFilter === f.id ? 'rgba(255,255,255,0.2)' : '#f3f4f6'};
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                ">${f.count}</span>
            </button>
        `).join('');
    }
    
    renderStats() {
        const stats = {
            total: this.managers.length,
            verified: this.managers.filter(m => m.phone_verified && m.email_verified).length,
            withBoats: this.managers.filter(m => m.boatsCount > 0).length,
            withComplaints: this.managers.filter(m => m.complaints > 0).length
        };
        
        return `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
                <div style="background: white; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 13px; color: #6b7280;">Всего</div>
                    <div style="font-size: 24px; font-weight: 600;">${stats.total}</div>
                </div>
                <div style="background: white; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 13px; color: #6b7280;">Верифицировано</div>
                    <div style="font-size: 24px; font-weight: 600; color: #10b981;">${stats.verified}</div>
                </div>
                <div style="background: white; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 13px; color: #6b7280;">С катерами</div>
                    <div style="font-size: 24px; font-weight: 600;">${stats.withBoats}</div>
                </div>
                <div style="background: white; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 13px; color: #6b7280;">С жалобами</div>
                    <div style="font-size: 24px; font-weight: 600; color: #ef4444;">${stats.withComplaints}</div>
                </div>
            </div>
        `;
    }

    async loadManagerBoats(managerId) {
        try {
            const response = await fetch(`/api/admin/boats/manager/${managerId}`);
            if (!response.ok) throw new Error('Ошибка загрузки катеров');
            return await response.json();
        } catch (error) {
            console.error('Ошибка загрузки катеров:', error);
            return [];
        }
    }
    
    renderManagerCard(manager) {
        const statusColors = {
            active: { bg: '#d1fae5', text: '#065f46', label: 'Активен' },
            pending: { bg: '#fef3c7', text: '#92400e', label: 'На проверке' },
            blocked: { bg: '#fee2e2', text: '#991b1b', label: 'Заблокирован' }
        };
        
        const status = statusColors[manager.status] || statusColors.pending;
        
        return `
            <div style="
                background: white;
                border-radius: 16px;
                padding: 20px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                border-left: 4px solid ${status.text};
            ">
                <!-- Верхняя часть с именем и статусом -->
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <h3 style="font-size: 18px; font-weight: 600;">${manager.name || 'Без имени'}</h3>
                            <span style="
                                background: ${status.bg};
                                color: ${status.text};
                                padding: 4px 12px;
                                border-radius: 20px;
                                font-size: 13px;
                                font-weight: 500;
                            ">${status.label}</span>
                        </div>
                        <div style="color: #4b5563; margin-top: 4px;">${manager.company || '—'}</div>
                    </div>
                    <div style="color: #6b7280; font-size: 14px;">
                        ID: ${manager.id}
                    </div>
                </div>
                
                <!-- Контакты -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px; background: #f9fafb; padding: 12px; border-radius: 8px;">
                    <div>
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Телефон</div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>${manager.phone || '—'}</span>
                            ${manager.phone_verified ? '<span style="color: #10b981;">✅</span>' : '<span style="color: #f59e0b;">⏳</span>'}
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Email</div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>${manager.email || '—'}</span>
                            ${manager.email_verified ? '<span style="color: #10b981;">✅</span>' : '<span style="color: #f59e0b;">⏳</span>'}
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Telegram</div>
                        <div>${manager.telegram || '—'}</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">VK</div>
                        <div>${manager.vk || '—'}</div>
                    </div>
                </div>

                <!-- Таблица катеров -->
                <div style="margin-top: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h4 style="font-size: 14px; color: #4b5563;">🚤 Катера менеджера</h4>
                        <button class="add-boat-btn" data-manager-id="${manager.id}" style="
                            padding: 4px 12px;
                            background: #4f46e5;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 12px;
                        ">
                            + Добавить катер
                        </button>
                    </div>
                    <div id="boats-table-${manager.id}" style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr>
                                    <th style="text-align: left; padding: 8px; background: #f9fafb;">Название</th>
                                    <th style="text-align: left; padding: 8px; background: #f9fafb;">Метод</th>
                                    <th style="text-align: left; padding: 8px; background: #f9fafb;">Цена клиенту</th>
                                    <th style="text-align: left; padding: 8px; background: #f9fafb;">Цена агенту</th>
                                    <th style="text-align: center; padding: 8px; background: #f9fafb;">Статус</th>
                                    <th style="text-align: center; padding: 8px; background: #f9fafb;">Действия</th>
                                </tr>
                            </thead>
                            <tbody id="boats-tbody-${manager.id}">
                                <tr><td colspan="6" style="text-align: center; padding: 16px;">⏳ Загрузка...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Статистика -->
                <div style="display: flex; gap: 24px; margin-bottom: 16px;">
                    <div>
                        <span style="font-size: 13px; color: #6b7280;">Катера:</span>
                        <span style="font-weight: 600; margin-left: 4px;">${manager.boatsCount || 0}</span>
                    </div>
                    <div>
                        <span style="font-size: 13px; color: #6b7280;">Предоплата:</span>
                        <span style="font-weight: 600; margin-left: 4px;">${manager.prepayment || 20}%</span>
                    </div>
                </div>
                
                <!-- Кнопки действий -->
                <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid #f3f4f6; padding-top: 16px;">
                    ${this.renderActionButtons(manager)}
                </div>
            </div>
        `;
    }
    
    renderActionButtons(manager) {
        const buttons = [];
        
        // Кнопки верификации (только если не верифицировано)
        if (!manager.phone_verified) {
            buttons.push(`
                <button class="verify-phone" data-id="${manager.id}" style="
                    padding: 6px 12px;
                    background: white;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                ">
                    📱 Подтвердить телефон
                </button>
            `);
        }
        
        if (!manager.email_verified) {
            buttons.push(`
                <button class="verify-email" data-id="${manager.id}" style="
                    padding: 6px 12px;
                    background: white;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                ">
                    ✉️ Подтвердить email
                </button>
            `);
        }
        
        // Кнопка блокировки/разблокировки
        if (manager.status === 'blocked') {
            buttons.push(`
                <button class="unblock-manager" data-id="${manager.id}" style="
                    padding: 6px 12px;
                    background: #10b981;
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                ">
                    🔓 Разблокировать
                </button>
            `);
        } else {
            buttons.push(`
                <button class="block-manager" data-id="${manager.id}" style="
                    padding: 6px 12px;
                    background: #ef4444;
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                ">
                    🔒 Заблокировать
                </button>
            `);
        }
        
        // Кнопка настроек предоплаты
        buttons.push(`
            <button class="set-prepayment" data-id="${manager.id}" style="
                padding: 6px 12px;
                background: #4f46e5;
                border: none;
                border-radius: 6px;
                color: white;
                cursor: pointer;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 4px;
            ">
                💰 Предоплата ${manager.prepayment || 20}%
            </button>
        `);
        
        return buttons.join('');
    }
    
    renderEmptyState() {
        return `
            <div style="
                background: white;
                border-radius: 12px;
                padding: 48px;
                text-align: center;
                color: #6b7280;
            ">
                <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
                <h3 style="margin-bottom: 8px;">Менеджеры не найдены</h3>
                <p>Попробуйте изменить параметры поиска</p>
            </div>
        `;
    }

    async renderBoatsTable(managerId) {
        const tbody = document.getElementById(`boats-tbody-${managerId}`);
        if (!tbody) return;
        
        const boats = await this.loadManagerBoats(managerId);
        
        if (boats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 16px;">📭 Нет катеров</td></tr>';
            return;
        }
        
        tbody.innerHTML = boats.map(boat => `
            <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px;">${boat.name}</td>
                <td style="padding: 8px;">${boat.pricing_method === 'margin' ? 'Маржа' : 'Процент'}</td>
                <td style="padding: 8px;">${boat.open_price || boat.price_per_hour || '—'} ₽/час</td>
                <td style="padding: 8px;">${boat.agent_price || '—'} ₽/час</td>
                <td style="text-align: center; padding: 8px;">
                    <span style="
                        background: ${boat.is_active ? '#d1fae5' : '#fee2e2'};
                        color: ${boat.is_active ? '#065f46' : '#991b1b'};
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                    ">
                        ${boat.is_active ? 'Активен' : 'Отключён'}
                    </span>
                </td>
                <td style="text-align: center; padding: 8px;">
                    <button class="edit-boat-btn" data-boat-id="${boat.id}" style="
                        background: none;
                        border: none;
                        cursor: pointer;
                        font-size: 16px;
                        margin-right: 8px;
                    " title="Редактировать">✏️</button>
                    <button class="delete-boat-btn" data-boat-id="${boat.id}" style="
                        background: none;
                        border: none;
                        cursor: pointer;
                        font-size: 16px;
                    " title="Деактивировать">🗑️</button>
                </td>
            </tr>
        `).join('');
        
        // Добавляем обработчики для кнопок
        this.attachBoatButtons(managerId);
    }

    async editBoat(boatId) {
        // TODO: открыть модальное окно для редактирования катера
        alert(`Редактирование катера ${boatId} (в разработке)`);
    }

    async deleteBoat(boatId, managerId) {
        if (!confirm('Деактивировать катер? Он перестанет отображаться на сайте.')) return;
        
        try {
            const response = await fetch(`/api/admin/boats/${boatId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Ошибка деактивации');
            
            alert('Катер деактивирован');
            this.renderBoatsTable(managerId); // обновляем таблицу
            this.loadManagers(); // обновляем список менеджеров (чтобы обновить счётчик катеров)
        } catch (error) {
            alert('Ошибка: ' + error.message);
        }
    }

    async addBoat(managerId) {
        // TODO: открыть форму добавления катера для этого менеджера
        alert(`Добавление катера для менеджера ${managerId} (в разработке)`);
    }

    attachBoatButtons(managerId) {
        // Редактирование катера
        document.querySelectorAll('.edit-boat-btn').forEach(btn => {
            btn.removeEventListener('click', this.handleEditBoat);
            this.handleEditBoat = (e) => {
                const boatId = btn.dataset.boatId;
                this.editBoat(boatId);
            };
            btn.addEventListener('click', this.handleEditBoat);
        });
        
        // Удаление катера
        document.querySelectorAll('.delete-boat-btn').forEach(btn => {
            btn.removeEventListener('click', this.handleDeleteBoat);
            this.handleDeleteBoat = (e) => {
                const boatId = btn.dataset.boatId;
                this.deleteBoat(boatId, managerId);
            };
            btn.addEventListener('click', this.handleDeleteBoat);
        });
    }
    
    attachEvents() {
        // Фильтры
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.currentTarget.dataset.filter;
                this.filterManagers();
            });
        });
        
        // Поиск
        const searchInput = document.getElementById('search-manager');
        if (searchInput) {
            if (this.searchHandler) {
                searchInput.removeEventListener('input', this.searchHandler);
            }
            
            this.searchHandler = (e) => {
                this.searchQuery = e.target.value;
                this.filterManagers();
            };
            
            searchInput.addEventListener('input', this.searchHandler);
        }

        // Кнопки "Добавить катер"
        document.querySelectorAll('.add-boat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const managerId = btn.dataset.managerId;
                this.addBoat(managerId);
            });
        });
        
        // Кнопка обновления
        const refreshBtn = document.getElementById('refresh-managers');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadManagers());
        }
        
        // TODO: добавить обработчики для кнопок действий
    }
    
    filterManagers() {
        this.filteredManagers = this.managers.filter(manager => {
            // Фильтр по статусу
            if (this.currentFilter !== 'all' && manager.status !== this.currentFilter) {
                return false;
            }
            
            // Поиск по тексту
            if (this.searchQuery) {
                const searchString = `${manager.name || ''} ${manager.company || ''} ${manager.phone || ''} ${manager.email || ''}`.toLowerCase();
                return searchString.includes(this.searchQuery.toLowerCase());
            }
            
            return true;
        });
        
        // Сохраняем позицию скролла и фокус
        const scrollPos = window.scrollY;
        const searchValue = this.searchQuery;
        
        this.render();
        
        // Восстанавливаем поиск и фокус
        window.scrollTo(0, scrollPos);
        const searchInput = document.getElementById('search-manager');
        if (searchInput) {
            searchInput.value = searchValue;
            searchInput.focus();
            searchInput.setSelectionRange(searchValue.length, searchValue.length);
        }
    }
}