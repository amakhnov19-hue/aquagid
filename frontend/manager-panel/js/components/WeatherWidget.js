/**
 * Виджет погоды
 */
class WeatherWidget {
    constructor() {
        this.latitude = 59.9343;  // СПб по умолчанию
        this.longitude = 30.3351;
        this.weatherData = null;
        this.isExpanded = false;
        this.isRendered = false;
        this.lastPressure = null;
        this.init();
    }

    async init() {
        // Показываем виджет сразу с заглушкой
        this.render();
        
        // Геолокацию запрашиваем с таймаутом 3 секунды
        await this.getUserLocationFast();
        
        // Загружаем погоду
        await this.fetchWeather();
        
        // Обновляем каждые 30 минут
        setInterval(() => this.fetchWeather(), 30 * 60 * 1000);
    }

        getUserLocationFast() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.log('Геолокация не поддерживается, используем СПб');
                resolve();
                return;
            }
            
            const timeout = setTimeout(() => {
                console.log('Таймаут геолокации, используем СПб');
                resolve();
            }, 3000);
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeout);
                    this.latitude = position.coords.latitude;
                    this.longitude = position.coords.longitude;
                    resolve();
                },
                () => {
                    clearTimeout(timeout);
                    console.log('Не удалось получить геолокацию, используем СПб');
                    resolve();
                }
            );
        });
    }

    async fetchWeather() {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.latitude}&longitude=${this.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloudcover,pressure_msl,surface_pressure&timezone=Europe%2FMoscow&forecast_days=1`;
            
            const response = await fetch(url);
            const data = await response.json();
            this.weatherData = data.current;

            // Обновляем lastPressure для тренда (добавить эти 3 строки)
            if (!this.lastPressure && this.weatherData.surface_pressure) {
                this.lastPressure = this.weatherData.surface_pressure;
            }

            if (!this.isRendered) {
                this.render();
                this.isRendered = true;
            }
            this.updateDisplay();

        } catch (error) {
            console.error('Ошибка загрузки погоды:', error);
        }
    }

    updateDisplay() {
        const widget = document.getElementById('weather-widget');
        if (!widget || !this.weatherData) return;

        const temp = this.weatherData ? Math.round(this.weatherData.temperature_2m) : '--';
        const icon = this.weatherData ? this.getWeatherIcon(this.weatherData) : '🌤️';
        const pressureTrend = this.weatherData ? this.getPressureTrend(this.weatherData.surface_pressure) : '';
        const windDirection = this.weatherData ? this.getWindDirection(this.weatherData.wind_direction_10m) : '';
        const skyCondition = this.weatherData ? this.getSkyCondition(this.weatherData) : '';

        if (!this.isExpanded) {
            widget.innerHTML = `
                <div class="weather-compact" onclick="window.weatherWidget.toggle()" style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">${icon}</span>
                    <span style="font-weight: bold; font-size: 16px;">${temp}°C</span>
                </div>
            `;
        } else {
            widget.innerHTML = `
                <div class="weather-expanded" onclick="window.weatherWidget.toggle()" style="color: #333; background: white; border-radius: 20px; padding: 16px; min-width: 220px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <span style="font-size: 36px;">${icon}</span>
                        <div>
                            <div style="font-size: 24px; font-weight: bold;">${temp}°C</div>
                            <div style="font-size: 14px; color: #666;">Ощущается как ${this.weatherData ? Math.round(this.weatherData.apparent_temperature) : '--'}°C</div>
                        </div>
                    </div>
                    <div style="font-size: 14px; line-height: 1.8;">
                        <div>🌥️ ${skyCondition}</div>
                        <div>💨 Ветер: ${Math.round(this.weatherData.wind_speed_10m)} м/с, ${windDirection}</div>
                        <div>💧 Влажность: ${this.weatherData.relative_humidity_2m}%</div>
                        <div>📊 Давление: ${Math.round(this.weatherData.surface_pressure / 1.333)} мм рт.ст. ${pressureTrend}</div>
                    </div>
                    <div style="font-size: 12px; color: #999; margin-top: 15px; text-align: center;">Нажмите, чтобы свернуть</div>
                </div>
            `;
        }

        // Прозрачность только когда свёрнут
        if (!this.isExpanded) {
            widget.style.opacity = '0.15';
        } else {
            widget.style.opacity = '1';
        }
    }

    getWindDirection(degrees) {
        if (degrees === undefined || degrees === null) return '';
        const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }

    getSkyCondition(data) {
        const rain = data.rain || data.showers || data.precipitation;
        const cloudcover = data.cloudcover;
        
        if (rain > 1) return 'Дождь';
        if (rain > 0.1) return 'Небольшой дождь';
        if (cloudcover !== undefined) {
            if (cloudcover < 20) return 'Ясно';
            if (cloudcover < 60) return 'Малооблачно';
            if (cloudcover < 90) return 'Облачно';
            return 'Пасмурно';
        }
        return '';
    }

    getPressureTrend(currentPressure) {
        if (!this.lastPressure) {
            this.lastPressure = currentPressure;
            return '';
        }
        const diff = currentPressure - this.lastPressure;
        this.lastPressure = currentPressure;
        
        if (diff > 0.3) return '⬆️';      // Растёт — погода улучшается
        if (diff < -0.3) return '⬇️';     // Падает — возможно ухудшение
        return '';                         // Стабильно — без стрелки
    }

    getWeatherIcon(data) {
        const rain = data.rain || data.showers || data.precipitation;
        const temp = data.temperature_2m;
        const wind = data.wind_speed_10m;
        
        if (rain > 0.5) return '🌧️';
        if (temp > 25) return '☀️';
        if (temp > 15) return '🌤️';
        if (temp > 5) return '⛅';
        if (temp > -5) return '☁️';
        if (wind > 10) return '💨';
        return '❄️';
    }

    toggle() {
        this.isExpanded = !this.isExpanded;
        // При разворачивании обновляем данные и пересчитываем тренд
        if (this.isExpanded) {
            this.fetchWeather().then(() => this.updateDisplay());
        } else {
            this.updateDisplay();
        }
    }

    render() {
        // Удаляем старый виджет, если он уже есть в DOM
        const existing = document.getElementById('weather-widget');
        if (existing) existing.remove();
        const container = document.createElement('span');
        container.id = 'weather-widget';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #0066CC;
            color: white;
            border-radius: 50px;
            box-shadow: 0 4px 15px rgba(0,102,204,0.3);
            padding: 12px 16px;
            cursor: pointer;
            z-index: 100;
            opacity: 0.15;
            transition: opacity 0.2s;
        `;
        
        container.addEventListener('mouseenter', () => container.style.opacity = '1');
        container.addEventListener('mouseleave', () => container.style.opacity = '0.3');

        document.body.appendChild(container);

        this.updateDisplay();
        
        window.weatherWidget = this;
    }
}

// Автозапуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new WeatherWidget());
} else {
    new WeatherWidget();
}



