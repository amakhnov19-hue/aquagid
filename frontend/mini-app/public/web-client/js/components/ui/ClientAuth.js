/**
 * ClientAuth — авторизация клиента
 */

(function() {
    function createButton() {
        const old = document.getElementById('client-login-btn');
        if (old) old.remove();

        const btn = document.createElement('div');
        btn.id = 'client-login-btn';
        btn.style.cssText = 'position:fixed;bottom:100px;right:20px;width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;cursor:pointer;z-index:9998;box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:all 0.3s;text-align:center;line-height:1.2;';
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

    function login() {
        // Проверка согласий
        if (!localStorage.getItem('aquagid-docs-accepted') || 
            !localStorage.getItem('aquagid-pd-accepted') ||
            !localStorage.getItem('aquagid-geo-accepted')) {
            alert('⚠️ Примите все три условия использования');
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
        
        // Приветствие
        const greeting = document.getElementById('client-greeting');
        if (greeting) greeting.textContent = '👋 Привет, ' + (name || 'Гость') + '!';
        if (!greeting) {
            const h1 = document.querySelector('.welcome-screen h1');
            if (h1) h1.insertAdjacentHTML('afterend', '<p id="client-greeting" style="text-align:center;color:#0066CC;font-weight:600;margin-top:-10px;margin-bottom:15px;">👋 Привет, ' + (name || 'Гость') + '!</p>');
        }
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