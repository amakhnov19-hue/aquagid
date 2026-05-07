// /frontend/manager-panel/js/components/boats/Boats.js
// Версия: 1.1.0
// Назначение: Управление катерами (CRUD) с отображением статуса модерации

(function(global) {
    'use strict';
    
    const VERSION = '20260416_01';
    
    class ManagerBoats {
        constructor() {
            this.version = VERSION;
            this.boats = [];
            this.loadBoatsFromAPI();
        }

        async loadBoatsFromAPI() {
            const managerId = window.managerId;
            if (!managerId) {
                console.log('Нет авторизации');
                return;
            }
            
            try {
                const response = await fetch(`/api/boats?manager_id=${managerId}`);
                if (!response.ok) throw new Error('Ошибка загрузки');
                const data = await response.json();
                const boats = data.boats || data;
                
                const bookingsData = {};
                boats.forEach(boat => {
                    bookingsData[boat.id] = {
                        bookings_today: boat.bookings_today || 0,
                        bookings_total: boat.bookings_total || 0
                    };
                });
                
                const boatsWithPhotos = [];
                for (const boat of boats) {
                    const detailResponse = await fetch(`/api/boats/${boat.id}`);
                    if (detailResponse.ok) {
                        const detail = await detailResponse.json();
                        detail.bookings_today = bookingsData[boat.id]?.bookings_today || 0;
                        detail.bookings_total = bookingsData[boat.id]?.bookings_total || 0;
                        boatsWithPhotos.push(detail);
                    } else {
                        boat.bookings_today = bookingsData[boat.id]?.bookings_today || 0;
                        boat.bookings_total = bookingsData[boat.id]?.bookings_total || 0;
                        boatsWithPhotos.push(boat);
                    }
                }
                
                this.boats = boatsWithPhotos.map(boat => {
                    if (boat.photos && boat.photos.length > 0) {
                        boat.main_photo_url = boat.photos[0].photo_url;
                    }
                    return boat;
                });
                
                console.log('Загружено катеров с фото:', this.boats.length);
                this.render('boats-container');
            } catch (error) {
                console.error('Ошибка загрузки катеров:', error);
                this.boats = [];
                this.render('boats-container');
            }
            console.log('this.boats после загрузки:', this.boats);
        }
        
        /**
         * Рендер списка катеров (основной метод)
         */
        render(containerId = 'boats-container') {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            container.innerHTML = `
                <div style="margin-top: 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; padding-bottom: 0px; border-bottom: 1px solid #eef2ff;">
                    <button onclick="AquaGid.ManagerBoats.showAddForm()" style="background: none; border: none; font-size: 24px; font-weight: bold; cursor: pointer; color: #0066CC; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">+</button>
                    <h2 style="margin: 0; font-size: 20px;">🚤 Мои катера</h2>
                    <button onclick="AquaGid.ManagerApp.switchSection('dashboard')" style="background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 8px; font-size: 18px; cursor: pointer;">✕</button>
                </div>
                
                <div class="boats-grid">
                    ${this.renderBoatsList()}
                </div>
            `;
        }

        /**
         * Рендер списка катеров (внутренний метод)
         */
        renderBoatsList() {
            return this.boats.map(boat => {
                // Активность катера
                const isActive = boat.is_active !== false && !boat.is_refueling && !boat.is_breakdown;
                const activeBadge = isActive ? '🟢 Активен' : '🔴 Неактивен';
                const activeClass = isActive ? 'status-active' : 'status-blocked';
                
                return `
                    <div class="boat-card">
                        <img src="${boat.main_photo_url || '/images/placeholder.jpg'}" alt="${boat.name}" class="boat-image">
                        <div class="boat-content">
                            <div class="boat-header">
                                <h3>${boat.name}</h3>
                                <div class="boat-status">
                                    <span class="status-badge ${activeClass}">${activeBadge}</span>
                                </div>
                            </div>
                            
                            <div class="boat-stats">
                                <span>📅 Сегодня: ${boat.bookings_today || 0} броней</span>
                                <span>📊 Всего: ${boat.bookings_total || 0} броней</span>
                            </div>
                            <div class="boat-actions" style="display: flex; gap: 6px; margin-top: 10px;">
                                <button class="btn-icon" onclick="AquaGid.ManagerBoats.editBoat(${boat.id})" 
                                        title="Редактировать" style="flex: 1; background: #0066CC; color: white; border: none; padding: 8px 0; border-radius: 6px; cursor: pointer;">
                                    ✏️
                                </button>
                                <button class="btn-icon refuel-btn" onclick="AquaGid.ManagerBoats.toggleRefuel(${boat.id})" 
                                        title="Заправка (2 часа)" style="flex: 1; background: ${boat.is_refueling ? '#f5a623' : '#d4a373'}; color: white; border: none; padding: 8px 0; border-radius: 6px; cursor: pointer;">
                                    ⛽
                                </button>
                                <button class="btn-icon breakdown-btn" onclick="AquaGid.ManagerBoats.toggleBreakdown(${boat.id})" 
                                        title="Поломка" style="flex: 1; background: ${boat.is_breakdown ? '#9c27b0' : '#9e9e9e'}; color: white; border: none; padding: 8px 0; border-radius: 6px; cursor: pointer;">
                                    🔧
                                </button>
                                <button class="btn-icon delete" onclick="AquaGid.ManagerBoats.deleteBoat(${boat.id})" 
                                        title="Удалить" style="flex: 1; background: #dc3545; color: white; border: none; padding: 8px 0; border-radius: 6px; cursor: pointer;">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        /**
         * Показать форму добавления
         */
        showAddForm() {
            if (global.AquaGid?.BoatForm) {
                global.AquaGid.BoatForm.showAddForm();
            }
        }
                
        /**
         * Редактировать катер
         */
        editBoat(id) {
            const boat = this.boats.find(b => b.id === id);
            if (boat && global.AquaGid?.BoatForm) {
                global.AquaGid.BoatForm.showEditForm(boat);
            }
        }

        /**
         * Добавить новый катер
         */
        async addBoat(boatData) {
            try {
                const token = localStorage.getItem('managerToken') || localStorage.getItem('access_token') || localStorage.getItem('token');
                const response = await fetch('/api/boats', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: boatData.name,
                        description_short: boatData.description_short || '',
                        price_per_hour: boatData.price_per_hour,
                        capacity: boatData.capacity,
                        boarding_address: boatData.boarding_address,
                        latitude: boatData.latitude,
                        longitude: boatData.longitude
                    })
                });
                
                if (!response.ok) throw new Error('Ошибка добавления');
                
                await this.loadBoatsFromAPI();
                alert('✅ Катер успешно добавлен и отправлен на модерацию');
            } catch (error) {
                console.error('Ошибка:', error);
                alert('❌ Ошибка добавления катера');
            }
        }

        /**
         * Обновить существующий катер
         */
        async updateBoat(boatData) {
            try {
                const token = localStorage.getItem('managerToken') || localStorage.getItem('access_token') || localStorage.getItem('token');
                const response = await fetch(`/api/boats/${boatData.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: boatData.name,
                        description_short: boatData.description_short || '',
                        price_per_hour: boatData.price_per_hour,
                        capacity: boatData.capacity,
                        boarding_address: boatData.boarding_address,
                        latitude: boatData.latitude,
                        longitude: boatData.longitude
                    })
                });
                
                if (!response.ok) throw new Error('Ошибка обновления');
                
                await this.loadBoatsFromAPI();
                alert('✅ Катер успешно обновлен');
            } catch (error) {
                console.error('Ошибка:', error);
                alert('❌ Ошибка обновления катера');
            }
        }
        
        /**
         * Открыть форму обслуживания
         */
        toggleMaintenance(id) {
            const boat = this.boats.find(b => b.id === id);
            if (!boat) return;
            this.showMaintenanceModal(boat);
        }

        /**
         * Показать модальное окно выбора периода обслуживания
         */
        async showMaintenanceModal(boat) {
            let currentMaintenance = null;
            try {
                const response = await fetch(`${window.API_CONFIG.baseURL}/maintenance/boat/${boat.id}?active_only=true`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        currentMaintenance = data[0];
                    }
                }
            } catch (error) {
                console.error('Ошибка загрузки периода:', error);
            }
            
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
            `;
            
            const today = new Date().toISOString().split('T')[0];
            const timeOptions = this.generateTimeOptions();
            
            const formatDateTimeForInput = (dateStr) => {
                if (!dateStr) return '';
                const d = new Date(dateStr);
                return {
                    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
                    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                };
            };
            
            const startFormatted = currentMaintenance ? formatDateTimeForInput(currentMaintenance.start_time) : null;
            const endFormatted = currentMaintenance ? formatDateTimeForInput(currentMaintenance.end_time) : null;
            
            overlay.innerHTML = `
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h3>🔧 Управление обслуживанием катера</h3>
                        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    <div style="padding: 20px;">
                        <p style="margin-bottom: 16px;">Катер: <strong>${boat.name}</strong></p>
                        
                        ${currentMaintenance ? `
                        <div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                            ⚠️ Катер на обслуживании до:<br>
                            <strong>${new Date(currentMaintenance.end_time).toLocaleString('ru-RU')}</strong>
                            ${currentMaintenance.reason ? `<br>📝 Причина: ${currentMaintenance.reason}` : ''}
                        </div>
                        ` : ''}
                        
                        <div class="form-group">
                            <label>📅 Дата начала</label>
                            <input type="date" id="maintenanceStartDate" class="form-control" min="${today}" value="${startFormatted ? startFormatted.date : today}">
                        </div>
                        
                        <div class="form-group">
                            <label>⏰ Время начала</label>
                            <select id="maintenanceStartTime" class="form-control">
                                ${timeOptions.map(t => `<option value="${t}" ${startFormatted && startFormatted.time === t ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div style="border-top: 1px solid #e2e8f0; margin: 16px 0;"></div>
                        
                        <div class="form-group">
                            <label>📅 Дата окончания</label>
                            <input type="date" id="maintenanceEndDate" class="form-control" min="${today}" value="${endFormatted ? endFormatted.date : ''}">
                        </div>
                        
                        <div class="form-group">
                            <label>⏰ Время окончания</label>
                            <select id="maintenanceEndTime" class="form-control">
                                ${timeOptions.map(t => `<option value="${t}" ${endFormatted && endFormatted.time === t ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>📝 Причина</label>
                            <input type="text" id="maintenanceReason" class="form-control" placeholder="Например: Техническое обслуживание" value="${currentMaintenance ? currentMaintenance.reason || '' : ''}">
                        </div>
                        
                        <div style="display: flex; gap: 12px; margin-top: 20px;">
                            ${currentMaintenance ? `
                            <button class="btn-danger" onclick="AquaGid.ManagerBoats.endMaintenance(${boat.id})" style="flex: 1; background: #dc2626; color: white; padding: 12px; border: none; border-radius: 12px; cursor: pointer;">
                                🔄 Вернуть в работу
                            </button>
                            ` : ''}
                            <button class="btn-save" onclick="AquaGid.ManagerBoats.confirmMaintenance(${boat.id})" style="flex: 1; background: linear-gradient(135deg, #0066CC, #0099FF); color: white; padding: 12px; border: none; border-radius: 12px; cursor: pointer;">
                                ${currentMaintenance ? '📅 Обновить период' : '🔧 Вывести на обслуживание'}
                            </button>
                        </div>
                        <button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()" style="width: 100%; margin-top: 12px; padding: 12px; background: #f1f5f9; border: none; border-radius: 12px; cursor: pointer;">
                            Отмена
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
        }

        generateTimeOptions() {
            const times = [];
            for (let hour = 11; hour <= 23; hour++) {
                for (let minute = 0; minute < 60; minute += 30) {
                    if (hour === 23 && minute > 30) break;
                    times.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
                }
            }
            return times;
        }

        async confirmMaintenance(boatId) {
            const boat = this.boats.find(b => b.id === boatId);
            if (!boat) return;
            
            const startDate = document.getElementById('maintenanceStartDate')?.value;
            const startTime = document.getElementById('maintenanceStartTime')?.value;
            const endDate = document.getElementById('maintenanceEndDate')?.value;
            const endTime = document.getElementById('maintenanceEndTime')?.value;
            const reason = document.getElementById('maintenanceReason')?.value;
            
            if (!startDate || !startTime || !endDate || !endTime) {
                alert('Заполните все поля');
                return;
            }
            
            const startDateTime = `${startDate}T${startTime}:00`;
            const endDateTime = `${endDate}T${endTime}:00`;
            
            if (startDateTime >= endDateTime) {
                alert('Время начала должно быть раньше времени окончания');
                return;
            }
            
            try {
                const response = await fetch(`${window.API_CONFIG.baseURL}/maintenance/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        boat_id: boatId,
                        start_time: startDateTime,
                        end_time: endDateTime,
                        reason: reason || ""
                    })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Ошибка сохранения');
                }
                
                await this.loadBoatsFromAPI();
                document.querySelector('.modal-overlay')?.remove();
                alert(`✅ Катер "${boat.name}" выведен на обслуживание`);
                
            } catch (error) {
                console.error('Ошибка:', error);
                alert(`❌ Ошибка: ${error.message}`);
            }
        }

        async endMaintenance(boatId) {
            const boat = this.boats.find(b => b.id === boatId);
            if (!boat) return;
            
            if (!confirm(`Вернуть катер "${boat.name}" в работу?`)) return;
            
            try {
                const response = await fetch(`${window.API_CONFIG.baseURL}/maintenance/boat/${boat.id}?active_only=true`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        await fetch(`${window.API_CONFIG.baseURL}/maintenance/${data[0].id}`, { method: 'DELETE' });
                        await this.loadBoatsFromAPI();
                        document.querySelector('.modal-overlay')?.remove();
                        alert(`✅ Катер "${boat.name}" возвращен в работу`);
                    }
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert(`❌ Ошибка: ${error.message}`);
            }
        }
        
        /**
         * Удалить катер
         */
        async deleteBoat(id) {
            const boat = this.boats.find(b => b.id === id);
            if (!boat) return;
            
            // Первое подтверждение
            if (!confirm(`Удалить катер "${boat.name}"?`)) return;
            
            // Второе, КРАСНОЕ подтверждение
            if (!confirm(`⚠️ ВНИМАНИЕ! ⚠️\n\nКатер "${boat.name}" будет удалён НАВСЕГДА.\nЕсли он понадобится снова, его нужно будет создать заново.\n\nНажмите "ОК" для окончательного удаления.`)) return;
            
            const token = localStorage.getItem('managerToken') || localStorage.getItem('access_token') || localStorage.getItem('token');
            
            try {
                const response = await fetch(`/api/boats/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Ошибка удаления');
                }
                
                await this.loadBoatsFromAPI();
                alert('✅ Катер полностью удалён');
                
            } catch (error) {
                console.error('Ошибка удаления:', error);
                alert(`❌ ${error.message}`);
            }
        }

        async toggleRefuel(boatId) {
            const boat = this.boats.find(b => b.id === boatId);
            if (!boat) return;
            
            const token = localStorage.getItem('managerToken') || localStorage.getItem('access_token') || localStorage.getItem('token');
            const action = boat.is_refueling ? 'end' : 'start';
            
            try {
                const response = await fetch(`/api/boats/${boatId}/refuel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ action })
                });
                
                if (!response.ok) throw new Error('Ошибка');
                
                await this.loadBoatsFromAPI();
                this.render('boats-container');
                
                if (action === 'start') {
                    alert('⛽ Заправка начата. Катер недоступен на 2 часа.');
                } else {
                    alert('✅ Заправка завершена. Катер снова доступен.');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('❌ Ошибка');
            }
        }
        
        async toggleBreakdown(boatId) {
            const boat = this.boats.find(b => b.id === boatId);
            if (!boat) return;
            
            const token = localStorage.getItem('managerToken') || localStorage.getItem('access_token') || localStorage.getItem('token');
            const action = boat.is_breakdown ? 'end' : 'start';
            
            if (action === 'start' && !confirm('🔧 Пометить катер как сломанный? Все будущие брони будут помечены как "требуют внимания".')) return;
            
            try {
                const response = await fetch(`/api/boats/${boatId}/breakdown`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ action })
                });
                
                if (!response.ok) throw new Error('Ошибка');
                
                await this.loadBoatsFromAPI();
                this.render('boats-container');
                
                if (action === 'start') {
                    alert('🔧 Поломка зафиксирована. Будущие брони помечены как "требуют внимания".');
                } else {
                    alert('✅ Поломка устранена. Катер снова доступен.');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('❌ Ошибка');
            }
        }
    }
    
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.ManagerBoats = new ManagerBoats();
    
})(typeof window !== 'undefined' ? window : global);