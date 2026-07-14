window.YANDEX_CONFIG = {
    GEOCODER_API_KEY: 'c3669ae8-5204-4ea4-afd9-6cde0a8d4dbc',
    geocoderUrl: function(address) {
        return 'https://geocode-maps.yandex.ru/1.x/?apikey=' + this.GEOCODER_API_KEY + '&geocode=' + encodeURIComponent(address) + '&format=json';
    }
};
console.log('YANDEX_CONFIG loaded');
