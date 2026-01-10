/**
 * AFC Configuration Module
 * Centralized configuration for the application
 * @module config
 */

const AFC_CONFIG = {
    // Application info
    APP_NAME: 'Amma Food Center (AFC)',
    APP_VERSION: '3.0.0', // CONSISTENCY FIX - Unified data source
    
    // Storage keys
    STORAGE_KEYS: {
        MENU: 'menuItems',
        ORDERS: 'orders',
        AUTH: 'adminAuth',
        AUTH_TOKEN: 'adminAuthToken',
        AUTH_EXPIRY: 'adminAuthExpiry',
        LOGIN_ATTEMPTS: 'adminLoginAttempts',
        CART: 'cartItems',
        ORDER_HISTORY: 'orderHistory',
        PROMO_CODES: 'promoCodes',
        THEME: 'userTheme'
    },
    
    // Security settings
    SECURITY: {
        // Token expiry in milliseconds (2 hours)
        TOKEN_EXPIRY: 2 * 60 * 60 * 1000,
        // Max login attempts before lockout
        MAX_LOGIN_ATTEMPTS: 5,
        // Lockout duration in milliseconds (15 minutes)
        LOCKOUT_DURATION: 15 * 60 * 1000,
        // Password hash (in production, use bcrypt on backend)
        // This is a SHA-256 hash of 'admin123' - in production, NEVER store passwords in frontend
        PASSWORD_HASH: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
    },
    
    // Sync settings
    SYNC: {
        POLLING_INTERVAL: 5000, // 5 seconds (reduced for battery)
        DEBOUNCE_DELAY: 300
    },
    
    // UI settings
    UI: {
        TOAST_DURATION: 3000,
        ANIMATION_DURATION: 300,
        SKELETON_COUNT: 6
    },
    
    // Category configuration
    CATEGORIES: {
        PREDEFINED: [
            'curry', 'biryani', 'rice', 'south-indian', 'dosa', 'idli', 'vada', 'uttapam',
            'bread', 'snacks', 'breakfast', 'lunch', 'dinner', 'beverages', 'juice', 
            'tea-coffee', 'desserts', 'fast-food'
        ],
        EMOJIS: {
            'all': '🍽️',
            'curry': '🍛',
            'biryani': '🍚',
            'rice': '🍚',
            'south-indian': '🌿',
            'dosa': '🥞',
            'idli': '⚪',
            'vada': '🍩',
            'uttapam': '🫓',
            'bread': '🍞',
            'snacks': '🍟',
            'breakfast': '🌅',
            'lunch': '☀️',
            'dinner': '🌙',
            'beverages': '🥤',
            'juice': '🧃',
            'tea-coffee': '☕',
            'desserts': '🍰',
            'fast-food': '🍔'
        }
    },
    
    // Default menu data (single source of truth)
    DEFAULT_MENU: [
        { id: 1, name: "Chicken Curry", price: 150, category: "curry", description: "Tender chicken in aromatic spices", emoji: "🍛", image: null },
        { id: 2, name: "Butter Chicken", price: 180, category: "curry", description: "Creamy and delicious butter chicken", emoji: "🍛", image: null },
        { id: 3, name: "Dal Makhani", price: 120, category: "curry", description: "Rich and creamy lentil curry", emoji: "🍲", image: null },
        { id: 4, name: "Chicken Biryani", price: 220, category: "biryani", description: "Fragrant rice with tender chicken", emoji: "🍚", image: null },
        { id: 5, name: "Mutton Biryani", price: 250, category: "biryani", description: "Premium biryani with tender mutton", emoji: "🍚", image: null },
        { id: 6, name: "Vegetable Biryani", price: 140, category: "biryani", description: "Mixed vegetables with aromatic rice", emoji: "🍚", image: null },
        { id: 7, name: "Naan", price: 40, category: "bread", description: "Soft and fluffy Indian bread", emoji: "🍞", image: null },
        { id: 8, name: "Roti", price: 20, category: "bread", description: "Traditional Indian flatbread", emoji: "🫓", image: null },
        { id: 9, name: "Paratha", price: 50, category: "bread", description: "Flaky stuffed Indian bread", emoji: "🥪", image: null },
        { id: 10, name: "Mango Lassi", price: 60, category: "beverages", description: "Refreshing mango yogurt drink", emoji: "🥤", image: null },
        { id: 11, name: "Masala Chai", price: 30, category: "beverages", description: "Traditional spiced tea", emoji: "☕", image: null },
        { id: 12, name: "Fresh Juice", price: 50, category: "beverages", description: "Fresh fruit juice", emoji: "🧃", image: null }
    ],
    
    // Default promo codes
    DEFAULT_PROMO_CODES: [
        { code: 'WELCOME10', discount: 10, type: 'percent', minOrder: 100, maxDiscount: 50, active: true, usageLimit: 100, usedCount: 0 },
        { code: 'FLAT50', discount: 50, type: 'flat', minOrder: 300, maxDiscount: 50, active: true, usageLimit: 50, usedCount: 0 },
        { code: 'AFC25', discount: 25, type: 'percent', minOrder: 200, maxDiscount: 100, active: true, usageLimit: null, usedCount: 0 }
    ]
};

// Freeze config to prevent modification
Object.freeze(AFC_CONFIG);
Object.freeze(AFC_CONFIG.STORAGE_KEYS);
Object.freeze(AFC_CONFIG.SECURITY);
Object.freeze(AFC_CONFIG.SYNC);
Object.freeze(AFC_CONFIG.UI);
Object.freeze(AFC_CONFIG.CATEGORIES);

// Export for ES modules (if supported)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AFC_CONFIG;
}
