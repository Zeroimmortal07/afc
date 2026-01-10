/**
 * AFC Cart Module
 * Cart management, promo codes, and order history
 * @module cart
 */

const AFC_CART = (function() {
    'use strict';
    
    // Private cart state
    let _cart = [];
    let _appliedPromo = null;
    
    /**
     * Initialize cart from storage
     */
    function init() {
        try {
            const stored = localStorage.getItem(AFC_CONFIG.STORAGE_KEYS.CART);
            if (stored) {
                _cart = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[AFC Cart] Error loading cart:', e);
            _cart = [];
        }
    }
    
    /**
     * Save cart to storage
     */
    function save() {
        try {
            localStorage.setItem(AFC_CONFIG.STORAGE_KEYS.CART, JSON.stringify(_cart));
        } catch (e) {
            console.warn('[AFC Cart] Error saving cart:', e);
        }
    }
    
    /**
     * Get all cart items
     * @returns {Array} Cart items
     */
    function getItems() {
        return [..._cart];
    }
    
    /**
     * Get cart item by ID
     * @param {number} itemId - Item ID
     * @returns {Object|null} Cart item
     */
    function getItem(itemId) {
        return _cart.find(item => item.id === itemId) || null;
    }
    
    /**
     * Add item to cart
     * @param {Object} menuItem - Menu item to add
     * @param {number} quantity - Quantity to add
     * @returns {Object} Updated cart item
     */
    function addItem(menuItem, quantity = 1) {
        if (!menuItem || !menuItem.id) return null;
        
        const existingItem = _cart.find(item => item.id === menuItem.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
            save();
            return existingItem;
        }
        
        const newItem = {
            id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            emoji: menuItem.emoji,
            image: menuItem.image,
            quantity: quantity
        };
        
        _cart.push(newItem);
        save();
        return newItem;
    }
    
    /**
     * Update item quantity
     * @param {number} itemId - Item ID
     * @param {number} delta - Quantity change (+/-)
     * @returns {Object|null} Updated item or null if removed
     */
    function updateQuantity(itemId, delta) {
        const item = _cart.find(i => i.id === itemId);
        if (!item) return null;
        
        item.quantity += delta;
        
        if (item.quantity <= 0) {
            return removeItem(itemId);
        }
        
        save();
        return item;
    }
    
    /**
     * Set item quantity
     * @param {number} itemId - Item ID
     * @param {number} quantity - New quantity
     * @returns {Object|null} Updated item
     */
    function setQuantity(itemId, quantity) {
        const item = _cart.find(i => i.id === itemId);
        if (!item) return null;
        
        if (quantity <= 0) {
            return removeItem(itemId);
        }
        
        item.quantity = quantity;
        save();
        return item;
    }
    
    /**
     * Remove item from cart
     * @param {number} itemId - Item ID
     * @returns {null} Always returns null
     */
    function removeItem(itemId) {
        _cart = _cart.filter(item => item.id !== itemId);
        save();
        return null;
    }
    
    /**
     * Clear entire cart
     */
    function clear() {
        _cart = [];
        _appliedPromo = null;
        save();
    }
    
    /**
     * Get cart summary
     * @returns {Object} Cart summary
     */
    function getSummary() {
        const itemCount = _cart.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = _cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        let discount = 0;
        if (_appliedPromo) {
            discount = calculateDiscount(subtotal, _appliedPromo);
        }
        
        const total = Math.max(0, subtotal - discount);
        
        return {
            itemCount,
            subtotal,
            discount,
            total,
            promoCode: _appliedPromo?.code || null,
            isEmpty: _cart.length === 0
        };
    }
    
    /**
     * Calculate discount for promo code
     * @param {number} subtotal - Order subtotal
     * @param {Object} promo - Promo code object
     * @returns {number} Discount amount
     */
    function calculateDiscount(subtotal, promo) {
        if (!promo || !promo.active) return 0;
        if (subtotal < promo.minOrder) return 0;
        
        let discount = 0;
        
        if (promo.type === 'percent') {
            discount = (subtotal * promo.discount) / 100;
        } else if (promo.type === 'flat') {
            discount = promo.discount;
        }
        
        // Apply max discount limit
        if (promo.maxDiscount && discount > promo.maxDiscount) {
            discount = promo.maxDiscount;
        }
        
        return Math.round(discount);
    }
    
    // ==========================================
    // PROMO CODE MANAGEMENT
    // ==========================================
    
    /**
     * Get all promo codes
     * @returns {Array} Promo codes
     */
    function getPromoCodes() {
        try {
            const stored = localStorage.getItem(AFC_CONFIG.STORAGE_KEYS.PROMO_CODES);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('[AFC Cart] Error loading promo codes:', e);
        }
        
        // Initialize with defaults
        const defaults = AFC_CONFIG.DEFAULT_PROMO_CODES || [];
        savePromoCodes(defaults);
        return defaults;
    }
    
    /**
     * Save promo codes
     * @param {Array} codes - Promo codes array
     */
    function savePromoCodes(codes) {
        try {
            localStorage.setItem(AFC_CONFIG.STORAGE_KEYS.PROMO_CODES, JSON.stringify(codes));
        } catch (e) {
            console.warn('[AFC Cart] Error saving promo codes:', e);
        }
    }
    
    /**
     * Add new promo code (admin)
     * @param {Object} promo - Promo code object
     * @returns {boolean} Success
     */
    function addPromoCode(promo) {
        if (!promo.code || !promo.discount) return false;
        
        const codes = getPromoCodes();
        
        // Check for duplicate
        if (codes.find(c => c.code.toUpperCase() === promo.code.toUpperCase())) {
            return false;
        }
        
        codes.push({
            code: promo.code.toUpperCase(),
            discount: parseFloat(promo.discount),
            type: promo.type || 'percent',
            minOrder: parseFloat(promo.minOrder) || 0,
            maxDiscount: parseFloat(promo.maxDiscount) || null,
            active: promo.active !== false,
            usageLimit: promo.usageLimit || null,
            usedCount: 0,
            createdAt: new Date().toISOString()
        });
        
        savePromoCodes(codes);
        return true;
    }
    
    /**
     * Delete promo code (admin)
     * @param {string} code - Promo code
     * @returns {boolean} Success
     */
    function deletePromoCode(code) {
        const codes = getPromoCodes();
        const filtered = codes.filter(c => c.code.toUpperCase() !== code.toUpperCase());
        
        if (filtered.length === codes.length) return false;
        
        savePromoCodes(filtered);
        return true;
    }
    
    /**
     * Toggle promo code status (admin)
     * @param {string} code - Promo code
     * @returns {boolean} New status
     */
    function togglePromoCode(code) {
        const codes = getPromoCodes();
        const promo = codes.find(c => c.code.toUpperCase() === code.toUpperCase());
        
        if (!promo) return false;
        
        promo.active = !promo.active;
        savePromoCodes(codes);
        return promo.active;
    }
    
    /**
     * Apply promo code to cart
     * @param {string} code - Promo code
     * @returns {Object} Result with success and message
     */
    function applyPromoCode(code) {
        if (!code) {
            return { success: false, message: 'Please enter a promo code' };
        }
        
        const codes = getPromoCodes();
        const promo = codes.find(c => c.code.toUpperCase() === code.toUpperCase());
        
        if (!promo) {
            return { success: false, message: 'Invalid promo code' };
        }
        
        if (!promo.active) {
            return { success: false, message: 'This promo code has expired' };
        }
        
        if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
            return { success: false, message: 'This promo code has reached its usage limit' };
        }
        
        const summary = getSummary();
        
        if (summary.subtotal < promo.minOrder) {
            return { 
                success: false, 
                message: `Minimum order of ₹${promo.minOrder} required` 
            };
        }
        
        _appliedPromo = promo;
        const discount = calculateDiscount(summary.subtotal, promo);
        
        return {
            success: true,
            message: `Promo applied! You save ₹${discount}`,
            discount,
            promo
        };
    }
    
    /**
     * Remove applied promo code
     */
    function removePromoCode() {
        _appliedPromo = null;
    }
    
    /**
     * Get applied promo code
     * @returns {Object|null} Applied promo
     */
    function getAppliedPromo() {
        return _appliedPromo;
    }
    
    /**
     * Record promo code usage (after successful order)
     */
    function recordPromoUsage() {
        if (!_appliedPromo) return;
        
        const codes = getPromoCodes();
        const promo = codes.find(c => c.code === _appliedPromo.code);
        
        if (promo) {
            promo.usedCount = (promo.usedCount || 0) + 1;
            savePromoCodes(codes);
        }
        
        _appliedPromo = null;
    }
    
    // ==========================================
    // ORDER HISTORY
    // ==========================================
    
    /**
     * Get order history
     * @returns {Array} Order history
     */
    function getOrderHistory() {
        try {
            const stored = localStorage.getItem(AFC_CONFIG.STORAGE_KEYS.ORDER_HISTORY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.warn('[AFC Cart] Error loading order history:', e);
            return [];
        }
    }
    
    /**
     * Save order to history
     * @param {Object} orderDetails - Order details
     * @returns {Object} Saved order
     */
    function saveOrderToHistory(orderDetails) {
        const history = getOrderHistory();
        
        const order = {
            id: 'ORD-' + Date.now(),
            date: new Date().toISOString(),
            items: [..._cart],
            ...orderDetails,
            summary: getSummary()
        };
        
        // Keep only last 20 orders
        history.unshift(order);
        if (history.length > 20) {
            history.pop();
        }
        
        try {
            localStorage.setItem(AFC_CONFIG.STORAGE_KEYS.ORDER_HISTORY, JSON.stringify(history));
        } catch (e) {
            console.warn('[AFC Cart] Error saving order history:', e);
        }
        
        // Record promo usage
        recordPromoUsage();
        
        return order;
    }
    
    /**
     * Clear order history
     */
    function clearOrderHistory() {
        localStorage.removeItem(AFC_CONFIG.STORAGE_KEYS.ORDER_HISTORY);
    }
    
    /**
     * Reorder from history
     * @param {string} orderId - Order ID
     * @returns {boolean} Success
     */
    function reorderFromHistory(orderId) {
        const history = getOrderHistory();
        const order = history.find(o => o.id === orderId);
        
        if (!order || !order.items) return false;
        
        // Clear current cart and add items from order
        _cart = order.items.map(item => ({ ...item }));
        save();
        
        return true;
    }
    
    // Initialize on load
    init();
    
    // Public API
    return {
        // Cart operations
        getItems,
        getItem,
        addItem,
        updateQuantity,
        setQuantity,
        removeItem,
        clear,
        getSummary,
        
        // Promo codes
        getPromoCodes,
        addPromoCode,
        deletePromoCode,
        togglePromoCode,
        applyPromoCode,
        removePromoCode,
        getAppliedPromo,
        
        // Order history
        getOrderHistory,
        saveOrderToHistory,
        clearOrderHistory,
        reorderFromHistory
    };
})();

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AFC_CART;
}
