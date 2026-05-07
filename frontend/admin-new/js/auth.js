// auth.js — авторизация в админке

const AUTH_KEY = 'admin_token';

function getToken() {
    return localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
}

function setToken(token, remember = true) {
    if (remember) {
        localStorage.setItem(AUTH_KEY, token);
    } else {
        sessionStorage.setItem(AUTH_KEY, token);
    }
}

function removeToken() {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
}

function isAuthenticated() {
    return !!getToken();
}

async function login(username, password, remember) {
    const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка входа');
    }
    
    const data = await response.json();
    setToken(data.token, remember);
    return data;
}

function logout() {
    removeToken();
    window.location.href = '/login.html';
}
