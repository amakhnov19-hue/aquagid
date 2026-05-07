/**
 * Универсальный загрузчик изображений с адаптацией под устройства
 * Используется во всех экранах и компонентах
 */
class ImageLoader {
    constructor() {
        // Определяем тип устройства
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Настройки качества для разных устройств
        this.quality = {
            mobile: {
                maxWidth: 400,
                quality: 0.7,
                placeholder: 'low'
            },
            tablet: {
                maxWidth: 800,
                quality: 0.8,
                placeholder: 'medium'
            },
            desktop: {
                maxWidth: 1200,
                quality: 0.9,
                placeholder: 'high'
            }
        };
        
        // Кэш загруженных изображений
        this.cache = new Map();
        
        // Очередь загрузки
        this.queue = [];
        this.isProcessing = false;
        
        console.log(`📸 ImageLoader инициализирован для ${this.isMobile ? 'мобильного' : 'десктоп'} устройства`);
    }

    /**
     * Получить URL с параметрами для оптимизации
     */
    getOptimizedUrl(originalUrl, type = 'thumbnail') {
        if (!originalUrl) return null;
        
        // Если это data URL (base64), возвращаем как есть
        if (originalUrl.startsWith('data:')) {
            return originalUrl;
        }
        
        // Если уже с параметрами - возвращаем как есть
        if (originalUrl.includes('?')) return originalUrl;
        
        // Определяем нужные параметры в зависимости от устройства и типа
        const device = this.isMobile ? 'mobile' : 'desktop';
        const settings = this.quality[device];
        
        // Формируем URL с параметрами для бэкенда
        const params = new URLSearchParams({
            w: type === 'thumbnail' ? settings.maxWidth : settings.maxWidth * 2,
            q: settings.quality,
            fit: 'cover'
        });
        
        return `${originalUrl}?${params.toString()}`;
    }

    /**
     * Загрузить изображение с прогрессом и анимацией
     */
    loadImage(imgElement, originalUrl, placeholderUrl, options = {}) {
        return new Promise((resolve, reject) => {
            const {
                priority = 'normal', // 'high', 'normal', 'low'
                retryCount = 3,
                timeout = 10000
            } = options;

            // Проверяем кэш
            if (this.cache.has(originalUrl)) {
                imgElement.src = this.cache.get(originalUrl);
                imgElement.classList.add('loaded');
                resolve();
                return;
            }

            // Ставим плейсхолдер
            imgElement.src = placeholderUrl;
            imgElement.classList.add('placeholder');

            // Создаем временное изображение для загрузки
            const tempImg = new Image();
            let attempts = 0;
            let timeoutId;

            const loadAttempt = () => {
                // Оптимизированный URL для загрузки
                const optimizedUrl = this.getOptimizedUrl(originalUrl, 'full');
                
                tempImg.onload = () => {
                    clearTimeout(timeoutId);
                    
                    // Сохраняем в кэш
                    this.cache.set(originalUrl, optimizedUrl);
                    
                    // Анимация "проявки"
                    this.revealImage(imgElement, optimizedUrl).then(() => {
                        resolve();
                    });
                };

                tempImg.onerror = () => {
                    attempts++;
                    if (attempts < retryCount) {
                        // Не пытаемся перезагружать data-url
                        if (!originalUrl.startsWith('data:')) {
                            console.log(`🔄 Повторная попытка загрузки ${originalUrl} (${attempts}/${retryCount})`);
                            setTimeout(loadAttempt, 1000 * attempts);
                        } else {
                            // Для data-url просто резолвим без ошибки
                            clearTimeout(timeoutId);
                            resolve();
                        }
                    } else {
                        clearTimeout(timeoutId);
                        // Не показываем ошибку для data-url
                        if (!originalUrl.startsWith('data:')) {
                            console.error(`❌ Не удалось загрузить ${originalUrl}`);
                            reject(new Error('Failed to load image'));
                        } else {
                            // Для data-url просто завершаем успешно
                            resolve();
                        }
                    }
                };

                tempImg.src = optimizedUrl;
            };

            // Таймаут загрузки
            timeoutId = setTimeout(() => {
                tempImg.onerror = null;
                tempImg.onload = null;
                reject(new Error('Image load timeout'));
            }, timeout);

            // Добавляем в очередь в зависимости от приоритета
            if (priority === 'high') {
                loadAttempt();
            } else {
                this.queue.push({ priority, loadAttempt });
                this.processQueue();
            }
        });
    }

    /**
     * Анимация проявки изображения
     */
    revealImage(imgElement, src) {
        return new Promise((resolve) => {
            // Эффект проявки Polaroid
            imgElement.classList.add('fade-out');
            
            setTimeout(() => {
                imgElement.src = src;
                imgElement.classList.remove('fade-out', 'placeholder');
                imgElement.classList.add('fade-in', 'loaded');
                
                setTimeout(() => {
                    imgElement.classList.remove('fade-in');
                    resolve();
                }, 300);
            }, 150);
        });
    }

    /**
     * Обработка очереди загрузки
     */
    processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        
        this.isProcessing = true;
        
        // Сортируем по приоритету
        this.queue.sort((a, b) => {
            const priorityWeight = { high: 3, normal: 2, low: 1 };
            return priorityWeight[b.priority] - priorityWeight[a.priority];
        });
        
        const next = this.queue.shift();
        next.loadAttempt();
        
        setTimeout(() => {
            this.isProcessing = false;
            this.processQueue();
        }, 100); // Задержка между загрузками
    }

    /**
     * Предзагрузка изображений (для следующих экранов)
     */
    preloadImages(urls, priority = 'low') {
        urls.forEach(url => {
            if (!this.cache.has(url)) {
                const tempImg = new Image();
                tempImg.src = this.getOptimizedUrl(url, 'thumbnail');
                this.cache.set(url, tempImg.src);
            }
        });
    }

    /**
     * Очистка кэша
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Кэш изображений очищен');
    }
}

// Создаем глобальный экземпляр
window.imageLoader = new ImageLoader();

