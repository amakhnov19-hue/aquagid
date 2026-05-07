/**
 * TestChecklist — опросник после бронирования для бета-тестирования
 */
class TestChecklist {
    constructor() {
        this.results = {};
        this.bookingId = null;
    }

    show(bookingId) {
        this.bookingId = bookingId;
        this.results = {};

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'test-checklist-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';

        const steps = [
            { id: 'date', label: 'Выбор даты', emoji: '📅' },
            { id: 'time', label: 'Выбор времени', emoji: '⏰' },
            { id: 'boat', label: 'Выбор катера', emoji: '🚤' },
            { id: 'payment', label: 'Оплата', emoji: '💳' },
            { id: 'success', label: 'Экран успеха', emoji: '🎉' },
            { id: 'messengers', label: 'Мессенджеры', emoji: '💬' }
        ];

        modal.innerHTML = `
            <div style="background:white;border-radius:16px;padding:24px;max-width:400px;width:90%;max-height:90vh;overflow-y:auto;">
                <h3 style="margin:0 0 4px;">🧪 Тестирование</h3>
                <p style="color:#666;margin:0 0 16px;">Бронирование #${bookingId}</p>
                <p style="color:#666;margin:0 0 16px;">Всё ли работало правильно?</p>
                
                ${steps.map(s => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;">
                        <span>${s.emoji} ${s.label}</span>
                        <div style="display:flex;gap:8px;">
                            <button class="tcl-btn" data-step="${s.id}" data-value="ok" style="padding:4px 12px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer;">✅</button>
                            <button class="tcl-btn" data-step="${s.id}" data-value="error" style="padding:4px 12px;border-radius:6px;border:1px solid #ccc;background:#fff;cursor:pointer;">❌</button>
                        </div>
                    </div>
                `).join('')}
                
                <textarea id="tcl-comment" placeholder="Комментарий (что именно не так?)" style="width:100%;margin-top:12px;padding:8px;border:1px solid #ddd;border-radius:8px;height:60px;box-sizing:border-box;"></textarea>
                
                <div style="display:flex;gap:8px;margin-top:12px;">
                    <button onclick="window.TestChecklist.submit()" style="flex:1;padding:10px;background:#0066CC;color:white;border:none;border-radius:8px;cursor:pointer;">📤 Отправить</button>
                    <button onclick="window.TestChecklist.close()" style="flex:1;padding:10px;background:#eee;border:none;border-radius:8px;cursor:pointer;">Пропустить</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Обработчики кнопок ✅/❌
        modal.querySelectorAll('.tcl-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const step = e.target.dataset.step;
                const value = e.target.dataset.value;
                this.results[step] = value;

                // Подсветка выбранного
                const parent = e.target.parentElement;
                parent.querySelectorAll('.tcl-btn').forEach(b => b.style.background = '#fff');
                e.target.style.background = value === 'ok' ? '#e8f5e9' : '#ffebee';
            });
        });
    }

    close() {
        const modal = document.getElementById('test-checklist-modal');
        if (modal) modal.remove();
    }

    async submit() {
        const comment = document.getElementById('tcl-comment')?.value || '';
        const steps = ['date','time','boat','payment','success','messengers'];
        const labels = { date:'Дата', time:'Время', boat:'Катер', payment:'Оплата', success:'Экран успеха', messengers:'Мессенджеры' };
        
        const details = steps.map(s => {
            const v = this.results[s];
            return `${v === 'ok' ? '✅' : v === 'error' ? '❌' : '⬜'} ${labels[s]}`;
        }).join(', ');
        
        const allOk = Object.values(this.results).every(v => v === 'ok');
        const description = `${details}${comment ? '. Комментарий: ' + comment : ''}`;
        
        try {
            await fetch('/api/test-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tester_name: 'Клиент',
                    action_type: 'booking_checklist',
                    description: description,
                    status: allOk ? 'ok' : 'error',
                    related_booking_id: this.bookingId
                })
            });
        } catch (e) {
            console.error('Ошибка отправки чек-листа:', e);
        }
        this.close();
    }
}

window.TestChecklist = new TestChecklist();

