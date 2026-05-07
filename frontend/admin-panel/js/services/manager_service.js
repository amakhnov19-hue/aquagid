/**
 * ManagerService.js
 * Сервис для работы с менеджерами (админ-панель)
 */

if (!window.AquaGid) window.AquaGid = {};

AquaGid.ManagerService = {
    
    getToken() {
        return localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    },
    
    async getAll() {
        const token = this.getToken();
        const response = await fetch('/api/admin/managers', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/';
                throw new Error('Не авторизован');
            }
            throw new Error('Ошибка загрузки менеджеров');
        }
        
        return response.json();
    },
    
    async updateStatus(managerId, status) {
        const token = this.getToken();
        const response = await fetch(`/api/admin/managers/${managerId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) throw new Error('Ошибка обновления статуса');
        return response.json();
    },
    
    async updatePrepayment(managerId, prepaymentPercent) {
        const token = this.getToken();
        const response = await fetch(`/api/admin/managers/${managerId}/prepayment`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ prepayment_percent: prepaymentPercent })
        });
        
        if (!response.ok) throw new Error('Ошибка обновления предоплаты');
        return response.json();
    }
};

// Для обратной совместимости
window.ManagerService = AquaGid.ManagerService;