/**
 * Boats.js
 * Управление катерами (подключено к реальному API)
 * Версия: 2.0.0
 */

if (!window.AquaGid) window.AquaGid = {};

AquaGid.Boats = class {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        // Состояние
        this.boats = [];
        this.filteredBoats = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.selectedManager = 'all';
        this.isLoading = true;
        this.error = null;
        
        // Уникальные менеджеры для фильтра
        this.managers = [];
        
        // Загружаем данные
        this.loadBoats();
    }
    
    async loadBoats() {
        this.isLoading = true;
        this.error = null;
        this.render();
        
        try {
            // Проверяем авторизацию
            const token = API_CONFIG.getToken();
            if (!token) {
                throw new Error('Не авторизован. Пожалуйста, войдите в систему.');
            }
            
            // Загружаем катера
            this.boats = await BoatService.getAll();
            
            // Загружаем менеджеров для фильтра
            await this.loadManagers();
            
            this.filteredBoats = [...this.boats];
            this.isLoading = false;
            
        } catch (error) {
            this.error = error.message;
            this.isLoading = false;
        }
        
        this.render();
    }
    
    async loadManagers() {
        try {
            const managers = await ManagerService.getAll();
            this.managers = managers.map(m => m.name).filter(Boolean);
        } catch (error) {
            console.warn('Не удалось загрузить менеджеров для фильтра:', error);
            this.managers = [];
        }
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
                <!-- Заголовок -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h1 style="font-size: 28px; font-weight: 600; color: #111827;">Катера</h1>
                    <button id="refresh-boats" style="
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

                <!-- Фильтры -->
                <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
                    ${this.renderStatusFilters()}
                    
                    <select id="manager-filter" style="
                        padding: 8px 16px;
                        border: 2px solid #e5e7eb;
                        border-radius: 8px;
                        font-size: 14px;
                        min-width: 200px;
                    ">
                        <option value="all">Все менеджеры</option>
                        ${this.managers.map(m => `
                            <option value="${m}" ${this.selectedManager === m ? 'selected' : ''}>${m}</option>
                        `).join('')}
                    </select>
                    
                    <div style="flex: 1; min-width: 300px;">
                        <input type="text" 
                               id="search-boat" 
                               placeholder="🔍 Поиск по названию, менеджеру, городу..."
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

                <!-- Статистика -->
                ${this.renderStats()}

                <!-- Таблица катеров -->
                <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                                <th style="padding: 16px; text-align: left;">Катер</th>
                                <th style="padding: 16px; text-align: left;">Менеджер</th>
                                <th style="padding: 16px; text-align: left;">Статус</th>
                                <th style="padding: 16px; text-align: center;">Жалобы</th>
                                <th style="padding: 16px; text-align: center;">Бронирований</th>
                                <th style="padding: 16px; text-align: left;">Цена</th>
                                <th style="padding: 16px; text-align: left;">Город</th>
                                <th style="padding: 16px; text-align: center;">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.filteredBoats.map(boat => this.renderBoatRow(boat)).join('')}
                        </tbody>
                    </table>
                    
                    ${this.filteredBoats.length === 0 ? this.renderEmptyState() : ''}
                </div>
            </div>
        `;
        
        this.attachEvents();
    }
    
    renderLoading() {
        this.container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 400px;">
                <div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
                    <h3>Загрузка катеров...</h3>
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
    
    renderStatusFilters() {
        const counts = {
            all: this.boats.length,
            active: this.boats.filter(b => b.status === 'active').length,
            blocked: this.boats.filter(b => b.status === 'blocked').length,
            complaints: this.boats.filter(b => b.complaints > 0).length
        };
        
        const filters = [
            { id: 'all', label: 'Все', count: counts.all },
            { id: 'active', label: 'Активные', count: counts.active },
            { id: 'blocked', label: 'Заблокированные', count: counts.blocked },
            { id: 'complaints', label: 'С жалобами', count: counts.complaints }
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
            total: this.boats.length,
            active: this.boats.filter(b => b.status === 'active').length,
            blocked: this.boats.filter(b => b.status === 'blocked').length,
            complaints: this.boats.filter(b => b.complaints > 0).length
        };
        
        return `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
                <div style="background: white; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 13px; color: #6b7280;">Всего катеров</div>
                    <div style="font-size: 24px; font-weight: 600;">${stats.total}</div>
                </div>
                <div style="background: white; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 13px; color: #6b7280;">Активные</div>
                    <div style="font-size: 24px; font-weight: 600; color: #10b981;">${stats.active}</div>
                </div>
                <div style="background: white; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 13px; color: #6b7280;">Заблокированные</div>
                    <div style="font-size: 24px; font-weight: 600; color: #ef4444;">${stats.blocked}</div>
                </div>
                <div style="background: white; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 13px; color: #6b7280;">С жалобами</div>
                    <div style="font-size: 24px; font-weight: 600; color: #f59e0b;">${stats.complaints}</div>
                </div>
            </div>
        `;
    }
    
    renderBoatRow(boat) {
        const statusColors = {
            active: { color: '#10b981', label: 'Активен' },
            blocked: { color: '#ef4444', label: 'Заблокирован' },
            maintenance: { color: '#f59e0b', label: 'Обслуживание' }
        };
        
        const status = statusColors[boat.status] || statusColors.active;
        
        return `
            <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 24px;">🚤</span>
                        <div>
                            <div style="font-weight: 500;">${boat.name || 'Без названия'}</div>
                            <div style="font-size: 12px; color: #6b7280;">ID: ${boat.id}</div>
                        </div>
                    </div>
                </td>
                <td style="padding: 16px;">
                    <div>${boat.manager_name || '—'}</div>
                    <div style="font-size: 12px; color: #6b7280;">Менеджер ID: ${boat.manager_id || '—'}</div>
                </td>
                <td style="padding: 16px;">
                    <span style="
                        background: ${status.color}20;
                        color: ${status.color};
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 13px;
                        font-weight: 500;
                    ">${status.label}</span>
                </td>
                <td style="padding: 16px; text-align: center;">
                    ${boat.complaints > 0 ? 
                        `<span style="
                            background: #fee2e2;
                            color: #ef4444;
                            padding: 4px 8px;
                            border-radius: 12px;
                            font-weight: 600;
                        ">${boat.complaints}</span>` : 
                        `<span style="color: #9ca3af;">0</span>`
                    }
                </td>
                <td style="padding: 16px; text-align: center; font-weight: 500;">${boat.popularity || 0}</td>
                <td style="padding: 16px; font-weight: 500;">${this.formatMoney(boat.price)}</td>
                <td style="padding: 16px;">${boat.city || '—'}</td>
                <td style="padding: 16px; text-align: center;">
                    ${this.renderActionButtons(boat)}
                </td>
            </tr>
        `;
    }
    
    renderActionButtons(boat) {
        const buttons = [];
        
        // Кнопка показа жалоб (если есть)
        if (boat.complaints > 0) {
            buttons.push(`
                <button class="view-complaints" data-id="${boat.id}" style="
                    padding: 6px 12px;
                    background: #f59e0b20;
                    border: 1px solid #f59e0b;
                    border-radius: 6px;
                    color: #f59e0b;
                    cursor: pointer;
                    font-size: 12px;
                    margin-right: 4px;
                ">
                    👁️ Жалобы
                </button>
            `);
        }
        
        // Кнопка блокировки/разблокировки
        if (boat.status === 'blocked') {
            buttons.push(`
                <button class="unblock-boat" data-id="${boat.id}" style="
                    padding: 6px 12px;
                    background: #10b981;
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                    font-size: 12px;
                ">
                    🔓 Разблокировать
                </button>
            `);
        } else {
            buttons.push(`
                <button class="block-boat" data-id="${boat.id}" style="
                    padding: 6px 12px;
                    background: #ef4444;
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                    font-size: 12px;
                ">
                    🔒 Блокировать
                </button>
            `);
        }
        
        return buttons.join('');
    }
    
    renderEmptyState() {
        return `
            <tr>
                <td colspan="8" style="padding: 48px; text-align: center; color: #6b7280;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🚤</div>
                    <h3 style="margin-bottom: 8px;">Катера не найдены</h3>
                    <p>Попробуйте изменить параметры фильтрации</p>
                </td>
            </tr>
        `;
    }
    
    attachEvents() {
        // Фильтры по статусу
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.currentTarget.dataset.filter;
                this.filterBoats();
            });
        });
        
        // Фильтр по менеджеру
        const managerFilter = document.getElementById('manager-filter');
        if (managerFilter) {
            managerFilter.addEventListener('change', (e) => {
                this.selectedManager = e.target.value;
                this.filterBoats();
            });
        }
        
        // Поиск
        const searchInput = document.getElementById('search-boat');
        if (searchInput) {
            if (this.searchHandler) {
                searchInput.removeEventListener('input', this.searchHandler);
            }
            
            this.searchHandler = (e) => {
                this.searchQuery = e.target.value;
                this.filterBoats();
            };
            
            searchInput.addEventListener('input', this.searchHandler);
        }
        
        // Кнопка обновления
        const refreshBtn = document.getElementById('refresh-boats');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadBoats());
        }
        
        // TODO: добавить обработчики для кнопок действий
    }
    
    filterBoats() {
        this.filteredBoats = this.boats.filter(boat => {
            // Фильтр по статусу
            if (this.currentFilter === 'active' && boat.status !== 'active') return false;
            if (this.currentFilter === 'blocked' && boat.status !== 'blocked') return false;
            if (this.currentFilter === 'complaints' && boat.complaints === 0) return false;
            
            // Фильтр по менеджеру
            if (this.selectedManager !== 'all' && boat.manager_name !== this.selectedManager) return false;
            
            // Поиск по тексту
            if (this.searchQuery) {
                const searchString = `${boat.name || ''} ${boat.manager_name || ''} ${boat.city || ''}`.toLowerCase();
                return searchString.includes(this.searchQuery.toLowerCase());
            }
            
            return true;
        });
        
        // Сохраняем позицию и фокус
        const scrollPos = window.scrollY;
        const searchValue = this.searchQuery;
        
        this.render();
        
        // Восстанавливаем
        window.scrollTo(0, scrollPos);
        const searchInput = document.getElementById('search-boat');
        if (searchInput) {
            searchInput.value = searchValue;
            searchInput.focus();
            searchInput.setSelectionRange(searchValue.length, searchValue.length);
        }
    }
    
    formatMoney(amount) {
        if (!amount) return '0 ₽';
        return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
    }
}
