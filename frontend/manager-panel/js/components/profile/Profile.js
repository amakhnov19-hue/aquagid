// manager-panel/js/components/profile/Profile.js
if (!window.AquaGid) window.AquaGid = {};

AquaGid.Profile = class {
    constructor(containerId, options = {}) {
        this.container = typeof containerId === 'string' 
            ? document.getElementById(containerId) 
            : containerId;
        this.isModal = options.isModal || false;
        this.onClose = options.onClose || null;
        
        this.profile = {
            companyName: '',
            contactName: '',
            phone: '',
            email: '',
            inn: '',
            telegram: '',
            vk: '',
        };
        
        this.render();
        this.attachEvents();
        this.loadManagerData();
    }

    async loadManagerData() {
        const managerId = window.managerId;
        if (!managerId) {
            console.log('Нет авторизации');
            return;
        }
        
        try {
            const response = await fetch(`/api/managers/${managerId}`);
            if (!response.ok) throw new Error('Ошибка загрузки');
            const data = await response.json();
            
            this.profile = {
                companyName: data.company_name || '',
                contactName: data.full_name || '',
                phone: data.phone || '',
                email: data.email || '',
                inn: data.inn || '',
                messengers: (data.messengers && typeof data.messengers === 'object') ? data.messengers : {},
            };
            
            this.render();
            this.attachEvents();
            
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
        }
    }

    render() {
        const html = `
            <div class="profile-container" style="width: 100%; max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
                <div class="profile-header" style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e5e7eb;">
                    <div>
                        <h2 style="margin: 0; font-size: 20px;">Профиль</h2>
                        <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">Судовладельца</p>
                    </div>
                    <button class="profile-close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #333;">✕</button>
                </div>

                <div class="profile-content" style="padding: 24px;">
                    <form id="profile-form">
                        <div class="form-section" style="margin-bottom: 24px;">
                            <h3 style="margin: 0 0 16px; font-size: 16px;">Основные данные</h3>
                            <div class="form-group" style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 6px; font-weight: 500;">Компания</label>
                                <input type="text" id="profileCompany" value="${this.profile.companyName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box;">
                            </div>
                            <div class="form-group" style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 6px; font-weight: 500;">ФИО контактного лица</label>
                                <input type="text" id="profileName" value="${this.profile.contactName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box;">
                            </div>
                            <div class="form-group" style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 6px; font-weight: 500;">Телефон</label>
                                <input type="tel" id="profilePhone" value="${this.profile.phone}" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box;">
                            </div>
                            <div class="form-group" style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 6px; font-weight: 500;">Email</label>
                                <input type="email" id="profileEmail" value="${this.profile.email}" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box;">
                            </div>
                            
                        </div>

                        <div class="form-section" style="margin-bottom: 24px;">
                            <h3 style="margin: 0 0 16px; font-size: 16px;">Мессенджеры для связи с клиентами</h3>
                            <div class="form-group" style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 6px; font-weight: 500;">✈️ Telegram</label>
                                <input type="text" id="profileTelegram" value="${((this.profile.messengers && this.profile.messengers.telegram) || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}" placeholder="@username или ссылка" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box;">
                            </div>
                            <div class="form-group" style="margin-bottom: 16px;">
                                <label style="display: block; margin-bottom: 6px; font-weight: 500;">💬 Макс</label>
                                <input type="text" id="profileMax" value="${((this.profile.messengers && this.profile.messengers.max) || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}" placeholder="username или номер" style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box;">
                            </div>
                        </div>

                        <div class="form-actions" style="display: flex; gap: 8px; justify-content: space-between; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                            ${this.isModal ? '<button type="button" class="btn-cancel" style="padding: 10px 16px; background: #f3f4f6; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">Отмена</button>' : '<div></div>'}
                            <button type="button" class="btn-change-password" id="changePwdBtn" style="padding: 10px 16px; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">🔒 Пароль</button>
                            <button type="button" class="btn-logout" id="logoutBtn" style="padding: 10px 16px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">🚪 Выйти</button>
                            <button type="button" class="profile-save-btn" id="saveProfile" style="padding: 10px 16px; background: #0066CC; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">💾 Сохранить</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
    }

    attachEvents() {
        const closeBtn = this.container.querySelector('.profile-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (this.onClose) this.onClose();
                else this.container.innerHTML = '';
            });
        }

        const changePwdBtn = this.container.querySelector('#changePwdBtn');
        if (changePwdBtn) {
            changePwdBtn.addEventListener('click', () => this.showChangePasswordModal());
        }

        const cancelBtn = this.container.querySelector('.btn-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (this.onClose) this.onClose();
            });
        }

        const saveBtn = this.container.querySelector('#saveProfile');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveProfile());
        }

        const logoutBtn = this.container.querySelector('#logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (window.AquaGid?.ManagerApp) {
                    window.AquaGid.ManagerApp.logout();
                }
                if (this.onClose) this.onClose();
            });
        }
    }

    async saveProfile() {
        const managerId = window.managerId;
        if (!managerId) {
            alert('Нет авторизации');
            return;
        }
        
        const messengers = {};
        const telegram = document.getElementById('profileTelegram')?.value?.trim();
        const max = document.getElementById('profileMax')?.value?.trim();
        if (telegram) messengers.telegram = telegram;
        if (max) messengers.max = max;
        
        const profileData = {
            company_name: document.getElementById('profileCompany')?.value || '',
            full_name: document.getElementById('profileName')?.value || '',
            phone: document.getElementById('profilePhone')?.value || '',
            email: document.getElementById('profileEmail')?.value || '',
            messengers: messengers,
        };
        
        try {
            const response = await fetch(`/api/managers/${managerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });
            
            if (!response.ok) throw new Error('Ошибка сохранения');
            
            alert('✅ Профиль сохранён');
            
            if (this.isModal && this.onClose) {
                this.onClose();
            }
            
        } catch (error) {
            console.error('Ошибка сохранения профиля:', error);
            alert('❌ Ошибка сохранения');
        }
    }

        showChangePasswordModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
        modal.innerHTML = `
            <div style="background:white;border-radius:16px;padding:24px;max-width:380px;width:90%;">
                <h3 style="margin:0 0 16px;">🔒 Смена пароля</h3>
                <div class="form-group" style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:4px;font-weight:500;">Старый пароль</label>
                    <div style="display:flex;gap:6px;">
                        <input type="password" id="oldPassword" style="flex:1;padding:10px;border:1px solid #d1d5db;border-radius:8px;">
                        <button onclick="const f=this.previousElementSibling;f.type=f.type==='password'?'text':'password'" type="button" style="padding:10px 12px;background:#f3f4f6;border:none;border-radius:8px;cursor:pointer;">👁️</button>
                    </div>
                </div>
                <div class="form-group" style="margin-bottom:12px;">
                    <label style="display:block;margin-bottom:4px;font-weight:500;">Новый пароль</label>
                    <div style="display:flex;gap:6px;">
                        <input type="password" id="newPassword1" style="flex:1;padding:10px;border:1px solid #d1d5db;border-radius:8px;">
                        <button onclick="const f=this.previousElementSibling;f.type=f.type==='password'?'text':'password'" type="button" style="padding:10px 12px;background:#f3f4f6;border:none;border-radius:8px;cursor:pointer;">👁️</button>
                    </div>
                </div>
                <div class="form-group" style="margin-bottom:16px;">
                    <label style="display:block;margin-bottom:4px;font-weight:500;">Повторите пароль</label>
                    <div style="display:flex;gap:6px;">
                        <input type="password" id="newPassword2" style="flex:1;padding:10px;border:1px solid #d1d5db;border-radius:8px;">
                        <button onclick="const f=this.previousElementSibling;f.type=f.type==='password'?'text':'password'" type="button" style="padding:10px 12px;background:#f3f4f6;border:none;border-radius:8px;cursor:pointer;">👁️</button>
                    </div>
                </div>
                <div id="passwordError" style="color:#ef4444;font-size:13px;margin-bottom:12px;display:none;"></div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.querySelector('.modal-overlay').__profile.changePassword()" style="flex:1;padding:10px;background:#0066CC;color:white;border:none;border-radius:8px;cursor:pointer;">💾 Сменить</button>
                    <button onclick="this.closest('.modal-overlay').remove()" style="flex:1;padding:10px;background:#f3f4f6;border:none;border-radius:8px;cursor:pointer;">Отмена</button>
                </div>
            </div>
        `;
        modal.__profile = this;
        document.body.appendChild(modal);
    }

    async changePassword() {
        const oldPwd = document.getElementById('oldPassword')?.value || '';
        const newPwd1 = document.getElementById('newPassword1')?.value || '';
        const newPwd2 = document.getElementById('newPassword2')?.value || '';
        const errEl = document.getElementById('passwordError');
        
        if (!oldPwd || !newPwd1) {
            errEl.textContent = 'Заполните все поля';
            errEl.style.display = 'block';
            return;
        }
        if (newPwd1.length < 6) {
            errEl.textContent = 'Пароль должен быть не менее 6 символов';
            errEl.style.display = 'block';
            return;
        }
        if (newPwd1 !== newPwd2) {
            errEl.textContent = 'Пароли не совпадают';
            errEl.style.display = 'block';
            return;
        }
        
        try {
            const response = await fetch(`/api/managers/${window.managerId}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_password: oldPwd, new_password: newPwd1 })
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Ошибка');
            }
            
            alert('✅ Пароль изменён');
            document.querySelector('.modal-overlay')?.remove();
        } catch (error) {
            errEl.textContent = error.message;
            errEl.style.display = 'block';
        }
    }
};