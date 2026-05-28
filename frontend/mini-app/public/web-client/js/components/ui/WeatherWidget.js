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
        await this.fetchWeather();
        this.render();
        // updateDisplay() вызовется внутри fetchWeather() после получения данных
        setInterval(() => this.fetchWeather(), 30 * 60 * 1000);
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

        const temp = Math.round(this.weatherData.temperature_2m);
        const icon = this.getWeatherIcon(this.weatherData);
        const pressureTrend = this.getPressureTrend(this.weatherData.surface_pressure);
        const windDirection = this.getWindDirection(this.weatherData.wind_direction_10m);
        const skyCondition = this.getSkyCondition(this.weatherData);

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
                            <div style="font-size: 14px; color: #666;">Ощущается как ${Math.round(this.weatherData.apparent_temperature)}°C</div>
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
        const container = document.createElement('div');
        container.id = 'weather-widget';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: linear-gradient(135deg, #0066CC, #0099FF);
            border-radius: 50px;
            box-shadow: 0 4px 15px rgba(0,102,204,0.3);
            padding: 12px 16px;
            cursor: pointer;
            z-index: 1000;
            transition: all 0.3s ease;
            user-select: none;
            color: white;
        `;
        document.body.appendChild(container);
        
        const style = document.createElement('style');
        style.textContent = `
            .weather-expanded {
                min-width: 220px;
                border-radius: 20px !important;
                padding: 16px !important;
            }
            .weather-compact {
                display: flex;
                align-items: center;
            }
        `;
        document.head.appendChild(style);
        
        window.weatherWidget = this;
    }
}

// Автозапуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new WeatherWidget());
} else {
    new WeatherWidget();
}

