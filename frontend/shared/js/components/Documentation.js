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
            this.isManager = false;
            
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
                        
                        <div class="documentation__tabs" id="documentation-tabs">
                            Загрузка...
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
         * Отображает вкладки (из загруженного списка)
         */
        renderTabs() {
            const keys = Object.keys(this.docs);
            if (keys.length === 0) {
                return '<span class="documentation__empty">Нет документов</span>';
            }
            
            return keys.map(key => {
                const doc = this.docs[key];
                return `
                    <button 
                        class="documentation__tab ${this.currentDoc === key ? 'active' : ''}"
                        onclick="window.AquaGid.Documentation.openDoc('${key}')"
                    >
                        ${doc.title}
                    </button>
                `;
            }).join('');
        }

        /**
         * Загрузить список документов из API
         */
        async loadDocList() {
            try {
                const target = this.isManager ? 'manager' : 'client';
                const response = await fetch(`/api/documents?target=${target}`);
                const data = await response.json();
                
                // Обновляем список документов из API
                this.docs = {};
                (data.documents || []).forEach(doc => {
                    this.docs[doc.key] = {
                        title: doc.title,
                        content: doc.content,
                        version: doc.version
                    };
                });
                
                // Если нет документов — показываем заглушку
                if (Object.keys(this.docs).length === 0) {
                    this.docs._empty = {
                        title: '📭 Документы',
                        content: '<p>Документы пока не загружены.</p>'
                    };
                }

                                
                // Обновляем вкладки в DOM
                const tabsContainer = document.getElementById('documentation-tabs');
                if (tabsContainer) {
                    tabsContainer.innerHTML = this.renderTabs();
                }

            } catch (error) {
                console.error('Ошибка загрузки списка документов:', error);
            }
        }
        
        /**
         * Открыть/закрыть модалку
         */
        toggle() {
            this.isOpen = !this.isOpen;
            const modal = document.querySelector('.documentation__modal');
            if (modal) {
                modal.classList.toggle('open', this.isOpen);
                if (this.isOpen) {
                    this.loadDocList().then(() => this.openDoc(Object.keys(this.docs)[0] || '_empty'));
                }
            }
        }
        
        /**
         * Открыть конкретный документ (загрузка из API)
         */
        async openDoc(docId) {
            const content = document.getElementById('documentation-content');
            if (!content) return;
            
            this.currentDoc = docId;
            
            // Берём контент из уже загруженного списка
            const doc = this.docs[docId];
            if (doc && doc.content) {
                content.innerHTML = doc.content;
            } else {
                content.innerHTML = '<div class="error-doc">Документ не найден</div>';
            }
            
            // Обновляем активную вкладку
            document.querySelectorAll('.documentation__tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.getAttribute('onclick')?.includes(`'${docId}'`)) {
                    tab.classList.add('active');
                }
            });
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