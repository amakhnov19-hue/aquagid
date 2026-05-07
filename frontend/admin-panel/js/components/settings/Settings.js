/**
 * Settings.js
 * Настройки системы (подключено к API)
 * Версия: 2.0.0
 */

if (!window.AquaGid) window.AquaGid = {};

AquaGid.Settings = class {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        // Состояние
        this.settings = null;
        this.managerPrepayments = {};
        this.isLoading = true;
        this.error = null;
        this.saveSuccess = false;
        
        // Загружаем данные
        this.loadSettings();

        // Сохраняем ссылки на элементы
        this.elements = {};

        // Привязываем методы к экземпляру
        this.boundSaveSettings = this.saveSettings.bind(this);
        this.boundLoadSettings = this.loadSettings.bind(this);
    }
    
    async loadSettings() {
        this.isLoading = true;
        this.error = null;
        this.render();
        
        try {
            const token = API_CONFIG.getToken();
            if (!token) {
                throw new Error('Не авторизован. Пожалуйста, войдите в систему.');
            }
            
            // Загружаем настройки
            const data = await SettingsService.getAll();
            console.log('📥 Данные с сервера:', data);
            
            // Берем ТОЛЬКО то что пришло с сервера, без подстановок
            this.settings = {
                season: {
                    start: data.season?.start || null,
                    end: data.season?.end || null
                },
                workDay: {
                    start: data.workDay?.start || null,
                    end: data.workDay?.end || null,
                    lastRide: data.workDay?.lastRide || null,
                    step: data.workDay?.step || null
                },
                prepayment: {
                    default: data.prepayment?.default || null,
                    reminderEnabled: data.prepayment?.reminderEnabled || null
                },
                sorting: {
                    weights: {
                        subscription: data.sorting?.weights?.subscription || null,
                        rating: data.sorting?.weights?.rating || null,
                        popularity: data.sorting?.weights?.popularity || null,
                        newBoat: data.sorting?.weights?.newBoat || null,
                        random: data.sorting?.weights?.random || null
                    },
                    newBoatDays: data.sorting?.newBoatDays || null,
                    enableRandom: data.sorting?.enableRandom || null
                },
                notifications: {
                    soundAlerts: data.notifications?.soundAlerts || null,
                    checkInterval: data.notifications?.checkInterval || null,
                    alertEmail: data.notifications?.alertEmail || null
                }
            };
            
            console.log('✅ Настройки загружены:', this.settings);
            this.isLoading = false;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки настроек:', error);
            this.error = error.message;
            this.isLoading = false;
        }
        
        this.render();
    }

    // Добавь эти методы в класс:

    formatDateForInput(dateString) {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return null;
            return date.toISOString().split('T')[0];
        } catch {
            return null;
        }
    }

    formatTimeForInput(timeString) {
        if (!timeString) return null;
        try {
            // Если пришла полная дата, извлекаем время
            if (timeString.includes('T')) {
                return timeString.split('T')[1].substring(0, 5);
            }
            // Если просто время, проверяем формат
            if (timeString.match(/^\d{2}:\d{2}$/)) {
                return timeString;
            }
            return null;
        } catch {
            return null;
        }
    }
    
    async saveSettings() {
        console.log('💾 Сохраняем настройки...');
        console.log('Сохраненные элементы:', this.elements);
        
        this.isLoading = true;
        this.error = null;
        
        try {
            const token = API_CONFIG.getToken();
            if (!token) {
                throw new Error('Не авторизован');
            }
            
            // Используем сохраненные элементы
            if (!this.elements.prepaymentDefault) {
                throw new Error('Элементы не сохранены');
            }
            
            // Собираем данные из сохраненных элементов
            const settings = {};

            // Сезон
            if (this.elements.seasonStart?.value || this.elements.seasonEnd?.value) {
                settings.season = {};
                if (this.elements.seasonStart?.value) settings.season.start = this.elements.seasonStart.value;
                if (this.elements.seasonEnd?.value) settings.season.end = this.elements.seasonEnd.value;
            }

            // Рабочий день
            if (this.elements.workStart?.value || this.elements.workEnd?.value || 
                this.elements.workLast?.value || this.elements.workStep?.value) {
                settings.workDay = {};
                if (this.elements.workStart?.value) settings.workDay.start = this.elements.workStart.value;
                if (this.elements.workEnd?.value) settings.workDay.end = this.elements.workEnd.value;
                if (this.elements.workLast?.value) settings.workDay.lastRide = this.elements.workLast.value;
                if (this.elements.workStep?.value) settings.workDay.step = parseInt(this.elements.workStep.value);
            }

            // Предоплата (уже есть)
            settings.prepayment = {
                default: parseInt(this.elements.prepaymentDefault?.value) || 20,
                reminderEnabled: this.elements.prepaymentReminder?.checked || false
            };

            // Сортировка
            if (this.elements.weightSub?.value || this.elements.weightRating?.value || 
                this.elements.weightPop?.value || this.elements.weightNew?.value || 
                this.elements.weightRandom?.value || this.elements.newBoatDays?.value ||
                this.elements.enableRandom) {
                
                settings.sorting = { 
                    weights: {}  // всегда создаем объект weights
                };
                
                // Заполняем weights только если есть значения
                if (this.elements.weightSub?.value) {
                    settings.sorting.weights.subscription = parseInt(this.elements.weightSub.value);
                }
                if (this.elements.weightRating?.value) {
                    settings.sorting.weights.rating = parseInt(this.elements.weightRating.value);
                }
                if (this.elements.weightPop?.value) {
                    settings.sorting.weights.popularity = parseInt(this.elements.weightPop.value);
                }
                if (this.elements.weightNew?.value) {
                    settings.sorting.weights.newBoat = parseInt(this.elements.weightNew.value);
                }
                if (this.elements.weightRandom?.value) {
                    settings.sorting.weights.random = parseInt(this.elements.weightRandom.value);
                }
                if (this.elements.newBoatDays?.value) {
                    settings.sorting.newBoatDays = parseInt(this.elements.newBoatDays.value);
                }
                if (this.elements.enableRandom) {
                    settings.sorting.enableRandom = this.elements.enableRandom.checked;
                }
            }

            // Уведомления
            if (this.elements.soundAlerts?.checked !== undefined || 
                this.elements.checkInterval?.value || 
                this.elements.alertEmail?.value) {
                settings.notifications = {};
                if (this.elements.soundAlerts) settings.notifications.soundAlerts = this.elements.soundAlerts.checked;
                if (this.elements.checkInterval?.value) settings.notifications.checkInterval = parseInt(this.elements.checkInterval.value);
                if (this.elements.alertEmail?.value) settings.notifications.alertEmail = this.elements.alertEmail.value;
            }
            
            console.log('📤 Отправка данных:', settings);
            
            // Сохраняем
            const result = await SettingsService.save(settings);
            console.log('📥 Ответ сервера:', result);
            
            this.saveSuccess = true;
            this.isLoading = false;
            
            // Перезагружаем настройки
            await this.loadSettings();
            
        } catch (error) {
            console.error('❌ Ошибка:', error);
            this.error = error.message;
            this.isLoading = false;
            this.render();
        }
    }
    
    collectFormData() {
        console.log('🔍 collectFormData ВЫЗВАН!');
        console.log('Сохраненные элементы:', this.elements);
        
        const data = {};
        
        if (this.elements.prepaymentDefault) {
            data.prepayment = {
                default: parseInt(this.elements.prepaymentDefault.value) || null
            };
        }
        
        console.log('📦 Данные из сохраненных элементов:', data);
        return data;
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
        
        if (!this.settings) {
            this.renderEmpty();
            return;
        }
        
        this.container.innerHTML = `
            <div style="max-width: 1000px; margin: 0 auto;">
                <!-- Заголовок -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h1 style="font-size: 28px; font-weight: 600; color: #111827;">Настройки системы</h1>
                    <button id="save-settings" style="
                        padding: 10px 24px;
                        background: #4f46e5;
                        border: none;
                        border-radius: 8px;
                        color: white;
                        font-weight: 600;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        💾 Сохранить настройки
                    </button>
                </div>

                <!-- Сообщение об успехе -->
                ${this.saveSuccess ? this.renderSuccessMessage() : ''}

                <!-- СЕЗОН -->
                <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 24px;">📅</span> Сезон работы
                    </h2>
                    
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <div>
                            <label style="display: block; font-size: 14px; color: #6b7280; margin-bottom: 6px;">Начало сезона</label>
                            <input type="date" id="season-start" 
                                value="${this.settings.season?.start !== null ? this.settings.season.start : ''}" 
                                style="
                                    padding: 10px 16px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    width: 200px;
                                ">
                        </div>
                        <div>
                            <label style="display: block; font-size: 14px; color: #6b7280; margin-bottom: 6px;">Конец сезона</label>
                            <input type="date" id="season-end" 
                                value="${this.settings.season?.end !== null ? this.settings.season.end : ''}" 
                                style="
                                    padding: 10px 16px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    width: 200px;
                                ">
                        </div>
                    </div>
                </div>

                <!-- РАБОЧИЙ ДЕНЬ -->
                <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 24px;">⏰</span> Рабочий день
                    </h2>
                    
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                        <div>
                            <label style="display: block; font-size: 14px; color: #6b7280; margin-bottom: 6px;">Начало</label>
                            <input type="time" id="work-start" 
                                value="${this.settings.workDay?.start !== null ? this.settings.workDay.start : ''}" 
                                style="
                                    padding: 10px 16px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    width: 100%;
                                ">
                        </div>
                        <div>
                            <label style="display: block; font-size: 14px; color: #6b7280; margin-bottom: 6px;">Конец</label>
                            <input type="time" id="work-end" 
                                value="${this.settings.workDay?.end !== null ? this.settings.workDay.end : ''}" 
                                style="
                                    padding: 10px 16px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    width: 100%;
                                ">
                        </div>
                        <div>
                            <label style="display: block; font-size: 14px; color: #6b7280; margin-bottom: 6px;">Последний рейс</label>
                            <input type="time" id="work-last" 
                                value="${this.settings.workDay?.lastRide !== null ? this.settings.workDay.lastRide : ''}" 
                                style="
                                    padding: 10px 16px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    width: 100%;
                                ">
                        </div>
                        <div>
                            <label style="display: block; font-size: 14px; color: #6b7280; margin-bottom: 6px;">Шаг (мин)</label>
                            <select id="work-step" style="
                                padding: 10px 16px;
                                border: 2px solid #e5e7eb;
                                border-radius: 8px;
                                font-size: 14px;
                                width: 100%;
                            ">
                                <option value="15" ${this.settings.workDay?.step === 15 ? 'selected' : ''}>15 мин</option>
                                <option value="30" ${this.settings.workDay?.step === 30 ? 'selected' : ''}>30 мин</option>
                                <option value="60" ${this.settings.workDay?.step === 60 ? 'selected' : ''}>60 мин</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- ПРЕДОПЛАТА -->
                <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 24px;">💰</span> Предоплата
                    </h2>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 14px; color: #6b7280; margin-bottom: 6px;">
                            Процент по умолчанию (0-30%)
                        </label>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="range" id="prepayment-default" 
                                min="0" max="30" 
                                value="${this.settings.prepayment?.default !== null ? this.settings.prepayment.default : 20}"
                                style="width: 300px;">
                            <input type="number" id="prepayment-default-input" 
                                value="${this.settings.prepayment?.default !== null ? this.settings.prepayment.default : 20}" 
                                min="0" max="30"
                                style="
                                    padding: 8px 12px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 8px;
                                    font-size: 14px;
                                    width: 80px;
                                "> %
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="prepayment-reminder" 
                                ${this.settings.prepayment?.reminderEnabled ? 'checked' : ''}>
                            <span style="font-size: 14px;">Напоминать о настройке предоплаты на новый сезон</span>
                        </label>
                    </div>
                </div>

                <!-- СОРТИРОВКА КАТЕРОВ -->
                <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 24px;">⚡</span> Сортировка катеров
                    </h2>
                    
                    <div style="display: grid; gap: 15px; max-width: 500px;">
                        <div style="display: flex; align-items: center;">
                            <label style="width: 150px; font-size: 14px;">Подписка:</label>
                            <input type="number" id="weight-subscription" 
                                value="${this.settings.sorting?.weights?.subscription !== null ? this.settings.sorting.weights.subscription : ''}" 
                                min="0" max="1000" 
                                style="width: 80px; padding: 5px; border: 2px solid #e5e7eb; border-radius: 6px;">
                        </div>
                        <div style="display: flex; align-items: center;">
                            <label style="width: 150px; font-size: 14px;">Рейтинг (за звезду):</label>
                            <input type="number" id="weight-rating" 
                                value="${this.settings.sorting?.weights?.rating !== null ? this.settings.sorting.weights.rating : ''}" 
                                min="0" max="100" 
                                style="width: 80px; padding: 5px; border: 2px solid #e5e7eb; border-radius: 6px;">
                        </div>
                        <div style="display: flex; align-items: center;">
                            <label style="width: 150px; font-size: 14px;">Популярность (за бронь):</label>
                            <input type="number" id="weight-popularity" 
                                value="${this.settings.sorting?.weights?.popularity !== null ? this.settings.sorting.weights.popularity : ''}" 
                                min="0" max="50" 
                                style="width: 80px; padding: 5px; border: 2px solid #e5e7eb; border-radius: 6px;">
                        </div>
                        <div style="display: flex; align-items: center;">
                            <label style="width: 150px; font-size: 14px;">Новый катер:</label>
                            <input type="number" id="weight-new" 
                                value="${this.settings.sorting?.weights?.newBoat !== null ? this.settings.sorting.weights.newBoat : ''}" 
                                min="0" max="50" 
                                style="width: 80px; padding: 5px; border: 2px solid #e5e7eb; border-radius: 6px;">
                        </div>
                        <div style="display: flex; align-items: center;">
                            <label style="width: 150px; font-size: 14px;">Случайность:</label>
                            <input type="number" id="weight-random" 
                                value="${this.settings.sorting?.weights?.random !== null ? this.settings.sorting.weights.random : ''}" 
                                min="0" max="10" 
                                style="width: 80px; padding: 5px; border: 2px solid #e5e7eb; border-radius: 6px;">
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; display: flex; gap: 30px; align-items: center;">
                        <div>
                            <label style="font-size: 14px; margin-right: 10px;">Дней считать новым:</label>
                            <input type="number" id="new-boat-days" 
                                value="${this.settings.sorting?.newBoatDays !== null ? this.settings.sorting.newBoatDays : ''}" 
                                min="1" max="365" 
                                style="width: 80px; padding: 5px; border: 2px solid #e5e7eb; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: flex; align-items: center; gap: 5px;">
                                <input type="checkbox" id="enable-random" 
                                    ${this.settings.sorting?.enableRandom ? 'checked' : ''}>
                                <span style="font-size: 14px;">Включить случайность</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- УВЕДОМЛЕНИЯ -->
                <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 24px;">🔔</span> Уведомления
                    </h2>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" id="sound-alerts" 
                                ${this.settings.notifications?.soundAlerts ? 'checked' : ''}>
                            <span style="font-size: 14px;">Звук при критических ошибках</span>
                        </label>
                        
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 14px;">Проверка API каждые:</span>
                            <select id="check-interval" style="padding: 8px; border: 2px solid #e5e7eb; border-radius: 6px;">
                                <option value="1" ${this.settings.notifications?.checkInterval === 1 ? 'selected' : ''}>1 минута</option>
                                <option value="5" ${this.settings.notifications?.checkInterval === 5 ? 'selected' : ''}>5 минут</option>
                                <option value="15" ${this.settings.notifications?.checkInterval === 15 ? 'selected' : ''}>15 минут</option>
                                <option value="30" ${this.settings.notifications?.checkInterval === 30 ? 'selected' : ''}>30 минут</option>
                            </select>
                        </div>
                        
                        <div>
                            <label style="display: block; font-size: 14px; margin-bottom: 4px;">Email для оповещений</label>
                            <input type="email" id="alert-email" 
                                value="${this.settings.notifications?.alertEmail !== null ? this.settings.notifications.alertEmail : ''}" 
                                style="
                                    padding: 8px 12px;
                                    border: 2px solid #e5e7eb;
                                    border-radius: 6px;
                                    width: 300px;
                                ">
                        </div>
                    </div>
                </div>
            </div>
        `;

        // В конце render, перед attachEvents - ОДИН РАЗ
        this.elements = {
            prepaymentDefault: document.getElementById('prepayment-default'),
            prepaymentReminder: document.getElementById('prepayment-reminder'),
            seasonStart: document.getElementById('season-start'),
            seasonEnd: document.getElementById('season-end'),
            workStart: document.getElementById('work-start'),
            workEnd: document.getElementById('work-end'),
            workLast: document.getElementById('work-last'),
            workStep: document.getElementById('work-step'),
            weightSub: document.getElementById('weight-subscription'),
            weightRating: document.getElementById('weight-rating'),
            weightPop: document.getElementById('weight-popularity'),
            weightNew: document.getElementById('weight-new'),
            weightRandom: document.getElementById('weight-random'),
            newBoatDays: document.getElementById('new-boat-days'),
            enableRandom: document.getElementById('enable-random'),
            soundAlerts: document.getElementById('sound-alerts'),
            checkInterval: document.getElementById('check-interval'),
            alertEmail: document.getElementById('alert-email')
        };
        console.log('✅ Элементы сохранены:', this.elements);
        
        this.attachEvents();

        // После this.attachEvents();
        console.log('🔍 После рендера:');
        console.log('- prepayment-default:', document.getElementById('prepayment-default'));
        console.log('- season-start:', document.getElementById('season-start'));
    }
    
    renderLoading() {
        this.container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 400px;">
                <div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
                    <h3>Загрузка настроек...</h3>
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
    
    renderEmpty() {
        this.container.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 400px;">
                <div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚙️</div>
                    <h3>Нет данных настроек</h3>
                </div>
            </div>
        `;
    }
    
    renderSuccessMessage() {
        return `
            <div style="
                background: #d1fae5;
                border: 1px solid #a7f3d0;
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 20px;
                color: #065f46;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                <span style="font-size: 20px;">✅</span>
                Настройки успешно сохранены
            </div>
        `;
    }
    
    attachEvents() {
        console.log('🔗 attachEvents вызван, this:', this);
        
        // Синхронизация ползунка и поля ввода
        const defaultRange = document.getElementById('prepayment-default');
        const defaultInput = document.getElementById('prepayment-default-input');
        
        if (defaultRange && defaultInput) {
            // Убираем старые обработчики
            defaultRange.removeEventListener('input', this.boundRangeHandler);
            defaultInput.removeEventListener('input', this.boundInputHandler);
            
            // Создаем новые с привязкой
            this.boundRangeHandler = (e) => {
                defaultInput.value = e.target.value;
            };
            this.boundInputHandler = (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val)) val = 0;
                if (val < 0) val = 0;
                if (val > 30) val = 30;
                defaultRange.value = val;
                e.target.value = val;
            };
            
            defaultRange.addEventListener('input', this.boundRangeHandler);
            defaultInput.addEventListener('input', this.boundInputHandler);
        }
        
        // Кнопка сохранения - САМОЕ ВАЖНОЕ
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) {
            // Убираем старый обработчик
            saveBtn.removeEventListener('click', this.boundSaveSettings);
            // Привязываем метод к экземпляру класса
            this.boundSaveSettings = this.saveSettings.bind(this);
            saveBtn.addEventListener('click', this.boundSaveSettings);
            console.log('✅ Кнопка сохранения привязана к:', this.boundSaveSettings);
        }
    }
}