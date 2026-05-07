/**
 * Dashboard.js
 * Главная панель администратора с диагностикой
 * Версия: 1.0.0
 */

if (!window.AquaGid) window.AquaGid = {};

AquaGid.Dashboard = class {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        // Состояние диагностики
        this.diagnostics = {
            api: { status: 'ok', message: '24aquabooking.ru - ответ 200 ms', lastCheck: new Date() },
            database: { status: 'ok', message: 'Подключено' },
            googleCalendar: { status: 'warning', message: '3 менеджера с истекшими токенами' },
            webhook: { status: 'error', message: 'Не отвечает (проверьте настройки)' },
            queue: { status: 'ok', message: '0 задач' }
        };
        
        // Статистика (заглушка)
        this.stats = {
            managers: { total: 12, new: 2 },
            boats: { total: 34, active: 29, problems: 1 },
            bookings: { total: 156, today: 12 },
            prepayments: { total: 156000 }
        };
        
        // Звуковое оповещение
        this.alertSound = new Audio();
        this.alertSound.src = 'data:audio/mp3;base64,SUQzBAAAAA...'; // заглушка
        
        this.render();
        this.startDiagnosticsCheck();
    }
    
    render() {
        this.container.innerHTML = `
            <div style="max-width: 1400px; margin: 0 auto;">
                <!-- Заголовок -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h1 style="font-size: 28px; font-weight: 600; color: #111827;">Дашборд</h1>
                    <div style="display: flex; gap: 12px;">
                        <button id="refresh-dashboard" style="
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
                        <button id="test-alert" style="
                            padding: 8px 16px;
                            background: #fee2e2;
                            border: 1px solid #fecaca;
                            border-radius: 8px;
                            color: #991b1b;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            🔔 Тест звука
                        </button>
                    </div>
                </div>

                <!-- Карточки статистики -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px;">
                    ${this.renderStatCard('👥', 'Менеджеров', this.stats.managers.total, `+${this.stats.managers.new} новых`)}
                    ${this.renderStatCard('🚤', 'Катеров', this.stats.boats.total, `${this.stats.boats.active} активны, ${this.stats.boats.problems} с жалобами`)}
                    ${this.renderStatCard('📅', 'Бронирований', this.stats.bookings.total, `+${this.stats.bookings.today} сегодня`)}
                    ${this.renderStatCard('💰', 'Предоплат', this.formatMoney(this.stats.prepayments.total), 'агентские')}
                </div>

                <!-- Панель диагностики -->
                <div style="
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    margin-bottom: 32px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    border: 2px solid ${this.getDiagnosticBorderColor()};
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 24px;">🚨</span>
                            Диагностика системы
                        </h2>
                        <span id="diagnostic-time" style="font-size: 14px; color: #6b7280;">
                            Последняя проверка: ${this.formatTime(new Date())}
                        </span>
                    </div>
                    
                    <div style="display: grid; gap: 12px;">
                        ${this.renderDiagnosticItem('API', this.diagnostics.api)}
                        ${this.renderDiagnosticItem('База данных', this.diagnostics.database)}
                        ${this.renderDiagnosticItem('Google Calendar', this.diagnostics.googleCalendar)}
                        ${this.renderDiagnosticItem('Webhook', this.diagnostics.webhook)}
                        ${this.renderDiagnosticItem('Очередь задач', this.diagnostics.queue)}
                    </div>
                </div>

                <!-- Последние события -->
                <div style="
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                ">
                    <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 20px;">Последние события</h2>
                    
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        ${this.renderEvent('⏳', 'Запрос на верификацию: Иванов И.П.', '2 минуты назад', '#f59e0b')}
                        ${this.renderEvent('⚠️', 'На катер "Марина" поступила жалоба (3 шт.)', '15 минут назад', '#ef4444')}
                        ${this.renderEvent('⚙️', 'У 3 менеджеров истекли токены Google Calendar', '1 час назад', '#3b82f6')}
                        ${this.renderEvent('✅', 'Новое бронирование на завтра, 15:00', '3 часа назад', '#10b981')}
                    </div>
                </div>
            </div>
        `;
        
        this.attachEvents();
    }
    
    renderStatCard(icon, label, value, subtitle) {
        return `
            <div style="
                background: white;
                border-radius: 16px;
                padding: 20px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            ">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <span style="font-size: 32px;">${icon}</span>
                    <span style="font-size: 14px; color: #6b7280;">${label}</span>
                </div>
                <div style="font-size: 32px; font-weight: 600; margin-bottom: 4px;">${value}</div>
                <div style="font-size: 14px; color: #6b7280;">${subtitle}</div>
            </div>
        `;
    }
    
    renderDiagnosticItem(name, data) {
        const statusIcons = {
            ok: '✅',
            warning: '⚠️',
            error: '❌'
        };
        
        const statusColors = {
            ok: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444'
        };
        
        return `
            <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px;
                background: #f9fafb;
                border-radius: 8px;
                border-left: 4px solid ${statusColors[data.status]};
            ">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 20px;">${statusIcons[data.status]}</span>
                    <span style="font-weight: 500;">${name}:</span>
                    <span style="color: #4b5563;">${data.message}</span>
                </div>
                ${data.status === 'error' ? '<span style="color: #ef4444; font-weight: 500;">Требуется внимание!</span>' : ''}
            </div>
        `;
    }
    
    renderEvent(icon, text, time, color) {
        return `
            <div style="display: flex; align-items: center; gap: 12px; padding: 8px; border-bottom: 1px solid #f3f4f6;">
                <span style="font-size: 20px;">${icon}</span>
                <div style="flex: 1;">
                    <span style="color: #111827;">${text}</span>
                </div>
                <span style="font-size: 14px; color: #6b7280;">${time}</span>
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
            </div>
        `;
    }
    
    attachEvents() {
        // Кнопка обновления
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDiagnostics());
        }
        
        // Тест звука
        const testBtn = document.getElementById('test-alert');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.playAlertSound());
        }
    }
    
    refreshDiagnostics() {
        // Имитация обновления диагностики
        this.diagnostics.api.status = Math.random() > 0.7 ? 'warning' : 'ok';
        this.diagnostics.webhook.status = Math.random() > 0.8 ? 'error' : 'ok';
        
        // Если появилась критическая ошибка - играем звук
        if (this.diagnostics.webhook.status === 'error') {
            this.playAlertSound();
        }
        
        this.render();
    }
    
    startDiagnosticsCheck() {
        // Автоматическая проверка каждые 30 секунд
        setInterval(() => {
            this.refreshDiagnostics();
        }, 30000);
    }
    
    playAlertSound() {
        // Имитация звука через beep
        console.log('🔊 BEEP! BEEP! Критическая ошибка!');
        
        // Визуальное оповещение
        const alert = document.createElement('div');
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);
            z-index: 9999;
            animation: slideIn 0.3s;
        `;
        alert.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">🚨</span>
                <div>
                    <div style="font-weight: 600;">КРИТИЧЕСКАЯ ОШИБКА!</div>
                    <div style="font-size: 14px;">Проверьте панель диагностики</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => alert.remove(), 5000);
    }
    
    getDiagnosticBorderColor() {
        if (this.diagnostics.webhook.status === 'error') return '#ef4444';
        if (this.diagnostics.googleCalendar.status === 'warning') return '#f59e0b';
        return '#e5e7eb';
    }
    
    formatMoney(amount) {
        return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
    }
    
    formatTime(date) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}