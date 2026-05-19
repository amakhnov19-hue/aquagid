/**
 * UnifiedScreens - главный класс, управляющий экранами
 * Версия с разделенными компонентами
 */

class UnifiedScreens {
    constructor() {
        console.log('UnifiedScreens constructor');
        
        // Состояние бронирования
        this.booking = {
            boat: null,
            date: null,
            time: null,
            duration: null,
            client: { name: '', phone: '', email: '' },
            price: { total: 0, prepayment: 0, remaining: 0 }
        };
        
        // Временные данные
        this.temp = {
            availableBoats: [],
            availableDates: [],
            availableTimes: [],
            availableDurations: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6],
            quickBoats: []
        };
        
        // Инициализируем экраны
        this.initScreens();

        // Обработка кнопки "Назад" браузера
        window.addEventListener('popstate', (e) => {
            if (e.state?.screen) {
                this.navigateToScreen(e.state.screen);
            }
        });        
    }

    /**
     * Инициализация всех экранов
     */
    initScreens() {
        this.welcomeScreen = new WelcomeScreen(this);
        this.dateScreen = new DateScreen(this);
        this.timeScreen = new TimeScreen(this);
        this.durationScreen = new DurationScreen(this);  
        this.boatScreen = new BoatScreen(this);
        this.confirmationScreen = new ConfirmationScreen(this);
        this.successScreen = new SuccessScreen(this);
        this.quickScreen = new QuickScreen(this);  // ← добавить
        this.myBookingsScreen = new MyBookingsScreen(this);
    }

    navigateToScreen(screen) {
        switch(screen) {
            case 'welcome': this.welcomeScreen.show(); break;
            case 'date': this.showDateSelection(); break;
            case 'time': this.showTimeSelection(); break;
            case 'duration': this.showDurationSelection(); break;
            case 'boat': this.showBoatSelection(); break;
            case 'quick': this.showQuickScreen(); break;
            case 'confirmation': this.showConfirmationScreen(); break;
        }
    }

    /**
     * Старт бронирования
     */
    startBooking(mode = 'quick') {
        console.log('🚀 startBooking', mode);
        
        this.resetBooking();
        this.currentFlow = mode;
        
        if (mode === 'fromDate') {
            this.showDateSelection();
        } else if (mode === 'fromBoat') {
            this.showBoatSelection();
        } else if (mode === 'quick') {
            this.showQuickScreen();  // ← вместо showBoatSelection()
        }
    }

    showQuickScreen() {
        console.log('⚡ showQuickScreen');
        if (this.quickScreen) {
            this.quickScreen.show();
        } else {
            this.quickScreen = new QuickScreen(this);
            this.quickScreen.show();
        }
    }

    /**
     * Показать экран приветствия
     */
    showWelcomeScreen() {
        history.pushState({ screen: 'welcome' }, '', window.location.pathname);
        this.resetBooking();
        this.welcomeScreen.show();
    }

    /**
     * Показать экран выбора даты
     */
    showDateSelection() {
        history.pushState({ screen: 'date' }, '', window.location.pathname);
        console.log('📅 showDateSelection');
        
        if (this.currentFlow === 'bridges') {
            // Для ветки развода мостов используем специальный экран
            this.dateScreen.showBridgesMode();
        } else {
            // Обычный режим
            this.dateScreen.show();
        }
    }

    /**
     * Показать экран выбора катера
     */
    showBoatSelection() {
        history.pushState({ screen: 'boat' }, '', window.location.pathname);
        console.log('🚤 showBoatSelection, flow:', this.currentFlow);
        
        if (this.currentFlow === 'fromBoat') {
            // Ветка "от катера" - показываем все катера
            if (this.boatScreen) {
                this.boatScreen.show();
            } else {
                console.error('❌ BoatScreen не инициализирован');
                this.boatScreen = new BoatScreen(this);
                this.boatScreen.show();
            }
        } else {
            // Ветка "от даты" или другие - показываем доступные по времени
            if (this.boatScreen) {
                this.boatScreen.show();
            } else {
                console.error('❌ BoatScreen не инициализирован');
                this.boatScreen = new BoatScreen(this);
                this.boatScreen.show();
            }
        }
    }

        /**
     * Показать экран выбора времени
     */
    showTimeSelection() {
        history.pushState({ screen: 'time' }, '', window.location.pathname);
        console.log('⏰ showTimeSelection');
        if (this.timeScreen) {
            this.timeScreen.show();
        } else {
            console.error('❌ TimeScreen не инициализирован');
            // На всякий случай создаем экран
            this.timeScreen = new TimeScreen(this);
            this.timeScreen.show();
        }
    }

    /**
     * Показать экран выбора длительности
     */
    showDurationSelection() {
        history.pushState({ screen: 'duration' }, '', window.location.pathname);
        console.log('⏱️ showDurationSelection');
        if (this.durationScreen) {
            this.durationScreen.show();
        } else {
            console.error('❌ DurationScreen не инициализирован');
            this.durationScreen = new DurationScreen(this);
            this.durationScreen.show();
        }
    }

    showConfirmationScreen() {
        history.pushState({ screen: 'confirmation' }, '', window.location.pathname);
        console.log('✅ showConfirmationScreen');
        if (this.confirmationScreen) {
            this.confirmationScreen.show();
        } else {
            console.error('❌ ConfirmationScreen не инициализирован');
            this.confirmationScreen = new ConfirmationScreen(this);
            this.confirmationScreen.show();
        }
    }

    showSuccessScreen(options = {}) {
        console.log('🎉 showSuccessScreen', options);
        if (this.successScreen) {
            this.successScreen.show(options);
        } else {
            console.error('❌ SuccessScreen не инициализирован');
            this.successScreen = new SuccessScreen(this);
            this.successScreen.show(options);
        }
    }

    /**
     * Ветка развода мостов (временно отключена)
     */
    // startBridgesRide() {
    //     console.log('🌉 startBridgesRide');
    //     
    //     // Сброс бронирования
    //     this.resetBooking();
    //     
    //     // Устанавливаем параметры для этой ветки
    //     this.currentFlow = 'bridges';
    //     this.booking.time = '23:30';
    //     this.booking.duration = 2;
    //     
    //     // Переходим к выбору даты
    //     this.showDateSelection();
    // }

    /**
     * Сброс состояния бронирования
     */
    resetBooking() {
        console.log('🔄 resetBooking');
        this.booking = {
            boat: null,
            date: null,
            time: null,
            duration: null,
            client: { name: '', phone: '', email: '' },
            price: { total: 0, prepayment: 0, remaining: 0 }
        };
        this.currentFlow = null;
        
        // Очищаем localStorage
        localStorage.removeItem('clientName');
        localStorage.removeItem('clientPhone');
        localStorage.removeItem('clientEmail');
        localStorage.removeItem('clientTelegram');
        
    }

    /**
     * Навигация до причала - меню выбора навигатора
     */
    navigateToPier() {
        console.log('🧭 navigateToPier');
        
        const boat = this.booking?.boat;
        const address = boat?.boarding_address || 'Санкт-Петербург, наб. реки Фонтанки, 123';
        const coordinates = boat?.boarding_coordinates || '59.9398,30.3146';
        
        // Создаем меню выбора
        const choice = prompt(
            `🗺️ Построить маршрут до причала:\n\n` +
            `📍 Адрес: ${address}\n\n` +
            `Выберите навигатор (введите номер):\n` +
            `1 - Яндекс.Навигатор (приложение)\n` +
            `2 - Яндекс.Карты (браузер)\n` +
            `3 - Google Maps (браузер)\n` +
            `4 - 2ГИС (браузер)\n` +
            `0 - ❌ Отмена`
        );
        
        let url;
        
        switch(choice) {
            case '1': // Яндекс.Навигатор
                url = `yandexnavi://show_point_on_map?addr=${encodeURIComponent(address)}&lat=${coordinates.split(',')[0]}&lon=${coordinates.split(',')[1]}`;
                window.location.href = url;
                
                // Fallback если навигатор не установлен
                setTimeout(() => {
                    const fallbackUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;
                    if (confirm('Яндекс.Навигатор не найден. Открыть в Яндекс.Картах?')) {
                        window.open(fallbackUrl, '_blank');
                    }
                }, 500);
                break;
                
            case '2': // Яндекс.Карты
                url = `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;
                window.open(url, '_blank');
                break;
                
            case '3': // Google Maps
                url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                window.open(url, '_blank');
                break;
                
            case '4': // 2ГИС
                url = `https://2gis.ru/geo/${encodeURIComponent(address)}`;
                window.open(url, '_blank');
                break;
                
            default: // 0 или отмена
                console.log('❌ Навигация отменена пользователем');
                break;
        }
    }

    /**
     * Показать меню выбора навигатора
     */
    showNavigationMenu() {
        console.log('🧭 showNavigationMenu');
        
        const boat = this.booking?.boat;
        const address = boat?.boarding_address || 'Санкт-Петербург, наб. реки Фонтанки, 123';
        const coordinates = boat?.boarding_coordinates || '59.9398,30.3146';
        
        // Удаляем предыдущее меню если было
        const oldMenu = document.getElementById('navigation-menu-overlay');
        if (oldMenu) oldMenu.remove();
        
        // Создаем меню
        const menuHTML = `
            <div id="navigation-menu-overlay" class="navigation-menu-overlay" onclick="if(event.target === this) window.AquaGid.UnifiedScreens.closeNavigationMenu()">
                <div class="navigation-menu">
                    <div class="navigation-menu-header">
                        <h3>🗺️ Построить маршрут</h3>
                        <p>📍 ${address}</p>
                    </div>
                    
                    <div class="navigation-menu-items">
                                                <button class="nav-item yandex-nav" onclick="window.AquaGid.UnifiedScreens.openNavigator('yandex-nav', '${address}', '${coordinates}')">
                            <span class="nav-icon">🗺️</span>
                            <span class="nav-text">
                                Яндекс.Карты
                                <small>откроется в браузере</small>
                            </span>
                        </button>
                        
                        <button class="nav-item google-maps" onclick="window.AquaGid.UnifiedScreens.openNavigator('google-maps', '${address}', '${coordinates}')">
                            <span class="nav-icon">📍</span>
                            <span class="nav-text">
                                Google Maps
                                <small>откроется в браузере</small>
                            </span>
                        </button>
                        
                        <button class="nav-item dgis" onclick="window.AquaGid.UnifiedScreens.openNavigator('2gis', '${address}', '${coordinates}')">
                            <span class="nav-icon">🏢</span>
                            <span class="nav-text">
                                2ГИС
                                <small>откроется в браузере</small>
                            </span>
                        </button>
                    </div>
                    
                    <button class="nav-item-cancel" onclick="window.AquaGid.UnifiedScreens.closeNavigationMenu()">
                        ❌ Отмена
                    </button>
                </div>
            </div>
        `;
        
        // Добавляем в body
        document.body.insertAdjacentHTML('beforeend', menuHTML);
    }
    
    /**
     * Закрыть меню навигации
     */
    closeNavigationMenu() {
        const menu = document.getElementById('navigation-menu-overlay');
        if (menu) menu.remove();
    }
    
        /**
     * Открыть выбранный навигатор (все в браузере)
     */
    openNavigator(navigator, address, coordinates) {
        console.log('🧭 openNavigator:', navigator);
        
        let url;
        
        switch(navigator) {
            case 'yandex-nav':
            case 'yandex-maps':
                // Яндекс.Карты (браузер) - сам предложит открыть в приложении
                url = `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;
                break;
                
            case 'google-maps':
                // Google Maps (браузер) - сам предложит открыть в приложении
                url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                break;
                
            case '2gis':
                // 2ГИС (браузер)
                url = `https://2gis.ru/search/${encodeURIComponent(address)}`;
                break;
        }
        
        // Открываем в браузере
        window.open(url, '_blank');
        
        // Закрываем меню
        this.closeNavigationMenu();
    }
    
    /**
     * Навигация до причала (вызывает меню)
     */
    navigateToPier() {
        console.log('🧭 navigateToPier');
        this.showNavigationMenu();
    }

    showMyBookings() {
        console.log('📋 showMyBookings');
        if (this.myBookingsScreen) {
            this.myBookingsScreen.show();
        }
    }

    /**
     * Скрыть экран успеха и вернуться в Мои бронирования
     */
    hideSuccessScreen() {
        this.showMyBookings();
    }
}

// Создаем экземпляр и делаем доступным везде
const unifiedScreensInstance = new UnifiedScreens();

if (typeof window !== 'undefined') {
    window.UnifiedScreens = unifiedScreensInstance;
    window.AquaGid = window.AquaGid || {};
    window.AquaGid.UnifiedScreens = unifiedScreensInstance;
}

if (typeof global !== 'undefined') {
    global.UnifiedScreens = unifiedScreensInstance;
    global.AquaGid = global.AquaGid || {};
    global.AquaGid.UnifiedScreens = unifiedScreensInstance;
}
