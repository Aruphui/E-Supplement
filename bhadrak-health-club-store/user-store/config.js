// Configuration for the user store
const config = {
    // API Base URL - automatically detects environment
    API_BASE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3001/api'  // Development
        : '/api',  // Production (Vercel)
    
    // App settings
    APP_NAME: 'Bhadrak Health Club',
    CURRENCY: '₹',
    
    // Features
    FEATURES: {
        USER_REGISTRATION: true,
        ORDER_HISTORY: true,
        LOGO_SUPPORT: true,
        UPI_PAYMENTS: true
    }
};

// Export for use in other files
window.APP_CONFIG = config;