// PricingSimple.js — компонент цены (менеджер вводит цену, процент — из глобальных настроек)
(function(global) {
    'use strict';
    
    class PricingSimple {
        constructor(boat) {
            this.boat = boat;
            this.globalPercent = null;
        }
        
        async loadGlobalPercent() {
            if (this.globalPercent !== null) return this.globalPercent;
            try {
                const token = localStorage.getItem('managerToken') || localStorage.getItem('access_token') || localStorage.getItem('token');
                const resp = await fetch('/api/admin/global-settings/public', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resp.ok) {
                    const settings = await resp.json();
                    this.globalPercent = settings.default_prepayment_percent || 15;
                } else {
                    this.globalPercent = 15;
                }
            } catch (e) {
                this.globalPercent = 15;
            }
            return this.globalPercent;
        }
        
        render() {
            const pricePerHour = this.boat?.price_per_hour || '';
            
            // Запускаем загрузку процента
            this.loadGlobalPercent().then(pct => {
                const percentEl = document.getElementById('globalPrepaymentPercent');
                if (percentEl) percentEl.textContent = `${pct}% (глобальная настройка)`;
            });
            
            return `
                <div class="pricing-section">
                    <div class="form-row">
                        <div class="form-group half">
                            <label>💰 Цена за час (₽) *</label>
                            <input type="number" id="boatPricePerHour" class="form-control" 
                                value="${pricePerHour}" min="0" step="100" placeholder="Например: 12000" required>
                        </div>
                        <div class="form-group half">
                            <label>📊 Предоплата</label>
                            <div class="form-control" style="background: #f3f4f6; color: #1f2937;">
                                <span id="globalPrepaymentPercent">⏳ Загрузка...</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        getSaveData() {
            return {
                price_per_hour: parseFloat(document.getElementById('boatPricePerHour')?.value) || 0
            };
        }
    }
    
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.PricingSimple = PricingSimple;
    
})(typeof window !== 'undefined' ? window : global);