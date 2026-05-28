/**
 * Экран выбора катера
 */
class BoatScreen extends ScreenBase {
    constructor(mainApp) {
        super(mainApp);
        this.boats = [];
    }

    /**
     * Показывает экран выбора катера
     */
    async show() {
        console.log('🚤 BoatScreen.show START, flow:', this.app?.currentFlow);
        
        if (!this.container) return;
        
        // Создаем базовую структуру экрана
        this.container.innerHTML = `
            <div class="screen boat-screen">
                <div class="selection-container" id="selection-info">
                    ${this.renderSelectionInfo()}
                </div>
                
                <h2 class="screen-title">🚤 Доступные катера</h2>
                
                <div class="home-button-container">
                    <button class="btn-home" onclick="window.AquaGid.UnifiedScreens.showWelcomeScreen()">
                        🏠 В начало
                    </button>
                </div>
                
                <div id="boats-container" class="boats-list"></div>
            </div>
        `;
        
        // Показываем скелетоны
        this.showSkeleton();
        
        // Загружаем данные в зависимости от ветки
        if (this.app?.currentFlow === 'fromBoat') {
            await this.loadAllBoats(true); // true = принудительно
        } else {
            await this.loadAvailableBoats(true); // true = принудительно
        }
        
        this.updateSelectionInfo();
        
        // Настраиваем автообновление при возвращении
        this.setupAutoRefresh();
        
        console.log('🚤 BoatScreen.show END');
    }

    /**
     * Настройка автоматического обновления данных
     */
    setupAutoRefresh() {
        // Удаляем старые обработчики, чтобы не дублировать
        if (this._refreshHandler) {
            document.removeEventListener('visibilitychange', this._refreshHandler);
            window.removeEventListener('focus', this._refreshHandler);
        }
        
        // Создаём обработчик
        this._refreshHandler = async () => {
            console.log('🔄 Автообновление данных катеров');
            if (this.app?.currentFlow === 'fromBoat') {
                await this.loadAllBoats(true);
            } else {
                await this.loadAvailableBoats(true);
            }
        };
        
        // Событие: возврат на вкладку (свернул/развернул)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('👁️ Вкладка активна, обновляем');
                this._refreshHandler();
            }
        });
        
        // Событие: окно получило фокус
        window.addEventListener('focus', this._refreshHandler);
    }

    /**
     * Загрузка доступных катеров с учётом выбранных даты/времени/длительности
     */
    async loadAvailableBoats(force = false) {
        console.log('🚤 loadAvailableBoats START, force:', force);
        
        try {
            // Проверяем, что все данные для бронирования есть
            if (!this.app.booking.date || !this.app.booking.time || !this.app.booking.duration) {
                console.log('⚠️ Нет данных для фильтрации, загружаем все катера');
                await this.loadAllBoats(force);
                return;
            }
            
            // Формируем запрос к API для проверки доступности
            const params = new URLSearchParams({
                booking_date: this.app.booking.date,
                start_time: this.app.booking.time,
                duration_minutes: this.app.booking.duration * 60
            });
            
            const url = `/api/availability/boats?${params}`;
            const headers = force ? { 'Cache-Control': 'no-cache, no-store, must-revalidate' } : {};
            
            console.log('📡 Запрос к API:', url);
            
            const response = await fetch(url, { headers });
            console.log('📡 Ответ статус:', response.status);
            
            const result = await response.json();
            console.log('📡 Данные от API:', result);
            
            if (result.success && result.boats) {
                this.boats = result.boats;
                
                // Случайная сортировка
                this.boats = this.boats.sort(() => Math.random() - 0.5);
                console.log('Порядок катеров после сортировки:', this.boats.map(b => b.name));
                
                console.log(`✅ Загружено катеров: ${this.boats.length}`);
                this.renderBoats();
            } else {
                console.log('⚠️ API вернуло пустой результат');
                this.boats = [];
                this.showError('Нет доступных катеров');
            }
        } catch (error) {
            console.log('⚠️ Ошибка загрузки катеров:', error);
            this.boats = [];
            this.showError('Не удалось загрузить катера');
        }
        
        console.log('🚤 loadAvailableBoats END, boats:', this.boats.length);
    }

    /**
     * Загрузить все катера (без фильтрации)
     */
    async loadAllBoats(force = false) {
        console.log('🚤 loadAllBoats START, force:', force);
        
        try {
            const headers = force ? { 'Cache-Control': 'no-cache, no-store, must-revalidate' } : {};
            const refCode = localStorage.getItem('aquagid-ref');
            const url = refCode ? `/api/boats/client?ref=${encodeURIComponent(refCode)}` : '/api/boats/client';
            const response = await fetch(url, { headers });
            console.log('📡 Ответ статус:', response.status);
            
            const boats = await response.json();
            console.log('📡 Загружено катеров:', boats.length);
            
            this.boats = boats;
            
            // Случайная сортировка
            this.boats = this.boats.sort(() => Math.random() - 0.5);
            console.log('Порядок катеров после сортировки:', this.boats.map(b => b.name));
            
            this.renderBoats();
        } catch (error) {
            console.log('⚠️ Ошибка загрузки катеров:', error);
            this.boats = [];
            this.showError('Не удалось загрузить катера');
        }
        
        console.log('🚤 loadAllBoats END, boats:', this.boats.length);
    }

    /**
     * Отрисовка списка катеров
     */
    renderBoats() {
        console.log('🎨 renderBoats START, boats:', this.boats.length);
        
        const container = document.getElementById('boats-container');
        if (!container) {
            console.warn('⚠️ boats-container не найден, рендер отменён');
            return;  // просто выходим, не вызывая showSkeleton
        }
        
        if (this.boats.length === 0) {
            container.innerHTML = '<div class="error">Нет доступных катеров</div>';
            return;
        }
        
        container.innerHTML = `
            <div class="boats-list">
                ${this.boats.map(boat => this.renderBoatCard(boat)).join('')}
            </div>
        `;
        
        this.addBoatHandlers();
        this.loadBoatImages();

        // Добавляем свайпы для карусели
        setTimeout(() => {
            this.initCarouselSwipeHandlers();
        }, 100);
        
        console.log('🎨 renderBoats END');
    }

    /**
     * Отрисовка карточки катера
     */
    renderBoatCard(boat) {
        const placeholderUrl = this.getPlaceholderImage(boat);
        const imageUrl = boat.main_photo_url || placeholderUrl;
        const boatId = `boat-img-${boat.id}`;
        
        return `
            <div class="boat-card compact" data-boat-id="${boat.id}">
                <div class="boat-image-container">
                    <img id="${boatId}" 
                        src="${placeholderUrl}" 
                        data-src="${imageUrl}"
                        alt="${escapeHtml(boat.name)}" 
                        class="boat-image lazy">
                    <div class="image-loading-indicator" style="display: none;"></div>
                </div>
                <div class="boat-info">
                    <h3 class="boat-name" style="text-align: center; margin-bottom: 4px;">${escapeHtml(boat.name)}</h3>
                    
                    <div class="boat-amenities-title" style="font-size: 11px; color: #888; margin-bottom: 6px; text-align: center; letter-spacing: 0.5px;">
                        УДОБСТВА НА БОРТУ
                    </div>
                    <div class="boat-features" style="display: flex; justify-content: center; gap: 14px; font-size: 20px; margin-bottom: 12px;">
                        ${boat.has_canopy ? '<span title="Навес">🏖️</span>' : ''}
                        ${boat.has_toilet ? '<span title="Туалет">🚻</span>' : ''}
                        ${boat.has_audio ? '<span title="Аудиосистема">🔊</span>' : ''}
                        ${boat.has_fridge ? '<span title="Холодильник">🧊</span>' : ''}
                        ${boat.has_blankets ? '<span title="Пледы">🧺</span>' : ''}
                        ${boat.has_kitchenware ? '<span title="Посуда/Бокалы">🍽️</span>' : ''}
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px;">
                        <div class="boat-capacity" style="font-size: 14px; color: #555;">👥 ${boat.capacity || 0} гостей</div>
                        <div class="boat-price" style="font-weight: 700; color: #0066CC;">${this.getDisplayPrice(boat)}</div>
                    </div>
                    
                    <button class="boat-details-button" data-boat-id="${boat.id}" style="margin-top: 12px; width: 100%;">
                        🔍 Подробнее
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Обработчики для катеров
     */
    addBoatHandlers() {
        // Клик по карточке - выбор катера
        document.querySelectorAll('.boat-card.compact').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('boat-details-button')) return;
                const boatId = card.dataset.boatId;
                this.selectBoat(boatId);
            });
        });

        // Кнопки "Подробнее"
        document.querySelectorAll('.boat-details-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const boatId = btn.dataset.boatId;
                this.showBoatDetails(boatId);
            });
        });
    }

    /**
     * Выбрать катер
     */
    selectBoat(boatId) {
        // Увеличиваем счётчик просмотров
        if (window.AquaGid?.BoatRanking) {
            window.AquaGid.BoatRanking.incrementViews(boatId);
        }

        console.log('🟢 selectBoat вызван, boatId:', boatId);
        console.log('🟢 this.boats:', this.boats);
        console.log('🟢 this.currentDetailBoat:', this.currentDetailBoat);
        console.log('🟢 window.currentBoatScreen:', window.currentBoatScreen);
        
        // Сначала ищем в общем списке
        let boat = this.boats.find(b => b.id == boatId);
        console.log('🟢 поиск в this.boats:', boat);
        
        // Если не нашли, ищем в текущем детальном катере
        if (!boat && this.currentDetailBoat && this.currentDetailBoat.id == boatId) {
            boat = this.currentDetailBoat;
            console.log('🟢 нашли в currentDetailBoat:', boat);
        }
        
        if (!boat) {
            console.error('❌ Катер не найден!');
            return;
        }
        
        console.log('🟢 Найден катер:', boat.name);
        console.log('🟢 app.booking до сохранения:', this.app.booking);
        
        this.app.booking.boat = boat;
        this.app.booking.boatId = boatId;
        
        console.log('🟢 app.booking после сохранения:', this.app.booking);
        
        // Если открыт детальный просмотр - закрываем
        if (this.detailContainer) {
            console.log('🟢 закрываем детальный просмотр');
            this.hideDetail();
        }
        
        console.log('🟢 текущий flow:', this.app.currentFlow);
        
        // В зависимости от ветки идем дальше
        if (this.app.currentFlow === 'fromBoat') {
            console.log('🟢 идем на выбор времени');
            this.app.showDateSelection();
        } else if (this.app.currentFlow === 'quick') {
            console.log('🟢 идем на выбор длительности');
            this.app.showDurationSelection();
        } else {
            console.log('🟢 идем в подтверждение');
            this.app.showConfirmationScreen();
        }
        
        this.updateSelectionInfo();
    }

    /**
     * Возвращает цену для отображения в зависимости от метода расчёта
     */
    getDisplayPrice(boat) {
        if (boat.pricing_method === 'margin' && boat.open_price) {
            return `${boat.open_price.toLocaleString()} ₽/час`;
        }
        return `${(boat.price_per_hour || 0).toLocaleString()} ₽/час`;
    }

    /**
     * Показать детали катера
     */
    async showBoatDetails(boatId) {
        try {
            this.showDetailSkeleton();
            
            const headers = { 'Cache-Control': 'no-cache' };
            const response = await fetch(`/api/boats/${boatId}`, { headers });
            if (!response.ok) {
                throw new Error('Ошибка загрузки данных');
            }
            
            const boat = await response.json();
            
            this.currentDetailBoat = boat;
            this.currentImageIndex = 0;
            
            this.galleryImages = boat.photos && boat.photos.length > 0 
                ? boat.photos.map(p => p.photo_url) 
                : [this.getPlaceholderImage(boat)];
            
            this.removeDetailSkeleton();
            
            const detailContainer = document.createElement('div');
            detailContainer.className = 'boat-detail-container';
            detailContainer.innerHTML = this.renderBoatDetail(boat);
            
            document.body.appendChild(detailContainer);
            
            this.detailContainer = detailContainer;
            window.currentBoatScreen = this;

            setTimeout(() => {
                this.initCarouselSwipeHandlers();
            }, 200);
            
        } catch (error) {
            console.error('Ошибка загрузки деталей катера:', error);
            alert('Не удалось загрузить информацию о катере');
            this.removeDetailSkeleton();
        }
    }

    /**
     * Скрыть детальный просмотр
     */
    hideDetail() {
        if (this.detailContainer) {
            document.body.removeChild(this.detailContainer);
            this.detailContainer = null;
            // Не обнуляем currentBoatScreen, чтобы кнопка "Выбрать" работала
        }
    }

    /**
     * Отрисовка подробной карточки катера
     */
    renderBoatDetail(boat) {
        const imageUrl = this.getPlaceholderImage(boat);
        const hasMultiplePhotos = this.galleryImages && this.galleryImages.length > 1;
        
        return `
            <div class="boat-detail-screen">
                <div class="detail-header">
                    <button class="detail-back-button" onclick="window.currentBoatScreen?.hideDetail()">
                        ← Назад к списку
                    </button>
                </div>
                
                <div class="boat-gallery" id="boat-gallery">
                    <div class="gallery-main">
                        <img src="${this.galleryImages[0] || imageUrl}" alt="${boat.name}" class="gallery-main-image" id="gallery-main-image" onclick="window.currentBoatScreen?.openFullscreenGallery(0)">
                    </div>
                    
                    ${hasMultiplePhotos ? `
                    <div class="gallery-thumbnails" id="gallery-thumbnails">
                        ${this.galleryImages.map((photo, index) => `
                            <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="window.currentBoatScreen?.switchGalleryImage(${index})">
                                <img src="${photo}" alt="${boat.name} ${index + 1}">
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="gallery-controls">
                        <button class="gallery-nav prev" onclick="window.currentBoatScreen?.prevImage()">‹</button>
                        <button class="gallery-nav next" onclick="window.currentBoatScreen?.nextImage()">›</button>
                        <span class="photo-count" id="photo-count">1 / ${this.galleryImages.length}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="boat-detail-info">
                    <h2 class="boat-detail-name">${boat.name}</h2>
                    
                    <div class="boat-detail-specs">
                        <div class="spec-item">
                            <span class="spec-label">💰 Цена:</span>
                            <span class="spec-value">${this.getDisplayPrice(boat)}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">👥 Вместимость:</span>
                            <span class="spec-value">до ${boat.capacity || 0} чел</span>
                        </div>
                    </div>
                    
                    <div class="boat-detail-description">
                        <h3>📋 Описание</h3>
                        <p>${boat.description_full || boat.description_short || 'Описание отсутствует'}</p>
                    </div>

                    <div class="boat-detail-amenities">
                        <h3>✨ Удобства на борту</h3>
                        <div class="amenities-list" style="display: flex; flex-wrap: wrap; gap: 16px 24px; margin-top: 12px;">
                            ${boat.has_canopy ? '<div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 24px;">🏖️</span><span style="color: #555;">Навес</span></div>' : ''}
                            ${boat.has_toilet ? '<div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 24px;">🚻</span><span style="color: #555;">Туалет</span></div>' : ''}
                            ${boat.has_audio ? '<div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 24px;">🔊</span><span style="color: #555;">Аудиосистема</span></div>' : ''}
                            ${boat.has_fridge ? '<div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 24px;">🧊</span><span style="color: #555;">Холодильник</span></div>' : ''}
                            ${boat.has_blankets ? '<div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 24px;">🧺</span><span style="color: #555;">Пледы</span></div>' : ''}
                            ${boat.has_kitchenware ? '<div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 24px;">🍽️</span><span style="color: #555;">Посуда/Бокалы</span></div>' : ''}
                        </div>
                        ${!boat.has_canopy && !boat.has_toilet && !boat.has_audio && !boat.has_fridge && !boat.has_blankets && !boat.has_kitchenware ? 
                            '<p style="color: #999; margin-top: 8px;">Информация об удобствах уточняется</p>' : ''}
                    </div>
                    
                    <button class="boat-select-detail-button" data-boat-id="${boat.id}" onclick="window.currentBoatScreen?.selectBoat(${boat.id})">
                        ✅ Выбрать этот катер
                    </button>
                </div>
            </div>
            
            <div class="fullscreen-gallery" id="fullscreen-gallery" style="display: none;">
                <button class="fullscreen-close" onclick="window.currentBoatScreen?.closeFullscreenGallery()">✕</button>
                <button class="fullscreen-prev" onclick="window.currentBoatScreen?.fullscreenPrev()">‹</button>
                <img class="fullscreen-image" id="fullscreen-image" src="" alt="">
                <button class="fullscreen-next" onclick="window.currentBoatScreen?.fullscreenNext()">›</button>
                <span class="fullscreen-counter" id="fullscreen-counter"></span>
            </div>
        `;
    }

    /**
     * Показать скелетоны во время загрузки
     */
    showSkeleton() {
        console.log('🦴 showSkeleton');
        
            const container = document.getElementById('boats-container');
            if (!container) {
                console.log('⚠️ boats-container не найден, скелетон не показан');
                return;
            }
        
        container.innerHTML = Array(6).fill().map(() => `
            <div class="boat-card compact loading">
                <div class="boat-image-container">
                    <div class="skeleton-image"></div>
                </div>
                <div class="boat-info">
                    <div class="skeleton-line" style="width: 70%"></div>
                    <div class="skeleton-line" style="width: 50%"></div>
                    <div class="skeleton-line" style="width: 90%"></div>
                </div>
            </div>
        `).join('');
        
        console.log('🦴 showSkeleton END');
    }

    /**
     * Показать скелетон загрузки деталей
     */
    showDetailSkeleton() {
        const skeleton = document.createElement('div');
        skeleton.className = 'boat-detail-skeleton';
        skeleton.id = 'boat-detail-skeleton';
        skeleton.innerHTML = `
            <div class="skeleton-header"></div>
            <div class="skeleton-gallery"></div>
            <div class="skeleton-info">
                <div class="skeleton-line" style="width: 70%"></div>
                <div class="skeleton-line" style="width: 50%"></div>
                <div class="skeleton-line" style="width: 90%"></div>
                <div class="skeleton-line" style="width: 80%"></div>
            </div>
        `;
        document.body.appendChild(skeleton);
    }

    /**
     * Удалить скелетон загрузки
     */
    removeDetailSkeleton() {
        const skeleton = document.getElementById('boat-detail-skeleton');
        if (skeleton) {
            skeleton.remove();
        }
    }

    /**
     * Показать ошибку
     */
    showError(message) {
        console.log('❌ showError:', message);
        const container = document.getElementById('boats-container');
        if (container) {
            container.innerHTML = `<div class="error">${message}</div>`;
        }
    }

    /**
     * Загрузка изображений с приоритетами
     */
    loadBoatImages() {
        // Сначала загружаем изображения первых 3 катеров
        const visibleBoats = Array.from(document.querySelectorAll('.boat-card')).slice(0, 3);
        visibleBoats.forEach(card => {
            const img = card.querySelector('.boat-image[data-src]');
            if (img) {
                const indicator = card.querySelector('.image-loading-indicator');
                if (indicator) indicator.style.display = 'block';
                
                window.imageLoader.loadImage(
                    img, 
                    img.dataset.src, 
                    img.src,
                    { priority: 'high' }
                ).then(() => {
                    if (indicator) indicator.style.display = 'none';
                });
            }
        });

        // Остальные грузим с нормальным приоритетом
        setTimeout(() => {
            document.querySelectorAll('.boat-card').forEach((card, index) => {
                if (index >= 3) {
                    const img = card.querySelector('.boat-image[data-src]');
                    if (img) {
                        window.imageLoader.loadImage(
                            img, 
                            img.dataset.src, 
                            img.src,
                            { priority: 'normal' }
                        );
                    }
                }
            });
        }, 500);
    }

    /**
     * Получить заглушку для изображения
     */
    getPlaceholderImage(boat) {
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%234c51bf'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='24' font-family='Arial'%3E${encodeURIComponent(boat.name)}%3C/text%3E%3C/svg%3E`;
    }

    // Методы для галереи
    switchGalleryImage(index) {
        this.currentImageIndex = index;
        const mainImage = document.getElementById('gallery-main-image');
        const thumbnails = document.querySelectorAll('.thumbnail');
        
        if (mainImage) {
            mainImage.src = this.galleryImages[index];
        }
        
        thumbnails.forEach((thumb, i) => {
            if (i === index) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
        
        const photoCount = document.getElementById('photo-count');
        if (photoCount) {
            photoCount.textContent = `${index + 1} / ${this.galleryImages.length}`;
        }
    }

    prevImage() {
        if (this.galleryImages.length > 1) {
            this.currentImageIndex = (this.currentImageIndex - 1 + this.galleryImages.length) % this.galleryImages.length;
            this.switchGalleryImage(this.currentImageIndex);
        }
    }

    nextImage() {
        if (this.galleryImages.length > 1) {
            this.currentImageIndex = (this.currentImageIndex + 1) % this.galleryImages.length;
            this.switchGalleryImage(this.currentImageIndex);
        }
    }

    openFullscreenGallery(index) {
        this.fullscreenIndex = index;
        const gallery = document.getElementById('fullscreen-gallery');
        const image = document.getElementById('fullscreen-image');
        const counter = document.getElementById('fullscreen-counter');
        
        if (gallery && image) {
            image.src = this.galleryImages[index];
            counter.textContent = `${index + 1} / ${this.galleryImages.length}`;
            gallery.style.display = 'flex';

            this.initSwipeHandlers();
        }
    }

    closeFullscreenGallery() {
        const gallery = document.getElementById('fullscreen-gallery');
        if (gallery) {
            gallery.style.display = 'none';
        }
    }

    fullscreenPrev() {
        if (this.galleryImages.length > 1) {
            this.fullscreenIndex = (this.fullscreenIndex - 1 + this.galleryImages.length) % this.galleryImages.length;
            const image = document.getElementById('fullscreen-image');
            const counter = document.getElementById('fullscreen-counter');
            image.src = this.galleryImages[this.fullscreenIndex];
            counter.textContent = `${this.fullscreenIndex + 1} / ${this.galleryImages.length}`;
        }
    }

    fullscreenNext() {
        if (this.galleryImages.length > 1) {
            this.fullscreenIndex = (this.fullscreenIndex + 1) % this.galleryImages.length;
            const image = document.getElementById('fullscreen-image');
            const counter = document.getElementById('fullscreen-counter');
            image.src = this.galleryImages[this.fullscreenIndex];
            counter.textContent = `${this.fullscreenIndex + 1} / ${this.galleryImages.length}`;
        }
    }

    initSwipeHandlers() {
        const gallery = document.getElementById('fullscreen-gallery');
        if (!gallery) return;
        
        let touchStartX = 0;
        let touchEndX = 0;
        
        const handleTouchStart = (e) => {
            touchStartX = e.changedTouches[0].screenX;
        };
        
        const handleTouchEnd = (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchEndX - touchStartX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.fullscreenPrev();
                } else {
                    this.fullscreenNext();
                }
            }
        };
        
        // Удаляем старые обработчики, чтобы не дублировать
        gallery.removeEventListener('touchstart', handleTouchStart);
        gallery.removeEventListener('touchend', handleTouchEnd);
        
        gallery.addEventListener('touchstart', handleTouchStart);
        gallery.addEventListener('touchend', handleTouchEnd);
    }

    initCarouselSwipeHandlers() {
        const carousel = document.querySelector('.boat-gallery');
        if (!carousel) return;
        
        let touchStartX = 0;
        let touchEndX = 0;
        
        const handleTouchStart = (e) => {
            touchStartX = e.changedTouches[0].screenX;
        };
        
        const handleTouchEnd = (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchEndX - touchStartX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.prevImage();
                } else {
                    this.nextImage();
                }
            }
        };
        
        carousel.addEventListener('touchstart', handleTouchStart);
        carousel.addEventListener('touchend', handleTouchEnd);
    }
}

window.BoatScreen = BoatScreen;