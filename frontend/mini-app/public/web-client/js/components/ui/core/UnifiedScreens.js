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

        // Инициализируем чат
        setTimeout(() => {
            const chatContainer = document.getElementById('support-chat-container') || (() => {
                const c = document.createElement('div');
                c.id = 'support-chat-container';
                document.body.appendChild(c);
                return c;
            })();
            if (window.AquaGid?.ChatService) {
                window.AquaGid.ChatService.render(chatContainer);
            }
        }, 100);

        // Сохраняем реферальный код из URL
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        if (refCode) {
            localStorage.setItem('aquagid-ref', refCode);
            console.log('🔗 Реферальный код сохранён:', refCode);
        } else if (localStorage.getItem('aquagid-ref')) {
            localStorage.removeItem('aquagid-ref');
            console.log('🔗 Реферальный код удалён (заход без ref)');
        }

        // Обработка возврата после оплаты
        const paymentStatus = urlParams.get('payment');
        const bookingIdFromUrl = urlParams.get('booking');
        if (paymentStatus === 'success' && bookingIdFromUrl) {
            console.log('✅ Оплата успешна, бронирование:', bookingIdFromUrl);
            if (typeof ym !== 'undefined') ym(109409407, 'reachGoal', 'payment_success');            
            // Показываем успех сразу с ID, данные загрузим потом
            window.history.replaceState({}, '', window.location.pathname);
            // Откладываем показ, чтобы initScreens успел отработать
            setTimeout(async () => {
                try {
                    const resp = await fetch(`/api/bookings/${bookingIdFromUrl}`);
                    const booking = await resp.json();
                    this.booking = booking;
                    this.navigateToScreen('success', { booking: booking });
                } catch(e) {
                    this.navigateToScreen('mybookings');
                }
            }, 100);
        } else if (paymentStatus === 'fail' && bookingIdFromUrl) {
            console.log('❌ Оплата не прошла, бронирование:', bookingIdFromUrl);
            if (typeof ym !== 'undefined') ym(109409407, 'reachGoal', 'payment_fail');            
            alert('Оплата не прошла. Попробуйте снова.');
            window.history.replaceState({}, '', window.location.pathname);
        }

        // Обработка кнопки "Назад" браузера
        window.addEventListener('popstate', (e) => {
            if (e.state?.screen) {
                this.navigateToScreen(e.state.screen);
            } else {
                // Конец истории — показываем приветствие вместо выхода
                e.preventDefault();
                this.showWelcomeScreen();
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
            case 'welcome': this.showWelcomeScreen(); break;
            case 'date': this.showDateSelection(); break;
            case 'time': this.showTimeSelection(); break;
            case 'duration': this.showDurationSelection(); break;
            case 'boat': this.showBoatSelection(); break;
            case 'quick': this.showQuickScreen(); break;
            case 'confirmation': this.showConfirmationScreen(); break;
            case 'success': this.showSuccessScreen(); break;
            case 'mybookings': this.showMyBookings(); break;
            case 'notifications':
                if (window.PushNotifications) {
                    const userId = localStorage.getItem('clientPhone') || 'guest';
                    PushNotifications.subscribe('client', userId).then(ok => {
                        alert(ok ? '✅ Уведомления включены!' : '❌ Не удалось включить уведомления');
                    });
                }
                break;
            case 'chat':
                window.AquaGid?.ChatService?.toggle();
                break;
            case 'docs':
                window.AquaGid?.Documentation?.close();
                break;
            case 'bookingdetail':
                this.showMyBookings();
                break;
            default: this.showWelcomeScreen(); break;
        }
    }

        startBooking(mode = 'quick') {
        console.log('🚀 startBooking', mode);

        this.resetBooking();
        this.currentFlow = mode;
        
        // Пушим welcome как базовое состояние
        history.pushState({ screen: 'welcome' }, '', window.location.pathname);
        
        if (mode === 'fromDate') {
            this.showDateSelection(); // внутри уже пушит 'date'
        } else if (mode === 'fromBoat') {
            this.showBoatSelection(); // внутри уже пушит 'boat'
        } else if (mode === 'quick') {
            this.showQuickScreen();   // внутри уже пушит 'quick'
        }
    }

    showQuickScreen() {
        if (history.state?.screen !== 'quick') {
            history.pushState({ screen: 'quick' }, '', window.location.pathname);
        }
        console.log('⚡ showQuickScreen');
        if (!this.quickScreen) {
            this.quickScreen = new QuickScreen(this);
        }
        this.quickScreen.show();
    }

    /**
     * Показать экран приветствия
     */
    showWelcomeScreen() {
        // Проверяем параметры от лендинга
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const boatId = urlParams.get('boat');
        
        if (mode === 'quick') {
            window.history.replaceState({}, '', window.location.pathname);
            this.startBooking('quick');
            return;
        }
        if (mode === 'fromBoat') {
            window.history.replaceState({}, '', window.location.pathname);
            this.startBooking('fromBoat');
            return;
        }
        if (mode === 'fromDate') {
            window.history.replaceState({}, '', window.location.pathname);
            this.startBooking('fromDate');
            return;
        }
        
        // Не пушим новую запись, если мы уже на приветствии
        if (history.state?.screen !== 'welcome') {
            history.pushState({ screen: 'welcome' }, '', window.location.pathname);
        }
        this.resetBooking();
        this.welcomeScreen.show();
    }

    /**
     * Показать экран выбора даты
     */
    showDateSelection() {
        if (history.state?.screen !== 'date') {
            history.pushState({ screen: 'date' }, '', window.location.pathname);
        }
        console.log('📅 showDateSelection');
        if (typeof ym !== 'undefined') ym(109409407, 'reachGoal', 'date_select');        
        
        if (this.currentFlow === 'bridges') {
            this.dateScreen.showBridgesMode();
        } else {
            this.dateScreen.show();
        }
    }

    /**
     * Показать экран выбора катера
     */
    showBoatSelection() {
        if (history.state?.screen !== 'boat') {
            history.pushState({ screen: 'boat' }, '', window.location.pathname);
        }
        console.log('🚤 showBoatSelection, flow:', this.currentFlow);
        if (typeof ym !== 'undefined') ym(109409407, 'reachGoal', 'boat_select');
        
        if (!this.boatScreen) {
            this.boatScreen = new BoatScreen(this);
        }
        this.boatScreen.show();
    }

        /**
     * Показать экран выбора времени
     */
    showTimeSelection() {
        if (history.state?.screen !== 'time') {
            history.pushState({ screen: 'time' }, '', window.location.pathname);
        }
        console.log('⏰ showTimeSelection');
        if (!this.timeScreen) {
            this.timeScreen = new TimeScreen(this);
        }
        this.timeScreen.show();
    }

    /**
     * Показать экран выбора длительности
     */
    showDurationSelection() {
        if (history.state?.screen !== 'duration') {
            history.pushState({ screen: 'duration' }, '', window.location.pathname);
        }
        console.log('⏱️ showDurationSelection');
        if (!this.durationScreen) {
            this.durationScreen = new DurationScreen(this);
        }
        this.durationScreen.show();
    }

    showConfirmationScreen() {
        if (history.state?.screen !== 'confirmation') {
            history.pushState({ screen: 'confirmation' }, '', window.location.pathname);
        }
        console.log('✅ showConfirmationScreen');
        if (!this.confirmationScreen) {
            this.confirmationScreen = new ConfirmationScreen(this);
        }
        this.confirmationScreen.show();
    }

    showSuccessScreen(options = {}) {
        history.pushState({ screen: 'success' }, '', window.location.pathname);
        console.log('🎉 showSuccessScreen', options);
        if (!this.successScreen) {
            this.successScreen = new SuccessScreen(this);
        }
        this.successScreen.show(options);
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
        
    }

    /**
     * Показать меню выбора навигатора
     */
    showNavigationMenu() {
        console.log('🧭 showNavigationMenu');
        
        const boat = this.booking?.boat;
        const address = boat?.boarding_address || 'Санкт-Петербург, наб. реки Мойки, 17';
        const coordinates = boat?.boarding_coordinates || '59.9405,30.3168';
        
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
        if (localStorage.getItem('aquagid-geo-accepted') !== 'true') {
            this.showManualAddressForRoute();
            return;
        }
        this.showNavigationMenu();
    }

    /**
     * Показать поле ввода адреса для построения маршрута
     */
    showManualAddressForRoute() {
        const boat = this.booking?.boat;
        const pierAddress = boat?.boarding_address || 'Санкт-Петербург, наб. реки Мойки, 17';
        
        const overlay = document.createElement('div');
        overlay.id = 'route-address-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
        overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
        
        overlay.innerHTML = `
            <div style="background:white;border-radius:12px;padding:20px;width:90%;max-width:400px;text-align:center;">
                <p style="font-weight:600;margin-bottom:12px;">🗺️ Введите ваш адрес</p>
                <p style="font-size:13px;color:#666;margin-bottom:4px;">До причала:</p>
                <p style="font-size:13px;font-weight:600;margin-bottom:12px;">📍 ${pierAddress}</p>
                <input type="text" id="route-manual-address" placeholder="Ваш адрес" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;margin-bottom:12px;font-size:14px;">
                <button id="route-build-btn" style="width:100%;padding:10px;background:#0066cc;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;">
                    🗺️ Выбрать навигатор
                </button>
                <button onclick="document.getElementById('route-address-overlay').remove()" style="width:100%;padding:8px;background:none;color:#999;border:none;margin-top:8px;font-size:13px;">
                    Отмена
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        document.getElementById('route-build-btn').addEventListener('click', () => {
            const userAddress = document.getElementById('route-manual-address').value.trim();
            if (!userAddress) {
                alert('Введите адрес');
                return;
            }
            overlay.remove();
            // Показываем стандартное меню навигаторов с маршрутом от адреса до причала
            this.showNavigationMenuWithAddress(userAddress, pierAddress);
        });
    }

    /**
     * Показать меню навигаторов с маршрутом от адреса до причала
     */
    showNavigationMenuWithAddress(fromAddress, toAddress) {
        const menuHTML = `
            <div id="navigation-menu-overlay" class="navigation-menu-overlay" onclick="if(event.target === this) window.AquaGid.UnifiedScreens.closeNavigationMenu()">
                <div class="navigation-menu">
                    <div class="navigation-menu-header">
                        <h3>🗺️ Маршрут до причала</h3>
                        <p style="font-size:12px;">От: ${fromAddress}</p>
                        <p>📍 ${toAddress}</p>
                    </div>
                    
                    <div class="navigation-menu-items">
                        <button class="nav-item yandex-nav" onclick="window.open('https://yandex.ru/maps/?mode=routes&rtext=${encodeURIComponent(fromAddress)}~${encodeURIComponent(toAddress)}&rtt=pd', '_blank')"
                            <span class="nav-icon">🗺️</span>
                            <span class="nav-text">Яндекс.Карты<small>откроется в браузере</small></span>
                        </button>
                        
                        <button class="nav-item google-maps" onclick="window.open('https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(fromAddress)}&destination=${encodeURIComponent(toAddress)}&travelmode=walking', '_blank')">
                            <span class="nav-icon">📍</span>
                            <span class="nav-text">Google Maps<small>откроется в браузере</small></span>
                        </button>
                        
                        <button class="nav-item dgis" onclick="window.open('https://2gis.ru/routeSearch/rsType/car/to/${encodeURIComponent(toAddress)}', '_blank')">
                            <span class="nav-icon">🏢</span>
                            <span class="nav-text">2ГИС<small>откроется в браузере</small></span>
                        </button>
                    </div>
                    
                    <button class="nav-item-cancel" onclick="window.AquaGid.UnifiedScreens.closeNavigationMenu()">
                        ❌ Отмена
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', menuHTML);
    }

    showMyBookings() {
        let phone = localStorage.getItem('clientPhone');
        let name = localStorage.getItem('clientName');
        
        if (!phone) {
            const p = prompt('Введите номер телефона:', '+7');
            if (!p) return;
            const n = prompt('Ваше имя:', '');
            if (n === null) return;
            
            phone = p.replace(/\D/g, '');
            name = n || 'Гость';
            
            localStorage.setItem('clientPhone', phone);
            localStorage.setItem('clientName', name);
            localStorage.setItem('loginTime', Date.now());
            location.reload();
            return;
        }
        
        if (history.state?.screen !== 'mybookings') {
            history.pushState({ screen: 'mybookings' }, '', window.location.pathname);
        }
        if (!this.myBookingsScreen) {
            this.myBookingsScreen = new MyBookingsScreen(this);
        }
        this.myBookingsScreen.show();
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
