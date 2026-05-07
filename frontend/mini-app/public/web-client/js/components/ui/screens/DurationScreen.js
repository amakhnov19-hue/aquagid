/**
 * Экран выбора длительности
 */
class DurationScreen extends ScreenBase {
    constructor(mainApp) {
        super(mainApp);
        this.maxAvailableHours = 8; // по умолчанию
    }

    /**
     * Показывает экран выбора длительности
     */
    async show() {
        console.log('⏱️ DurationScreen.show START');
        
        if (!this.container) return;
        
        // Получаем максимальную доступную длительность для выбранных даты и времени
        const date = this.app.booking.date;
        const time = this.app.booking.time;
        
        if (date && time) {
            const boatId = this.app.booking.boat?.id;
            this.maxAvailableHours = await window.AquaGid.AvailabilityService.getMaxDuration(date, time, boatId);
            console.log(`⏱️ Макс. длительность для ${date} ${time}: ${this.maxAvailableHours} ч`);
        }
        
        // Фильтруем популярные длительности
        const popularDurations = window.APP_CONSTANTS.DURATION.POPULAR.filter(d => d <= this.maxAvailableHours);
        
        this.container.innerHTML = `
            <div class="screen duration-screen">
                <div class="selection-container" id="selection-info">
                    ${this.renderSelectionInfo()}
                </div>
                
                <h2 class="screen-title">⏱️ Выбери длительность</h2>
                
                <div class="home-button-container">
                    <button class="btn-home" onclick="window.AquaGid.UnifiedScreens.showWelcomeScreen()">
                        🏠 В начало
                    </button>
                </div>
                
                ${popularDurations.length > 0 ? `
                <div class="popular-section">
                    <h3 class="section-title">Популярные варианты</h3>
                    <div class="durations-grid popular">
                        ${popularDurations.map(duration => this.renderDurationCard(duration)).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div class="custom-section">
                    <h3 class="section-title">Своя продолжительность</h3>
                    <div class="custom-duration-picker">
                        <div class="time-selector">
                            <select id="custom-hours" class="time-select">
                                ${this.renderHourOptions()}
                            </select>
                            
                            <select id="custom-minutes" class="time-select">
                                <option value="0">00 мин</option>
                                <option value="30">30 мин</option>
                            </select>
                        </div>
                        
                        <div class="range-hint">
                            Мин. ${window.APP_CONSTANTS.DURATION.MIN_HOURS} ч, макс. ${this.maxAvailableHours} ч, шаг 30 мин
                        </div>
                        
                        <button class="btn-select-custom" onclick="window.currentDurationScreen?.selectCustomDuration()">
                            ✅ Выбрать свою продолжительность
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        window.currentDurationScreen = this;
        this.addHourChangeHandler();
        this.addDurationHandlers();
        this.updateSelectionInfo();
        
        console.log('⏱️ DurationScreen.show END');
    }

    /**
     * Отрисовка карточки длительности
     */
    renderDurationCard(hours) {
        const isSelected = this.app.booking?.duration === hours ? 'selected' : '';
        const displayText = hours % 1 === 0 ? `${hours} ч` : `${hours} ч`;
        
        return `
            <div class="duration-item popular ${isSelected}" data-duration="${hours}">
                ${displayText}
            </div>
        `;
    }

    /**
     * Обработчики для популярных длительностей
     */
    addDurationHandlers() {
        document.querySelectorAll('.duration-item.popular').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.duration-item').forEach(d => d.classList.remove('selected'));
                item.classList.add('selected');
                const duration = parseFloat(item.dataset.duration);
                this.selectDuration(duration);
            });
        });
    }

    /**
     * Выбрать длительность
     */
    selectDuration(hours) {
        console.log('⏱️ Выбрана длительность:', hours);
        
        this.app.booking.duration = hours;
        
        if (this.app.currentFlow === 'quick') {
            this.app.showConfirmationScreen();
        } else if (this.app.currentFlow === 'fromBoat') {
            this.app.showConfirmationScreen();
        } else {
            this.app.showBoatSelection();
        }
        
        this.updateSelectionInfo();
    }

    /**
     * Выбрать свою продолжительность
     */
    selectCustomDuration() {
        const hours = parseInt(document.getElementById('custom-hours').value);
        const minutes = parseInt(document.getElementById('custom-minutes').value);
        
        // Если минуты заблокированы, они должны быть 0
        if (hours === 8 && minutes > 0) {
            alert('При длительности 8 часов можно выбрать только 00 минут');
            return;
        }
        
        // Проверка на максимальную длительность
        if (hours > this.maxAvailableHours) {
            alert(`Максимальная длительность для этого времени — ${this.maxAvailableHours} часов`);
            return;
        }
        
        const totalHours = hours + (minutes / 60);
        
        // Проверка границ
        if (totalHours > this.maxAvailableHours) {
            alert(`Максимальная длительность для этого времени — ${this.maxAvailableHours} часов`);
            return;
        }
        
        if (totalHours < window.APP_CONSTANTS.DURATION.MIN_HOURS) {
            alert(`Минимальная длительность — ${window.APP_CONSTANTS.DURATION.MIN_HOURS} час`);
            return;
        }
        
        this.selectDuration(totalHours);
    }

    /**
     * Генерация опций для выбора часов
     */
    renderHourOptions() {
        const maxDurationFromSettings = this.app.booking.boat?.max_duration || 8;
        const options = [];
        for (let i = 1; i <= maxDurationFromSettings; i++) {
            if (i <= this.maxAvailableHours) {
                options.push(`<option value="${i}" ${i === 2 ? 'selected' : ''}>${i} ${this.getHourWord(i)}</option>`);
            } else {
                options.push(`<option value="${i}" disabled>${i} ${this.getHourWord(i)} (недоступно)</option>`);
            }
        }
        return options.join('');
    }

    /**
     * Склонение слова "час"
     */
    getHourWord(hours) {
        if (hours === 1) return 'час';
        if (hours >= 2 && hours <= 4) return 'часа';
        return 'часов';
    }

    /**
     * Обработчик изменения часов
     */
    addHourChangeHandler() {
        const hoursSelect = document.getElementById('custom-hours');
        const minutesSelect = document.getElementById('custom-minutes');
        
        if (hoursSelect && minutesSelect) {
            hoursSelect.addEventListener('change', (e) => {
                const hours = parseInt(e.target.value);
                
                // Если выбрано 8 часов - блокируем выбор минут
                if (hours === 8) {
                    minutesSelect.value = '0';
                    minutesSelect.disabled = true;
                    minutesSelect.style.opacity = '0.5';
                    minutesSelect.style.pointerEvents = 'none';
                } else {
                    minutesSelect.disabled = false;
                    minutesSelect.style.opacity = '1';
                    minutesSelect.style.pointerEvents = 'auto';
                }
                
                // Дополнительная проверка на максимальную доступность
                if (hours >= this.maxAvailableHours) {
                    minutesSelect.value = '0';
                    minutesSelect.disabled = true;
                    minutesSelect.style.opacity = '0.5';
                    minutesSelect.style.pointerEvents = 'none';
                } else if (hours !== 8) {
                    minutesSelect.disabled = false;
                    minutesSelect.style.opacity = '1';
                    minutesSelect.style.pointerEvents = 'auto';
                }
            });
            
            // Проверяем начальное значение
            setTimeout(() => {
                const initialHours = parseInt(hoursSelect.value);
                if (initialHours === 8 || initialHours >= this.maxAvailableHours) {
                    minutesSelect.value = '0';
                    minutesSelect.disabled = true;
                    minutesSelect.style.opacity = '0.5';
                    minutesSelect.style.pointerEvents = 'none';
                }
            }, 100);
        }
    }
}

window.DurationScreen = DurationScreen;