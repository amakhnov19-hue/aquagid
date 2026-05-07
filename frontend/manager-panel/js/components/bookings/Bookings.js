/**
 * Компонент управления бронированиями для менеджера
 */
class ManagerBookings {
    constructor() {
        this.bookings = [];
        this.searchQuery = '';
        this.currentTab = 'active';
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.searchTimeout = null;
        this.periodType = 'week'; // 'week', 'month', 'custom'
        this.startDate = null;
        this.endDate = null;
        this.sourceFilter = 'all'; // 'all', 'manual', 'google'
    }

    filterBySource(bookings) {
        if (this.sourceFilter === 'all') return bookings;
        if (this.sourceFilter === 'manual') {
            return bookings.filter(b => b.source === 'manual');
        }
        if (this.sourceFilter === 'google') {
            return bookings.filter(b => b.source === 'google');
        }
        return bookings;
    }

    /**
     * Установить период для истории
     */
    setPeriod(type, startDate = null, endDate = null) {
        this.periodType = type;
        if (type === 'week') {
            // Последние 7 дней
            this.endDate = new Date();
            this.startDate = new Date();
            this.startDate.setDate(this.endDate.getDate() - 7);
        } else if (type === 'month') {
            // Последние 30 дней
            this.endDate = new Date();
            this.startDate = new Date();
            this.startDate.setDate(this.endDate.getDate() - 30);
        } else if (type === 'custom' && startDate && endDate) {
            this.startDate = new Date(startDate);
            this.endDate = new Date(endDate);
        }
        this.currentPage = 1;
        this.renderContent(document.getElementById('bookings-container'));
    }

    /**
     * Форматирование даты для отображения
     */
    formatDateRange() {
        if (!this.startDate || !this.endDate) return 'Выберите период';
        
        const format = (date) => {
            return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric', year: 'numeric' });
        };
        
        if (this.periodType === 'week') {
            return `Последние 7 дней (${format(this.startDate)} — ${format(this.endDate)})`;
        } else if (this.periodType === 'month') {
            return `Последние 30 дней (${format(this.startDate)} — ${format(this.endDate)})`;
        } else {
            return `${format(this.startDate)} — ${format(this.endDate)}`;
        }
    }

    /**
     * Проверка, входит ли бронь в выбранный период
     */
    isInPeriod(bookingDate) {
        if (!this.startDate || !this.endDate) return true;
        
        const date = new Date(bookingDate);
        // Обнуляем время для корректного сравнения
        date.setHours(0, 0, 0, 0);
        const start = new Date(this.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(this.endDate);
        end.setHours(23, 59, 59, 999);
        
        return date >= start && date <= end;
    }

    /**
     * Загрузить бронирования
     */
    async loadBookings() {
        const managerId = window.managerId;
        if (!managerId) return;

        try {
            const response = await fetch(`/api/bookings?manager_id=${managerId}`);
            if (!response.ok) throw new Error('Ошибка загрузки');
            
            const data = await response.json();
            this.bookings = data.map(b => ({
                id: b.id,
                boatId: b.boat_id,
                boatName: b.boat?.name || `Катер #${b.boat_id}`,
                date: b.booking_date,
                time: b.start_time ? b.start_time.slice(0, 5) : '',
                duration: b.duration_minutes / 60,
                clientName: b.client_name || '—',
                clientPhone: b.client_phone || '—',
                clientMessengerType: b.client_messenger_type || '',
                clientMessengerContact: b.client_messenger_contact || '',
                totalAmount: b.total_price,
                prepaid: b.prepayment_amount || 0,
                status: b.status,
                google_event_id: b.google_event_id,  // ← добавить
                source: b.source || (b.google_event_id ? 'google' : 'client'),
                requiresReplacement: false,
                viewed_at: b.viewed_at,
                cancellation_requested: b.cancellation_requested,
                created_at: b.created_at,
            }));

            console.log('Bookings loaded:', this.bookings.length);
            
            // Обновляем таблицу после загрузки
            const container = document.getElementById('bookings-container');
            if (container) {
                this.renderContent(container);
            }
        } catch (error) {
            console.error('Ошибка загрузки бронирований:', error);
        }
    }

    /**
     * Фильтрация бронирований по поисковому запросу
     */
    filterBookings() {
        if (!this.searchQuery) return this.bookings;
        
        const query = this.searchQuery.toLowerCase();
        return this.bookings.filter(b => 
            b.boatName.toLowerCase().includes(query) ||
            b.clientName.toLowerCase().includes(query) ||
            b.clientPhone.includes(query)
        );
    }

    /**
     * Проверка, активно ли бронирование (время ещё не прошло)
     */
    isBookingActive(booking) {
        const bookingDate = new Date(booking.date + 'T' + booking.time);
        const now = new Date();
        return bookingDate > now;
    }

    /**
     * Установить поисковый запрос
     */
    setSearchQuery(query) {
        this.searchQuery = query;
        this.currentPage = 1;
        this.renderContent(document.getElementById('bookings-container'));
    }

    /**
     * Установить вкладку
     */
    setTab(tab) {
        this.currentTab = tab;
        this.currentPage = 1;
        this.renderContent(document.getElementById('bookings-container'));
    }

    setSourceFilter(source) {
        this.sourceFilter = source;
        this.currentPage = 1;
        this.renderContent(document.getElementById('bookings-container'));
    }

    setSearchInput() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            this.setSearchQuery(searchInput.value);
        }
    }

    /**
     * Пагинация
     */
    paginate(items) {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        return items.slice(start, start + this.itemsPerPage);
    }

    /**
     * Форматирование даты
     */
    formatDate(dateStr) {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU');
    }

    /**
     * Текст статуса
     */
    getStatusText(status) {
        const statuses = {
            'active': 'Активно',
            'completed': 'Завершено',
            'cancelled': 'Отменено'
        };
        return statuses[status] || status;
    }

    /**
     * Рендер содержимого
     */
    renderContent(container) {
        if (!container) {
            console.error('Контейнер не найден');
            return;
        }

        const now = new Date();
        
        // Сначала фильтруем по поисковому запросу
        const filteredBookings = this.filterBookings();
        
        // Только активные брони (будущие)
        const activeBookings = filteredBookings
            .filter(b => {
                if (b.status !== 'active') return false;
                const start = new Date(b.date + 'T' + b.time);
                const end = new Date(start.getTime() + b.duration * 3600000);
                // Показываем: будущие + текущие + новые (непросмотренные, даже если завершены)
                if (!b.viewed_at) return true;
                return end > now;
            })
            .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateA - dateB;
            });
        
        const paginatedBookings = this.paginate(activeBookings);
        
        container.innerHTML = `
            <div class="bookings-section">
                <div class="bookings-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 00px; padding-bottom: 10px; border-bottom: 1px solid #eef2ff;position: relative;">
                    <div style="width: 30px;"></div>
                    <h2 style="margin: 0; font-size: 20px;">📋 Бронирования (${activeBookings.length})</h2>
                    <span onclick="AquaGid.ManagerApp.switchSection('dashboard')" style="cursor: pointer; font-size: 24px; color: #666;">✕</span>
                </div> 

                <div class="filters-section">
                    <div class="search-box">
                        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                            <div style="flex: 1; position: relative; min-width: 200px;">
                                <input type="text" 
                                    id="searchInput"
                                    placeholder="🔍 Поиск по клиенту, катеру..." 
                                    value="${this.searchQuery.replace(/"/g, '&quot;')}"
                                    style="width: 100%; padding: 12px 40px 12px 16px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 14px; box-sizing: border-box;">
                                ${this.searchQuery ? '<button style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 16px; cursor: pointer; color: #333; padding: 4px;" onclick="AquaGid.ManagerBookings.clearSearch()">✕</button>' : ''}
                            </div>
                            <button style="padding: 12px 24px; background: #0066CC; color: white; border: none; border-radius: 12px; cursor: pointer; white-space: nowrap;" onclick="AquaGid.ManagerBookings.setSearchInput()">🔍 Найти</button>
                        </div>
                    </div>
                </div>

                <table class="bookings-table">
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Время</th>
                            <th>Катер</th>
                            <th>Источник</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderRows(paginatedBookings)}
                    </tbody>
                </table>
                
                <div class="pagination">
                    ${this.renderPagination(Math.ceil(activeBookings.length / this.itemsPerPage))}
                </div>
            </div>
        `;
    }

    /**
     * Очистить поисковый запрос
     */
    clearSearch() {
        console.log('clearSearch called, current query:', this.searchQuery);
        this.searchQuery = '';
        this.currentPage = 1;
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        console.log('after clear, query:', this.searchQuery);
        this.renderContent(document.getElementById('bookings-container'));
    }

    /**
     * Показать окно выбора произвольного периода
     */
    showCustomDatePicker() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 350px;">
                <div class="modal-header">
                    <h3>Выберите период</h3>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div style="padding: 20px;">
                    <div class="form-group">
                        <label>📅 Дата начала</label>
                        <input type="date" id="customStartDate" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>📅 Дата окончания</label>
                        <input type="date" id="customEndDate" class="form-control">
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 20px;">
                        <button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">Отмена</button>
                        <button class="btn-save" onclick="AquaGid.ManagerBookings.applyCustomPeriod()">Применить</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Применить произвольный период
     */
    applyCustomPeriod() {
        const startDateInput = document.getElementById('historyStartDate')?.value;
        const endDateInput = document.getElementById('historyEndDate')?.value;
        
        if (!startDateInput || !endDateInput) {
            alert('Выберите даты начала и окончания');
            return;
        }
        
        if (startDateInput > endDateInput) {
            alert('Дата начала не может быть позже даты окончания');
            return;
        }
        
        this.startDate = new Date(startDateInput);
        this.endDate = new Date(endDateInput);
        this.periodType = 'custom';
        this.currentPage = 1;
        this.renderContent(document.getElementById('bookings-container'));
    }

    /**
     * Очистить период
     */
    clearPeriod() {
        this.startDate = null;
        this.endDate = null;
        this.periodType = null;
        this.currentPage = 1;
        this.renderContent(document.getElementById('bookings-container'));
    }

    /**
     * Рендер строк таблицы
     */
    renderRows(bookings) {
        if (bookings.length === 0) {
            return `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px; color: #999;">
                        Нет бронирований по заданным критериям
                    </td>
                </tr>
            `;
        }
        
        const lastViewed = window.AquaGid?.ManagerDashboard?.lastViewed || null;
        
        return bookings.map(b => {
            const isActive = b.status === 'active';
            
            // Определяем источник по полю source из БД
            const isGoogle = b.source === 'google';
            const isClient = b.source === 'client';
            const sourceDisplay = isGoogle ? '🌐 Google' : '📱 Приложение';
            
            // Для Google — некликабельные и без подсветки
            const rowStyle = (isActive && isClient) ? 'cursor: pointer;' : '';
            const onclick = (isActive && isClient) ? `onclick="AquaGid.ManagerBookings.handleRowClick(${b.id})"` : '';
            
            // Подсветка только для клиентских
            let backgroundColor = '';
            if (isClient) {
                if (b.cancellation_requested) {
                    backgroundColor = '#fff3e0';  // запрошена отмена — приоритет
                } else if (!b.viewed_at) {
                    backgroundColor = '#e8f5e9';  // новая, не просмотрена
                }
            }
            
            const rowBackground = backgroundColor ? `background-color: ${backgroundColor};` : '';
            
            // Время окончания
            const startTime = b.time || b.start_time;
            const durationHours = b.duration || (b.duration_minutes / 60) || 1;
            const endTime = this.calculateEndTime(startTime, durationHours);
            const timeRange = startTime ? `${startTime.slice(0, 5)} — ${endTime}` : '—';
            
            return `
                <tr style="${rowStyle} ${rowBackground}" ${onclick}>
                    <td>${this.formatDate(b.date)}</td>
                    <td>${timeRange}</td>
                    <td>${(b.boatName || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
                    <td>${sourceDisplay}</td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Рендер пагинации
     */
    renderPagination(totalPages) {
        if (totalPages <= 1) return '';
        
        let html = '<div class="pagination-buttons">';
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="${i === this.currentPage ? 'active' : ''}" onclick="AquaGid.ManagerBookings.goToPage(${i})">${i}</button>`;
        }
        html += '</div>';
        return html;
    }

    /**
     * Переход на страницу
     */
    goToPage(page) {
        this.currentPage = page;
        this.renderContent(document.getElementById('bookings-container'));
    }

    /**
     * Обработка клика по строке
     */
    async handleRowClick(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (!booking) return;
        
        // Отмечаем как просмотренное
        const token = localStorage.getItem('managerToken') || localStorage.getItem('access_token') || localStorage.getItem('token');
        if (token && !booking.viewed_at) {
            try {
                await fetch(`/api/bookings/${bookingId}/view`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                // Обновляем дашборд
                if (window.AquaGid?.ManagerDashboard) {
                    window.AquaGid.ManagerDashboard.loadDashboardData();
                }
                // Обновляем локально
                booking.viewed_at = new Date().toISOString();
                // Перерисовываем таблицу
                const container = document.getElementById('bookings-container');
                if (container) this.renderContent(container);
            } catch (e) {
                console.error('Ошибка отметки просмотра:', e);
            }
        }
        
        this.showDetails(bookingId);
    }

    /**
     * Обработка клика по кнопке действий
     */
    handleActionClick(bookingId, event) {
        event.stopPropagation();
        console.log('Действия с бронированием:', bookingId);
    }

    /**
     * Показать детали бронирования в модальном окне
     */
    showDetails(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (!booking) {
            console.error('Бронирование не найдено:', bookingId);
            return;
        }
        this.showDetailsModal(booking);
    }

    calculateEndTime(startTime, durationHours) {
        if (!startTime) return '—';
        const [hour, minute] = startTime.split(':').map(Number);
        const totalMinutes = hour * 60 + minute + (durationHours * 60);
        const endHour = Math.floor(totalMinutes / 60);
        const endMin = totalMinutes % 60;
        return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    }

    showDetailsModal(booking) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        const startTime = booking.time || booking.start_time;
        const duration = booking.duration || (booking.duration_minutes / 60) || 1;
        const endTime = this.calculateEndTime(startTime, duration);
        
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h3>📋 Детали бронирования</h3>
                <div class="booking-detail-row">
                    <span class="detail-label">👤 Клиент:</span>
                    <span class="detail-value">${booking.clientName || booking.client_name}</span>
                </div>
                ${booking.clientPhone ? `
                <div class="booking-detail-row">
                    <span class="detail-label">📞 Телефон:</span>
                    <span class="detail-value"><a href="tel:${booking.clientPhone}" style="color: #0066CC; text-decoration: none;">${booking.clientPhone}</a></span>
                </div>
                ` : ''}
                ${booking.clientMessengerType && booking.clientMessengerContact ? `
                <div class="booking-detail-row">
                    <span class="detail-label">💬 Связь:</span>
                    <span class="detail-value">
                        <a href="${window.MessengerService?.getLink(booking.clientMessengerType, booking.clientMessengerContact) || '#'}" 
                            target="_blank" 
                            style="color: ${window.MessengerService?.getColor(booking.clientMessengerType) || '#0066CC'}; text-decoration: none;">
                            ${window.MessengerService?.getIcon(booking.clientMessengerType) || '💬'} ${window.MessengerService?.getLabel(booking.clientMessengerType) || 'Мессенджер'}: ${booking.clientMessengerContact}
                        </a>
                    </span>
                </div>
                ` : ''}
                <div class="booking-detail-row">
                    <span class="detail-label">🚤 Катер:</span>
                    <span class="detail-value">${booking.boatName || booking.boat_name}</span>
                </div>
                <div class="booking-detail-row">
                    <span class="detail-label">📅 Дата:</span>
                    <span class="detail-value">${booking.date}</span>
                </div>
                <div class="booking-detail-row">
                    <span class="detail-label">⏰ Время:</span>
                    <span class="detail-value">${startTime?.slice(0, 5)} — ${endTime}</span>
                </div>
                <div class="booking-detail-row">
                    <span class="detail-label">⏳ Длительность:</span>
                    <span class="detail-value">${duration} ч</span>
                </div>
                <div class="booking-detail-row">
                    <span class="detail-label">💰 Сумма:</span>
                    <span class="detail-value">${booking.totalAmount || booking.total_price || 0} ₽</span>
                </div>
                <div class="booking-detail-row">
                    <span class="detail-label">💳 Предоплата:</span>
                    <span class="detail-value">${booking.prepaid || 0} ₽</span>
                </div>
                <div class="booking-detail-row">
                    <span class="detail-label">📌 Статус:</span>
                    <span class="detail-value status-badge ${booking.status}">${this.getStatusText(booking.status)}</span>
                </div>
                <div class="modal-footer" style="display: flex; gap: 10px; margin-top: 20px;">
                    ${booking.status === 'active' ? (
                        booking.cancellation_requested 
                            ? `<span style="color: #ff9800; font-weight: 600; padding: 8px 0;">✅ Запрос на отмену отправлен</span>`
                            : `<button class="btn-request-cancel" style="background: #ff9800; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;" onclick="AquaGid.ManagerBookings.requestCancellation(${booking.id})">🔄 Запросить отмену</button>`
                    ) : ''}
                    <button class="btn-close" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Закрыть</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close').onclick = () => modal.remove();
        modal.querySelector('.btn-close').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }

    calculateEndTime(startTime, durationHours) {
        if (!startTime) return '—';
        const [hour, minute] = startTime.split(':').map(Number);
        const totalMinutes = hour * 60 + minute + (durationHours * 60);
        const endHour = Math.floor(totalMinutes / 60);
        const endMin = totalMinutes % 60;
        return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    }

    /**
     * Запросить отмену бронирования у клиента
     */
    async requestCancellation(bookingId) {
        const token = TokenService ? TokenService.getToken() : localStorage.getItem('token');
        if (!token) {
            alert('Ошибка авторизации');
            return;
        }
        
        if (!confirm('Отправить клиенту запрос на отмену бронирования? Клиент получит уведомление в личном кабинете.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/bookings/${bookingId}/request-cancellation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Ошибка отправки запроса');
            }
            
            const result = await response.json();
            alert('✅ Запрос на отмену отправлен клиенту');
            
            // Закрываем модальное окно
            const modal = document.querySelector('.modal');
            if (modal) modal.remove();

            // Обновляем локальные данные
            const booking = this.bookings.find(b => b.id === bookingId);
            if (booking) {
                booking.cancellation_requested = true;
            }
            
            // Перерисовываем таблицу
            const container = document.getElementById('bookings-container');
            if (container) this.renderContent(container);
            
            // Обновляем список бронирований
            await this.loadBookings();
            
        } catch (error) {
            console.error('Ошибка:', error);
            alert('❌ Ошибка: ' + error.message);
        }
    }

    /**
     * Рендер компонента (вызывается из ManagerApp)
     */
    async render(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            this.renderContent(container);
            await this.loadBookings();
        } else {
            // Контейнер скрыт — просто загружаем данные в фоне
            console.log('Контейнер не найден, загружаем данные в фоне');
            await this.loadBookings();
        }
    }


}

// Создаем глобальный экземпляр
if (!window.AquaGid) window.AquaGid = {};
window.AquaGid.ManagerBookings = new ManagerBookings();