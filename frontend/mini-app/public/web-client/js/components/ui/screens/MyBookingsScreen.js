/**
 * Экран "Мои бронирования"
 */
class MyBookingsScreen extends ScreenBase {
    constructor(mainApp) {
        super(mainApp);
    }

    show() {
        console.log('📋 MyBookingsScreen.show START');
        
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="screen my-bookings-screen">
                <div class="screen-header">
                    <h2>📋 Мои бронирования</h2>
                    <button class="close-btn" onclick="window.AquaGid.UnifiedScreens.showWelcomeScreen()">✕</button>
                </div>
                
                <div id="my-bookings-container"></div>
            </div>
        `;
        
        // Используем существующий MyBookings компонент
        if (window.AquaGid?.MyBookings) {
            window.AquaGid.MyBookings.loadBookings('active');
        } else {
            console.error('❌ MyBookings не загружен');
        }
        
        console.log('📋 MyBookingsScreen.show END');
    }
}

window.MyBookingsScreen = MyBookingsScreen;