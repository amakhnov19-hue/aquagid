/**
 * ClientAuth — авторизация клиента
 */

(function() {
    function createButton() {
        const old = document.getElementById('client-login-btn');
        if (old) old.remove();

        const btn = document.createElement('div');
        btn.id = 'client-login-btn';
        btn.style.cssText = 'position:fixed;bottom:50px;right:20px;width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;cursor:pointer;z-index:9998;box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:all 0.3s;text-align:center;line-height:1.2;';
        document.body.appendChild(btn);
        updateButton();
    }

    function updateButton() {
        const btn = document.getElementById('client-login-btn');
        if (!btn) return;
        const phone = localStorage.getItem('clientPhone');
        
        if (phone) {
            btn.style.background = '#0066CC';
            btn.style.color = '#fff';
            btn.textContent = 'Выход';
            btn.onclick = logout;
        } else {
            btn.style.background = '#10b981';
            btn.style.color = '#fff';
            btn.textContent = 'Вход';
            btn.onclick = login;
        }
    }

    function showConsentForm() {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;overflow-y:auto;';
        modal.innerHTML = `
            <div style="background:#fff;border-radius:16px;padding:24px;width:360px;max-height:90vh;overflow-y:auto;text-align:left;">
                <h3 style="margin-top:0;">📜 Условия использования</h3>
                
                <p style="font-size:12px;color:#666;line-height:1.5;margin-bottom:16px;">
                    Перед использованием сервиса ознакомьтесь с документами:
                </p>
                
                <div style="background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:16px;">
                    <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
                        <input type="checkbox" id="cf-terms" style="margin-top:3px;width:18px;height:18px;flex-shrink:0;">
                        <span style="font-size:13px;line-height:1.5;">
                            Я принимаю условия 
                            <a href="javascript:void(0)" onclick="history.pushState({screen:'docs'},'',window.location.pathname); window.AquaGid.Documentation.toggle(); return false;" style="color:#0066cc;">Договора оказания услуг бронирования (Публичной оферты)</a> 
                            и даю 
                            <a href="javascript:void(0)" onclick="history.pushState({screen:'docs'},'',window.location.pathname); window.AquaGid.Documentation.toggle(); return false;" style="color:#0066cc;">Согласие на обработку персональных данных</a> 
                            в соответствии с 
                            <a href="javascript:void(0)" onclick="history.pushState({screen:'docs'},'',window.location.pathname); window.AquaGid.Documentation.toggle(); return false;" style="color:#0066cc;">Политикой конфиденциальности</a>.
                        </span>
                    </label>
                </div>
                
                <div style="background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:16px;">
                    <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;">
                        <input type="checkbox" id="cf-geo" style="margin-top:3px;width:18px;height:18px;flex-shrink:0;">
                        <span style="font-size:13px;line-height:1.5;">
                            Согласен на определение моего местоположения для поиска ближайших катеров и построения маршрута до причала (координаты не сохраняются).
                        </span>
                    </label>
                </div>
                
                <button id="cf-continue" disabled style="width:100%;padding:12px;background:#0066CC;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;opacity:0.5;">
                    Продолжить
                </button>
            </div>`;
        document.body.appendChild(modal);
        
        const terms = document.getElementById('cf-terms');
        const geo = document.getElementById('cf-geo');
        const btn = document.getElementById('cf-continue');
        
        const check = () => {
            btn.disabled = !(terms.checked && geo.checked);
            btn.style.opacity = btn.disabled ? '0.5' : '1';
        };
        terms.onchange = check;
        geo.onchange = check;
        
        document.getElementById('cf-continue').onclick = async () => {
            const phone = prompt('Номер телефона (начиная с +7):', '+7');
            if (!phone || phone.length < 10) return;
            const name = prompt('Ваше имя:', '') || 'Гость';
            
            const uid = phone.replace(/\D/g, '');
            localStorage.setItem('clientPhone', uid);
            localStorage.setItem('clientName', name);
            localStorage.setItem('loginTime', Date.now());
            
            // Сохраняем согласия: terms = оферта + ПД, geo = геолокация
            const consents = [
                { type: 'terms', label: 'offer_v1' },
                { type: 'pd', label: 'pd_v1' },
                { type: 'geo', label: 'geo_v1' }
            ];
            for (const c of consents) {
                try {
                    await fetch('/api/consent/give', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_type: 'client',
                            user_id: uid,
                            consent_type: c.type,
                            doc_version: c.label,
                            client_name: name
                        })
                    });
                } catch(e) {}
            }
            localStorage.setItem('aquagid-docs-accepted', '1');
            localStorage.setItem('aquagid-pd-accepted', '1');
            localStorage.setItem('aquagid-geo-accepted', '1');
            
            modal.remove();
            updateButton();
            location.reload();
        };
    }

    function login() {
        // Проверка согласий
        if (!localStorage.getItem('aquagid-docs-accepted') || 
            !localStorage.getItem('aquagid-pd-accepted') ||
            !localStorage.getItem('aquagid-geo-accepted')) {
            // Показываем форму согласий
            showConsentForm();
            return;
        }

        const phone = prompt('Номер телефона (начиная с +7):', '+7');
        if (!phone || phone.length < 10) return;
        const name = prompt('Ваше имя:', '');
        if (name === null) return;
        
        localStorage.setItem('clientPhone', phone.replace(/\D/g, ''));
        localStorage.setItem('clientName', name || 'Гость');
        localStorage.setItem('loginTime', Date.now());
        updateButton();
        location.reload();
    }

    function logout() {
        if (confirm('Выйти из аккаунта?')) {
            localStorage.removeItem('clientPhone');
            localStorage.removeItem('clientName');
            localStorage.removeItem('loginTime');
            localStorage.removeItem('aquagid-docs-accepted');
            localStorage.removeItem('aquagid-geo-accepted');
            location.reload();
        }
    }

    // Авто-выход через 12 часов
    const loginTime = localStorage.getItem('loginTime');
    if (loginTime && (Date.now() - parseInt(loginTime)) > 12 * 60 * 60 * 1000) {
        localStorage.removeItem('clientPhone');
        localStorage.removeItem('clientName');
        localStorage.removeItem('loginTime');
    }

    // При загрузке показать приветствие
    function showGreeting() {
        const name = localStorage.getItem('clientName');
        const phone = localStorage.getItem('clientPhone');
        if (name && phone) {
            setTimeout(() => {
                const h1 = document.querySelector('.welcome-screen h1');
                if (h1 && !document.getElementById('client-greeting')) {
                    h1.insertAdjacentHTML('afterend', '<p id="client-greeting" style="text-align:center;color:#0066CC;font-weight:600;margin-top:-10px;margin-bottom:15px;">👋 Привет, ' + name + '!</p>');
                }
            }, 300);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { createButton(); showGreeting(); });
    } else {
        createButton();
        showGreeting();
    }
})();