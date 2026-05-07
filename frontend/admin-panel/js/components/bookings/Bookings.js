/**
 * Bookings.js
 * Управление бронированиями (подключено к реальному API)
 * Версия: 2.0.0
 */

if (!window.AquaGid) window.AquaGid = {};

AquaGid.Bookings = class {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        // Состояние
        this.bookings = [];
        this.filteredBookings = [];
        this.managers = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.selectedManager = 'all';
        this.dateFrom = '';
        this.dateTo = '';
        this.isLoading = true;
        this.error = null;
        this.stats = {
            total_prepayments: 0,
            total_bookings: 0,
            average_percent: 0
        };
        
        // Загружаем данные
        this.loadBookings();
    }
    
    async loadBookings() {
        this.isLoading = true;
        this.error = null;
        this.render();
        
        try {
            const token = API_CONFIG.getToken();
            if (!token) {
                throw new Error('Не авторизован. Пожалуйста, войдите в систему.');
            }
            
            // Загружаем бронирования
            await this.loadBookingsData();
            
            // Загружаем менеджеров для фильтра
            await this.loadManagers();
            
            // Загружаем статистику
            await this.loadStats();
            
            this.isLoading = false;
            
        } catch (error) {
            this.error = error.message;
            this.isLoading = false;
        }
        
        this.render();
    }
    
    async loadBookingsData(params = {}) {
        try {
            this.bookings = await BookingService.getAll(params);
            this.filteredBookings = [...this.bookings];
        } catch (error) {
            console.error('Ошибка загрузки бронирований:', error);
            throw error;
        }
    }
    
    async loadManagers() {
        try {
            const managers = await ManagerService.getAll();
            this.managers = managers.map(m => ({
                id: m.id,
                name: m.name
            }));
        } catch (error) {
            console.warn('Не удалось загрузить менеджеров:', error);
            this.managers = [];
        }
    }
    
    async loadStats() {
        try {
            const params = {};
            if (this.selectedManager !== 'all') {
                const manager = this.managers.find(m => m.name === this.selectedManager);
                if (manager) params.manager_id = manager.id;
            }
            if (this.dateFrom) params.date_from = this.dateFrom;
            if (this.dateTo) params.date_to = this.dateTo;
            
            this.stats = await BookingService.getPrepaymentStats(params);
        } catch (error) {
            console.warn('Не удалось загрузить статистику:', error);
            this.stats = {
                total_prepayments: 0,
                total_bookings: 0,
                average_percent: 0
            };
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
                    <h1 style="font-size: 28px; font-weight: 600; color: #111827;">Бронирования</h1>
                    <button id="refresh-bookings" style="
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

                <!-- Сводка по предоплатам -->
                ${this.renderPrepaymentSummary()}

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
                            <option value="${m.name}" ${this.selectedManager === m.name ? 'selected' : ''}>${m.name}</option>
                        `).join('')}
                    </select>
                    
                    <div style="display: flex; gap: 8px;">
                        <input type="text" 
                               id="date-from" 
                               placeholder="ДД.ММ.ГГ"
                               value="${this.dateFrom}"
                               style="
                                   width: 100px;
                                   padding: 8px 12px;
                                   border: 2px solid #e5e7eb;
                                   border-radius: 8px;
                                   font-size: 14px;
                               ">
                        <span style="align-self: center;">—</span>
                        <input type="text" 
                               id="date-to" 
                               placeholder="ДД.ММ.ГГ"
                               value="${this.dateTo}"
                               style="
                                   width: 100px;
                                   padding: 8px 12px;
                                   border: 2px solid #e5e7eb;
                                   border-radius: 8px;
                                   font-size: 14px;
                               ">
                    </div>
                    
                    <div style="flex: 1; min-width: 300px;">
                        <input type="text" 
                               id="search-booking" 
                               placeholder="🔍 Поиск по клиенту, телефону..."
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

                <!-- Таблица бронирований -->
                <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                                <th style="padding: 16px; text-align: left;">Дата</th>
                                <th style="padding: 16px; text-align: left;">Время</th>
                                <th style="padding: 16px; text-align: left;">Катер</th>
                                <th style="padding: 16px; text-align: left;">Менеджер</th>
                                <th style="padding: 16px; text-align: left;">Клиент</th>
                                <th style="padding: 16px; text-align: right;">Сумма</th>
                                <th style="padding: 16px; text-align: right;">Предоплата</th>
                                <th style="padding: 16px; text-align: left;">Статус</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.filteredBookings.map(booking => this.renderBookingRow(booking)).join('')}
                        </tbody>
                    </table>
                    
                    ${this.filteredBookings.length === 0 ? this.renderEmptyState() : ''}
                </div>
                
                <!-- Итоги по странице -->
                ${this.renderTotals()}
            </div>
        `;
        
        this.attachEvents();
    }
    
    renderLoading() {
        this.container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 400px;">
                <div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
                    <h3>Загрузка бронирований...</h3>
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
    
    renderPrepaymentSummary() {
        return `
            <div style="
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                border-radius: 16px;
                padding: 24px;
                margin-bottom: 24px;
                color: white;
            ">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
                    <div>
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Всего предоплат</div>
                        <div style="font-size: 32px; font-weight: 600;">${this.formatMoney(this.stats.total_prepayments)}</div>
                    </div>
                    <div>
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Средний процент</div>
                        <div style="font-size: 32px; font-weight: 600;">${this.stats.average_percent}%</div>
                    </div>
                    <div>
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Бронирований</div>
                        <div style="font-size: 32px; font-weight: 600;">${this.stats.total_bookings}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderStatusFilters() {
        const counts = {
            all: this.bookings.length,
            confirmed: this.bookings.filter(b => b.status === 'confirmed').length,
            completed: this.bookings.filter(b => b.status === 'completed').length,
            cancelled: this.bookings.filter(b => b.status === 'cancelled').length
        };
        
        const filters = [
            { id: 'all', label: 'Все', count: counts.all },
            { id: 'confirmed', label: 'Подтвержденные', count: counts.confirmed },
            { id: 'completed', label: 'Завершенные', count: counts.completed },
            { id: 'cancelled', label: 'Отмененные', count: counts.cancelled }
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
    
    renderBookingRow(booking) {
        const statusColors = {
            confirmed: { bg: '#d1fae5', color: '#065f46', label: 'Подтверждено' },
            cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Отменено' },
            completed: { bg: '#dbeafe', color: '#1e40af', label: 'Завершено' }
        };
        
        const status = statusColors[booking.status] || statusColors.confirmed;
        const date = new Date(booking.date);
        
        return `
            <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 16px;">${date.toLocaleDateString()}</td>
                <td style="padding: 16px;">${date.toLocaleTimeString().slice(0,5)}</td>
                <td style="padding: 16px;">
                    <div>Катер ID: ${booking.boat_id}</div>
                </td>
                <td style="padding: 16px;">Менеджер ID: ${booking.manager_id}</td>
                <td style="padding: 16px;">
                    <div>${booking.client_name}</div>
                    <div style="font-size: 12px; color: #6b7280;">${booking.client_phone}</div>
                </td>
                <td style="padding: 16px; text-align: right; font-weight: 500;">
                    ${this.formatMoney(booking.total_amount)}
                </td>
                <td style="padding: 16px; text-align: right;">
                    <div style="font-weight: 600; color: #4f46e5;">
                        ${this.formatMoney(booking.prepayment_amount)}
                    </div>
                    <div style="font-size: 12px; color: #6b7280;">
                        ${booking.prepayment_percent}%
                    </div>
                </td>
                <td style="padding: 16px;">
                    <span style="
                        background: ${status.bg};
                        color: ${status.color};
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 13px;
                        font-weight: 500;
                    ">${status.label}</span>
                </td>
            </tr>
        `;
    }
    
    renderEmptyState() {
        return `
            <tr>
                <td colspan="8" style="padding: 48px; text-align: center; color: #6b7280;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📅</div>
                    <h3 style="margin-bottom: 8px;">Бронирования не найдены</h3>
                    <p>Попробуйте изменить параметры фильтрации</p>
                </td>
            </tr>
        `;
    }
    
    renderTotals() {
        const filteredTotal = this.filteredBookings.reduce((sum, b) => sum + b.total_amount, 0);
        const filteredPrepayments = this.filteredBookings.reduce((sum, b) => sum + b.prepayment_amount, 0);
        
        return `
            <div style="
                margin-top: 24px;
                padding: 16px 24px;
                background: white;
                border-radius: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: 500;
            ">
                <div>Показано: ${this.filteredBookings.length} из ${this.bookings.length} бронирований</div>
                <div style="display: flex; gap: 32px;">
                    <div>Сумма: <span style="font-weight: 600;">${this.formatMoney(filteredTotal)}</span></div>
                    <div>Предоплаты: <span style="font-weight: 600; color: #4f46e5;">${this.formatMoney(filteredPrepayments)}</span></div>
                </div>
            </div>
        `;
    }
    
    attachEvents() {
        // Фильтры по статусу
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.currentTarget.dataset.filter;
                this.filterBookings();
            });
        });
        
        // Фильтр по менеджеру
        const managerFilter = document.getElementById('manager-filter');
        if (managerFilter) {
            managerFilter.addEventListener('change', (e) => {
                this.selectedManager = e.target.value;
                this.applyFilters();
            });
        }
        
        // Фильтр по датам
        const dateFrom = document.getElementById('date-from');
        const dateTo = document.getElementById('date-to');
        
        if (dateFrom) {
            dateFrom.addEventListener('change', (e) => {
                this.dateFrom = e.target.value;
                this.applyFilters();
            });
        }
        
        if (dateTo) {
            dateTo.addEventListener('change', (e) => {
                this.dateTo = e.target.value;
                this.applyFilters();
            });
        }
        
        // Поиск
        const searchInput = document.getElementById('search-booking');
        if (searchInput) {
            if (this.searchHandler) {
                searchInput.removeEventListener('input', this.searchHandler);
            }
            
            this.searchHandler = (e) => {
                this.searchQuery = e.target.value;
                this.filterBookings();
            };
            
            searchInput.addEventListener('input', this.searchHandler);
        }
        
        // Кнопка обновления
        const refreshBtn = document.getElementById('refresh-bookings');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadBookings());
        }
    }
    
    async applyFilters() {
        this.isLoading = true;
        this.render();
        
        const params = {};
        
        if (this.selectedManager !== 'all') {
            const manager = this.managers.find(m => m.name === this.selectedManager);
            if (manager) params.manager_id = manager.id;
        }
        
        if (this.dateFrom) params.date_from = this.dateFrom;
        if (this.dateTo) params.date_to = this.dateTo;
        
        try {
            await this.loadBookingsData(params);
            await this.loadStats();
        } catch (error) {
            this.error = error.message;
        } finally {
            this.isLoading = false;
            this.filterBookings(); // применяем поиск и фильтр статуса
        }
    }
    
    filterBookings() {
        this.filteredBookings = this.bookings.filter(booking => {
            // Фильтр по статусу
            if (this.currentFilter !== 'all' && booking.status !== this.currentFilter) return false;
            
            // Поиск по тексту
            if (this.searchQuery) {
                const searchString = `${booking.client_name} ${booking.client_phone} ${booking.client_email || ''}`.toLowerCase();
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
        const searchInput = document.getElementById('search-booking');
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