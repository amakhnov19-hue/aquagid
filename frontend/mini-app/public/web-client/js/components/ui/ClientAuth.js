/**
 * ClientAuth v2.0 — Профиль клиента
 * Кнопка появляется после бронирования (когда есть телефон)
 * Показывает данные: имя, телефон, email, мессенджер + кнопка Выйти
 */

(function() {
    function showProfile() {
        const phone = localStorage.getItem('clientPhone') || '';
        const name = localStorage.getItem('clientName') || '';
        const email = localStorage.getItem('clientEmail') || '';
        const messengerType = localStorage.getItem('clientMessengerType') || '';
        const messengerContact = localStorage.getItem('clientMessengerContact') || '';

        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;';
        modal.innerHTML = `
            <div style="background:#fff;border-radius:16px;padding:24px;width:320px;text-align:left;">
                <h3 style="margin-top:0;">👤 Профиль</h3>
                
                <div style="margin-bottom:12px;">
                    <label style="font-size:12px;color:#666;">Имя</label>
                    <input type="text" id="prof-name" value="${escapeHtml(name)}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;">
                </div>
                <div style="margin-bottom:12px;">
                    <label style="font-size:12px;color:#666;">Телефон</label>
                    <input type="text" id="prof-phone" value="${phone}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;">
                </div>
                <div style="margin-bottom:12px;">
                    <label style="font-size:12px;color:#666;">Email</label>
                    <input type="email" id="prof-email" value="${escapeHtml(email)}" style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:6px;margin-top:4px;">
                </div>
                <div style="margin-bottom:16px;">
                    <label style="font-size:12px;color:#666;">Мессенджер</label>
                    <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;">
                        <select id="prof-messenger-type" style="flex:1;min-width:100px;padding:8px;border:1px solid #d1d5db;border-radius:6px;">
                            <option value="">Не выбран</option>
                            <option value="telegram" ${messengerType === 'telegram' ? 'selected' : ''}>Telegram</option>
                            <option value="max" ${messengerType === 'max' ? 'selected' : ''}>Макс</option>
                        </select>
                        <input type="text" id="prof-messenger-contact" value="${escapeHtml(messengerContact)}" placeholder="@username"  style="flex:1;min-width:0;padding:8px;border:1px solid #d1d5db;border-radius:6px;">
                    </div>
                </div>
                
                <button id="prof-save" style="width:100%;padding:10px;background:#0066CC;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:8px;">💾 Сохранить</button>
                <button id="prof-logout" style="width:100%;padding:10px;background:#dc3545;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;">🚪 Выйти</button>
                <button id="prof-close" style="width:100%;padding:8px;background:#e5e7eb;border:none;border-radius:8px;margin-top:8px;cursor:pointer;">Закрыть</button>
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('prof-save').onclick = () => {
            const phone = document.getElementById('prof-phone').value.replace(/\D/g, '');
            const name = document.getElementById('prof-name').value.trim();
            
            if (!phone || phone.length < 10) {
                alert('Введите корректный номер телефона');
                return;
            }
            if (!name) {
                alert('Введите имя');
                return;
            }
            
            localStorage.setItem('clientName', name);
            localStorage.setItem('clientPhone', phone);
            localStorage.setItem('clientEmail', document.getElementById('prof-email').value.trim());
            localStorage.setItem('clientMessengerType', document.getElementById('prof-messenger-type').value);
            localStorage.setItem('clientMessengerContact', document.getElementById('prof-messenger-contact').value.trim());
            modal.remove();
            alert('✅ Данные сохранены');
            location.reload();
        };

        document.getElementById('prof-logout').onclick = () => {
            if (confirm('Выйти из профиля? Все локальные данные будут удалены.')) {
                localStorage.removeItem('clientPhone');
                localStorage.removeItem('clientName');
                localStorage.removeItem('clientEmail');
                localStorage.removeItem('clientMessengerType');
                localStorage.removeItem('clientMessengerContact');
                modal.remove();
                location.reload();
            }
        };

        document.getElementById('prof-close').onclick = () => modal.remove();
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

window.AquaGid.ClientAuth = { showProfile: showProfile };
})();