/**
 * Экран выбора времени
 */
class TimeScreen extends ScreenBase {
    constructor(mainApp) {
        super(mainApp);
        this.availableSlots = [];
    }

    /**
     * Показывает экран выбора времени
     */
    async show() {
        console.log('⏰ TimeScreen.show START');
        
        if (!this.container) return;
        
        // Получаем доступные слоты для выбранной даты
        const boatId = this.app.booking?.boat?.id;
        this.availableSlots = await window.AquaGid.AvailabilityService.getAvailableTimeSlots(this.app.booking.date, boatId);
        console.log('📅 Доступные слоты:', this.availableSlots);
        
        this.container.innerHTML = `
            <div class="screen time-screen">
                <div class="selection-container" id="selection-info">
                    ${this.renderSelectionInfo()}
                </div>
                
                <h2 class="screen-title">⏰ Выбери время</h2>
                
                <div class="home-button-container">
                    <button class="btn-home" onclick="window.AquaGid.UnifiedScreens.showWelcomeScreen()">
                        🏠 В начало
                    </button>
                </div>
                
                <div class="times-grid">
                    ${this.renderTimeSlots()}
                </div>
            </div>
        `;
        
        window.currentTimeScreen = this;
        this.updateSelectionInfo();
        
        console.log('⏰ TimeScreen.show END');
    }

    /**
     * Отрисовка слотов времени
     */
    renderTimeSlots() {
        if (!this.availableSlots || this.availableSlots.length === 0) {
            return '<p class="no-slots">❌ На эту дату нет доступного времени</p>';
        }
        
        return this.availableSlots.map(time => {
            const isSelected = this.app.booking?.time === time ? 'selected' : '';
            return `
                <div class="time-item ${isSelected}" data-time="${time}" onclick="window.currentTimeScreen?.selectTime('${time}')">
                    ${time}
                </div>
            `;
        }).join('');
    }

    /**
     * Выбрать время
     */
    selectTime(time) {
        console.log('⏰ Выбрано время:', time);
        
        this.app.booking.time = time;
        
        // Убираем выделение с других
        document.querySelectorAll('.time-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Выделяем выбранное
        document.querySelector(`.time-item[data-time="${time}"]`)?.classList.add('selected');
        
        // Переходим на выбор длительности
        this.app.showDurationSelection();
        
        this.updateSelectionInfo();
    }
}

window.TimeScreen = TimeScreen;