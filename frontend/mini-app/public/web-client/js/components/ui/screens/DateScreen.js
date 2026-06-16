/**
 * Экран выбора даты как в монолите
 */
class DateScreen extends ScreenBase {
    constructor(mainApp) {
        super(mainApp);
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.availableDates = [];
    }

    /**
     * Показывает экран выбора даты
     */
    async show() {
        console.log('📅 DateScreen.show START');
        console.log('📅 this.app.booking.boat?.id:', this.app.booking.boat?.id);
        console.log('📅 DateScreen.show START');
        
        if (!this.container) return;
        this.container.classList.remove('loading');
        
        // Загружаем доступные даты
        await this.loadAvailableDates();
        
        // Отображаем календарь
        this.renderCalendar();
        
        console.log('📅 DateScreen.show END');
    }

    /**
     * Загрузка доступных дат из API
     */
    async loadAvailableDates() {
        console.log('📅 loadAvailableDates START');
        const boatId = this.app.booking.boat?.id;
        const url = boatId 
            ? `/api/availability/available-dates-with-slots?boat_id=${boatId}`
            : '/api/availability/available-dates-with-slots';
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.dates) {
                this.availableDates = data.dates;
                this.renderCalendar();
            } else {
                this.availableDates = [];
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки дат:', error);
            this.availableDates = [];
        }
    }

    /**
     * Отрисовка календаря
     */
    renderCalendar() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const monthNames = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];
        
        const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        
        // Преобразуем доступные даты в Set для быстрого поиска
        const availableSet = new Set(this.availableDates);
        
        // Получаем первый день месяца и количество дней
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        
        // День недели первого числа (0 = воскресенье, переводим в 1 = понедельник)
        let firstDayIndex = firstDay.getDay();
        if (firstDayIndex === 0) firstDayIndex = 7; // Воскресенье = 7
        firstDayIndex -= 1; // Теперь 0 = понедельник
        
        const daysInMonth = lastDay.getDate();
        
        // Навигация по месяцам
        const prevMonth = this.currentMonth === 0 ? 11 : this.currentMonth - 1;
        const prevYear = this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear;
        const nextMonth = this.currentMonth === 11 ? 0 : this.currentMonth + 1;
        const nextYear = this.currentMonth === 11 ? this.currentYear + 1 : this.currentYear;
        
        let html = `
            <div class="screen date-screen">
                <!-- Информационный блок выбора -->
                <div class="selection-container" id="selection-info">
                    ${this.renderSelectionInfo()}
                </div>
                
                <!-- Заголовок экрана -->
                <h2 class="screen-title">📅 Выбери дату</h2>
                
                <!-- Кнопка В начало -->
                <div class="home-button-container">
                    <button class="btn-home" onclick="window.AquaGid.UnifiedScreens.showWelcomeScreen()">
                        🏠 В начало
                    </button>
                </div>
                
                <!-- Навигация по месяцам -->
                <div class="calendar-navigation">
                    <button class="btn btn-secondary prev-month" onclick="window.currentDateScreen?.changeMonth(${prevMonth}, ${prevYear})">
                        ← ${monthNames[prevMonth].slice(0, 3)}
                    </button>
                    <div class="page-info">
                        ${monthNames[this.currentMonth]} ${this.currentYear}
                    </div>
                    <button class="btn btn-secondary next-month" onclick="window.currentDateScreen?.changeMonth(${nextMonth}, ${nextYear})">
                        ${monthNames[nextMonth].slice(0, 3)} →
                    </button>
                </div>
                
                <!-- Дни недели -->
                <div class="weekdays">
                    ${dayNames.map(day => `<div class="weekday">${day}</div>`).join('')}
                </div>
                
                <!-- Сетка дат -->
                <div class="dates-grid" id="dates-grid">
        `;
        
        // Пустые ячейки в начале месяца
        for (let i = 0; i < firstDayIndex; i++) {
            html += '<div class="date-item empty"></div>';
        }
        
        // Ячейки с датами
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const currentDate = new Date(this.currentYear, this.currentMonth, day);
            currentDate.setHours(0, 0, 0, 0);
            
            const isPast = currentDate < today;
            const isAvailable = availableSet.has(dateStr);
            const isSelected = this.app.booking?.date === dateStr ? 'selected' : '';
            const isToday = currentDate.getTime() === today.getTime();
            const todayClass = isToday ? 'today' : '';
            
            if (isPast || !isAvailable) {
                html += '<div class="date-item empty"></div>';
            } else {
                html += `
                    <div class="date-item available ${isSelected} ${todayClass}" data-date="${dateStr}">
                        ${day}
                    </div>
                `;
            }
        }
        
        html += `
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Добавляем обработчики
        this.addDateHandlers();
        this.updateSelectionInfo();
        
        // Сохраняем ссылку на текущий экран для кнопок навигации
        window.currentDateScreen = this;
    }

    /**
     * Смена месяца
     */
    changeMonth(month, year) {
        this.currentMonth = month;
        this.currentYear = year;
        
        // Определяем, какой календарь рисовать
        if (this.app.currentFlow === 'bridges') {
            this.renderBridgesCalendar();
        } else {
            this.renderCalendar();
        }
        
        setTimeout(() => {
            if (this.app.currentFlow !== 'bridges') {
                this.addDateHandlers();
            }
            this.updateSelectionInfo();
        }, 50);
    }

    /**
     * Обработчики для дат
     */
    addDateHandlers() {
        document.querySelectorAll('.date-item.available').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.date-item').forEach(d => d.classList.remove('selected'));
                item.classList.add('selected');
                this.app.booking.date = item.dataset.date;
                
                // После выбора даты — куда идти?
                if (this.app.currentFlow === 'fromBoat') {
                    // Ветка "от катера" — после даты на выбор времени
                    this.app.showTimeSelection();
                } else if (this.app.currentFlow === 'bridges') {
                    // Ветка "Развод мостов" — после даты сразу в подтверждение
                    // Время и длительность уже заданы: 23:30 и 2 часа
                    this.app.booking.time = '23:30';
                    this.app.booking.duration = 2;
                    this.app.showConfirmationScreen();
                } else {
                    // Обычная ветка "от даты" — на выбор времени
                    this.app.showTimeSelection();
                }
                
                this.updateSelectionInfo();
            });
        });
    }

    /**
     * Показать ошибку
     */
    showError(message) {
        const container = document.getElementById('dates-grid');
        if (container) {
            container.innerHTML = `<div class="error">❌ ${message}</div>`;
        }
    }

    /**
     * Показывает экран выбора даты для ветки "Развод мостов"
     */
    async showBridgesMode() {
        console.log('📅 DateScreen.showBridgesMode START');
        
        if (!this.container) return;
        this.container.classList.remove('loading');
        
        // Загружаем доступные даты (можно использовать тот же метод)
        await this.loadAvailableDates();
        
        // Отображаем календарь с пометкой
        this.renderBridgesCalendar();
        
        console.log('📅 DateScreen.showBridgesMode END');
    }

    renderBridgesCalendar() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        
        const availableSet = new Set(this.availableDates);
        
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        
        let firstDayIndex = firstDay.getDay();
        if (firstDayIndex === 0) firstDayIndex = 7;
        firstDayIndex -= 1;
        
        const daysInMonth = lastDay.getDate();
        
        const prevMonth = this.currentMonth === 0 ? 11 : this.currentMonth - 1;
        const prevYear = this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear;
        const nextMonth = this.currentMonth === 11 ? 0 : this.currentMonth + 1;
        const nextYear = this.currentMonth === 11 ? this.currentYear + 1 : this.currentYear;
        
        let html = `
            <div class="screen date-screen">
                <div class="selection-container" id="selection-info">
                    ${this.renderSelectionInfo()}
                </div>
                
                <h2 class="screen-title">🌉 Выбери дату</h2>
                
                <div class="home-button-container">
                    <button class="btn-home" onclick="window.AquaGid.UnifiedScreens.showWelcomeScreen()">
                        🏠 В начало
                    </button>
                </div>
                
                <div class="calendar-navigation">
                    <button class="btn btn-secondary" onclick="window.currentDateScreen?.changeMonth(${prevMonth}, ${prevYear})">
                        ← ${monthNames[prevMonth].slice(0, 3)}
                    </button>
                    <div class="page-info">
                        ${monthNames[this.currentMonth]} ${this.currentYear}
                    </div>
                    <button class="btn btn-secondary" onclick="window.currentDateScreen?.changeMonth(${nextMonth}, ${nextYear})">
                        ${monthNames[nextMonth].slice(0, 3)} →
                    </button>
                </div>
                
                <div class="weekdays">
                    ${dayNames.map(day => `<div class="weekday">${day}</div>`).join('')}
                </div>
                
                <div class="dates-grid" id="dates-grid">
        `;
        
        for (let i = 0; i < firstDayIndex; i++) {
            html += '<div class="date-item empty"></div>';
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const currentDate = new Date(this.currentYear, this.currentMonth, day);
            currentDate.setHours(0, 0, 0, 0);
            
            const isPast = currentDate < today;
            const isAvailable = availableSet.has(dateStr);
            
            if (isPast || !isAvailable) {
                html += `<div class="date-item disabled">${day}</div>`;
            } else {
                html += `
                    <div class="date-item available bridges" data-date="${dateStr}" onclick="window.currentDateScreen?.selectBridgesDate('${dateStr}')">
                        ${day}
                    </div>
                `;
            }
        }
        
        html += `</div></div>`;
        
        this.container.innerHTML = html;
        window.currentDateScreen = this;
    }

    selectBridgesDate(dateStr) {
        console.log('🌉 selectBridgesDate:', dateStr);
        this.app.booking.date = dateStr;
        
        if (this.app.currentFlow === 'fromBoat') {
            this.app.showConfirmationScreen();
        } else {
            this.app.showBoatSelection();
        }
    }
}

window.DateScreen = DateScreen;