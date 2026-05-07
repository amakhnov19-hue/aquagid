// /frontend/mini-app/public/js/components/ui/Documentation.js
// Версия: 1.0.0
// Назначение: Документация (оферта, согласия, правила)

(function(global) {
    'use strict';
    
    const VERSION = '20260223_01';
    
    class Documentation {
        constructor() {
            this.version = VERSION;
            this.isOpen = false;
            
            // Типы документов
            this.docs = {
                offer: {
                    title: '📄 Договор оферты',
                    url: '/docs/offer.html',
                    content: 'Загружается...'
                },
                privacy: {
                    title: '🔐 Политика конфиденциальности',
                    url: '/docs/privacy.html',
                    content: 'Загружается...'
                },
                consent: {
                    title: '📝 Согласие на обработку ПД',
                    url: '/docs/consent.html',
                    content: 'Загружается...'
                },
                geolocation: {
                    title: '📍 Согласие на геолокацию',
                    url: '/docs/geolocation.html',
                    content: 'Загружается...'
                },
                rules: {
                    title: '📋 Правила пользования',
                    content: `
                        <h3>Правила пользования сервисом АкваГидСПб</h3>
                        <p>1.1. Используя сервис, вы соглашаетесь с Договором оферты и Политикой конфиденциальности.</p>
                        <p>1.2. Минимальная продолжительность прогулки - 1 час, максимальная - 6 часов.</p>
                        <p>1.3. Рабочее время: с 11:00 до 23:30, последний рейс начинается не позднее 22:00.</p>
                        <p>1.4. Между рейсами предусмотрен технический перерыв 30 минут.</p>
                    `
                },
                instructions: {
                    title: '📌 Краткая инструкция',
                    content: `
                        <h3>Как пользоваться АкваГидСПб</h3>
                        <p><strong>⚡ Быстрое бронирование:</strong></p>
                        <ol>
                            <li>Разрешите геолокацию</li>
                            <li>Выберите катер с удобным временем</li>
                            <li>Выберите продолжительность</li>
                            <li>Подтвердите и оплатите</li>
                        </ol>
                        <p><strong>🚤 От катера:</strong></p>
                        <ol>
                            <li>Выберите катер</li>
                            <li>Выберите продолжительность</li>
                            <li>Выберите время</li>
                            <li>Выберите дату</li>
                        </ol>
                        <p><strong>📅 От даты:</strong></p>
                        <ol>
                            <li>Выберите дату</li>
                            <li>Выберите время</li>
                            <li>Выберите продолжительность</li>
                            <li>Выберите катер</li>
                        </ol>
                    `
                }
            };
            
            // Текущий открытый документ
            this.currentDoc = 'rules';
        }
        
        /**
         * Создаёт HTML структуру документации
         */
        render(containerId = 'documentation-container') {
            // Проверим DesignSystem
            if (!global.AquaGid || !global.AquaGid.DesignSystem) {
                console.warn('DesignSystem not loaded, styles might be missing');
            }
            
            // Создаём контейнер
            let container = document.getElementById(containerId);
            if (!container) {
                container = document.createElement('div');
                container.id = containerId;
                document.body.appendChild(container);
            }
            
            // Модальное окно документации
            container.innerHTML = `
                <div class="documentation">
                    <div class="documentation__modal ${this.isOpen ? 'open' : ''}">
                        <div class="documentation__header">
                            <h2 class="documentation__title">📚 Документы АкваГидСПб</h2>
                            <button class="documentation__close" onclick="window.AquaGid.Documentation.toggle()">✕</button>
                        </div>
                        
                        <div class="documentation__tabs">
                            ${this.renderTabs()}
                        </div>
                        
                        <div class="documentation__content" id="documentation-content">
                            ${this.docs[this.currentDoc].content}
                        </div>
                        
                        <div class="documentation__footer">
                            <button class="documentation__accept" onclick="window.AquaGid.Documentation.acceptAll()">
                                ✅ Принять все
                            </button>
                            <span class="documentation__version">Версия ${VERSION}</span>
                        </div>
                    </div>
                </div>
            `;
            
            return container;
        }
        
        /**
         * Отображает вкладки
         */
        renderTabs() {
            const tabs = [
                { id: 'rules', label: '📋 Правила', icon: '📋' },
                { id: 'offer', label: '📄 Оферта', icon: '📄' },
                { id: 'privacy', label: '🔐 Политика', icon: '🔐' },
                { id: 'consent', label: '📝 Согласие ПД', icon: '📝' },
                { id: 'geolocation', label: '📍 Геолокация', icon: '📍' },
                { id: 'instructions', label: '📌 Инструкция', icon: '📌' }  // ЭТОЙ НЕ ХВАТАЛО!
            ];
            
            return tabs.map(tab => `
                <button 
                    class="documentation__tab ${this.currentDoc === tab.id ? 'active' : ''}"
                    onclick="window.AquaGid.Documentation.openDoc('${tab.id}')"
                >
                    ${tab.label}
                </button>
            `).join('');
        }
        
        /**
         * Открыть/закрыть модалку
         */
        toggle() {
            this.isOpen = !this.isOpen;
            const modal = document.querySelector('.documentation__modal');
            if (modal) {
                modal.classList.toggle('open', this.isOpen);
            }
        }
        
        /**
         * Открыть конкретный документ
         */
        async openDoc(docId) {
            if (this.docs[docId]) {
                this.currentDoc = docId;
                const content = document.getElementById('documentation-content');
                
                if (content) {
                    // Если есть url - загружаем через fetch
                    if (this.docs[docId].url) {
                        content.innerHTML = '<div class="loading-doc">Загрузка документа...</div>';
                        
                        try {
                            const response = await fetch(this.docs[docId].url);
                            const html = await response.text();
                            content.innerHTML = html;
                        } catch (error) {
                            console.error('Ошибка загрузки документа:', error);
                            content.innerHTML = `
                                <div class="error-doc">
                                    ❌ Ошибка загрузки документа.<br>
                                    <a href="${this.docs[docId].url}" target="_blank">Открыть в новой вкладке</a>
                                </div>
                            `;
                        }
                    } else {
                        // Если нет url - используем встроенный контент
                        content.innerHTML = this.docs[docId].content;
                    }
                }
                
                // Обновляем активную вкладку
                document.querySelectorAll('.documentation__tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                const activeTab = Array.from(document.querySelectorAll('.documentation__tab'))
                    .find(tab => tab.getAttribute('onclick')?.includes(`'${docId}'`));
                if (activeTab) {
                    activeTab.classList.add('active');
                }
            }
        }
        
        /**
         * Принять все согласия
         */
        acceptAll() {
            // Сохраняем в localStorage что пользователь принял
            const accepted = {
                rules: true,
                personalData: true,
                geolocation: true,
                offer: true,
                instructions: true,
                date: new Date().toISOString()
            };
            
            localStorage.setItem('aquagid-docs-accepted', JSON.stringify(accepted));
            
            // Показываем уведомление
            if (global.AquaGid?.DesignSystem) {
                global.AquaGid.DesignSystem.ui.showNotification('Спасибо! Документы приняты', 'success');
            }
            
            // Закрываем модалку
            setTimeout(() => this.toggle(), 1000);
        }
        
        /**
         * Проверить, приняты ли документы
         */
        isAccepted() {
            const accepted = localStorage.getItem('aquagid-docs-accepted');
            return !!accepted;
        }
        
        /**
         * Стили для документации - теперь в отдельном CSS файле
         * injectStyles() удалён
         */
    }
    
    // Создаём синглтон
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.Documentation = new Documentation();
    
})(typeof window !== 'undefined' ? window : global);

// Экспорт для ES6 модулей
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Documentation: global.AquaGid.Documentation };
}