/**
 * Экран быстрого бронирования (ближайший катер)
 */
class QuickScreen extends ScreenBase {
    constructor(mainApp) {
        super(mainApp);
        this.userLocation = null;
        this.availableBoats = [];
    }

    /**
     * Показывает экран быстрого бронирования
     */
    async show() {
        console.log('⚡ QuickScreen.show START');
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="screen quick-screen">
                <h2 class="screen-title">⚡ Ближайший катер</h2>
                <div class="home-button-container">
                    <button class="btn-home" onclick="window.AquaGid.UnifiedScreens.showWelcomeScreen()">🏠 В начало</button>
                </div>
                <div class="quick-options">
                    <div class="address-input-container">
                        <input type="text" id="manual-address" placeholder="Или введите адрес вручную">
                        <button id="search-address-btn" class="btn-secondary">🔍 Найти по адресу</button>
                    </div>
                </div>
                <div id="quick-content">
                    <div class="loading">Определяем местоположение...</div>
                </div>
            </div>`;

        document.getElementById('search-address-btn')?.addEventListener('click', () => this.searchByAddress());

        // Сразу пробуем геолокацию (браузер сам спросит разрешение)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.userLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                    this.findNearestBoats();
                },
                () => {
                    document.getElementById('quick-content').innerHTML = 
                        '<p style="text-align:center;color:#666;padding:20px;">Не удалось определить местоположение.<br>Введите адрес вручную ☝️</p>';
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            document.getElementById('quick-content').innerHTML = 
                '<p style="text-align:center;color:#666;padding:20px;">Геолокация не поддерживается.<br>Введите адрес вручную ☝️</p>';
        }

        console.log('⚡ QuickScreen.show END');
    }

    /**
     * Запрос геолокации
     */
    requestLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                this.showAddressInput('Геолокация не поддерживается. Введите ваш адрес:');
                resolve();
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    console.log('📍 Геолокация получена:', this.userLocation);
                    this.findNearestBoats();
                    resolve();
                },
                (error) => {
                    console.log('⚠️ Ошибка геолокации:', error.message);
                    this.showAddressInput('Не удалось определить местоположение. Введите ваш адрес:');
                    resolve();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    showAddressInput(message) {
        const content = document.getElementById('quick-content');
        content.innerHTML = '';
    }

    /**
     * Поиск катеров по введенному адресу
     */
    async searchByAddress() {
        const addressInput = document.getElementById('manual-address');
        const address = addressInput?.value.trim();
        
        if (!address) {
            alert('Введите адрес');
            return;
        }
        
        const content = document.getElementById('quick-content');
        content.innerHTML = '<div class="loading">Определяем координаты...</div>';
        
        try {
            const response = await fetch(window.YANDEX_CONFIG.geocoderUrl(address));
            const data = await response.json();
            
            const pos = data.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos.split(' ');
            this.userLocation = {
                lat: parseFloat(pos[1]),
                lon: parseFloat(pos[0])
            };
            
            console.log('📍 Координаты по адресу:', this.userLocation);
            this.findNearestBoats();
            
        } catch (error) {
            console.error('❌ Ошибка геокодирования:', error);
            content.innerHTML = `
                <div class="error">
                    Не удалось определить координаты. Проверьте правильность адреса.
                    <br>Пример: Санкт-Петербург, Невский проспект, 1
                </div>
            `;
        }
    }

    async geocodeManualAddress() {
        const address = document.getElementById('manual-address').value;
        if (!address) {
            alert('Введите адрес');
            return;
        }

        const content = document.getElementById('quick-content');
        content.innerHTML = '<div class="loading">Определяем координаты...</div>';

        try {
            // Используем функцию из YANDEX_CONFIG
            const response = await fetch(window.YANDEX_CONFIG.geocoderUrl(address));
            const data = await response.json();
            
            const pos = data.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos.split(' ');
            this.userLocation = {
                lat: parseFloat(pos[1]),
                lon: parseFloat(pos[0])
            };
            
            console.log('📍 Координаты по адресу:', this.userLocation);
            this.findNearestBoats();
            
        } catch (error) {
            console.error('❌ Ошибка геокодирования:', error);
            this.showAddressInput('Не удалось определить координаты. Проверьте адрес:');
        }
    }

    // ========== НОВЫЕ МЕТОДЫ ==========

    /**
     * Поиск ближайших катеров с точным расчетом маршрута
     */
    async findNearestBoats() {
        console.log('⚡ findNearestBoats');
        
        const content = document.getElementById('quick-content');
        content.innerHTML = '<div class="loading">Поиск ближайших катеров...</div>';
        
        try {
            // Загружаем все катера
            const refCode = localStorage.getItem('aquagid-ref');
            const url = refCode ? `/api/boats/client?ref=${encodeURIComponent(refCode)}&_t=${Date.now()}` : `/api/boats/client?_t=${Date.now()}`;
            const response = await fetch(url);
            const boats = await response.json();
            
            console.log('📡 Загружено катеров:', boats.length);
            
            const today = new Date().toISOString().split('T')[0];
            
            // Получаем максимальную длительность для текущего времени
            const maxDurationNow = await window.AquaGid.AvailabilityService.getMaxDurationForNow();
            
            // Если максимальная длительность 0 - показываем сообщение и выходим
            if (maxDurationNow === 0) {
                console.log('⚠️ Сегодня рейсов нет');
                this.showNoBoatsToday();
                return;
            }
            
            // Фильтруем только катера с координатами
            const boatsWithCoords = boats.filter(b => 
                b.latitude && b.longitude
            );
            
            console.log('📍 Катеров с координатами:', boatsWithCoords.length);
            
            // Рассчитываем маршрут для каждого катера
            const boatsWithRoute = [];
            
            for (let boat of boatsWithCoords) {
                try {
                    // Используем Яндекс.Маршрутизатор для точного расчета
                    const travelTime = await window.calculateRouteTime(
                        this.userLocation.lat,
                        this.userLocation.lon,
                        boat.latitude,
                        boat.longitude
                    );
                    
                    // Рассчитываем время начала рейса
                    const startTime = window.calculateQuickBookingTime(travelTime, 'pedestrian');
                    
                    // Форматируем время для отображения
                    let startTimeStr = '—';
                    let isAvailable = false;
                    let maxAvailableHours = 0;
                    
                    if (startTime) {
                        const hours = startTime.getHours().toString().padStart(2, '0');
                        const minutes = startTime.getMinutes().toString().padStart(2, '0');
                        startTimeStr = `${hours}:${minutes}`;
                        
                        // Проверяем доступность катера в это время
                        try {
                            const checkResponse = await fetch(`/api/availability/check`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    boat_id: boat.id,
                                    booking_date: today,
                                    start_time: startTimeStr,
                                    duration_minutes: 60
                                })
                            });
                            const checkResult = await checkResponse.json();
                            isAvailable = checkResult.available;
                            
                            if (isAvailable) {
                                maxAvailableHours = await window.AquaGid.AvailabilityService.getMaxDuration(today, startTimeStr, boat.id);
                            }
                        } catch (error) {
                            console.error('Ошибка проверки доступности:', error);
                        }
                    }
                    
                    console.log(`✅ ${boat.name}: ${travelTime} мин, старт: ${startTimeStr}, доступен: ${isAvailable}`);
                    
                    boatsWithRoute.push({
                        ...boat,
                        travel_time_minutes: travelTime,
                        walk_time_minutes: travelTime,
                        total_time: travelTime + 5,
                        suggested_start_time: startTime ? startTime.toISOString() : null,
                        suggested_start_time_str: startTimeStr,
                        travel_mode: 'pedestrian',
                        max_available_hours: maxAvailableHours,
                        is_available: isAvailable
                    });
                    
                } catch (error) {
                    console.log(`⚠️ Ошибка маршрута для ${boat.name}:`, error);
                }
            }
            
            console.log('📊 Все катера с маршрутами:', boatsWithRoute.map(b => ({
                name: b.name,
                travel_time: b.travel_time_minutes,
                start_time: b.suggested_start_time_str,
                available: b.is_available,
                max_hours: b.max_available_hours
            })));
            
            // Фильтруем (≤20 минут пешком) И доступные по времени
            this.availableBoats = boatsWithRoute
                .filter(b => {
                    if (b.travel_time_minutes > 20) {
                        console.log(`❌ ${b.name}: слишком далеко (${b.travel_time_minutes} > 20 мин)`);
                        return false;
                    }
                    if (!b.is_available) {
                        console.log(`❌ ${b.name}: недоступен в ${b.suggested_start_time_str}`);
                        return false;
                    }
                    return true;
                })
                .sort((a, b) => a.travel_time_minutes - b.travel_time_minutes);
            
            console.log('📊 Перед renderBoats, availableBoats:', this.availableBoats);
            console.log('📊 Длина массива:', this.availableBoats?.length);
            
            this.renderBoats(this.availableBoats);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки катеров:', error);
            this.showError('Не удалось загрузить катера');
        }
    }

    /**
     * Показать сообщение об отсутствии рейсов сегодня
     */
    showNoBoatsToday() {
        const content = document.getElementById('quick-content');
        content.innerHTML = `
            <div class="info-message">
                <h3>😔 Сегодня рейсов уже нет</h3>
                <p>Выберите другой день для прогулки</p>
                <button class="btn-home" onclick="window.AquaGid.UnifiedScreens.showWelcomeScreen()">
                    На главную
                </button>
            </div>
        `;
    }

    /**
     * Выбор катера в быстром бронировании
     */
    async selectBoat(boatId) {
        const boat = this.availableBoats.find(b => b.id == boatId);
        if (!boat) {
            console.error('❌ Катер не найден:', boatId);
            return;
        }
        
        console.log('✅ Выбран катер:', boat.name);
        
        // Проверка через AvailabilityService
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // Получаем ближайший доступный слот
        let nextSlot = await window.AquaGid.AvailabilityService.getNextAvailableSlot(today, currentTime);
        
        if (!nextSlot) {
            alert('Сегодня рейсов уже нет. Выберите другой день.');
            return;
        }
        
        // Проверяем, свободен ли выбранный катер в это время
        try {
            const availabilityCheck = await fetch(`/api/availability/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    boat_id: boatId,
                    booking_date: today,
                    start_time: nextSlot,
                    duration_minutes: 60 // минимальная длительность для проверки
                })
            });
            const availability = await availabilityCheck.json();
            
            if (!availability.available) {
                console.log('⚠️ Слот занят, ищем следующий...');
                const nextFreeSlot = await window.AquaGid.AvailabilityService.getNextAvailableSlot(today, nextSlot);
                if (!nextFreeSlot) {
                    alert('Сегодня рейсов уже нет. Выберите другой день.');
                    return;
                }
                nextSlot = nextFreeSlot;
                console.log('✅ Новый слот:', nextSlot);
            }
        } catch (error) {
            console.error('❌ Ошибка проверки доступности:', error);
        }
        
        // Если максимальная доступность 0 - предложить выбрать завтра
        if (boat.max_available_hours === 0) {
            alert('Сегодня рейсов уже нет. Выберите другой день.');
            return;
        }
        
        // Создаем объект booking, если его нет
        if (!this.app.booking) {
            this.app.booking = {};
        }
        
        // Сохраняем выбранный катер в общее состояние
        this.app.booking.boat = boat;
        this.app.booking.boatId = boatId;
        
        // Сохраняем максимальную доступную длительность
        this.app.booking.maxAvailableHours = boat.max_available_hours;
        
        // Устанавливаем flow для быстрого бронирования
        this.app.currentFlow = 'quick';

        console.log('📅 today:', today);
        console.log('⏰ nextSlot:', nextSlot);
        
        // Сохраняем предложенное время старта
        this.app.booking.time = nextSlot;
        
        // Устанавливаем дату (сегодня)
        this.app.booking.date = today;
        
        console.log('📅 Дата бронирования:', this.app.booking.date);
        console.log('⏰ Время бронирования:', this.app.booking.time);
        
        // Сохраняем время прибытия (если есть из старого расчета)
        if (boat.suggested_start_time) {
            const startTime = new Date(boat.suggested_start_time);
            this.app.booking.suggestedTime = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
        }

        // Получаем минимальную доступную длительность для этого катера
        const minDuration = await window.AquaGid.AvailabilityService.getMinDuration(today, nextSlot, boatId);
        this.app.booking.duration = minDuration || 1;
        
        // Переходим к выбору длительности
        this.app.showDurationSelection();
    }

    /**
     * Расчет расстояния между двумя точками (формула гаверсинусов)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // радиус Земли в метрах
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // расстояние в метрах
    }

    /**
     * Отрисовка списка катеров
     */
    async renderBoats(boats) {
        console.log('🎨 renderBoats вызван с boats:', boats);
        console.log('🎨 Длина boats:', boats?.length);
        const content = document.getElementById('quick-content');
        
        // Проверяем, есть ли сегодня рейсы
        const maxDurationNow = await window.AquaGid.AvailabilityService.getMaxDurationForNow();
        
        if (maxDurationNow === 0) {
            content.innerHTML = `
                <div class="info-message">
                    <h3>😔 Сегодня рейсов уже нет</h3>
                    <p>Выберите другой день для прогулки</p>
                    <button class="btn-home" onclick="window.AquaGid.UnifiedScreens.showWelcomeScreen()">
                        На главную
                    </button>
                </div>
            `;
            return;
        }
        
        if (!boats || boats.length === 0) {
            content.innerHTML = `
                <div class="info-message">
                    <h3>😔 Нет доступных катеров</h3>
                    <p>Попробуйте позже или выберите другую дату</p>
                    <button class="btn-home" onclick="window.AquaGid.UnifiedScreens.showWelcomeScreen()">
                        На главную
                    </button>
                </div>
            `;
            return;
        }
        
        content.innerHTML = `
            <h3>Доступные катера (от ближайшего)</h3>
            <div class="quick-boats-list">
                ${boats.map(boat => `
                    <div class="quick-boat-card" onclick="window.currentQuickScreen?.selectBoat(${boat.id})">
                        <div class="quick-boat-image">
                            <img src="${boat.main_photo_url || '/images/boat-placeholder.jpg'}" alt="${boat.name}">
                        </div>
                        <div class="quick-boat-info">
                            <h4>${boat.name}</h4>
                            <p>👥 до ${boat.capacity} чел</p>
                            <p>💰 ${boat.price_per_hour} ₽/час</p>
                            <p class="walk-time">🚶 ${boat.walk_time_minutes} мин пешком</p>
                            ${boat.distance_km ? `<p class="distance">📏 ${boat.distance_km} км</p>` : ''}
                            <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;">
                                ${boat.has_canopy ? '<span>🏖️</span>' : ''}
                                ${boat.has_toilet ? '<span>🚻</span>' : ''}
                                ${boat.has_audio ? '<span>🔊</span>' : ''}
                                ${boat.has_fridge ? '<span>❄️</span>' : ''}
                                ${boat.has_blankets ? '<span>🛏️</span>' : ''}
                                ${boat.has_kitchenware ? '<span>🍽️</span>' : ''}
                            </div>
                            
                            <button class="btn-details" onclick="event.stopPropagation(); window.currentQuickScreen?.showBoatDetails(${boat.id})" style="width:100%;padding:12px;background:#0066CC;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">
                                🔍 Подробнее
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        window.currentQuickScreen = this;
    }

    /**
     * Показать детальную информацию о катере
     */
    showBoatDetails(boatId) {
        const boat = this.availableBoats.find(b => b.id == boatId);
        if (!boat) return;
        
        // Используем существующий BoatScreen для показа деталей
        if (window.AquaGid?.UnifiedScreens?.boatScreen) {
            const boatScreen = window.AquaGid.UnifiedScreens.boatScreen;
            
            // Передаём данные катера
            boatScreen.currentDetailBoat = boat;
            
            // ВАЖНО: устанавливаем глобальную ссылку для кнопки "Выбрать"
            window.currentBoatScreen = boatScreen;
            
            // Вызываем показ деталей
            boatScreen.showBoatDetails(boatId);
        } else {
            console.error('❌ BoatScreen не найден');
        }
    }

    // ========== КОНЕЦ НОВЫХ МЕТОДОВ ==========

    showError(message) {
        const content = document.getElementById('quick-content');
        if (content) {
            content.innerHTML = `<div class="error">${message}</div>`;
        }
    }
}

window.QuickScreen = QuickScreen;