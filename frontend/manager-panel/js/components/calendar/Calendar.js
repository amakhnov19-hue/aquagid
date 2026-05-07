// /frontend/manager-panel/js/components/calendar/Calendar.js
// Версия: 1.0.0
// Назначение: Календарь с бронированиями

(function(global) {
    'use strict';
    
    const VERSION = '20260227_01';
    
    class ManagerCalendar {
        constructor(container, managerId, options = {}) {
            this.container = container;
            this.managerId = managerId;
            this.version = VERSION;
            this.currentDate = new Date();
            this.selectedDate = null;
            this.currentView = 'month';
            this.bookingsByDate = {};
            this.managerBoatsCount = 3; // потом заменим на реальные данные
            this.boats = []; // потом загрузим из API
        }

        async loadCalendarData() {
            const managerId = window.managerId;
            console.log('loadCalendarData called, managerId:', managerId);
            if (!managerId) {
                console.log('Нет авторизации');
                return;
            }
            
            try {
                // Загружаем бронирования
                const bookingsRes = await fetch(`/api/sync/google/bookings/${managerId}`);
                if (!bookingsRes.ok) throw new Error('Ошибка загрузки бронирований');
                const bookingsData = await bookingsRes.json();

                console.log('bookingsData.bookings sample:', bookingsData.bookings[0]);
                console.log('bookingsData.bookings source:', bookingsData.bookings[0]?.source);
                
                // Загружаем ручные события
                const today = new Date().toISOString().split('T')[0];
                const endDate = new Date();
                endDate.setMonth(endDate.getMonth() + 3);
                const endDateStr = endDate.toISOString().split('T')[0];
                
                const eventsRes = await fetch(`/api/sync/google/events/?start_date=${today}&end_date=${endDateStr}`, {
                    headers: { 'Authorization': `Bearer ${TokenService.getToken()}` }
                });
                
                let manualEvents = [];
                if (eventsRes.ok) {
                    manualEvents = await eventsRes.json();
                    console.log('Manual events received:', manualEvents.length);
                }
                
                // Объединяем бронирования и ручные события
                const allEvents = [
                    ...bookingsData.bookings.map(b => ({
                        ...b,
                        type: 'booking',
                        time: b.start_time,
                        client_name: b.client_name,
                        boat_name: b.boat_name
                    })),
                    ...manualEvents.map(e => ({
                        id: e.id,
                        type: 'manual',
                        date: e.event_date,
                        start_time: e.start_time,
                        duration_minutes: (new Date(`2000-01-01T${e.end_time}`) - new Date(`2000-01-01T${e.start_time}`)) / 60000,
                        client_name: e.title,
                        boat_name: e.boat_name || 'Событие',
                        boat_id: e.boat_id,
                        description: e.description
                    }))
                ];
                
                // Фильтруем: только сегодня и будущие
                const now = new Date();
                this.bookings = allEvents.filter(b => {
                    if (b.date < today) return false;
                    const start = new Date(b.date + 'T' + b.start_time);
                    const end = new Date(start.getTime() + b.duration_minutes * 60000);
                    return end > now;
                });
                console.log('All events after filter (today+future):', this.bookings.length);
                
                this.groupBookingsByDate();
                
                // Перерендериваем календарь
                this.render();
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
                this.bookings = [];
            }
        }

        /**
         * Группировка бронирований по датам
         */
        groupBookingsByDate() {
            const grouped = {};
            
            this.bookings.forEach(booking => {
                const date = booking.date;
                if (!grouped[date]) {
                    grouped[date] = [];
                }
                grouped[date].push({
                    id: booking.id,
                    time: booking.start_time,
                    boat: booking.boat_name || `Катер #${booking.boat_id}`,
                    boat_name: booking.boat_name,
                    client_name: booking.client_name,
                    client: booking.client_name,
                    status: booking.status,
                    duration_minutes: booking.duration_minutes,
                    type: booking.type,
                    source: booking.source
                });
            });
            
            this.bookingsByDate = grouped;
        }
        
        /**
         * Рендер календаря
         */
        render(containerId = 'calendar-container') {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            if (this.currentView === 'day' && this.selectedDate) {
                // Показываем дневной просмотр
                this.renderDayView(this.selectedDate);
            } else {
                // Показываем месячный просмотр
                const year = this.currentDate.getFullYear();
                const month = this.currentDate.getMonth();
                
                // Проверяем, можно ли переключиться на предыдущий месяц
                const today = new Date();
                const currentMonthStart = new Date(year, month, 1);
                const isPrevDisabled = currentMonthStart <= new Date(today.getFullYear(), today.getMonth(), 1);
                
                const html = `
                    <div class="calendar-section">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0px; padding-bottom: 10px; border-bottom: 1px solid #eef2ff;">
                            <div style="width: 30px;"></div>
                            <div style="display: flex; align-items: center; gap: 20px;">
                                <button class="month-nav" onclick="AquaGid.ManagerCalendar.prevMonth()" ${isPrevDisabled ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>◀</button>
                                <h3 style="margin: 0;">${this.getMonthName(month)} ${year}</h3>
                                <button class="month-nav" onclick="AquaGid.ManagerCalendar.nextMonth()">▶</button>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <span onclick="AquaGid.ManagerApp.switchSection('dashboard')" style="cursor: pointer; font-size: 24px; color: #666;">✕</span>
                            </div>
                        </div>
                        
                        <div class="calendar-grid">
                            <div class="weekday">Пн</div>
                            <div class="weekday">Вт</div>
                            <div class="weekday">Ср</div>
                            <div class="weekday">Чт</div>
                            <div class="weekday">Пт</div>
                            <div class="weekday">Сб</div>
                            <div class="weekday">Вс</div>
                            
                            ${this.renderDays(year, month)}
                        </div>
                    </div>
                `;
                
                container.innerHTML = html;

                // Добавляем обработчик для кнопки "Добавить событие"
                const addEventBtn = document.getElementById('addEventBtn');
                if (addEventBtn) {
                    addEventBtn.addEventListener('click', () => this.showAddEventModal());
                }
            }
        }

        async showAddEventModal(defaultDate = null) {
            const today = new Date().toISOString().split('T')[0];
            const selectedDate = defaultDate || today;
            
            // Загружаем катера менеджера
            const managerId = window.managerId;
            let boats = [];
            let availableSlots = {};
            
            try {
                const boatsRes = await fetch(`/api/boats?manager_id=${managerId}`);
                boats = await boatsRes.json();
                
                for (const boat of boats) {
                    const slotsRes = await fetch(`/api/availability/available-slots?boat_id=${boat.id}&booking_date=${selectedDate}`);
                    const slotsData = await slotsRes.json();
                    if (slotsData.success) {
                        availableSlots[boat.id] = slotsData.slots;
                    }
                }
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
            }
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h3>➕ Добавить бронирование</h3>
                    <form id="eventForm">
                        <div class="form-group">
                            <label>Имя гостя</label>
                            <input type="text" id="eventTitle" required>
                        </div>
                        <div class="form-group">
                            <label>Дата</label>
                            <input type="text" id="eventDate" value="${this.formatDateForDisplay(selectedDate)}" readonly style="background: #f5f5f5;">
                        </div>
                        <div class="form-group">
                            <label>Катер</label>
                            <select id="eventBoat" required>
                                ${boats.map(boat => `<option value="${boat.id}" data-slots='${JSON.stringify(availableSlots[boat.id] || [])}'>${boat.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Время начала</label>
                            <select id="eventStart" required>
                                <option value="">Сначала выберите катер</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Длительность (часы)</label>
                            <select id="eventDuration">
                                <option value="1">1 час</option>
                                <option value="1.5">1.5 часа</option>
                                <option value="2">2 часа</option>
                                <option value="2.5">2.5 часа</option>
                                <option value="3">3 часа</option>
                                <option value="4">4 часа</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Примечание</label>
                            <textarea id="eventDesc" rows="3" placeholder="Дополнительная информация"></textarea>
                        </div>
                        <button type="submit" class="btn-save">Сохранить</button>
                    </form>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const closeBtn = modal.querySelector('.close');
            closeBtn.onclick = () => modal.remove();
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
            
            const boatSelect = modal.querySelector('#eventBoat');
            const startSelect = modal.querySelector('#eventStart');
            const durationSelect = modal.querySelector('#eventDuration');
            
            boatSelect.addEventListener('change', () => {
                const selectedBoatId = boatSelect.value;
                const selectedOption = boatSelect.options[boatSelect.selectedIndex];
                const slots = JSON.parse(selectedOption.getAttribute('data-slots') || '[]');
                
                startSelect.innerHTML = '<option value="">Выберите время</option>';
                slots.forEach(slot => {
                    startSelect.innerHTML += `<option value="${slot}">${slot}</option>`;
                });
                
                if (slots.length === 0) {
                    startSelect.innerHTML = '<option value="">Нет доступных слотов</option>';
                }
            });
            
            modal.querySelector('#eventForm').onsubmit = async (e) => {
                e.preventDefault();
                
                const startTime = startSelect.value;
                const duration = parseFloat(durationSelect.value);
                
                const [hours, minutes] = startTime.split(':');
                const startMinutes = parseInt(hours) * 60 + parseInt(minutes);
                const endMinutes = startMinutes + duration * 60;
                const endHours = Math.floor(endMinutes / 60);
                const endMins = endMinutes % 60;
                const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
                const selectedBoatId = boatSelect.value;
                const selectedBoatName = boatSelect.options[boatSelect.selectedIndex].text;

                const eventData = {
                    title: document.getElementById('eventTitle').value,
                    event_date: selectedDate,
                    start_time: startTime,
                    end_time: endTime,
                    boat_id: parseInt(selectedBoatId),
                    boat_name: selectedBoatName,  // ← добавить
                    description: document.getElementById('eventDesc').value
                };

                const token = TokenService.getToken();
                console.log('Токен для создания события:', token ? token.substring(0, 50) + '...' : 'null');
                console.log('TokenService.getToken() полный:', TokenService.getToken());
                
                try {
                    const response = await fetch('/api/sync/google/events/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${TokenService.getToken()}`
                        },
                        body: JSON.stringify(eventData)
                    });
                    
                    if (response.ok) {
                        alert('✅ Бронирование добавлено');
                        modal.remove();
                        await this.loadCalendarData();  // ← добавить
                        if (this.currentView === 'day' && this.selectedDate) {
                            this.renderDayView(this.selectedDate);
                        } else {
                            this.render();
                        }
                    } else {
                        const error = await response.json();
                        alert('❌ Ошибка: ' + (error.detail || 'Не удалось добавить'));
                    }
                } catch (error) {
                    console.error('Ошибка:', error);
                    alert('❌ Ошибка при добавлении');
                }
            };
            
            if (boats.length > 0) {
                boatSelect.dispatchEvent(new Event('change'));
            }
        }

        formatDateForDisplay(dateStr) {
            const [year, month, day] = dateStr.split('-');
            return `${day}.${month}.${year}`;
        }

        loadBoatsForModal(modal) {
            const managerId = window.managerId;
            fetch(`/api/boats?manager_id=${managerId}`)
                .then(res => res.json())
                .then(boats => {
                    const select = modal.querySelector('#eventBoat');
                    if (select) {
                        select.innerHTML = boats.map(boat => 
                            `<option value="${boat.id}">${boat.name}</option>`
                        ).join('');
                    }
                })
                .catch(err => {
                    console.error('Ошибка загрузки катеров:', err);
                    const select = modal.querySelector('#eventBoat');
                    if (select) {
                        select.innerHTML = '<option value="">Ошибка загрузки</option>';
                    }
                });
        }

        renderTimeOptions() {
            const times = [];
            for (let hour = 0; hour <= 23; hour++) {
                for (let min of [0, 30]) {
                    const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                    times.push(`<option value="${time}">${time}</option>`);
                }
            }
            return times.join('');
        }

        renderBoatsOptions() {
            if (!this.boats || this.boats.length === 0) {
                return '<option value="">Загрузка...</option>';
            }
            return this.boats.map(boat => `<option value="${boat.id}">${boat.name}</option>`).join('');
        }
        
        /**
         * Рендер дней месяца
         */
        renderDays(year, month) {
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            let days = [];
            
            // Пустые ячейки до первого дня месяца
            const firstDayOfWeek = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
            for (let i = 1; i < firstDayOfWeek; i++) {
                days.push('<div class="calendar-day empty"></div>');
            }
            
            // Ячейки дней месяца
            for (let d = 1; d <= lastDay.getDate(); d++) {
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const hasBookings = this.bookingsByDate && this.bookingsByDate[dateStr] && this.bookingsByDate[dateStr].length > 0;
                const isSelected = this.selectedDate === dateStr;
                const isToday = this.isToday(dateStr);
                
                days.push(`
                    <div class="calendar-day ${hasBookings ? 'has-bookings' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}"
                        onclick="AquaGid.ManagerCalendar.renderDayView('${dateStr}')">
                        ${d}
                        ${hasBookings ? `<span class="booking-count">${this.bookingsByDate[dateStr].length}</span>` : ''}
                    </div>
                `);
            }
            
            return days.join('');
        }
        
        /**
         * Рендер деталей дня
         */
        renderDayDetails(dateStr) {
            const dayBookings = this.bookingsByDate && this.bookingsByDate[dateStr] ? this.bookingsByDate[dateStr] : [];
            
            if (dayBookings.length === 0) {
                return `
                    <div class="day-details">
                        <h3>📅 ${this.formatDate(dateStr)}</h3>
                        <p class="no-bookings">Нет бронирований</p>
                    </div>
                `;
            }
            
            return `
                <div class="day-details">
                    <h3>📅 ${this.formatDate(dateStr)}</h3>
                    <div class="bookings-list">
                        ${dayBookings.map(b => `
                            <div class="booking-item-small">
                                <span class="booking-time">${b.time}</span>
                                <span class="booking-boat">${b.boat}</span>
                                <span class="booking-client">${b.client}</span>
                                <span class="status-badge ${b.status}">${this.getStatusText(b.status)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        /**
         * Рендер детального представления дня
         */
        renderDayView(dateStr) {
            console.log('========== РЕНДЕР ДНЯ ==========');
            console.log('Дата:', dateStr);
            
            const dayBookings = this.bookingsByDate && this.bookingsByDate[dateStr] ? this.bookingsByDate[dateStr] : [];
            console.log('Бронирования на день:', dayBookings);
            console.log('Количество катеров:', this.managerBoatsCount);
            
            this.selectedDate = dateStr;
            this.currentView = 'day';
            
            const container = document.getElementById('calendar-container');
            if (!container) {
                console.error('Контейнер не найден!');
                return;
            }
            
            const [year, month, day] = dateStr.split('-');
            const date = new Date(year, month-1, day);
            
            // Проверяем, сегодня ли этот день
            const today = new Date();
            const isToday = date.toDateString() === today.toDateString();
            
            // Получаем количество катеров
            const totalBoats = this.managerBoatsCount || 3;
            console.log('Всего катеров для расчета:', totalBoats);

            console.log('dayBookings sample:', dayBookings[0]);
            console.log('boat_name in first booking:', dayBookings[0]?.boat_name);
            console.log('boat in first booking:', dayBookings[0]?.boat);
            
            // Рассчитываем позиции для бронирований
            const positionedBookings = this.positionBookings(dayBookings, totalBoats);
            console.log('Позиционированные бронирования:', positionedBookings);
            
            const html = `
                <div class="day-view">
                    <div style="margin-bottom: 20px;">
                        <!-- Шапка: стрелки + дата + крестик -->
                        <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 15px; position: relative;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <button class="day-nav prev" onclick="AquaGid.ManagerCalendar.prevDay()" ${isToday ? 'disabled style="opacity:0.5; cursor:not-allowed; background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 18px;"' : 'style="background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 18px; cursor: pointer;"'}>◀</button>
                                <h2 style="margin: 0; font-size: 18px; white-space: nowrap;">📅 ${this.formatDateShort(date)}</h2>
                                <button class="day-nav next" onclick="AquaGid.ManagerCalendar.nextDay()" style="background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 18px; cursor: pointer;">▶</button>
                            </div>
                            <button onclick="AquaGid.ManagerCalendar.showMonthView()" style="position: absolute; right: 0; background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; font-size: 18px; cursor: pointer;">✕</button>
                        </div>
                    </div>
                    
                    <div class="day-timeline" style="height: auto; min-height: 810px; border: 1px solid #e0e0e0; border-radius: 8px; display: flex; position: relative;">
                        <!-- Сетка и бронирования -->
                        <div class="grid-column" style="flex: 1; position: relative; background: white; min-width: 300px;">
                            <!-- Координатная сетка 40x40 -->
                            <div class="coordinate-grid" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 1;">
                                ${this.renderCoordinateGrid()}
                            </div>
                            
                            <!-- Бронирования -->
                            <div class="bookings-container" style="position: relative; height: 100%; z-index: 2;">
                                ${this.renderPositionedBookings(positionedBookings, dateStr)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('HTML сгенерирован, вставляем в контейнер');
            container.innerHTML = html;

            // Добавляем обработчик для кнопки добавления события
            const addEventBtn = document.getElementById('addEventDayBtn');
            if (addEventBtn) {
                addEventBtn.addEventListener('click', () => this.showAddEventModal(dateStr));
            }
            console.log('========== КОНЕЦ РЕНДЕРА ==========');
        }

        formatDateShort(date) {
            const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
            const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
            
            const dayNum = date.getDate();
            const month = months[date.getMonth()];
            const weekday = days[date.getDay()];
            
            return `${dayNum} ${month}, ${weekday}`;
        }

        isToday(dateStr) {
            const today = new Date();
            const checkDate = new Date(dateStr);
            return checkDate.toDateString() === today.toDateString();
        }
        
        /**
         * Рендер временной шкалы
         */
        renderTimeScale() {
            let scale = '';
            const startHour = 11;
            const endHour = 23;
            const offset = 30;
            
            for (let hour = startHour; hour <= endHour; hour++) {
                const topPosition = (hour - startHour) * 60 + offset;
                
                // Только цифры, без линий
                scale += `
                    <div style="position: absolute; top: ${topPosition - 8}px; left: 5px; font-size: 12px; color: #333; background: #f8f9fa; padding: 2px 4px; z-index: 3;">${hour}:00</div>
                `;
                
                // Полчаса
                scale += `
                    <div style="position: absolute; top: ${topPosition + 22}px; left: 5px; font-size: 10px; color: #999; background: #f8f9fa; padding: 0 2px; z-index: 3;">${hour}:30</div>
                `;
            }
            
            // Последняя метка 23:30
            scale += `
                <div style="position: absolute; top: ${(endHour - startHour + 0.5) * 60 + offset - 8}px; left: 5px; font-size: 12px; color: #333; background: #f8f9fa; padding: 2px 4px; z-index: 3;">23:30</div>
            `;
            
            return scale;
        }

        renderCoordinateGrid() {
            let grid = '';
            const startHour = 11;
            const endHour = 24; // до 00:00
            const offset = 30; // смещение временной шкалы
            
            // Горизонтальные линии с отметками времени
            for (let hour = startHour; hour <= endHour; hour++) {
                // Часовая линия (в 11:00, 12:00 и т.д.)
                const hourY = offset + (hour - startHour) * 60;
                grid += `
                    <div style="position: absolute; top: ${hourY}px; left: 0; right: 0; height: 1px; background: rgba(100, 100, 100, 0.4); pointer-events: none;">
                        <span style="position: absolute; left: 5px; top: -8px; font-size: 10px; color: #666; background: white; padding: 0 4px;">${hour}:00</span>
                    </div>
                `;
                
                // Получасовая линия (в 11:30, 12:30 и т.д.)
                if (hour < endHour) {
                    const halfHourY = offset + (hour - startHour) * 60 + 30;
                    grid += `
                        <div style="position: absolute; top: ${halfHourY}px; left: 0; right: 0; height: 1px; background: rgba(150, 150, 150, 0.2); pointer-events: none;">
                            <span style="position: absolute; left: 5px; top: -8px; font-size: 9px; color: #999; background: white; padding: 0 4px;">${hour}:30</span>
                        </div>
                    `;
                }
            }
            
            return grid;
        }
        
        /**
         * Распределение бронирований по катерам
         */
        positionBookings(bookings) {
            if (!bookings.length) return [];
            
            // Группируем по катерам для назначения цветов
            const uniqueBoats = [...new Set(bookings.map(b => b.boat_name || b.boat || 'Катер'))];
            
            // Цвета для катеров (палитра)
            const boatColors = [
                'rgba(52, 152, 219, 0.25)',   // яркий голубой
                'rgba(231, 76, 60, 0.25)',    // яркий красный
                'rgba(46, 204, 113, 0.25)',   // яркий зеленый
                'rgba(241, 196, 15, 0.25)',   // яркий желтый
                'rgba(155, 89, 182, 0.25)',   // яркий фиолетовый
                'rgba(26, 188, 156, 0.25)',   // яркий бирюзовый
            ];
            
            return bookings.map((booking, index) => {
                // Время начала (используем time или start_time)
                const startTime = booking.start_time || booking.time;
                if (!startTime) {
                    console.warn('Бронирование без времени:', booking);
                    return null;
                }

                console.log('Booking in positionBookings:', booking.id, booking.boat_name, booking.client_name);
                
                const [startHour, startMin] = startTime.split(':').map(Number);
                const durationMin = booking.duration_minutes || 90;
                
                // Координаты в пикселях (1 час = 60px, начало в 11:00)
                const offset = 30; // смещение временной шкалы
                const startY = (startHour - 11) * 60 + (startMin / 60) * 60 + offset;
                const height = durationMin;
                console.log(`Бронь ${startTime}: startY=${startY}, height=${height}, startHour=${startHour}, startMin=${startMin}`);
                
                // Находим индекс катера для цвета и смещения
                const boatKey = booking.boat_name || booking.boat;
                const boatIndex = uniqueBoats.indexOf(boatKey);
                const leftOffset = boatIndex * 60; // 60px отступ для каждого следующего катера
                
                // Цвет для этого катера
                const color = boatColors[boatIndex % boatColors.length];

                console.log('Positioned booking:', booking.id, booking.boat_name);
                
                return {
                    id: booking.id,
                    type: booking.type,
                    source: booking.source,
                    boat_name: booking.boat_name || booking.boat || 'Катер',
                    boat: booking.boat,
                    client_name: booking.client_name,
                    start_time: booking.start_time || booking.time,
                    duration_minutes: booking.duration_minutes || 90,
                    top: startY,
                    height: height,
                    leftOffset: leftOffset,
                    color: color,
                    boatIndex: boatIndex
                };
            }).filter(b => b !== null);
        }
        
        /**
         * Рендер позиционированных бронирований
         */
        renderPositionedBookings(positionedBookings, dateStr) {
            if (!positionedBookings || positionedBookings.length === 0) {
                return '<div class="no-bookings-message">Нет бронирований на этот день</div>';
            }
            
            const now = new Date();
            
            return positionedBookings.map(booking => {
                console.log('=== renderPositionedBookings ===');
                console.log('booking.source:', booking.source);
                console.log('booking.type:', booking.type);
                const bookingEnd = new Date(`${dateStr}T${booking.start_time}`);
                bookingEnd.setMinutes(bookingEnd.getMinutes() + booking.duration_minutes);
                
                if (bookingEnd < now) {
                    return '';
                }
                
                const endTime = this.getEndTime(booking.start_time, booking.duration_minutes);
                
                // Определяем, показывать ли крестик
                const showDelete = (booking.type === 'manual' || booking.source === 'google');

                console.log('booking.start_time:', booking.start_time);
                console.log('booking.boat_name:', booking.boat_name);
                
                return `
                    <div class="booking-block" 
                        style="top: ${booking.top}px; 
                                height: ${booking.height}px; 
                                left: ${60 + booking.leftOffset}px; 
                                right: 0;
                                position: absolute;
                                background: ${booking.color.replace('0.6', '0.35')};
                                border-left: 3px solid ${booking.color.replace('0.6', '1')};
                                border-radius: 4px;
                                padding: 4px 8px;
                                cursor: pointer;
                                overflow: hidden;
                                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                                z-index: ${Math.max(1, 100 - booking.duration_minutes)};"
                        onclick="AquaGid.ManagerCalendar.showBookingFromCalendar(${booking.id})">
                        <div class="vertical-text">
                            🚤 ${booking.boat_name || 'Событие'}<br>⏰ ${booking.start_time}—${endTime}<br>👤 ${booking.client_name || '—'}
                        </div>
                    </div>
                `;
            }).join('');
        }

        async showUnifiedDetails(eventId, type, source) {
            // Ищем событие
            let event = this.bookings.find(b => b.id === eventId);
            if (!event && window.AquaGid?.ManagerBookings?.bookings) {
                const booking = window.AquaGid.ManagerBookings.bookings.find(b => b.id === eventId);
                if (booking) {
                    event = {
                        id: booking.id,
                        client_name: booking.clientName,
                        boat_name: booking.boatName,
                        start_time: booking.time,
                        date: booking.date,
                        duration_minutes: booking.duration * 60,
                        type: 'booking',
                        source: booking.source || 'manual',
                        status: booking.status
                    };
                }
            }
            
            if (!event) {
                console.error('Событие не найдено:', eventId);
                return;
            }
            
            let sourceText = '';
            let deleteButton = '';
            
            if (event.type === 'manual') {
                sourceText = '✏️ Создано вручную';
                deleteButton = `<button class="btn-delete" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;" onclick="AquaGid.ManagerCalendar.deleteManualEvent(${event.id})">🗑 Удалить</button>`;
            } else if (event.source === 'google') {
                sourceText = '🌐 Импортировано из Google Calendar';
                deleteButton = `<button class="btn-delete" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;" onclick="AquaGid.ManagerCalendar.deleteGoogleBooking(${event.id})">🗑 Удалить</button>`;
            } else {
                sourceText = '✅ Из клиентского кабинета';
                deleteButton = event.cancellation_requested 
                    ? `<span style="color: #ff9800; font-weight: 600;">✅ Запрос на отмену отправлен</span>`
                    : `<button class="btn-request-cancel" style="background: #ff9800; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;" onclick="AquaGid.ManagerBookings.requestCancellation(${event.id})">🔄 Запросить отмену</button>`;
            }
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h3>📋 Детали бронирования</h3>
                    <div class="booking-detail-row">
                        <span class="detail-label">👤 Гость:</span>
                        <span class="detail-value">${event.client_name}</span>
                    </div>
                    ${event.client_phone ? `
                    <div class="booking-detail-row">
                        <span class="detail-label">📞 Телефон:</span>
                        <span class="detail-value"><a href="tel:${event.client_phone}" style="color: #0066CC; text-decoration: none;">${this.formatPhone(event.client_phone)}</a></span>
                    </div>
                    ` : ''}
                    <div class="booking-detail-row">
                        <span class="detail-label">🚤 Катер:</span>
                        <span class="detail-value">${event.boat_name}</span>
                    </div>
                    <div class="booking-detail-row">
                        <span class="detail-label">📅 Дата:</span>
                        <span class="detail-value">${this.formatDate(event.date || this.selectedDate)}</span>
                    </div>
                    <div class="booking-detail-row">
                        <span class="detail-label">⏰ Время:</span>
                        <span class="detail-value">${event.start_time.slice(0, 5)} — ${this.getEndTime(event.start_time, event.duration_minutes || event.duration || 0)}</span>
                    </div>
                    <div class="booking-detail-row">
                        <span class="detail-label">⏳ Длительность:</span>
                        <span class="detail-value">${this.formatDuration(event.duration_minutes || event.duration || 0)}</span>
                    </div>
                    <div class="booking-detail-row">
                        <span class="detail-label">📝 Источник:</span>
                        <span class="detail-value">${sourceText}</span>
                    </div>
                    <div class="modal-footer" style="display: flex; gap: 10px; margin-top: 20px;">
                        ${deleteButton}
                        <button class="btn-close" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Закрыть</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelector('.close').onclick = () => modal.remove();
            modal.querySelector('.btn-close').onclick = () => modal.remove();
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
        }


        getEndTime(startTime, durationMinutes) {
            const [hour, minute] = startTime.split(':').map(Number);
            const endHour = hour + Math.floor((minute + durationMinutes) / 60);
            const endMin = (minute + durationMinutes) % 60;
            return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
        }
        
        /**
         * Показать детали бронирования
         */
        async showBookingDetails(eventId) {
            const event = this.bookings.find(b => b.id === eventId);
            if (!event) {
                console.error('Событие не найдено:', eventId);
                return;
            }
            
            let sourceText = '';
            let deleteHandler = null;
            
            if (event.type === 'manual') {
                sourceText = '✏️ Создано вручную';
                deleteHandler = () => this.deleteManualEvent(event.id);
            } else if (event.source === 'google') {
                sourceText = '🌐 Импортировано из Google Calendar';
                deleteHandler = () => this.deleteGoogleBooking(event.id);
            } else {
                // Обычное бронирование из клиентского кабинета
                if (!window.AquaGid?.ManagerBookings?.bookings || window.AquaGid.ManagerBookings.bookings.length === 0) {
                    await window.AquaGid.ManagerBookings.loadBookings();
                }
                const booking = window.AquaGid.ManagerBookings.bookings.find(b => b.id === eventId);
                if (booking) {
                    window.AquaGid.ManagerBookings.showDetails(eventId);
                }
                return;
            }
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h3>📅 Детали бронирования</h3>
                    <div class="booking-detail-row">
                        <span class="detail-label">👤 Гость:</span>
                        <span class="detail-value">${event.client_name}</span>
                    </div>
                    <div class="booking-detail-row">
                        <span class="detail-label">🚤 Катер:</span>
                        <span class="detail-value">${event.boat_name}</span>
                    </div>
                    <div class="booking-detail-row">
                        <span class="detail-label">⏰ Время:</span>
                        <span class="detail-value">${event.start_time}</span>
                    </div>
                    <div class="booking-detail-row">
                        <span class="detail-label">📝 Источник:</span>
                        <span class="detail-value">${sourceText}</span>
                    </div>
                    <div class="modal-footer" style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn-delete" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">🗑 Удалить</button>
                        <button class="btn-close" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Закрыть</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelector('.close').onclick = () => modal.remove();
            modal.querySelector('.btn-close').onclick = () => modal.remove();
            modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
            
            modal.querySelector('.btn-delete').onclick = async () => {
                if (confirm('Удалить это бронирование?')) {
                    await deleteHandler();
                    modal.remove();
                }
            };
        }

        async deleteManualEvent(eventId) {
            try {
                const response = await fetch(`/api/sync/google/events/${eventId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${TokenService.getToken()}` }
                });
                
                if (response.ok) {
                    // Успешно удалено, обновляем календарь
                    await this.loadCalendarData();
                    if (this.currentView === 'day' && this.selectedDate) {
                        this.renderDayView(this.selectedDate);
                    } else {
                        this.render();
                    }
                    console.log('✅ Ручное событие удалено');
                } else {
                    const error = await response.json();
                    console.error('Ошибка удаления:', error);
                    alert('❌ Ошибка удаления: ' + (error.detail || 'Неизвестная ошибка'));
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('❌ Ошибка удаления');
            }
        }

        async deleteGoogleBooking(bookingId) {
            if (!confirm('Удалить это бронирование?')) return;
            
            try {
                const response = await fetch(`/api/sync/google/google-booking/${bookingId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${TokenService.getToken()}` }
                });
                
                if (response.ok) {
                    alert('✅ Бронирование удалено');
                    await this.loadCalendarData();
                    if (this.currentView === 'day' && this.selectedDate) {
                        this.renderDayView(this.selectedDate);
                    } else {
                        this.render();
                    }
                } else {
                    alert('❌ Ошибка удаления');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('❌ Ошибка удаления');
            }
        }

        showBookingModal(booking, dateStr) {
            const modal = document.createElement('div');
            modal.className = 'booking-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h3>📋 Детали бронирования</h3>
                    <div class="booking-detail-row">
                        <span class="detail-label">👤 Гость:</span>
                        <span class="detail-value">${event.client_name}</span>
                    </div>
                    ${event.client_phone ? `
                    <div class="booking-detail-row">
                        <span class="detail-label">📞 Телефон:</span>
                        <span class="detail-value"><a href="tel:${event.client_phone}" style="color: #0066CC; text-decoration: none;">${this.formatPhone(event.client_phone)}</a></span>
                    </div>
                    ` : ''}
                    <div class="booking-detail-row">
                        <span class="detail-label">🚤 Катер:</span>
                        <span class="detail-value">${event.boat_name}</span>
                    </div>
                    <div class="booking-detail-row">
                        <span class="detail-label">📅 Дата:</span>
                        <span class="detail-value">${this.formatDate(event.date || this.selectedDate)}</span>
                    </div>
                    <div class="booking-detail-row">
                        <span class="detail-label">⏰ Время:</span>
                        <span class="detail-value">${event.start_time.slice(0, 5)} — ${this.getEndTime(event.start_time, event.duration_minutes || event.duration || 0)}</span>
                    </div>
                    <div class="booking-detail-row">
                        <span class="detail-label">⏳ Длительность:</span>
                        <span class="detail-value">${this.formatDuration(event.duration_minutes || event.duration || 0)}</span>
                    </div>
                    <div class="booking-detail-row">
                        <span class="detail-label">📝 Источник:</span>
                        <span class="detail-value">${sourceText}</span>
                    </div>
                    <div class="modal-footer" style="display: flex; gap: 10px; margin-top: 20px;">
                        ${deleteButton}
                        <button class="btn-close" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Закрыть</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        /**
         * Вернуться к месячному просмотру
         */
        showMonthView() {
            this.currentView = 'month';
            this.render();
        }
        
        /**
         * Предыдущий месяц
         */
        prevMonth() {
            const newDate = new Date(this.currentDate);
            newDate.setDate(1);  // ← сначала ставим 1 число
            newDate.setMonth(newDate.getMonth() - 1);
            this.currentDate = newDate;
            this.selectedDate = null;
            this.render();
        }

        /**
         * Следующий месяц
         */
        nextMonth() {
            const newDate = new Date(this.currentDate);
            newDate.setDate(1);  // ← сначала ставим 1 число
            newDate.setMonth(newDate.getMonth() + 1);
            this.currentDate = newDate;
            this.selectedDate = null;
            this.render();
        }

        /**
         * Предыдущий день
         */
        prevDay() {
            if (!this.selectedDate) return;
            const [year, month, day] = this.selectedDate.split('-');
            const date = new Date(year, month-1, day);
            
            // Проверяем, не сегодня ли уже
            const today = new Date();
            if (date.toDateString() === today.toDateString()) {
                return; // Не переключаем на вчера
            }
            
            date.setDate(date.getDate() - 1);
            const newDateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
            this.renderDayView(newDateStr);
        }

        /**
         * Следующий день
         */
        nextDay() {
            if (!this.selectedDate) return;
            const [year, month, day] = this.selectedDate.split('-');
            const date = new Date(year, month-1, day);
            date.setDate(date.getDate() + 1);
            const newDateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
            this.renderDayView(newDateStr);
        }
        
        /**
         * Получить название месяца
         */
        getMonthName(monthIndex) {
            const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
            return months[monthIndex];
        }
        
        /**
         * Получить текст статуса
         */
        getStatusText(status) {
            const statuses = {
                'pending': '⏳ Ожидает',
                'confirmed': '✅ Подтверждено',
                'paid': '💰 Оплачено',
                'cancelled': '❌ Отменено',
                'completed': '⭐ Завершено'
            };
            return statuses[status] || status;
        }
        
        /**
         * Форматировать дату
         */
        formatDate(dateStr) {
            const [year, month, day] = dateStr.split('-');
            return `${day}.${month}.${year}`;
        }
        
        /**
         * Форматирование даты полное
         */
        formatDateFull(date) {
            const months = [
                'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
            ];
            const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
            
            return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${days[date.getDay()]}`;
        }
        
        /**
         * Проверить, сегодня ли эта дата
         */
        isToday(dateStr) {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
            return dateStr === todayStr;
        }

        formatPhone(phone) {
            if (!phone) return '';
            const cleaned = phone.replace(/\D/g, '');
            if (cleaned.length === 11) {
                return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`;
            }
            return phone;
        }

        formatDuration(minutes) {
            if (!minutes) return '—';
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            if (hours === 0) return `${mins} мин`;
            if (mins === 0) return `${hours} ч`;
            return `${hours} ч ${mins} мин`;
        }

        /**
         * Показать детали бронирования из календаря (не зависит от ManagerBookings)
         */
        showBookingFromCalendar(bookingId) {
            const booking = this.bookings?.find(b => b.id === bookingId);
            if (!booking) {
                console.error('Бронирование не найдено в календаре:', bookingId);
                return;
            }
            
            // Формируем объект, совместимый с showDetailsModal
            const bookingData = {
                id: booking.id,
                clientName: booking.client_name || '—',
                clientPhone: booking.client_phone || '—',
                boatName: booking.boat_name || 'Событие',
                date: booking.date,
                time: booking.start_time,
                duration: (booking.duration_minutes || 60) / 60,
                totalAmount: booking.total_price || 0,
                prepaid: booking.prepayment_amount || 0,
                status: booking.status || 'active',
            };
            
            // Используем модалку из ManagerBookings, если она уже загружена
            if (window.AquaGid?.ManagerBookings?.showDetailsModal) {
                window.AquaGid.ManagerBookings.showDetailsModal(bookingData);
            } else {
                alert(`
                    📋 Детали бронирования:
                    🚤 Катер: ${bookingData.boatName}
                    👤 Клиент: ${bookingData.clientName}
                    📅 Дата: ${bookingData.date}
                    ⏰ Время: ${bookingData.time}
                    ⏱ Длительность: ${bookingData.duration} ч
                    💰 Сумма: ${bookingData.totalAmount} ₽
                `);
            }
        }
    }
    
// Экспорт класса
if (typeof window !== 'undefined') {
    window.ManagerCalendar = ManagerCalendar;
}

})(typeof window !== 'undefined' ? window : global);