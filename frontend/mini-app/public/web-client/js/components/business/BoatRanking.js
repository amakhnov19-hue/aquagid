/**
 * Сервис для сортировки и рейтинга катеров
 */
class BoatRanking {
    constructor() {
        // Ключ для localStorage
        this.STORAGE_KEY = 'boat_ranking';
        // Веса для разных факторов
        this.WEIGHTS = {
            views: 0.2,      // просмотры
            bookings: 0.4,   // бронирования
            rating: 0.3,     // рейтинг
            random: 0.1      // случайность
        };
        
        this.loadStats();
    }
    
    /**
     * Загрузить статистику из localStorage
     */
    loadStats() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            this.stats = JSON.parse(saved);
        } else {
            this.stats = {};
        }
    }
    
    /**
     * Сохранить статистику
     */
    saveStats() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.stats));
    }
    
    /**
     * Увеличить счётчик просмотров катера
     */
    incrementViews(boatId) {
        if (!this.stats[boatId]) {
            this.stats[boatId] = { views: 0, bookings: 0, rating: 0 };
        }
        this.stats[boatId].views++;
        this.saveStats();
    }
    
    /**
     * Увеличить счётчик бронирований
     */
    incrementBookings(boatId) {
        if (!this.stats[boatId]) {
            this.stats[boatId] = { views: 0, bookings: 0, rating: 0 };
        }
        this.stats[boatId].bookings++;
        this.saveStats();
    }
    
    /**
     * Обновить рейтинг катера (от 0 до 5)
     */
    updateRating(boatId, rating) {
        if (!this.stats[boatId]) {
            this.stats[boatId] = { views: 0, bookings: 0, rating: 0 };
        }
        this.stats[boatId].rating = Math.min(5, Math.max(0, rating));
        this.saveStats();
    }
    
    /**
     * Получить статистику катера
     */
    getStats(boatId) {
        return this.stats[boatId] || { views: 0, bookings: 0, rating: 0 };
    }
    
    /**
     * Рассчитать рейтинг катера (0-100)
     */
    calculateScore(boatId, maxViews, maxBookings) {
        const stats = this.getStats(boatId);
        const viewsScore = maxViews > 0 ? stats.views / maxViews : 0;
        const bookingsScore = maxBookings > 0 ? stats.bookings / maxBookings : 0;
        const ratingScore = stats.rating / 5;
        
        let score = (
            viewsScore * this.WEIGHTS.views +
            bookingsScore * this.WEIGHTS.bookings +
            ratingScore * this.WEIGHTS.rating
        );
        
        // Добавляем случайность
        score += Math.random() * this.WEIGHTS.random;
        
        return score;
    }
    
    /**
     * Отсортировать катера по рейтингу
     */
    sortBoats(boats) {
        if (!boats || boats.length === 0) return boats;
        
        // Находим максимумы для нормализации
        const maxViews = Math.max(...boats.map(b => this.getStats(b.id).views), 0);
        const maxBookings = Math.max(...boats.map(b => this.getStats(b.id).bookings), 0);
        
        // Вычисляем score для каждого катера
        const boatsWithScore = boats.map(boat => ({
            ...boat,
            _score: this.calculateScore(boat.id, maxViews, maxBookings)
        }));
        
        // Сортируем по убыванию score
        boatsWithScore.sort((a, b) => b._score - a._score);
        
        // Удаляем временное поле
        return boatsWithScore.map(({ _score, ...boat }) => boat);
    }
    
    /**
     * Получить список катеров с их рейтингом
     */
    getRanking(boats) {
        if (!boats || boats.length === 0) return [];
        
        const maxViews = Math.max(...boats.map(b => this.getStats(b.id).views), 0);
        const maxBookings = Math.max(...boats.map(b => this.getStats(b.id).bookings), 0);
        
        return boats.map(boat => ({
            id: boat.id,
            name: boat.name,
            views: this.getStats(boat.id).views,
            bookings: this.getStats(boat.id).bookings,
            rating: this.getStats(boat.id).rating,
            score: this.calculateScore(boat.id, maxViews, maxBookings) * 100
        })).sort((a, b) => b.score - a.score);
    }
}

// Создаём глобальный экземпляр
if (!window.AquaGid) window.AquaGid = {};
window.AquaGid.BoatRanking = new BoatRanking();
console.log('✅ BoatRanking загружен');