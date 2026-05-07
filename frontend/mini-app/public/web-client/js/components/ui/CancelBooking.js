/**
 * Компонент отмены бронирования
 */
class CancelBooking {
    constructor(bookingId, onCancel) {
        this.bookingId = bookingId;
        this.onCancel = onCancel;
        this.modal = null;
    }
    
    show() {
        this.modal = document.createElement('div');
        this.modal.className = 'cancel-modal';
        this.modal.innerHTML = `
            <div class="cancel-modal-content">
                <div class="cancel-modal-header">
                    <h3>Отмена бронирования</h3>
                    <button class="close-modal">✕</button>
                </div>
                <div class="cancel-modal-body">
                    <div class="cancel-rules">
                        <h4>Правила отмены:</h4>
                        <ul>
                            <li>За 24 часа и более — полный возврат предоплаты</li>
                            <li>Деньги возвращаются в течение 3 банковских дней на карту, с которой была произведена оплата</li>
                            <li>Менее чем за 24 часа — предоплата не возвращается</li>
                            <li>В день бронирования — отмена невозможна</li>
                        </ul>
                    </div>
                    <div class="cancel-reason">
                        <label>Причина отмены (можно выбрать несколько):</label>
                        <div class="reason-checkboxes">
                            <label><input type="checkbox" value="changed_plans"> Изменились планы</label>
                            <label><input type="checkbox" value="weather"> Плохая погода</label>
                            <label><input type="checkbox" value="new_booking"> Хочу новое бронирование</label>
                            <label><input type="checkbox" value="other"> Другое</label>
                        </div>
                        <input type="text" id="other-reason" placeholder="Укажите причину" style="display:none; margin-top:10px; width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                    </div>
                </div>
                <div class="cancel-modal-footer">
                    <button class="btn-secondary">Отменить отмену</button>
                    <button class="btn-danger">Да, отменить бронирование</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        this.attachEvents();
    }
    
    attachEvents() {
        const closeBtn = this.modal.querySelector('.close-modal');
        const cancelBtn = this.modal.querySelector('.btn-secondary');
        const confirmBtn = this.modal.querySelector('.btn-danger');
        
        closeBtn?.addEventListener('click', () => this.close());
        cancelBtn?.addEventListener('click', () => this.close());
        
        // Делаем кнопку подтверждения неактивной по умолчанию
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
        }
        
        // Следим за изменениями чекбоксов
        const checkboxes = this.modal.querySelectorAll('.reason-checkboxes input[type="checkbox"]');
        const otherInput = this.modal.querySelector('#other-reason');
        
        const updateConfirmButton = () => {
            const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
            if (confirmBtn) {
                confirmBtn.disabled = !anyChecked;
                confirmBtn.style.opacity = anyChecked ? '1' : '0.5';
                confirmBtn.style.cursor = anyChecked ? 'pointer' : 'not-allowed';
            }
        };
        
        checkboxes.forEach(cb => {
            cb.addEventListener('change', updateConfirmButton);
        });
        
        if (otherInput) {
            otherInput.addEventListener('input', updateConfirmButton);
        }
        
        // Обработка поля "Другое"
        const otherCheckbox = this.modal.querySelector('input[value="other"]');
        
        if (otherCheckbox && otherInput) {
            otherCheckbox.addEventListener('change', () => {
                otherInput.style.display = otherCheckbox.checked ? 'block' : 'none';
                updateConfirmButton();
            });
        }
        
        confirmBtn?.addEventListener('click', () => this.confirm());
    }
    
    close() {
        this.modal?.remove();
        this.modal = null;
    }
    
    async confirm() {
        const checkedReasons = Array.from(this.modal.querySelectorAll('.reason-checkboxes input:checked'))
            .map(cb => cb.value);
        
        const otherInput = this.modal.querySelector('#other-reason');
        const otherReason = otherInput?.value || '';
        
        const reason = {
            reasons: checkedReasons,
            other: otherReason
        };
        
        try {
            const response = await fetch(`/api/bookings/${this.bookingId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            
            if (!response.ok) throw new Error('Ошибка отмены');
            
            this.close();
            
            if (this.onCancel) {
                this.onCancel();
            }
            
            alert('✅ Бронирование отменено');
            
        } catch (error) {
            console.error('Ошибка отмены:', error);
            alert('❌ Ошибка при отмене бронирования');
        }
    }
}

// Добавляем в глобальный объект
if (!window.AquaGid) window.AquaGid = {};
window.AquaGid.CancelBooking = CancelBooking;