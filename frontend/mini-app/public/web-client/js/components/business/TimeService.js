// TimeService.js — все расчёты времени через APP_CONSTANTS (загружается из API)
(function(global) {
    'use strict';
    
    class TimeService {
        constructor() {
            this.BREAK_TIME = 30;  // минут между рейсами
        }
        
        get workStart() { return window.APP_CONSTANTS?.TIME?.work_start || '09:00'; }
        get workEnd() { return window.APP_CONSTANTS?.TIME?.work_end || '24:00'; }
        get slotStep() { return window.APP_CONSTANTS?.TIME?.slot_step_minutes || 30; }
        
        generateTimeSlots() {
            return window.APP_CONSTANTS?.getTimeSlots() || [];
        }
        
        isTimeAvailable(startTime, durationHours) {
            const [startH, startM] = startTime.split(':').map(Number);
            const [endH, endM] = this.workEnd.split(':').map(Number);
            const endMinutes = startH * 60 + startM + durationHours * 60 + this.BREAK_TIME;
            const workEndMinutes = endH * 60 + endM;
            return endMinutes <= workEndMinutes;
        }
        
        isWorkingTime(time) {
            const [hours] = time.split(':').map(Number);
            const [startH] = this.workStart.split(':').map(Number);
            const [endH] = this.workEnd.split(':').map(Number);
            return hours >= startH && hours <= endH;
        }
        
        // Остальные методы без изменений
        calculateNearestSlots(currentTime = new Date()) {
            const arrivalTime = new Date(currentTime);
            arrivalTime.setMinutes(currentTime.getMinutes() + 20);
            const allSlots = this.generateTimeSlots();
            const arrivalMinutes = arrivalTime.getHours() * 60 + arrivalTime.getMinutes();
            const futureSlots = allSlots.filter(slot => {
                const [h, m] = slot.split(':').map(Number);
                return h * 60 + m >= arrivalMinutes;
            });
            if (futureSlots.length === 0) {
                return { primary: this.workStart, secondary: null, isNextDay: true };
            }
            const nearestSlot = futureSlots[0];
            return { primary: nearestSlot, secondary: futureSlots[1] || null, hasChoice: futureSlots.length > 1 };
        }
        
        formatTimeForDisplay(time) { return time; }
        getDiffDescription(diffMinutes) {
            if (diffMinutes <= 0) return 'успеваете впритык';
            if (diffMinutes <= 5) return 'едва успеваете';
            if (diffMinutes <= 10) return 'успеваете';
            if (diffMinutes <= 20) return 'есть время';
            return 'в запасе много времени';
        }
        
        async getAvailableDates(days = 30) {
            try {
                const resp = await fetch(`/api/availability/available-dates?days=${days}`);
                const data = await resp.json();
                if (data.success && data.dates) return data.dates;
            } catch (e) {}
            return this.getFallbackDates(days);
        }
        
        getFallbackDates(days) {
            const dates = [];
            const today = new Date();
            for (let i = 0; i < days; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                dates.push(d.toISOString().split('T')[0]);
            }
            return dates;
        }
    }
    
    if (!global.AquaGid) global.AquaGid = {};
    global.AquaGid.TimeService = new TimeService();
})(typeof window !== 'undefined' ? window : global);