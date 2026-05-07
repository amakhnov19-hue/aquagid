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
                        <h3>Правила пользования сервисом AquaGid</h3>
                        <p>1.1. Используя сервис, вы соглашаетесь с Договором оферты и Политикой конфиденциальности.</p>
                        <p>1.2. Минимальная продолжительность прогулки - 1 час, максимальная - 6 часов.</p>
                        <p>1.3. Рабочее время: с 11:00 до 23:30, последний рейс начинается не позднее 22:00.</p>
                        <p>1.4. Между рейсами предусмотрен технический перерыв 30 минут.</p>
                    `
                },
                instructions: {
                    title: '📌 Краткая инструкция',
                    content: `
                        <h3>Как пользоваться AquaGid</h3>
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
            
            // Кнопка открытия документации
            container.innerHTML = `
                <div class="documentation">
                    <button class="documentation__button" onclick="window.AquaGid.Documentation.toggle()">
                        📚 Документация
                    </button>
                    
                    <div class="documentation__modal ${this.isOpen ? 'open' : ''}">
                        <div class="documentation__header">
                            <h2 class="documentation__title">📚 Документы AquaGid</h2>
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
            
            this.injectStyles();
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
         * Стили для документации
         */
        injectStyles() {
            const styleId = 'documentation-styles';
            const oldStyle = document.getElementById(styleId);
            if (oldStyle) oldStyle.remove();
            
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .documentation {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .documentation__button {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    background: #4A5568;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 30px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 500;
                    box-shadow: 0 4px 12px rgba(74, 85, 104, 0.3);
                    transition: transform 0.2s, box-shadow 0.2s;
                    z-index: 9998;
                }
                
                .documentation__button:hover {
                    transform: scale(1.05);
                    box-shadow: 0 6px 16px rgba(74, 85, 104, 0.4);
                }
                
                .documentation__modal {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(0.9);
                    width: 90%;
                    max-width: 800px;
                    max-height: 80vh;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                    display: none;
                    flex-direction: column;
                    z-index: 9999;
                    opacity: 0;
                    transition: transform 0.3s, opacity 0.3s;
                }
                
                .documentation__modal.open {
                    display: flex;
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                
                .documentation__header {
                    padding: 20px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f7fafc;
                    border-radius: 12px 12px 0 0;
                }
                
                .documentation__title {
                    margin: 0;
                    font-size: 1.5rem;
                    color: #2d3748;
                }
                
                .documentation__close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #718096;
                    transition: color 0.2s;
                }
                
                .documentation__close:hover {
                    color: #2d3748;
                }
                
                .documentation__tabs {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 5px;
                    padding: 15px 20px 0;
                    background: #f7fafc;
                    border-bottom: 1px solid #e2e8f0;
                }
                
                .documentation__tab {
                    padding: 8px 16px;
                    border: 1px solid #cbd5e0;
                    background: white;
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s;
                    color: #4a5568;
                }
                
                .documentation__tab:hover {
                    background: #edf2f7;
                    border-color: #a0aec0;
                }
                
                .documentation__tab.active {
                    background: #4A5568;
                    border-color: #4A5568;
                    color: white;
                }
                
                .documentation__content {
                    padding: 20px;
                    overflow-y: auto;
                    flex: 1;
                    line-height: 1.6;
                }
                
                .documentation__content h3 {
                    color: #2d3748;
                    margin-top: 0;
                    margin-bottom: 15px;
                }
                
                .documentation__content h4 {
                    color: #4a5568;
                    margin: 15px 0 10px;
                }
                
                .documentation__content p {
                    margin: 10px 0;
                    color: #4a5568;
                }
                
                .documentation__content ul, 
                .documentation__content ol {
                    margin: 10px 0;
                    padding-left: 25px;
                }
                
                .documentation__content li {
                    margin: 5px 0;
                }
                
                .documentation__footer {
                    padding: 15px 20px;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f7fafc;
                    border-radius: 0 0 12px 12px;
                }
                
                .documentation__accept {
                    background: #0066CC;
                    color: white;
                    border: none;
                    padding: 10px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 500;
                    transition: background 0.2s;
                }
                
                .documentation__accept:hover {
                    background: #0052a3;
                }
                
                .documentation__version {
                    color: #a0aec0;
                    font-size: 12px;
                }
                
                @media (max-width: 768px) {
                    .documentation__modal {
                        width: 95%;
                        max-height: 90vh;
                    }
                    
                    .documentation__tabs {
                        padding: 10px 15px 0;
                    }
                    
                    .documentation__tab {
                        padding: 6px 12px;
                        font-size: 13px;
                    }
                }

                /* НОВЫЕ СТИЛИ ДЛЯ ЗАГРУЗКИ */
                .loading-doc {
                    text-align: center;
                    padding: 40px;
                    color: #666;
                    font-style: italic;
                }
                
                .error-doc {
                    text-align: center;
                    padding: 40px;
                    color: #DC3545;
                    background: #f8d7da;
                    border-radius: 8px;
                    margin: 20px;
                }
                
                .error-doc a {
                    color: #0066CC;
                    text-decoration: none;
                    display: inline-block;
                    margin-top: 10px;
                    padding: 8px 16px;
                    border: 2px solid #0066CC;
                    border-radius: 6px;
                    transition: all 0.2s;
                }
                
                .error-doc a:hover {
                    background: #0066CC;
                    color: white;
                }
            `;
            
            document.head.appendChild(style);
        }
    }
    
    // Создаём синглтон
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.Documentation = new Documentation();
    
})(typeof window !== 'undefined' ? window : global);

// Экспорт для ES6 модулей
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Documentation: global.AquaGid.Documentation };
}