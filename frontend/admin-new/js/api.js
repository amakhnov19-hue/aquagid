// api.js — запросы к API

const API_BASE = '/api/admin';

async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        logout();
        throw new Error('Сессия истекла');
    }
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка запроса');
    }
    
    return response.json();
}

// Менеджеры
async function getManagers() {
    return request('/managers');
}

async function updateManagerStatus(managerId, status) {
    return request(`/managers/${managerId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
    });
}

async function updateManagerPrepayment(managerId, prepaymentPercent) {
    return request(`/managers/${managerId}/prepayment`, {
        method: 'PUT',
        body: JSON.stringify({ prepayment_percent: prepaymentPercent })
    });
}

// Приглашения
async function createInvite(phone) {
    return request('/manager-invite', {
        method: 'POST',
        body: JSON.stringify({ phone })
    });
}

// Катера
async function getManagerBoats(managerId) {
    return request(`/boats/manager/${managerId}`);
}

async function updateBoat(boatId, data) {
    return request(`/boats/${boatId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function deleteBoat(boatId) {
    return request(`/boats/${boatId}`, {
        method: 'DELETE'
    });
}

