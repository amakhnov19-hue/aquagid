// Утилиты для работы с API
class ApiClient {
    constructor() {
        this.baseURL = API_CONFIG.baseURL;
    }
    
    // GET запрос
    async get(endpoint) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'GET',
            headers: API_CONFIG.getHeaders()
        });
        
        if (!response.ok) {
            throw await this.handleError(response);
        }
        
        return response.json();
    }
    
    // POST запрос
    async post(endpoint, data) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: API_CONFIG.getHeaders(),
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw await this.handleError(response);
        }
        
        return response.json();
    }
    
    // PUT запрос
    async put(endpoint, data) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'PUT',
            headers: API_CONFIG.getHeaders(),
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw await this.handleError(response);
        }
        
        return response.json();
    }
    
    // DELETE запрос
    async delete(endpoint) {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'DELETE',
            headers: API_CONFIG.getHeaders()
        });
        
        if (!response.ok) {
            throw await this.handleError(response);
        }
        
        return response.json();
    }
    
    // Обработка ошибок
    async handleError(response) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
        } catch (e) {
            // Не удалось распарсить ошибку
        }
        
        return new Error(errorMessage);
    }
}

// Создаем глобальный экземпляр
window.apiClient = new ApiClient();
