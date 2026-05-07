// Сервис для работы с настройками
const SettingsService = {
    _checkClient() {
        if (!window.apiClient) {
            throw new Error('apiClient не инициализирован');
        }
        return window.apiClient;
    },
    
    async getAll() {
        const client = this._checkClient();
        try {
            return await client.get('/settings');
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
            throw error;
        }
    },
    
    async save(settings) {
        const client = this._checkClient();
        try {
            return await client.post('/settings', settings);
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            throw error;
        }
    },
    
    async saveSetting(key, value) {
        const client = this._checkClient();
        try {
            return await client.post(`/settings/${key}`, value);
        } catch (error) {
            console.error(`Ошибка сохранения настройки ${key}:`, error);
            throw error;
        }
    },
    
    async getManagerPrepayments() {
        try {
            const managers = await ManagerService.getAll();
            const prepayments = {};
            managers.forEach(m => {
                prepayments[m.id] = m.prepayment || 20;
            });
            return prepayments;
        } catch (error) {
            console.error('Ошибка загрузки предоплат менеджеров:', error);
            return {};
        }
    }
};

window.SettingsService = SettingsService;
console.log('✅ SettingsService загружен');