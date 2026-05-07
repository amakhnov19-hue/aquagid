// Конфигурация Яндекс.Карт для клиентской части
const YANDEX_CONFIG = {
    // API ключ для геокодера
    GEOCODER_API_KEY: 'c3669ae8-5204-4ea4-afd9-6cde0a8d4dbc',
    
    // URL геокодера
    geocoderUrl: function(address) {
        return `https://geocode-maps.yandex.ru/1.x/?apikey=${this.GEOCODER_API_KEY}&geocode=${encodeURIComponent(address)}&format=json`;
    }
};

window.YANDEX_CONFIG = YANDEX_CONFIG;
console.log('✅ YANDEX_CONFIG загружен');
