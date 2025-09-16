// Configuration for the admin portal
const config = {
    // API Base URL - automatically detects environment
    API_BASE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3001/api'  // Development
        : '/api',  // Production (Vercel)
    
    // App settings
    APP_NAME: 'Bhadrak Health Club - Admin Portal',
    CURRENCY: '₹',
    
    // Features
    FEATURES: {
        ANALYTICS: true,
        LOGO_MANAGEMENT: true,
        PRODUCT_MANAGEMENT: true,
        ORDER_MANAGEMENT: true,
        DATE_FILTERING: true
    }
};

// Export for use in other files
window.ADMIN_CONFIG = config;