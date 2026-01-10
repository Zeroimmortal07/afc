/**
 * AFC API Module
 * Handles all external API calls with security measures
 * @module api
 */

const AFC_API = (function() {
    'use strict';
    
    // Private API endpoints (obfuscated)
    const _endpoints = {
        // Base64 encoded for basic obfuscation (not secure, but better than plaintext)
        sheets: atob('aHR0cHM6Ly9zY3JpcHQuZ29vZ2xlLmNvbS9tYWNyb3Mvcy9BS2Z5Y2J5anI2R1R3YkhLSjZRUDZ3TmlnVEhJN2lMZkNTUjBkYk1aVER1bUtuVExJX05TYmpiZUFZbEFtRXFXTEhrbnFCSzI0Zy9leGVj'),
        whatsapp: 'https://wa.me/'
    };
    
    // Private WhatsApp number (Base64 encoded)
    const _businessNumber = atob('OTE5MTY3OTMxODgz');
    
    /**
     * Generate a unique request ID for tracking
     * @returns {string} Unique request ID
     */
    function generateRequestId() {
        return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Sanitize input to prevent XSS
     * @param {string} input - Raw input
     * @returns {string} Sanitized input
     */
    function sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
    
    /**
     * Validate phone number format
     * @param {string} phone - Phone number
     * @returns {boolean} Is valid
     */
    function validatePhone(phone) {
        const phoneRegex = /^\+?[1-9]\d{9,14}$/;
        return phoneRegex.test(phone.replace(/\D/g, ''));
    }
    
    /**
     * Rate limiting tracker
     */
    const rateLimiter = {
        requests: [],
        maxRequests: 10,
        windowMs: 60000, // 1 minute
        
        canMakeRequest() {
            const now = Date.now();
            this.requests = this.requests.filter(time => now - time < this.windowMs);
            return this.requests.length < this.maxRequests;
        },
        
        recordRequest() {
            this.requests.push(Date.now());
        }
    };
    
    /**
     * Send order to Google Sheets
     * @param {Object} orderData - Order data
     * @returns {Promise} API response
     */
    async function sendOrderToSheet(orderData) {
        const requestId = generateRequestId();
        
        // Rate limiting check
        if (!rateLimiter.canMakeRequest()) {
            console.warn('[AFC API] Rate limit exceeded');
            throw new Error('Too many requests. Please wait a moment.');
        }
        
        // Validate required fields
        if (!orderData.phone || !orderData.items || !orderData.total) {
            throw new Error('Missing required order data');
        }
        
        // Validate phone
        if (!validatePhone(orderData.phone)) {
            throw new Error('Invalid phone number format');
        }
        
        // Sanitize data
        const sanitizedData = {
            requestId,
            phone: sanitizeInput(orderData.phone),
            customerName: sanitizeInput(orderData.customerName || ''),
            address: sanitizeInput(orderData.address || ''),
            items: sanitizeInput(orderData.items),
            total: parseFloat(orderData.total) || 0,
            promoCode: sanitizeInput(orderData.promoCode || ''),
            discount: parseFloat(orderData.discount) || 0,
            timestamp: new Date().toISOString()
        };
        
        try {
            rateLimiter.recordRequest();
            
            const response = await fetch(_endpoints.sheets, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sanitizedData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log('[AFC API] Order stored:', requestId);
            return { success: true, requestId, data };
            
        } catch (error) {
            console.error('[AFC API] Sheet error:', error);
            // Don't block order if sheet fails - WhatsApp is primary
            return { success: false, requestId, error: error.message };
        }
    }
    
    /**
     * Build WhatsApp order message
     * @param {Object} details - Order details
     * @returns {string} Formatted message
     */
    function buildWhatsAppMessage(details) {
        const { name, phone, address, items, total, promoCode, discount } = details;
        
        let message = `*🍽️ AFC Order*

*Customer Details:*
📛 Name: ${sanitizeInput(name)}
📱 Phone: ${sanitizeInput(phone)}
📍 Address: ${sanitizeInput(address)}

*Order Items:*
${sanitizeInput(items)}`;

        if (promoCode && discount > 0) {
            message += `

*Promo Code:* ${sanitizeInput(promoCode)}
*Discount:* -₹${discount}`;
        }

        message += `

*💰 Total: ₹${total}*

_Please confirm this order_`;

        return message;
    }
    
    /**
     * Open WhatsApp with order message
     * @param {string} message - Message to send
     */
    function openWhatsApp(message) {
        const encodedMessage = encodeURIComponent(message);
        const whatsappURL = `${_endpoints.whatsapp}${_businessNumber}?text=${encodedMessage}`;
        window.open(whatsappURL, '_blank');
    }
    
    /**
     * Get business WhatsApp number (masked for display)
     * @returns {string} Masked number
     */
    function getMaskedBusinessNumber() {
        const num = _businessNumber;
        return num.slice(0, 4) + '****' + num.slice(-4);
    }
    
    // Public API
    return {
        sendOrderToSheet,
        buildWhatsAppMessage,
        openWhatsApp,
        getMaskedBusinessNumber,
        sanitizeInput,
        validatePhone,
        generateRequestId
    };
})();

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AFC_API;
}
