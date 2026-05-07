/**
 * Boats.js
 * Управление катерами (просмотр, блокировка при жалобах)
 * Версия: 1.0.0
 */

if (!window.AquaGid) window.AquaGid = {};

AquaGid.Boats = class {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        // Мок-данные катеров
        this.boats = [
            {
                id: 101,
                name: 'Марина',
                managerId: 1,
                managerName: 'Иванов Иван',
                status: 'active', // active, blocked
                complaints: 0,
                bookings: 8,
                price: 5000,
                capacity: 6,
                city: 'Сочи',
                lastBooking: '2026-03-02T15:00:00',
                image: '🚤'
            },
            {
                id: 102,
                name: 'Ветерок',
                managerId: 2,
                managerName: 'Петров Петр',
                status: 'active',
                complaints: 2,
                bookings: 3,
                price: 3500,
                capacity: 4,
                city: 'Сочи',
                lastBooking: '2026-03-01T18:00:00',
                image: '⛵'
            },
            {
                id: 103,
                name: 'Буря',
                managerId: 1,
                managerName: 'Иванов Иван',
                status: 'blocked',
                complaints: 5,
                bookings: 2,
                price: 7000,
                capacity: 8,
                city: 'Адлер',
                lastBooking: '2026-02-28T12:00:00',
                image: '🛥️'
            },
            {
                id: 104,
                name: 'Чайка',
                managerId: 3,
                managerName: 'Сидоров Сидор',
                status: 'active',
                complaints: 0,
                bookings: 12,
                price: 4500,
                capacity: 5,
                city: 'Сочи',
                lastBooking: '2026-03-02T10:00:00',
                image: '⛵'
            },
            {
                id: 105,
                name: 'Шторм',
                managerId: 2,
                managerName: 'Петров Петр',
                status: 'active',
                complaints: 1,
                bookings: 5,
                price: 6000,
                capacity: 7,
                city: 'Адлер',
                lastBooking: '2026-03-01T14:00:00',
                image: '🚤'
            }
        ];
        
        this.filteredBoats = [...this.boats];
        this.currentFilter = 'all'; // all, active, blocked, complaints
        this.searchQuery = '';
        this.selectedManager = 'all'; // фильтр по менеджеру
        
        // Уникальные менеджеры для фильтра
        this.managers = [...new Set(this.boats.map(b => b.managerName))];
        
        // Для поиска
        this.searchHandler = null;
        
        this.render();
    }
    
    render() {
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
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
                    ${this.renderBoatStats()}
                </div>

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
                                <th style="padding: 16px; text-align: left;">Последняя</th>
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
    
    renderStatusFilters() {
        const filters = [
            { id: 'all', label: 'Все', count: this.boats.length },
            { id: 'active', label: 'Активные', count: this.boats.filter(b => b.status === 'active').length },
            { id: 'blocked', label: 'Заблокированные', count: this.boats.filter(b => b.status === 'blocked').length },
            { id: 'complaints', label: 'С жалобами', count: this.boats.filter(b => b.complaints > 0).length }
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
    
    renderBoatStats() {
        const stats = {
            total: this.boats.length,
            active: this.boats.filter(b => b.status === 'active').length,
            blocked: this.boats.filter(b => b.status === 'blocked').length,
            complaints: this.boats.filter(b => b.complaints > 0).length
        };
        
        return `
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
        `;
    }
    
    renderBoatRow(boat) {
        const statusColors = {
            active: { color: '#10b981', label: 'Активен' },
            blocked: { color: '#ef4444', label: 'Заблокирован' }
        };
        
        const status = statusColors[boat.status];
        
        return `
            <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 24px;">${boat.image}</span>
                        <div>
                            <div style="font-weight: 500;">${boat.name}</div>
                            <div style="font-size: 12px; color: #6b7280;">ID: ${boat.id}</div>
                        </div>
                    </div>
                </td>
                <td style="padding: 16px;">
                    <div>${boat.managerName}</div>
                    <div style="font-size: 12px; color: #6b7280;">Менеджер ID: ${boat.managerId}</div>
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
                <td style="padding: 16px; text-align: center; font-weight: 500;">${boat.bookings}</td>
                <td style="padding: 16px; font-weight: 500;">${this.formatMoney(boat.price)}</td>
                <td style="padding: 16px;">${boat.city}</td>
                <td style="padding: 16px; font-size: 14px; color: #6b7280;">
                    ${boat.lastBooking ? new Date(boat.lastBooking).toLocaleDateString() : '—'}
                </td>
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
                <td colspan="9" style="padding: 48px; text-align: center; color: #6b7280;">
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
        
        // Действия с катерами
        document.querySelectorAll('.view-complaints').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.viewComplaints(id);
            });
        });
        
        document.querySelectorAll('.block-boat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.blockBoat(id);
            });
        });
        
        document.querySelectorAll('.unblock-boat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.unblockBoat(id);
            });
        });
        
        // Кнопка обновления
        const refreshBtn = document.getElementById('refresh-boats');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                alert('🔄 Данные обновлены (тестовый режим)');
            });
        }
    }
    
    filterBoats() {
        this.filteredBoats = this.boats.filter(boat => {
            // Фильтр по статусу
            if (this.currentFilter === 'active' && boat.status !== 'active') return false;
            if (this.currentFilter === 'blocked' && boat.status !== 'blocked') return false;
            if (this.currentFilter === 'complaints' && boat.complaints === 0) return false;
            
            // Фильтр по менеджеру
            if (this.selectedManager !== 'all' && boat.managerName !== this.selectedManager) return false;
            
            // Поиск по тексту
            if (this.searchQuery) {
                const searchString = `${boat.name} ${boat.managerName} ${boat.city}`.toLowerCase();
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
    
    // Методы-заглушки
    viewComplaints(id) {
        const boat = this.boats.find(b => b.id == id);
        if (boat) {
            alert(`Жалобы на катер "${boat.name}": ${boat.complaints} шт.\n\n(тестовый режим - здесь будет список жалоб)`);
        }
    }
    
    blockBoat(id) {
        if (confirm('Заблокировать катер? Это отменит все будущие бронирования.')) {
            const boat = this.boats.find(b => b.id == id);
            if (boat) {
                boat.status = 'blocked';
                this.filterBoats();
                alert('🔒 Катер заблокирован');
            }
        }
    }
    
    unblockBoat(id) {
        if (confirm('Разблокировать катер?')) {
            const boat = this.boats.find(b => b.id == id);
            if (boat) {
                boat.status = 'active';
                this.filterBoats();
                alert('🔓 Катер разблокирован');
            }
        }
    }
    
    formatMoney(amount) {
        return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
    }
}