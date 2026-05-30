/**
 * PaymentSettings — управление платёжными аккаунтами
 */
class PaymentSettings {
    constructor(container) {
        this.container = container;
        this.token = localStorage.getItem('admin_token');
    }

    async render() {
        this.container.innerHTML = '<div class="card"><h2>💳 Платёжные аккаунты</h2><div class="loading">Загрузка...</div></div>';
        
        try {
            const response = await fetch('/api/payment-accounts', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();
            const accounts = data.accounts || [];
            
            let html = `
                <div class="card">
                    <h2>💳 Платёжные аккаунты</h2>
                    <p style="color:#6b7280;margin-bottom:16px;">Настройка приёма платежей через разные банки.</p>
                    <table class="data-table">
                        <thead><tr><th>ID</th><th>Название</th><th>Банк</th><th>Тест</th><th>Активен</th><th>Действия</th></tr></thead>
                        <tbody>`;
            
            accounts.forEach(acc => {
                html += `
                    <tr>
                        <td>${acc.id}</td>
                        <td>${acc.name}</td>
                        <td>${acc.bank}</td>
                        <td>${acc.test_mode ? '✅' : '—'}</td>
                        <td>${acc.is_active ? '✅' : '❌'}</td>
                        <td>
                            <button class="btn btn-sm" onclick="PaymentSettings.edit(${acc.id})">✏️</button>
                            <button class="btn btn-sm" style="background:#ef4444;color:white;" onclick="PaymentSettings.remove(${acc.id})">🗑</button>
                        </td>
                    </tr>`;
            });
            
            html += `</tbody></table>
                <button class="btn btn-primary" style="margin-top:16px;" onclick="PaymentSettings.edit()">➕ Добавить аккаунт</button>
            </div>`;
            
            this.container.innerHTML = html;
        } catch (e) {
            this.container.innerHTML = `<div class="card error">Ошибка: ${e.message}</div>`;
        }
    }

    static async edit(id) {
        const token = localStorage.getItem('admin_token');
        let account = { name: '', bank: 'modulbank', merchant_id: '', secret_key: '', test_mode: true, is_active: true };
        
        if (id) {
            const resp = await fetch('/api/payment-accounts', { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await resp.json();
            account = (data.accounts || []).find(a => a.id === id) || account;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
        modal.innerHTML = `
            <div style="background:white;border-radius:12px;padding:24px;max-width:500px;width:90%;">
                <h3>${id ? '✏️ Редактировать' : '➕ Новый'} аккаунт</h3>
                <div class="form-group"><label>Название:</label>
                    <input type="text" id="paName" value="${account.name}" class="form-input"></div>
                <div class="form-group"><label>Банк:</label>
                    <select id="paBank" class="form-input">
                        <option value="modulbank" ${account.bank === 'modulbank' ? 'selected' : ''}>МодульБанк</option>
                        <option value="tbank" ${account.bank === 'tbank' ? 'selected' : ''}>Т-Банк</option>
                    </select></div>
                <div class="form-group"><label>Merchant ID:</label>
                    <input type="text" id="paMerchant" value="${account.merchant_id || ''}" class="form-input"></div>
                <div class="form-group"><label>Secret Key:</label>
                    <input type="password" id="paSecret" placeholder="${id ? 'Оставьте пустым чтобы не менять' : ''}" class="form-input"></div>
                <div class="form-group">
                    <label><input type="checkbox" id="paTest" ${account.test_mode ? 'checked' : ''}> Тестовый режим</label>
                    <label style="margin-left:16px;"><input type="checkbox" id="paActive" ${account.is_active ? 'checked' : ''}> Активен</label>
                </div>
                <div style="display:flex;gap:8px;margin-top:16px;">
                    <button class="btn btn-primary" id="paSave">💾 Сохранить</button>
                    <button class="btn btn-secondary" id="paCancel">Отмена</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        
        document.getElementById('paCancel').onclick = () => modal.remove();
        document.getElementById('paSave').onclick = async () => {
            const body = {
                name: document.getElementById('paName').value,
                bank: document.getElementById('paBank').value,
                merchant_id: document.getElementById('paMerchant').value,
                secret_key: document.getElementById('paSecret').value,
                test_mode: document.getElementById('paTest').checked,
                is_active: document.getElementById('paActive').checked
            };
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/api/payment-accounts/${id}` : '/api/payment-accounts';
            const resp = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            if (resp.ok) {
                modal.remove();
                loadView('payments');
            } else {
                alert('Ошибка сохранения');
            }
        };
    }

    static async remove(id) {
        if (!confirm('Удалить аккаунт?')) return;
        const token = localStorage.getItem('admin_token');
        const resp = await fetch(`/api/payment-accounts/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) {
            loadView('payments');
        } else {
            const err = await resp.json();
            alert(err.detail || 'Ошибка удаления');
        }
    }
}

window.PaymentSettings = PaymentSettings;