/**
 * MobileStyles.js
 * Адаптивные стили для мобильных устройств
 */

const MobileStyles = {
    // Базовые стили для мобильных
    init() {
        const style = document.createElement('style');
        style.textContent = `
            /* Базовые сбросы */
            * {
                box-sizing: border-box;
                -webkit-tap-highlight-color: transparent;
            }
            
            body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #f5f5f5;
            }
            
            /* Контейнеры */
            .mobile-container {
                max-width: 100%;
                padding: 16px;
                margin: 0 auto;
            }
            
            /* Кнопки */
            .mobile-button {
                min-height: 48px;
                min-width: 48px;
                padding: 14px 20px;
                font-size: 16px;
                border: none;
                border-radius: 12px;
                background: #0066CC;
                color: white;
                font-weight: 500;
                cursor: pointer;
                transition: opacity 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                margin-bottom: 8px;
            }
            
            .mobile-button:active {
                opacity: 0.7;
            }
            
            .mobile-button.secondary {
                background: #f0f0f0;
                color: #333;
                border: 1px solid #ddd;
            }
            
            /* Карточки катеров */
            .boat-card {
                background: white;
                border-radius: 16px;
                padding: 16px;
                margin-bottom: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                cursor: pointer;
                transition: transform 0.2s;
            }
            
            .boat-card:active {
                transform: scale(0.98);
            }
            
            .boat-card__header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .boat-card__name {
                font-size: 18px;
                font-weight: 600;
            }
            
            .boat-card__price {
                font-size: 16px;
                color: #0066CC;
                font-weight: 500;
            }
            
            .boat-card__capacity {
                font-size: 14px;
                color: #666;
                margin-bottom: 8px;
            }
            
            .boat-card__button {
                min-height: 44px;
                min-width: 44px;
                padding: 10px 16px;
                background: #f0f0f0;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                margin-right: 8px;
            }
            
            /* Поля ввода */
            .mobile-input {
                width: 100%;
                min-height: 48px;
                padding: 12px 16px;
                font-size: 16px;
                border: 2px solid #ddd;
                border-radius: 12px;
                margin-bottom: 16px;
                background: white;
            }
            
            .mobile-input:focus {
                outline: none;
                border-color: #0066CC;
            }
            
            /* Вкладки */
            .mobile-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 16px;
                background: #f0f0f0;
                padding: 4px;
                border-radius: 12px;
            }
            
            .mobile-tab {
                flex: 1;
                min-height: 44px;
                border: none;
                border-radius: 10px;
                background: transparent;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .mobile-tab.active {
                background: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            /* Фильтры */
            .mobile-filters {
                display: flex;
                gap: 8px;
                overflow-x: auto;
                padding: 8px 0;
                margin-bottom: 16px;
                -webkit-overflow-scrolling: touch;
            }
            
            .filter-chip {
                min-height: 40px;
                padding: 8px 16px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 20px;
                font-size: 14px;
                white-space: nowrap;
                cursor: pointer;
            }
            
            .filter-chip.active {
                background: #0066CC;
                color: white;
                border-color: #0066CC;
            }
            
            /* Навигация */
            .mobile-nav {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: white;
                display: flex;
                justify-content: space-around;
                padding: 8px 0;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
                z-index: 100;
            }
            
            .mobile-nav-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                padding: 8px;
                min-width: 64px;
                background: none;
                border: none;
                font-size: 12px;
                color: #666;
                cursor: pointer;
            }
            
            .mobile-nav-item.active {
                color: #0066CC;
            }
            
            .mobile-nav-item span {
                font-size: 20px;
            }
            
            /* Дата-пикер для мобильных */
            .date-grid {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 4px;
                margin: 16px 0;
            }
            
            .date-cell {
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                background: white;
                border: 1px solid #eee;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                min-height: 44px;
            }
            
            .date-cell.selected {
                background: #0066CC;
                color: white;
                border-color: #0066CC;
            }
            
            /* Временные слоты */
            .time-slots {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin: 16px 0;
            }
            
            .time-slot {
                min-height: 44px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
            }
            
            .time-slot:active {
                background: #f0f0f0;
            }
            
            /* Уведомления */
            .mobile-toast {
                position: fixed;
                bottom: 80px;
                left: 16px;
                right: 16px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 16px;
                border-radius: 12px;
                text-align: center;
                animation: slideUp 0.3s;
                z-index: 1000;
            }
            
            @keyframes slideUp {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            /* Адаптация существующих компонентов */
            .info-block {
                background: #f8f9fa;
                padding: 12px;
                border-radius: 12px;
                margin-bottom: 16px;
                font-size: 14px;
            }
            
            .info-block strong {
                font-size: 16px;
                display: block;
                margin-bottom: 4px;
            }
        `;
        
        document.head.appendChild(style);
        console.log('✅ MobileStyles загружены');
    }
};

// Делаем глобальным
window.MobileStyles = MobileStyles;