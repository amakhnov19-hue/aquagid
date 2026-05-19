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
            return `
                <div class="no-slots" style="text-align:center;padding:60px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;">
                    <p style="font-size:48px;margin-bottom:16px;">😊</p>
                    <p style="font-size:22px;color:#2d3748;margin-bottom:8px;font-weight:600;">Упс! Катера все заняты</p>
                    <p style="color:#6b7280;margin-bottom:28px;font-size:16px;">Попробуйте выбрать другую дату</p>
                    <a href="javascript:void(0)" onclick="window.UnifiedScreens?.showDateSelection()" 
                       style="display:inline-block;padding:14px 36px;background:#0066CC;color:white;border-radius:12px;text-decoration:none;font-size:17px;font-weight:500;box-shadow:0 2px 8px rgba(0,102,204,0.3);">
                        📅 Выбрать другую дату
                    </a>
                </div>`;
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