// /frontend/manager-panel/js/components/boats/PricingSimple.js
// Версия: 1.0.0
// Назначение: Простой компонент ценообразования (только чтение, управление из админки)

(function(global) {
    'use strict';
    
    class PricingSimple {
        constructor(boat) {
            this.boat = boat;
        }
        
        /**
         * Рендер ценового блока
         */
        render() {
            const isEdit = this.boat !== null;
            const pricingMethod = this.boat?.pricing_method || 'percent';
            const isMargin = pricingMethod === 'margin' || pricingMethod === 'fixed';
            
            return `
                <div class="pricing-section">
                    <!-- Метод расчёта (только для чтения) -->
                    <div class="form-group">
                        <label>Метод расчёта предоплаты</label>
                        <div class="form-control" style="background: #f3f4f6; color: #1f2937; cursor: not-allowed;">
                            ${isMargin ? '💰 Разница цен (открытая / агентская)' : '📈 Процент от цены за час'}
                            ${isEdit ? ' 🔒 (устанавливается администратором)' : ''}
                        </div>
                    </div>

                    ${isMargin ? this.renderMarginFields() : this.renderPercentFields()}
                </div>
            `;
        }
        
        renderMarginFields() {
            return `
                <div class="form-row">
                    <div class="form-group half">
                        <label>💰 Открытая цена (для клиента) ₽/час</label>
                        <div class="form-control" style="background: #f3f4f6; color: #1f2937; cursor: not-allowed;">
                            ${this.boat?.open_price?.toLocaleString() || '—'} ₽/час
                        </div>
                    </div>
                    <div class="form-group half">
                        <label>🔒 Агентская цена (для нас) ₽/час</label>
                        <div class="form-control" style="background: #f3f4f6; color: #1f2937; cursor: not-allowed;">
                            ${this.boat?.agent_price?.toLocaleString() || '—'} ₽/час
                        </div>
                    </div>
                </div>
            `;
        }
        
        renderPercentFields() {
            return `
                <div class="form-row">
                    <div class="form-group half">
                        <label>💰 Цена за час (₽)</label>
                        <div class="form-control" style="background: #f3f4f6; color: #1f2937; cursor: not-allowed;">
                            ${this.boat?.price_per_hour?.toLocaleString() || '—'} ₽/час
                        </div>
                    </div>
                    <div class="form-group half">
                        <label>📊 Процент предоплаты (%)</label>
                        <div class="form-control" style="background: #f3f4f6; color: #1f2937; cursor: not-allowed;">
                            ${this.boat?.prepayment_percent || 20}%
                        </div>
                    </div>
                </div>
            `;
        }
        
        /**
         * Получить данные для сохранения (пусто, т.к. менеджер не может менять)
         */
        getSaveData() {
            return {};
        }
    }
    
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.PricingSimple = PricingSimple;
    
})(typeof window !== 'undefined' ? window : global);
