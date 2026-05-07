// /frontend/manager-panel/js/components/boats/BoatForm.js
// Версия: 2.0.0
// Назначение: Форма добавления/редактирования катера (цены вынесены в отдельный компонент)

(function(global) {
    'use strict';
    
    const VERSION = '20260416_02';
    
    class BoatForm {
        constructor() {
            this.version = VERSION;
            this.boat = null;
            this.lastGeocodedAddress = '';
            this.boatLatitude = null;
            this.boatLongitude = null;
            this.tempLat = null;
            this.tempLon = null;
        }
        
        showAddForm() {
            this.boat = null;
            this.render('boat-form-modal');
        }
        
        async showEditForm(boat) {
            try {
                const response = await fetch(`/api/boats/${boat.id}`);
                if (response.ok) {
                    const fullBoat = await response.json();
                    this.boat = {
                        ...fullBoat,
                        photos: fullBoat.photos ? fullBoat.photos.map(p => p.photo_url) : []
                    };
                } else {
                    this.boat = {
                        ...boat,
                        photos: boat.main_photo_url ? [boat.main_photo_url] : []
                    };
                }
            } catch (error) {
                console.error('Ошибка загрузки катера:', error);
                this.boat = {
                    ...boat,
                    photos: boat.main_photo_url ? [boat.main_photo_url] : []
                };
            }
            this.render('boat-form-modal');
        }
        
        render(containerId) {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.id = containerId;
            
            const isEdit = this.boat !== null;
            
            overlay.innerHTML = `
                <div class="modal-content boat-form">
                    <div class="modal-header">
                        <h2>${isEdit ? '✏️ Редактировать катер' : '➕ Добавить катер'}</h2>
                        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    
                    <form id="boatForm" onsubmit="event.preventDefault(); AquaGid.BoatForm.save()">
                        <div class="form-group">
                            <label>Название катера *</label>
                            <input type="text" id="boatName" class="form-control" value="${isEdit ? this.boat.name : ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Описание (макс 250 символов)</label>
                            <textarea id="boatDescription" class="form-control" rows="3" maxlength="250" oninput="document.getElementById('descCounter').textContent = this.value.length">${isEdit ? this.boat.description_short || '' : ''}</textarea>
                            <div class="counter"><span id="descCounter">0</span>/250</div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group half">
                                <label>Вместимость (чел)</label>
                                <input type="number" id="boatCapacity" class="form-control" value="${isEdit ? this.boat.capacity || 8 : 8}" min="1">
                            </div>
                        </div>

                        <!-- Ценовой блок (компонент) -->
                        ${new global.AquaGid.PricingSimple(this.boat).render()}

                        <div class="form-row">
                            <div class="form-group half">
                                <label>
                                    <input type="checkbox" id="boatHasCanopy" ${isEdit && this.boat.has_canopy ? 'checked' : ''}>
                                    🏖️ Навес
                                </label>
                            </div>
                            <div class="form-group half">
                                <label>
                                    <input type="checkbox" id="boatHasToilet" ${isEdit && this.boat.has_toilet ? 'checked' : ''}>
                                    🚽 Туалет
                                </label>
                            </div>
                        </div>

                                                <div class="form-row">
                            <div class="form-group half">
                                <label>
                                    <input type="checkbox" id="boatHasAudio" ${isEdit && this.boat.has_audio ? 'checked' : ''}>
                                    🎵 Аудиосистема
                                </label>
                            </div>
                            <div class="form-group half">
                                <label>
                                    <input type="checkbox" id="boatHasFridge" ${isEdit && this.boat.has_fridge ? 'checked' : ''}>
                                    🧊 Холодильник
                                </label>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group half">
                                <label>
                                    <input type="checkbox" id="boatHasBlankets" ${isEdit && this.boat.has_blankets ? 'checked' : ''}>
                                    🧺 Пледы
                                </label>
                            </div>
                            <div class="form-group half">
                                <label>
                                    <input type="checkbox" id="boatHasKitchenware" ${isEdit && this.boat.has_kitchenware ? 'checked' : ''}>
                                    🍽️ Посуда/Бокалы
                                </label>
                            </div>
                        </div>

                        <!-- Плановое ТО -->
                        <div class="form-row">
                            <div class="form-group half">
                                <label>
                                    <input type="checkbox" id="boatHasMaintenance" ${isEdit && this.boat.has_maintenance ? 'checked' : ''}>
                                    🔧 Плановое техническое обслуживание
                                </label>
                            </div>
                        </div>
                        <div id="maintenanceFields" style="display: ${isEdit && this.boat.has_maintenance ? 'block' : 'none'}; margin-top: 10px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <div class="form-row">
                                <div class="form-group half">
                                    <label>📅 Дата начала ТО</label>
                                    <input type="date" id="maintenanceStartDate" class="form-control" 
                                        value="${isEdit && this.boat.maintenance_start ? this.boat.maintenance_start.split('T')[0] : ''}">
                                </div>
                                <div class="form-group half">
                                    <label>⏰ Час начала</label>
                                    <select id="maintenanceStartHour" class="form-control">
                                        ${this.renderHourOptions(isEdit && this.boat.maintenance_start ? this.boat.maintenance_start.split('T')[1]?.slice(0,2) : '')}
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group half">
                                    <label>📅 Дата окончания ТО</label>
                                    <input type="date" id="maintenanceEndDate" class="form-control" 
                                        value="${isEdit && this.boat.maintenance_end ? this.boat.maintenance_end.split('T')[0] : ''}">
                                </div>
                                <div class="form-group half">
                                    <label>⏰ Час окончания</label>
                                    <select id="maintenanceEndHour" class="form-control">
                                        ${this.renderHourOptions(isEdit && this.boat.maintenance_end ? this.boat.maintenance_end.split('T')[1]?.slice(0,2) : '')}
                                    </select>
                                </div>
                            </div>
                            <div style="font-size: 12px; color: #666; margin-top: 8px;">
                                ⚠️ В этот период бронирования катера будут недоступны
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Адрес причала</label>
                            <input type="text" id="boatAddress" class="form-control" value="${isEdit ? this.boat.boarding_address || '' : ''}" placeholder="Дворцовая наб., 10">
                            <div style="display: flex; gap: 10px; margin-top: 8px;">
                                <button type="button" class="btn-geocode" onclick="AquaGid.BoatForm.geocodeAddress()" style="flex: 1;">🔍 Определить координаты</button>
                                <button type="button" class="btn-check-map" onclick="AquaGid.BoatForm.showMap()" style="flex: 1;">🗺️ Проверить на карте</button>
                            </div>
                            <div class="address-hint" style="font-size: 12px; color: #666; margin-top: 8px;">
                                📍 Координаты: <span id="addressCoords">${isEdit && this.boat.latitude && this.boat.longitude ? `${this.boat.latitude.toFixed(6)}, ${this.boat.longitude.toFixed(6)}` : 'не определены'}</span>
                            </div>
                        </div>
                        
                        <div id="mapContainer" style="display: none; margin-top: 15px;">
                            <div id="map" style="height: 300px; width: 100%; border-radius: 8px;"></div>
                            <div class="map-hint" style="font-size: 12px; color: #666; margin-top: 8px;">
                                📍 Если метка стоит неверно, перетащите её на нужное место
                            </div>
                            <button type="button" class="btn-save-coords" onclick="AquaGid.BoatForm.saveCoordinates()" style="margin-top: 10px; width: 100%;">💾 Сохранить координаты</button>
                        </div>
                        
                        <div class="form-group">
                            <label>Фотографии (не более 5)</label>
                            <div class="photo-upload">
                                <input type="file" id="boatPhotos" accept="image/*" multiple>
                                <div class="photo-hint">
                                    <span>📸 Формат: JPG, PNG, GIF</span>
                                    <span>⚖️ Макс. размер: 15MB</span>
                                </div>
                                <div class="photo-counter" id="photoCounter">
                                    <span id="currentPhotoCount">0</span>/5 фото
                                </div>
                                <div class="photo-preview" id="photoPreview">
                                    ${this.renderPhotoPreviews()}
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">Отмена</button>
                            <button type="submit" class="btn-save">${isEdit ? 'Сохранить' : 'Добавить'}</button>
                        </div>
                    </form>
                </div>
            `;
            
            document.body.appendChild(overlay);

            const addressInput = document.getElementById('boatAddress');
            if (addressInput) {
                addressInput.addEventListener('blur', async () => {
                    const address = addressInput.value.trim();
                    if (address && address !== this.lastGeocodedAddress) {
                        this.lastGeocodedAddress = address;
                        await this.geocodeAddress(true);
                    }
                });
            }

            // Обработчик для показа/скрытия полей ТО
            const maintenanceCheckbox = document.getElementById('boatHasMaintenance');
            const maintenanceFields = document.getElementById('maintenanceFields');
            if (maintenanceCheckbox && maintenanceFields) {
                maintenanceCheckbox.addEventListener('change', (e) => {
                    maintenanceFields.style.display = e.target.checked ? 'block' : 'none';

                    // Если снимаем галочку — очищаем поля
                    if (!e.target.checked) {
                        document.getElementById('maintenanceStartDate').value = '';
                        document.getElementById('maintenanceStartHour').value = '00';
                        document.getElementById('maintenanceEndDate').value = '';
                        document.getElementById('maintenanceEndHour').value = '00';
                    }
                });
            }
            
            document.getElementById('boatPhotos')?.addEventListener('change', (e) => this.handlePhotoUpload(e));
            this.updatePhotoCounter();
        }

        renderHourOptions(selectedHour) {
            let options = '';
            for (let h = 0; h < 24; h++) {
                const hour = h.toString().padStart(2, '0');
                const selected = (selectedHour === hour) ? 'selected' : '';
                options += `<option value="${hour}" ${selected}>${hour}:00</option>`;
            }
            return options;
        }
        
        renderPhotoPreviews() {
            if (!this.boat || !this.boat.photos || this.boat.photos.length === 0) return '';
            return this.boat.photos.map(photo => `
                <div class="photo-thumb">
                    <img src="${photo}" alt="preview">
                    <button class="remove-photo" onclick="this.parentElement.remove(); AquaGid.BoatForm.updatePhotoCounter()">✕</button>
                </div>
            `).join('');
        }
        
        async handlePhotoUpload(event) {
            const files = event.target.files;
            const preview = document.getElementById('photoPreview');
            const currentPhotos = preview.children.length;
            const maxPhotos = 5;
            
            if (currentPhotos + files.length > maxPhotos) {
                alert(`Можно загрузить не более ${maxPhotos} фото.`);
                return;
            }
            
            for (let file of files) {
                if (file.size > 15 * 1024 * 1024) {
                    alert(`Файл ${file.name} слишком большой.`);
                    continue;
                }
                if (!file.type.startsWith('image/')) {
                    alert(`Файл ${file.name} не является изображением`);
                    continue;
                }
                
                try {
                    const compressedImage = await this.compressImage(file);
                    const thumb = document.createElement('div');
                    thumb.className = 'photo-thumb';
                    thumb.innerHTML = `
                        <img src="${compressedImage}" alt="preview">
                        <button class="remove-photo" onclick="this.parentElement.remove(); AquaGid.BoatForm.updatePhotoCounter()">✕</button>
                    `;
                    preview.appendChild(thumb);
                    this.updatePhotoCounter();
                } catch (error) {
                    console.error('Ошибка сжатия:', error);
                    alert(`Не удалось обработать ${file.name}`);
                }
            }
            event.target.value = '';
        }

        updatePhotoCounter() {
            const preview = document.getElementById('photoPreview');
            if (!preview) return;
            const count = preview.children.length;
            const counterSpan = document.getElementById('currentPhotoCount');
            if (counterSpan) counterSpan.textContent = count;
            
            const fileInput = document.getElementById('boatPhotos');
            const photoUploadDiv = document.querySelector('.photo-upload');
            
            if (count >= 5) {
                if (fileInput) fileInput.style.display = 'none';
                if (photoUploadDiv && !document.getElementById('maxPhotosMessage')) {
                    const message = document.createElement('div');
                    message.id = 'maxPhotosMessage';
                    message.style.cssText = 'background: #fff3cd; color: #856404; padding: 10px; border-radius: 6px; margin-top: 10px; text-align: center;';
                    message.innerHTML = '📸 Максимум 5 фотографий загружено.';
                    photoUploadDiv.appendChild(message);
                }
            } else {
                if (fileInput) fileInput.style.display = 'block';
                document.getElementById('maxPhotosMessage')?.remove();
            }
        }
        
        async save() {
            const token = localStorage.getItem('managerToken') || localStorage.getItem('access_token') || localStorage.getItem('token');

            // Валидация ТО: либо нет, либо заполнены обе даты
            const hasMaintenance = document.getElementById('boatHasMaintenance')?.checked || false;
            const startDate = document.getElementById('maintenanceStartDate')?.value;
            const startHour = document.getElementById('maintenanceStartHour')?.value;
            const endDate = document.getElementById('maintenanceEndDate')?.value;
            const endHour = document.getElementById('maintenanceEndHour')?.value;
            
            const maintenanceStart = startDate && startHour ? `${startDate}T${startHour}:00` : null;
            const maintenanceEnd = endDate && endHour ? `${endDate}T${endHour}:00` : null;
            
            if (hasMaintenance && (!maintenanceStart || !maintenanceEnd)) {
                alert('❌ Укажите даты начала и окончания ТО, либо снимите галочку "Плановое ТО"');
                return;
            }
            
            if (hasMaintenance && maintenanceStart >= maintenanceEnd) {
                alert('❌ Дата окончания ТО должна быть позже даты начала');
                return;
            }
            
            const boatData = {
                id: this.boat?.id,
                name: document.getElementById('boatName')?.value,
                description_short: document.getElementById('boatDescription')?.value,
                capacity: parseInt(document.getElementById('boatCapacity')?.value) || 8,
                boarding_address: document.getElementById('boatAddress')?.value,
                latitude: this.boatLatitude || this.boat?.latitude || null,
                longitude: this.boatLongitude || this.boat?.longitude || null,
                has_canopy: document.getElementById('boatHasCanopy')?.checked || false,
                has_toilet: document.getElementById('boatHasToilet')?.checked || false,
                has_audio: document.getElementById('boatHasAudio')?.checked || false,
                has_fridge: document.getElementById('boatHasFridge')?.checked || false,
                has_blankets: document.getElementById('boatHasBlankets')?.checked || false,
                has_kitchenware: document.getElementById('boatHasKitchenware')?.checked || false,
                has_maintenance: hasMaintenance,
                maintenance_start: maintenanceStart || null,
                maintenance_end: maintenanceEnd || null,
                // Цены не отправляем — их устанавливает админ
            };
            
            if (!boatData.name) {
                alert('Заполните название катера');
                return;
            }
            
            const photos = this.collectPhotos();
            
            try {
                let boatId = boatData.id;

            // Проверка пересечения ТО с активными бронями
            if (hasMaintenance && maintenanceStart && maintenanceEnd && boatData.id) {
                const token = localStorage.getItem('managerToken') || localStorage.getItem('access_token') || localStorage.getItem('token');
                try {
                    const checkRes = await fetch(`/api/boats/${boatData.id}/check-maintenance`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ 
                            start: maintenanceStart, 
                            end: maintenanceEnd 
                        })
                    });
                    
                    if (checkRes.ok) {
                        const checkData = await checkRes.json();
                        if (checkData.has_bookings) {
                            alert(`❌ В выбранный период есть ${checkData.count} активных бронирований. Выберите другое время.`);
                            return;
                        }
                    }
                } catch (e) {
                    console.error('Ошибка проверки ТО:', e);
                    // Продолжаем, бэкенд всё равно проверит
                }
            }
                
                if (boatData.id) {
                    const response = await fetch(`/api/boats/${boatData.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(boatData)
                    });
                    if (!response.ok) throw new Error('Ошибка обновления');
                    
                    await fetch(`/api/boats/${boatData.id}/photos`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                } else {
                    const response = await fetch('/api/boats', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(boatData)
                    });
                    if (!response.ok) throw new Error('Ошибка добавления');
                    const newBoat = await response.json();
                    boatId = newBoat.id;
                }

                let firstPhotoUrl = null;
                if (photos.length > 0 && boatId) {
                    for (let i = 0; i < photos.length; i++) {
                        const response = await fetch(`/api/boats/${boatId}/photos`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ photo_url: photos[i], display_order: i })
                        });
                        if (response.ok && i === 0) {
                            const result = await response.json();
                            firstPhotoUrl = result.photo_url;
                        }
                    }
                }
                
                if (firstPhotoUrl) {
                    await fetch(`/api/boats/${boatId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ ...boatData, main_photo_url: firstPhotoUrl })
                    });
                }
                
                await global.AquaGid.ManagerBoats.loadBoatsFromAPI();
                alert('✅ Катер успешно сохранен');
                document.querySelector('.modal-overlay')?.remove();
                
            } catch (error) {
                console.error('Ошибка:', error);
                alert('❌ Ошибка сохранения катера');
            }
        }

        async geocodeAddress(autoSave = false) {
            const address = document.getElementById('boatAddress')?.value;
            if (!address) return;
            
            const coordsSpan = document.getElementById('addressCoords');
            coordsSpan.textContent = '⏳ Определяем...';
            
            try {
                const apiKey = window.YANDEX_CONFIG?.GEOCODER_API_KEY;
                if (!apiKey) {
                    coordsSpan.textContent = '❌ Нет ключа';
                    return;
                }
                
                const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(address)}&format=json&results=1`);
                const data = await response.json();
                
                const pos = data.response?.GeoObjectCollection?.featureMember[0]?.GeoObject?.Point?.pos;
                if (pos) {
                    const [lon, lat] = pos.split(' ');
                    const latNum = parseFloat(lat);
                    const lonNum = parseFloat(lon);
                    
                    this.tempLat = latNum;
                    this.tempLon = lonNum;
                    
                    coordsSpan.textContent = `${latNum.toFixed(6)}, ${lonNum.toFixed(6)}`;
                    
                    if (autoSave) {
                        this.boatLatitude = latNum;
                        this.boatLongitude = lonNum;
                    }
                } else {
                    coordsSpan.textContent = '❌ Адрес не найден';
                }
            } catch (error) {
                console.error('Ошибка геокодирования:', error);
                coordsSpan.textContent = '❌ Ошибка';
            }
        }

        async showMap() {
            const address = document.getElementById('boatAddress')?.value;
            if (!address) {
                alert('Введите адрес');
                return;
            }
            
            const container = document.getElementById('mapContainer');
            container.style.display = 'block';
            
            try {
                const apiKey = window.YANDEX_CONFIG?.GEOCODER_API_KEY;
                const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(address)}&format=json&results=1`);
                const data = await response.json();
                
                const pos = data.response?.GeoObjectCollection?.featureMember[0]?.GeoObject?.Point?.pos;
                if (!pos) {
                    alert('Адрес не найден');
                    container.style.display = 'none';
                    return;
                }
                
                const [lon, lat] = pos.split(' ');
                const latNum = parseFloat(lat);
                const lonNum = parseFloat(lon);
                
                this.tempLat = latNum;
                this.tempLon = lonNum;
                
                if (!window.ymaps) {
                    const script = document.createElement('script');
                    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
                    script.onload = () => this.initMap(latNum, lonNum);
                    document.head.appendChild(script);
                } else {
                    this.initMap(latNum, lonNum);
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Ошибка загрузки карты');
                container.style.display = 'none';
            }
        }

        initMap(lat, lon) {
            ymaps.ready(() => {
                const map = new ymaps.Map('map', {
                    center: [lat, lon],
                    zoom: 15,
                    controls: ['zoomControl', 'fullscreenControl']
                });
                
                const placemark = new ymaps.Placemark([lat, lon], {}, {
                    draggable: true,
                    preset: 'islands#redCircleIcon'
                });
                
                map.geoObjects.add(placemark);
                
                placemark.events.add('dragend', () => {
                    const coords = placemark.geometry.getCoordinates();
                    this.tempLat = coords[0];
                    this.tempLon = coords[1];
                });
                
                this.currentMap = map;
                this.currentPlacemark = placemark;
            });
        }

        saveCoordinates() {
            if (this.tempLat && this.tempLon) {
                this.boatLatitude = this.tempLat;
                this.boatLongitude = this.tempLon;
                
                const coordsSpan = document.getElementById('addressCoords');
                if (coordsSpan) {
                    coordsSpan.textContent = `${this.tempLat.toFixed(6)}, ${this.tempLon.toFixed(6)}`;
                }
                
                document.getElementById('mapContainer').style.display = 'none';
                alert('✅ Координаты обновлены с карты');
            } else {
                alert('Сначала определите адрес с помощью кнопки "Определить координаты"');
            }
        }

        compressImage(file, maxSizeMB = 0.5) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                
                reader.onload = (e) => {
                    const img = new Image();
                    img.src = e.target.result;
                    
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        let width = img.width;
                        let height = img.height;
                        const maxSize = 1200;
                        
                        if (width > height && width > maxSize) {
                            height = Math.round((height * maxSize) / width);
                            width = maxSize;
                        } else if (height > maxSize) {
                            width = Math.round((width * maxSize) / height);
                            height = maxSize;
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        resolve(compressedDataUrl);
                    };
                    
                    img.onerror = reject;
                };
                
                reader.onerror = reject;
            });
        }

        collectPhotos() {
            const preview = document.getElementById('photoPreview');
            if (!preview) return [];
            
            const photos = [];
            preview.querySelectorAll('img').forEach(img => {
                photos.push(img.src);
            });
            return photos;
        }
    }
    
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.BoatForm = new BoatForm();
    
})(typeof window !== 'undefined' ? window : global);