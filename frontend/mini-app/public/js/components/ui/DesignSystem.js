// /home/developer/projects/aquagid-experimental/frontend/js/components/ui/DesignSystem.js
// Версия: 1.0.0
// Назначение: Единый источник стилей и UI-утилит из монолита

(function(global) {
  'use strict';
  
  // Версия дизайн-системы для cache-busting
  const VERSION = '20260223_01';
  
  /**
   * DesignSystem — извлекает и стандартизирует все стили из production монолита
   * Содержит:
   * - CSS-классы в виде JS-объектов для инлайн-стилей
   * - UI-компоненты (кнопки, карточки, модалки)
   * - Цветовую схему и типографику
   * - Анимации и переходы
   */
  class DesignSystem {
    constructor() {
      this.version = VERSION;
      
      // 🎨 Цветовая палитра (из production)
      this.colors = {
        primary: '#0066CC',        // Основной синий
        primaryDark: '#004999',    // Для hover
        secondary: '#00A884',      // Зелёный (успех, подтверждение)
        danger: '#DC3545',         // Красный (ошибки, отмена)
        warning: '#FFC107',         // Жёлтый (предупреждения)
        text: {
          primary: '#1A1A1A',
          secondary: '#666666',
          light: '#999999',
          inverse: '#FFFFFF'
        },
        background: {
          main: '#FFFFFF',
          light: '#F5F5F5',
          dark: '#E8E8E8',
          overlay: 'rgba(0, 0, 0, 0.5)'
        },
        borders: '#DDDDDD',
        shadows: 'rgba(0, 0, 0, 0.1)'
      };
      
      // 📏 Размеры и отступы
      this.spacing = {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px'
      };
      
      // 🔤 Типографика
      this.typography = {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        sizes: {
          xs: '12px',
          sm: '14px',
          md: '16px',
          lg: '18px',
          xl: '20px',
          xxl: '24px',
          xxxl: '32px'
        },
        weights: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700
        }
      };
      
      // 🎯 Скругления
      this.borderRadius = {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        round: '50%'
      };
      
      // ✨ Тени
      this.shadows = {
        sm: '0 2px 4px rgba(0,0,0,0.1)',
        md: '0 4px 8px rgba(0,0,0,0.1)',
        lg: '0 8px 16px rgba(0,0,0,0.1)',
        xl: '0 12px 24px rgba(0,0,0,0.1)'
      };
      
      // ⏱️ Анимации
      this.animations = {
        duration: {
          fast: '0.2s',
          normal: '0.3s',
          slow: '0.5s'
        },
        easing: {
          default: 'ease',
          in: 'ease-in',
          out: 'ease-out',
          inOut: 'ease-in-out'
        }
      };
    }
    
    /**
     * Создаёт инлайн-стили для кнопки
     * @param {string} variant - primary, secondary, danger, outline
     * @param {string} size - sm, md, lg
     * @returns {Object} Стили для React/инлайн
     */
    getButtonStyles(variant = 'primary', size = 'md') {
      const baseStyles = {
        fontFamily: this.typography.fontFamily,
        fontWeight: this.typography.weights.medium,
        borderRadius: this.borderRadius.md,
        cursor: 'pointer',
        transition: `all ${this.animations.duration.fast} ${this.animations.easing.default}`,
        border: 'none',
        outline: 'none'
      };
      
      // Размеры
      const sizeStyles = {
        sm: {
          padding: `${this.spacing.xs} ${this.spacing.md}`,
          fontSize: this.typography.sizes.sm
        },
        md: {
          padding: `${this.spacing.sm} ${this.spacing.lg}`,
          fontSize: this.typography.sizes.md
        },
        lg: {
          padding: `${this.spacing.md} ${this.spacing.xl}`,
          fontSize: this.typography.sizes.lg
        }
      };
      
      // Варианты
      const variantStyles = {
        primary: {
          backgroundColor: this.colors.primary,
          color: this.colors.text.inverse,
          hover: {
            backgroundColor: this.colors.primaryDark
          }
        },
        secondary: {
          backgroundColor: this.colors.secondary,
          color: this.colors.text.inverse,
          hover: {
            backgroundColor: '#008B6B'
          }
        },
        danger: {
          backgroundColor: this.colors.danger,
          color: this.colors.text.inverse,
          hover: {
            backgroundColor: '#B02A37'
          }
        },
        outline: {
          backgroundColor: 'transparent',
          color: this.colors.primary,
          border: `2px solid ${this.colors.primary}`,
          hover: {
            backgroundColor: this.colors.primary,
            color: this.colors.text.inverse
          }
        }
      };
      
      return {
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant]
      };
    }
    
    /**
     * Создаёт CSS-класс для карточки катера (полностью из монолита)
     * @returns {string} CSS-строка
     */
    getBoatCardStyles() {
      return `
        .boat-card {
          background: ${this.colors.background.main};
          border-radius: ${this.borderRadius.lg};
          box-shadow: ${this.shadows.md};
          overflow: hidden;
          transition: transform ${this.animations.duration.fast} ${this.animations.easing.default},
                      box-shadow ${this.animations.duration.fast} ${this.animations.easing.default};
          cursor: pointer;
        }
        
        .boat-card:hover {
          transform: translateY(-4px);
          box-shadow: ${this.shadows.lg};
        }
        
        .boat-card__image {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }
        
        .boat-card__content {
          padding: ${this.spacing.lg};
        }
        
        .boat-card__title {
          font-size: ${this.typography.sizes.xl};
          font-weight: ${this.typography.weights.bold};
          color: ${this.colors.text.primary};
          margin: 0 0 ${this.spacing.xs} 0;
        }
        
        .boat-card__owner {
          font-size: ${this.typography.sizes.sm};
          color: ${this.colors.text.light};
          margin-bottom: ${this.spacing.sm};
        }
        
        .boat-card__description {
          font-size: ${this.typography.sizes.md};
          color: ${this.colors.text.secondary};
          margin-bottom: ${this.spacing.md};
        }
        
        .boat-card__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: ${this.spacing.md};
        }
        
        .boat-card__price {
          font-size: ${this.typography.sizes.lg};
          font-weight: ${this.typography.weights.bold};
          color: ${this.colors.primary};
        }
        
        .boat-card__button {
          background-color: ${this.colors.primary};
          color: ${this.colors.text.inverse};
          border: none;
          border-radius: ${this.borderRadius.md};
          padding: ${this.spacing.sm} ${this.spacing.lg};
          font-size: ${this.typography.sizes.sm};
          font-weight: ${this.typography.weights.medium};
          cursor: pointer;
          transition: background-color ${this.animations.duration.fast} ${this.animations.easing.default};
        }
        
        .boat-card__button:hover {
          background-color: ${this.colors.primaryDark};
        }
        
        .boat-card__button--details {
          background-color: transparent;
          color: ${this.colors.primary};
          border: 2px solid ${this.colors.primary};
        }
        
        .boat-card__button--details:hover {
          background-color: ${this.colors.primary};
          color: ${this.colors.text.inverse};
        }
      `;
    }
    
    /**
     * Стили для навигации (Яндекс.Навигатор кнопка)
     */
    getNavigationStyles() {
      return `
        .nav-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: ${this.spacing.sm};
          background: #1E98FF;
          color: white;
          border: none;
          border-radius: ${this.borderRadius.md};
          padding: ${this.spacing.md} ${this.spacing.xl};
          font-size: ${this.typography.sizes.md};
          font-weight: ${this.typography.weights.medium};
          cursor: pointer;
          transition: all ${this.animations.duration.fast};
          text-decoration: none;
          width: 100%;
        }
        
        .nav-button:hover {
          background: #0077E6;
          transform: scale(1.02);
        }
        
        .nav-button:active {
          transform: scale(0.98);
        }
        
        .nav-button__icon {
          width: 20px;
          height: 20px;
        }
      `;
    }
    
    /**
     * Стили для чата поддержки
     */
    getChatStyles() {
      return `
        .support-chat {
          position: fixed;
          bottom: ${this.spacing.xl};
          right: ${this.spacing.xl};
          z-index: 1000;
        }
        
        .support-chat__button {
          width: 60px;
          height: 60px;
          border-radius: ${this.borderRadius.round};
          background: ${this.colors.primary};
          color: white;
          border: none;
          box-shadow: ${this.shadows.lg};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          transition: transform ${this.animations.duration.fast};
        }
        
        .support-chat__button:hover {
          transform: scale(1.1);
        }
        
        .support-chat__window {
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 300px;
          height: 400px;
          background: white;
          border-radius: ${this.borderRadius.lg};
          box-shadow: ${this.shadows.xl};
          display: none;
          flex-direction: column;
          overflow: hidden;
        }
        
        .support-chat__window.open {
          display: flex;
        }
        
        .support-chat__header {
          background: ${this.colors.primary};
          color: white;
          padding: ${this.spacing.md};
          font-weight: ${this.typography.weights.bold};
        }
        
        .support-chat__messages {
          flex: 1;
          padding: ${this.spacing.md};
          overflow-y: auto;
        }
        
        .support-chat__input {
          padding: ${this.spacing.md};
          border-top: 1px solid ${this.colors.borders};
        }
        
        .support-chat__input input {
          width: 100%;
          padding: ${this.spacing.sm};
          border: 1px solid ${this.colors.borders};
          border-radius: ${this.borderRadius.md};
          font-size: ${this.typography.sizes.sm};
        }
      `;
    }
    
    /**
     * Инъекция всех стилей в DOM
     */
    injectStyles() {
      const styleId = 'aquagid-design-system';
      
      // Удаляем предыдущие стили если есть
      const oldStyle = document.getElementById(styleId);
      if (oldStyle) oldStyle.remove();
      
      // Создаём новый style элемент
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* AquaGid Design System v${VERSION} */
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: ${this.typography.fontFamily};
          color: ${this.colors.text.primary};
          background: ${this.colors.background.light};
          line-height: 1.5;
        }
        
        ${this.getBoatCardStyles()}
        ${this.getNavigationStyles()}
        ${this.getChatStyles()}
        
        /* Утилиты */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 ${this.spacing.md};
        }
        
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        
        .mt-1 { margin-top: ${this.spacing.xs}; }
        .mt-2 { margin-top: ${this.spacing.sm}; }
        .mt-3 { margin-top: ${this.spacing.md}; }
        .mt-4 { margin-top: ${this.spacing.lg}; }
        .mt-5 { margin-top: ${this.spacing.xl}; }
        
        .mb-1 { margin-bottom: ${this.spacing.xs}; }
        .mb-2 { margin-bottom: ${this.spacing.sm}; }
        .mb-3 { margin-bottom: ${this.spacing.md}; }
        .mb-4 { margin-bottom: ${this.spacing.lg}; }
        .mb-5 { margin-bottom: ${this.spacing.xl}; }
        
        .p-1 { padding: ${this.spacing.xs}; }
        .p-2 { padding: ${this.spacing.sm}; }
        .p-3 { padding: ${this.spacing.md}; }
        .p-4 { padding: ${this.spacing.lg}; }
        .p-5 { padding: ${this.spacing.xl}; }
        
        /* Анимации */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .fade-in {
          animation: fadeIn ${this.animations.duration.normal} ${this.animations.easing.default};
        }
        
        /* Адаптивность */
        @media (max-width: 768px) {
          .container {
            padding: 0 ${this.spacing.sm};
          }
          
          .boat-card__image {
            height: 150px;
          }
        }
      `;
      
      document.head.appendChild(style);
      console.log(`🎨 DesignSystem v${VERSION} injected`);
    }
    
    /**
     * UI-хелперы
     */
    ui = {
      /**
       * Показать загрузку (скелетон)
       */
      showSkeleton: (containerId, type = 'card') => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const skeletonHtml = type === 'card' 
          ? `<div class="boat-card skeleton">
               <div class="boat-card__image skeleton-image"></div>
               <div class="boat-card__content">
                 <div class="skeleton-title"></div>
                 <div class="skeleton-text"></div>
                 <div class="skeleton-text"></div>
               </div>
             </div>`
          : `<div class="skeleton-line"></div>`;
        
        container.innerHTML = skeletonHtml.repeat(3);
      },
      
      /**
       * Показать уведомление
       */
      showNotification: (message, type = 'info') => {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} fade-in`;
        notification.textContent = message;
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 24px;
          background: ${type === 'success' ? '#00A884' : type === 'error' ? '#DC3545' : '#0066CC'};
          color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 9999;
          animation: fadeIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.style.opacity = '0';
          setTimeout(() => notification.remove(), 300);
        }, 3000);
      }
    };
  }
  
  // Создаём синглтон
  if (!global.AquaGid) global.AquaGid = {};
  global.AquaGid.DesignSystem = new DesignSystem();
  
})(typeof window !== 'undefined' ? window : global);

// Экспорт для ES6 модулей
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DesignSystem: global.AquaGid.DesignSystem };
}