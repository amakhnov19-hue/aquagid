// Сервис для работы с менеджерами
const ManagerService = {
    // Проверка готовности API клиента
    _checkClient() {
        if (!window.apiClient) {
            throw new Error('apiClient не инициализирован. Проверьте подключение api_client.js');
        }
        return window.apiClient;
    },
    
    // Получить список всех менеджеров
    async getAll() {
        const client = this._checkClient();
        return client.get(API_CONFIG.endpoints.managers.list);
    },
    
    // Получить менеджера по ID
    async getById(id) {
        const client = this._checkClient();
        return client.get(API_CONFIG.endpoints.managers.get(id));
    },
    
    // Создать нового менеджера
    async create(managerData) {
        const client = this._checkClient();
        return client.post(API_CONFIG.endpoints.managers.create, managerData);
    },
    
    // Обновить менеджера
    async update(id, managerData) {
        const client = this._checkClient();
        return client.put(API_CONFIG.endpoints.managers.update(id), managerData);
    },
    
    // Удалить менеджера (заблокировать)
    async delete(id) {
        const client = this._checkClient();
        return client.delete(API_CONFIG.endpoints.managers.delete(id));
    },
    
    // Получить статистику по менеджерам
    async getStats() {
        const client = this._checkClient();
        const managers = await this.getAll();
        return {
            total: managers.length,
            active: managers.filter(m => m.status === 'active').length,
            pending: managers.filter(m => m.status === 'pending').length,
            blocked: managers.filter(m => m.status === 'blocked').length
        };
    }
};

window.ManagerService = ManagerService;
console.log('✅ ManagerService загружен');