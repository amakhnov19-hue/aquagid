// /frontend/manager-panel/js/components/settings/Settings.js
// Версия: 2.0.0
// Назначение: Настройки профиля, катеров, уведомлений, интеграций

(function(global) {
    'use strict';
    
    const VERSION = '20260407_01';
    
    class ManagerSettings {
        constructor() {
            this.version = VERSION;

            // Глобальные ограничения из ЛК Админа (будут приходить с бэкенда)
            this.globalLimits = {
                seasonStart: null,
                seasonEnd: null,
                minWorkTime: null,
                maxWorkTime: null,
                maxDurationGlobal: null
            };
            
            // Настройки катеров (загрузятся из API)
            this.boatSettings = {
                seasonStart: null,
                seasonEnd: null,
                workStart: null,
                workEnd: null,
                maxDuration: null
            };
            
            // Настройки уведомлений
            this.notifications = {
                newBookings: true,
                cancellations: true,
                reviews: true,
                adminMessages: true
            };
            
            // Google Calendar
            this.googleCalendar = {
                connected: false,
                email: null,
                lastSync: null,
                calendars: [],
                selectedCalendarId: null
            };

            this.loadSettings();
            this.loadGlobalLimits();
        }

        async loadGlobalLimits() {
            try {
                const response = await fetch('/api/admin/global-settings/public');
                if (response.ok) {
                    const data = await response.json();
                    this.globalLimits = {
                        seasonStart: data.season_start || null,
                        seasonEnd: data.season_end || null,
                        minWorkTime: data.work_start || null,
                        maxWorkTime: data.work_end || null,
                        maxDurationGlobal: data.max_duration || null
                    };
                    console.log('Глобальные ограничения загружены:', this.globalLimits);
                }
            } catch (error) {
                console.error('Ошибка загрузки глобальных ограничений:', error);
            }
        }

        async loadSettings() {
            console.log('loadSettings START');
            const managerId = window.managerId;
            console.log('managerId:', managerId);
            if (!managerId) return;
            
            try {
                const response = await fetch(`/api/settings/${managerId}`);
                if (response.ok) {
                    const data = await response.json();
                    this.boatSettings = {
                        seasonStart: data.season_start || null,
                        seasonEnd: data.season_end || null,
                        workStart: data.work_start || null,
                        workEnd: data.work_end || null,
                        maxDuration: data.max_duration || null
                    };

                    console.log('boatSettings после загрузки:', this.boatSettings);

                    this.notifications = {
                        newBookings: data.notify_new_bookings ?? true,
                        cancellations: data.notify_cancellations ?? true,
                        reviews: data.notify_reviews ?? true,
                        adminMessages: data.notify_admin ?? true
                    };

                    console.log('Данные из API:', data);
                    
                    // Обновляем поля формы
                    this.updateFormFields();
                    console.log('После updateFormFields:', {
                        seasonStart: this.boatSettings.seasonStart,
                        workStart: this.boatSettings.workStart
                    });

                    // Загружаем статус календаря после того, как managerId известен
                    await this.loadCalendarStatus();
                }
            } catch (error) {
                console.error('Ошибка загрузки настроек:', error);
            }
        }

        updateFormFields() {
            console.log('Обновляем поля формы');
            
            const seasonStart = document.getElementById('seasonStart');
            if (seasonStart) seasonStart.value = this.boatSettings.seasonStart || '';
            
            const seasonEnd = document.getElementById('seasonEnd');
            if (seasonEnd) seasonEnd.value = this.boatSettings.seasonEnd || '';
            
            const workStart = document.getElementById('workStart');
            if (workStart) workStart.value = this.boatSettings.workStart || '11:00';
            
            const workEnd = document.getElementById('workEnd');
            if (workEnd) workEnd.value = this.boatSettings.workEnd || '23:30';
            
            const maxDuration = document.getElementById('maxDuration');
            if (maxDuration) maxDuration.value = this.boatSettings.maxDuration || 4;
            
            const notifyNew = document.getElementById('notifyNewBookings');
            const notifyCancellations = document.getElementById('notifyCancellations');
            const notifyReviews = document.getElementById('notifyReviews');
            const notifyAdmin = document.getElementById('notifyAdmin');
            
            if (notifyNew) notifyNew.checked = this.notifications.newBookings;
            if (notifyCancellations) notifyCancellations.checked = this.notifications.cancellations;
            if (notifyReviews) notifyReviews.checked = this.notifications.reviews;
            if (notifyAdmin) notifyAdmin.checked = this.notifications.adminMessages;
        }
        
        async render(containerId = 'settings-container') {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            container.innerHTML = this.renderSettings();
            this.updateFormFields();
            
            // Рендерим Google Calendar прямо здесь
            const googleContainer = document.getElementById('google-calendar-settings');
            if (googleContainer) {
                googleContainer.innerHTML = this.renderGoogleCalendar();
            }

            // Проверяем, вернулись ли мы после подключения календаря
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('calendar_connected') === 'true') {
                console.log('🔄 Обнаружен параметр calendar_connected=true, загружаем статус...');
                
                // Убираем параметр из URL сразу, чтобы не мешал при перезагрузке
                const newUrl = window.location.pathname + '?section=settings';
                window.history.replaceState({}, document.title, newUrl);
                
                // Принудительно устанавливаем флаг и загружаем календари
                this.googleCalendar.connected = true;
                
                // Загружаем статус и календари
                const managerId = window.managerId;
                if (managerId) {
                    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
                    
                    // Сначала получаем статус
                    fetch(`/api/sync/google/status/${managerId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    .then(r => r.json())
                    .then(async (statusData) => {
                        console.log('📅 Статус календаря после OAuth:', statusData);
                        this.googleCalendar.connected = statusData.connected;
                        this.googleCalendar.selectedCalendarId = statusData.calendar_id;
                        
                        // Затем загружаем список календарей
                        if (statusData.connected) {
                            const calResponse = await fetch(`/api/sync/google/calendars/${managerId}`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const calData = await calResponse.json();
                            console.log('📋 Список календарей получен:', calData);
                            
                            this.googleCalendar.calendars = calData.calendars || [];
                            
                            // Если календари загрузились, но selectedCalendarId не установлен
                            if (!this.googleCalendar.selectedCalendarId && this.googleCalendar.calendars.length > 0) {
                                // Ищем primary календарь
                                const primaryCal = this.googleCalendar.calendars.find(cal => cal.primary);
                                if (primaryCal) {
                                    this.googleCalendar.selectedCalendarId = primaryCal.id;
                                    // Сохраняем выбор на бэкенде
                                    await fetch(`/api/sync/google/select/${managerId}?calendar_id=${primaryCal.id}`, {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    console.log('✅ Автоматически выбран primary календарь:', primaryCal.id);
                                }
                            }
                            
                            // Перерисовываем интерфейс
                            this.render();

                            // Принудительно обновляем дашборд
                            if (window.AquaGid?.ManagerDashboard) {
                                console.log('🔄 Принудительно обновляем дашборд');
                                await window.AquaGid.ManagerDashboard.loadDashboardData();
                            }
                        }
                    })
                    .catch(error => {
                        console.error('❌ Ошибка загрузки статуса после OAuth:', error);
                    });
                }
            }
        }

        getAvailableTimes() {
            const times = [];
            for (let hour = 0; hour <= 23; hour++) {
                times.push(`${hour.toString().padStart(2, '0')}:00`);
                times.push(`${hour.toString().padStart(2, '0')}:30`);
            }
            times.push('24:00');
            return times;
        }

        renderSettings() {
            const seasonStartValue = this.boatSettings.seasonStart || '';
            const seasonEndValue = this.boatSettings.seasonEnd || '';
            const workStartValue = this.boatSettings.workStart || '11:00';
            const workEndValue = this.boatSettings.workEnd || '24:00';
            const maxDurationValue = this.boatSettings.maxDuration || 4;
            
            return `
                <div class="settings-section">
                    <div class="settings-card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="margin: 0;">🚤 Настройки катеров</h2>
                            <span onclick="AquaGid.ManagerApp.switchSection('dashboard')" style="cursor: pointer; font-size: 24px; color: #666;">✕</span>
                        </div>
                        
                        <div class="settings-row">
                            <span class="settings-label">Сезон:</span>
                            <div class="settings-value date-range">
                                <input type="date" class="settings-input" id="seasonStart" 
                                    value="${seasonStartValue}"
                                    min="${this.globalLimits.seasonStart || ''}" 
                                    max="${this.globalLimits.seasonEnd || ''}">
                                <span>—</span>
                                <input type="date" class="settings-input" id="seasonEnd" 
                                    value="${seasonEndValue}"
                                    min="${this.globalLimits.seasonStart || ''}" 
                                    max="${this.globalLimits.seasonEnd || ''}">
                            </div>
                        </div>
                        ${this.globalLimits.seasonStart ? `
                        <div class="settings-note">
                            Глобальные ограничения: ${this.formatDate(this.globalLimits.seasonStart)} - ${this.formatDate(this.globalLimits.seasonEnd)}
                        </div>
                        ` : ''}

                        <div class="settings-row">
                            <span class="settings-label">Рабочее время:</span>
                            <div class="settings-value time-range">
                                <select class="settings-input" id="workStart" style="width: 120px;">
                                    ${this.getAvailableTimes().map(time => `
                                        <option value="${time}" ${workStartValue === time ? 'selected' : ''}>
                                            ${time}
                                        </option>
                                    `).join('')}
                                </select>
                                <span>—</span>
                                <select class="settings-input" id="workEnd" style="width: 120px;">
                                    ${this.getAvailableTimes().map(time => `
                                        <option value="${time}" ${workEndValue === time ? 'selected' : ''}>
                                            ${time}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="settings-row">
                            <span class="settings-label">Макс. длительность:</span>
                            <div class="settings-value">
                                <input type="number" class="settings-input" id="maxDuration" 
                                    value="${maxDurationValue}" 
                                    min="1" 
                                    max="${this.globalLimits.maxDurationGlobal || 12}">
                            </div>
                        </div>
                    </div>
                    
                    <div class="settings-card">
                        <h2>🔔 Уведомления</h2>
                        
                        <div class="notification-item">
                            <label for="notifyNewBookings">Новые подтвержденные бронирования</label>
                            <input type="checkbox" id="notifyNewBookings" ${this.notifications.newBookings ? 'checked' : ''}>
                        </div>
                        
                        <div class="notification-item">
                            <label for="notifyCancellations">Отмены бронирований</label>
                            <input type="checkbox" id="notifyCancellations" ${this.notifications.cancellations ? 'checked' : ''}>
                        </div>
                        
                        <div class="notification-item">
                            <label for="notifyReviews">Отзывы на мои катера</label>
                            <input type="checkbox" id="notifyReviews" ${this.notifications.reviews ? 'checked' : ''}>
                        </div>
                        
                        <div class="notification-item">
                            <label for="notifyAdmin">Сообщения от Админа</label>
                            <input type="checkbox" id="notifyAdmin" ${this.notifications.adminMessages ? 'checked' : ''}>
                        </div>
                    </div>
                    
                    <div class="settings-card">
                        <h2>📅 Google Calendar</h2>
                        <div id="google-calendar-settings"></div>
                    </div>
                    
                    <button class="btn-save" onclick="AquaGid.ManagerSettings.saveSettings()">
                        💾 Сохранить настройки
                    </button>
                </div>
            `;
        }

        renderGoogleCalendar() {
            const connected = this.googleCalendar.connected;
            const email = this.googleCalendar.email || '';
            const calendars = this.googleCalendar.calendars || [];
            const selectedCalendarId = this.googleCalendar.selectedCalendarId;
            
            if (!connected) {
                return `
                    <div style="text-align: center; padding: 20px 0;">
                        <p style="color: #666; margin-bottom: 15px;">Подключите Google Календарь для автоматической синхронизации бронирований</p>
                        <button class="btn-connect" onclick="AquaGid.ManagerSettings.connectCalendar()" 
                            style="background: #0066CC; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 16px; cursor: pointer;">
                            🔌 Подключить Google Календарь
                        </button>
                    </div>
                `;
            }
            
            return `
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; padding: 10px; border-radius: 8px;">
                        <span style="font-size: 20px;">✅</span>
                        <span style="color: #2e7d32;">Подключен${email ? ': ' + email : ''}</span>
                    </div>
                    
                    <div class="settings-row">
                        <span class="settings-label">Календарь:</span>
                        <div class="settings-value">
                            <select id="calendarSelect" onchange="AquaGid.ManagerSettings.changeCalendar(this.value)" 
                                style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;">
                                ${calendars.map(cal => `
                                    <option value="${cal.id}" ${selectedCalendarId === cal.id ? 'selected' : ''}>
                                        ${cal.summary || cal.name || 'Календарь'} ${cal.primary ? '(основной)' : ''}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button onclick="AquaGid.ManagerSettings.syncCalendar()" 
                            style="background: #f1f5f9; color: #333; border: 1px solid #ddd; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                            🔄 Синхронизировать
                        </button>
                        <button onclick="AquaGid.ManagerSettings.disconnectCalendar()" 
                            style="background: #fff; color: #dc3545; border: 1px solid #dc3545; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                            ❌ Отключить
                        </button>
                    </div>
                    
                    ${this.googleCalendar.lastSync ? `
                        <p style="margin-top: 15px; font-size: 12px; color: #999;">
                            Последняя синхронизация: ${this.googleCalendar.lastSync}
                        </p>
                    ` : ''}
                </div>
            `;
        }

        async syncCalendar() {
            const managerId = window.managerId;
            if (!managerId) return;
            
            try {
                const response = await fetch(`/api/sync/google/import/${managerId}`, { 
                    method: 'POST' 
                });
                const data = await response.json();
                
                this.googleCalendar.lastSync = new Date().toLocaleString();
                alert(`✅ Синхронизировано: ${data.imported || 0} событий`);
                
                // Обновляем календарь
                if (window.AquaGid?.ManagerCalendar) {
                    window.AquaGid.ManagerCalendar.loadCalendarData();
                }
                if (window.AquaGid?.ManagerBookings) {
                    window.AquaGid.ManagerBookings.loadBookings();
                }
                
                this.render();
            } catch (error) {
                console.error('Ошибка синхронизации:', error);
                alert('❌ Ошибка синхронизации');
            }
        }

        renderCalendarOptions() {
            const calendars = this.googleCalendar.calendars || [];
            if (!calendars.length) return '<option>Загрузка...</option>';
            
            return calendars.map(cal => `
                <option value="${cal.id}" ${this.googleCalendar.selectedCalendarId === cal.id ? 'selected' : ''}>
                    ${cal.summary || cal.name || 'Календарь'} ${cal.primary ? '(основной)' : ''}
                </option>
            `).join('');
        }

        async changeCalendar(calendarId) {
            const managerId = window.managerId;
            if (!managerId) return;
            
            this.googleCalendar.selectedCalendarId = calendarId;
            
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            
            try {
                // Отправляем calendar_id как query parameter
                const response = await fetch(`/api/sync/google/select/${managerId}?calendar_id=${calendarId}`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    console.log('✅ Календарь сохранён в БД:', calendarId);
                    
                    // Проверяем, что сохранилось
                    const statusResponse = await fetch(`/api/sync/google/status/${managerId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const statusData = await statusResponse.json();
                    console.log('📅 Статус после сохранения:', statusData);
                    
                    // Обновляем дашборд (если метод существует)
                    if (window.AquaGid?.ManagerApp?.loadDashboardData) {
                        window.AquaGid.ManagerApp.loadDashboardData();
                    } else if (window.AquaGid?.ManagerApp?.render) {
                        window.AquaGid.ManagerApp.render();
                    }
                } else {
                    console.error('❌ Ошибка сохранения календаря');
                }
            } catch (error) {
                console.error('❌ Ошибка сохранения выбора:', error);
            }

            // Отправляем событие через Event Bus
            if (window.AquaGid?.events) {
                const calendarName = this.googleCalendar.calendars.find(c => c.id === calendarId)?.summary || '';
                window.AquaGid.events.emit(
                    window.AquaGid.EventTypes.CALENDAR_UPDATED,
                    {
                        connected: true,
                        calendarId: calendarId,
                        name: calendarName
                    }
                );
                console.log('📡 Отправлено событие CALENDAR_UPDATED');
            }
        }

        async loadCalendars() {
            const managerId = window.managerId;
            if (!managerId || !this.googleCalendar.connected) return;
            
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            
            try {
                const response = await fetch(`/api/sync/google/calendars/${managerId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                const calendars = data.calendars || data || [];
                this.googleCalendar.calendars = calendars;
                
                const statusResponse = await fetch(`/api/sync/google/status/${managerId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const statusData = await statusResponse.json();
                const savedCalendarId = statusData.calendar_id;
                
                const calendarsArray = Array.isArray(this.googleCalendar.calendars) ? this.googleCalendar.calendars : [];
                this.googleCalendar.selectedCalendarId = savedCalendarId || 
                    calendarsArray.find(cal => cal.primary)?.id;
                
                this.render();
            } catch (error) {
                console.error('Ошибка загрузки календарей:', error);
            }
        }

        async syncCalendar() {
            const managerId = window.managerId;
            if (!managerId) return;
            
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            
            try {
                const response = await fetch(`/api/sync/google/import/${managerId}`, { 
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                
                this.googleCalendar.lastSync = new Date().toLocaleString();
                alert(`✅ Синхронизировано: ${data.imported || 0} событий`);
                
                if (window.AquaGid?.ManagerCalendar) {
                    window.AquaGid.ManagerCalendar.loadCalendarData();
                }
                
                this.render();
            } catch (error) {
                console.error('Ошибка синхронизации:', error);
                alert('❌ Ошибка синхронизации');
            }
        }

        async disconnectCalendar() {
            if (!confirm('Отключить Google Календарь?')) return;
            
            const managerId = window.managerId;
            if (!managerId) return;
            
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            
            try {
                const response = await fetch(`/api/sync/google/${managerId}`, { 
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    // Сбрасываем состояние
                    this.googleCalendar.connected = false;
                    this.googleCalendar.email = null;
                    this.googleCalendar.calendars = [];
                    this.googleCalendar.selectedCalendarId = null;
                    
                    // Обновляем дашборд
                    if (window.AquaGid?.ManagerDashboard) {
                        window.AquaGid.ManagerDashboard.calendarConnected = false;
                        window.AquaGid.ManagerDashboard.calendarName = null;
                        window.AquaGid.ManagerDashboard.render();
                    }
                    
                    this.render();
                    alert('✅ Календарь отключён');
                } else {
                    alert('❌ Ошибка отключения');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('❌ Ошибка отключения');
            }
        }

        formatDate(dateStr) {
            if (!dateStr) return 'не задано';
            const [year, month, day] = dateStr.split('-');
            return `${day}.${month}.${year}`;
        }
        
        async saveSettings() {
            const managerId = window.managerId;
            if (!managerId) {
                alert('Нет авторизации');
                return;
            }
            
            const seasonStart = document.getElementById('seasonStart')?.value || null;
            const seasonEnd = document.getElementById('seasonEnd')?.value || null;
            const workStart = document.getElementById('workStart')?.value;
            const workEnd = document.getElementById('workEnd')?.value;
            const maxDuration = parseInt(document.getElementById('maxDuration')?.value);
            
            this.boatSettings.seasonStart = seasonStart;
            this.boatSettings.seasonEnd = seasonEnd;
            this.boatSettings.workStart = workStart;
            this.boatSettings.workEnd = workEnd;
            this.boatSettings.maxDuration = maxDuration;
            
            this.notifications.newBookings = document.getElementById('notifyNewBookings')?.checked || false;
            this.notifications.cancellations = document.getElementById('notifyCancellations')?.checked || false;
            this.notifications.reviews = document.getElementById('notifyReviews')?.checked || false;
            this.notifications.adminMessages = document.getElementById('notifyAdmin')?.checked || false;
            
            try {
                const response = await fetch(`/api/settings/${managerId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        season_start: seasonStart,
                        season_end: seasonEnd,
                        work_start: workStart,
                        work_end: workEnd,
                        max_duration: maxDuration,
                        notify_new_bookings: this.notifications.newBookings,
                        notify_cancellations: this.notifications.cancellations,
                        notify_reviews: this.notifications.reviews,
                        notify_admin: this.notifications.adminMessages
                    })
                });
                
                if (response.ok) {
                    alert('✅ Настройки сохранены');
                    await this.loadSettings();
                } else {
                    alert('❌ Ошибка сохранения');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('❌ Ошибка сохранения');
            }
        }
        
        disconnectGoogle() {
            if (confirm('Отключить Google Calendar?')) {
                this.googleCalendar.connected = false;
                this.googleCalendar.email = null;
                this.render(document.getElementById('settings-container'));
            }
        }

        async connectCalendar() {
            const managerId = window.managerId;
            if (!managerId) {
                alert('Нет авторизации');
                return;
            }
            
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            console.log('Token for Google auth:', token ? token.substring(0, 50) : 'NULL');
            
            try {
                const response = await fetch(`/api/sync/google/auth?manager_id=${managerId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    throw new Error('Ошибка получения ссылки');
                }
                
                const data = await response.json();
                if (data.auth_url) {
                    // Сохраняем, что мы в процессе авторизации
                    sessionStorage.setItem('oauth_pending', 'true');
                    
                    // Сбрасываем состояние перед редиректом
                    this.googleCalendar.connected = false;
                    this.googleCalendar.calendars = [];
                    this.googleCalendar.selectedCalendarId = null;
                    
                    // Редирект на Google OAuth
                    window.location.href = data.auth_url;
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('❌ Ошибка подключения');
            }
        }

        async loadCalendarStatus() {
            const managerId = window.managerId;
            if (!managerId) return;
            
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            
            try {
                const response = await fetch(`/api/sync/google/status/${managerId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                
                console.log('📅 loadCalendarStatus получил:', data);
                
                // ВАЖНО: connected = true, даже если calendar_id ещё не выбран
                // Потому что токен уже сохранён в БД
                this.googleCalendar.connected = data.connected === true;
                this.googleCalendar.selectedCalendarId = data.calendar_id;
                
                // Загружаем календари, если подключение есть (даже без выбранного календаря)
                if (data.connected === true) {
                    await this.loadCalendars();
                }
                
                this.render();

                // Обновляем дашборд если он есть
                if (window.AquaGid?.ManagerDashboard) {
                    window.AquaGid.ManagerDashboard.calendarConnected = this.googleCalendar.connected;
                    window.AquaGid.ManagerDashboard.calendarName = this.googleCalendar.calendars.find(c => c.id === this.googleCalendar.selectedCalendarId)?.summary || '';
                    window.AquaGid.ManagerDashboard.render();
                }
                
                console.log('📅 После loadCalendarStatus:', {
                    connected: this.googleCalendar.connected,
                    calendarsCount: this.googleCalendar.calendars.length,
                    selectedCalendarId: this.googleCalendar.selectedCalendarId
                });
            } catch (error) {
                console.error('❌ Ошибка загрузки статуса календаря:', error);
            }
        }
    }
    
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.ManagerSettings = new ManagerSettings();
    
})(typeof window !== 'undefined' ? window : global);