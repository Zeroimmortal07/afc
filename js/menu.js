/**
 * AFC Menu Module
 * Menu data management and rendering
 * @module menu
 */

const AFC_MENU = (function() {
    'use strict';
    
    // Private state
    let _menuData = [];
    let _currentFilter = 'all';
    let _searchQuery = '';
    
    // Menu version for cache invalidation
    const MENU_VERSION_KEY = 'menuVersion';
    const CURRENT_MENU_VERSION = '2.0.1'; // Increment when DEFAULT_MENU changes
    
    /**
     * Check if stored menu version matches current version
     * @returns {boolean} Version match
     */
    function isMenuVersionValid() {
        try {
            const storedVersion = localStorage.getItem(MENU_VERSION_KEY);
            return storedVersion === CURRENT_MENU_VERSION;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Load menu from storage or defaults
     * Ensures consistency across all devices
     * @returns {Array} Menu data
     */
    function load() {
        try {
            const stored = localStorage.getItem(AFC_CONFIG.STORAGE_KEYS.MENU);
            
            // Check if menu version is current
            if (stored && isMenuVersionValid()) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    _menuData = parsed;
                    console.log('[AFC Menu] Loaded', _menuData.length, 'items from storage (v' + CURRENT_MENU_VERSION + ')');
                    return _menuData;
                }
            } else if (stored && !isMenuVersionValid()) {
                // Version mismatch - merge stored data with defaults
                console.log('[AFC Menu] Version mismatch, merging with defaults...');
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    // Keep user-added items but ensure all default items exist
                    const defaultIds = AFC_CONFIG.DEFAULT_MENU.map(i => i.id);
                    const userAddedItems = parsed.filter(item => !defaultIds.includes(item.id));
                    
                    // Combine: defaults + user-added items
                    _menuData = [...AFC_CONFIG.DEFAULT_MENU, ...userAddedItems];
                    console.log('[AFC Menu] Merged menu:', _menuData.length, 'items');
                    
                    // Save merged data with new version
                    save();
                    return _menuData;
                }
            }
        } catch (e) {
            console.error('[AFC Menu] Error loading menu:', e);
        }
        
        // Use defaults for fresh installs
        _menuData = [...AFC_CONFIG.DEFAULT_MENU];
        console.log('[AFC Menu] Using default menu:', _menuData.length, 'items');
        
        // Save defaults with version
        save();
        
        return _menuData;
    }
    
    /**
     * Save menu to storage with version tracking
     * @returns {boolean} Success
     */
    function save() {
        try {
            const dataString = JSON.stringify(_menuData);
            localStorage.setItem(AFC_CONFIG.STORAGE_KEYS.MENU, dataString);
            
            // Save menu version for consistency tracking
            localStorage.setItem(MENU_VERSION_KEY, CURRENT_MENU_VERSION);
            
            // Dispatch sync events
            window.dispatchEvent(new CustomEvent('afc-menu-updated', {
                detail: { menuData: _menuData }
            }));
            
            return true;
        } catch (e) {
            console.error('[AFC Menu] Error saving menu:', e);
            
            if (e.name === 'QuotaExceededError') {
                // Try to save without images
                const stripped = _menuData.map(item => ({ ...item, image: null }));
                try {
                    localStorage.setItem(AFC_CONFIG.STORAGE_KEYS.MENU, JSON.stringify(stripped));
                    localStorage.setItem(MENU_VERSION_KEY, CURRENT_MENU_VERSION);
                    _menuData = stripped;
                    return true;
                } catch (e2) {
                    return false;
                }
            }
            
            return false;
        }
    }
    
    /**
     * Get all menu items
     * @returns {Array} Menu items
     */
    function getAll() {
        return [..._menuData];
    }
    
    /**
     * Get filtered menu items
     * @returns {Array} Filtered items
     */
    function getFiltered() {
        let filtered = [..._menuData];
        
        // Apply category filter
        if (_currentFilter !== 'all') {
            filtered = filtered.filter(item => item.category === _currentFilter);
        }
        
        // Apply search filter
        if (_searchQuery.trim()) {
            const query = _searchQuery.toLowerCase().trim();
            filtered = filtered.filter(item => {
                const name = (item.name || '').toLowerCase();
                const description = (item.description || '').toLowerCase();
                const category = (item.category || '').toLowerCase();
                return name.includes(query) || description.includes(query) || category.includes(query);
            });
        }
        
        return filtered;
    }
    
    /**
     * Get item by ID
     * @param {number} itemId - Item ID
     * @returns {Object|null} Menu item
     */
    function getById(itemId) {
        return _menuData.find(item => item.id === itemId) || null;
    }
    
    /**
     * Add new menu item
     * @param {Object} item - Item data
     * @returns {Object} Created item
     */
    function addItem(item) {
        const maxId = _menuData.length > 0 
            ? Math.max(..._menuData.map(i => i.id)) 
            : 0;
        
        const newItem = {
            id: maxId + 1,
            name: item.name || 'Unnamed Item',
            price: parseFloat(item.price) || 0,
            category: item.category || 'other',
            description: item.description || '',
            emoji: item.emoji || '🍽️',
            image: item.image || null
        };
        
        _menuData.push(newItem);
        save();
        
        return newItem;
    }
    
    /**
     * Update menu item
     * @param {number} itemId - Item ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated item
     */
    function updateItem(itemId, updates) {
        const item = _menuData.find(i => i.id === itemId);
        if (!item) return null;
        
        Object.assign(item, {
            name: updates.name ?? item.name,
            price: updates.price !== undefined ? parseFloat(updates.price) : item.price,
            category: updates.category ?? item.category,
            description: updates.description ?? item.description,
            emoji: updates.emoji ?? item.emoji,
            image: updates.image !== undefined ? updates.image : item.image
        });
        
        save();
        return item;
    }
    
    /**
     * Delete menu item
     * @param {number} itemId - Item ID
     * @returns {boolean} Success
     */
    function deleteItem(itemId) {
        const index = _menuData.findIndex(i => i.id === itemId);
        if (index === -1) return false;
        
        _menuData.splice(index, 1);
        save();
        return true;
    }
    
    /**
     * Set category filter
     * @param {string} category - Category name
     */
    function setFilter(category) {
        _currentFilter = category;
    }
    
    /**
     * Get current filter
     * @returns {string} Current filter
     */
    function getFilter() {
        return _currentFilter;
    }
    
    /**
     * Set search query
     * @param {string} query - Search query
     */
    function setSearch(query) {
        _searchQuery = query;
    }
    
    /**
     * Get search query
     * @returns {string} Search query
     */
    function getSearch() {
        return _searchQuery;
    }
    
    /**
     * Reset filters
     */
    function resetFilters() {
        _currentFilter = 'all';
        _searchQuery = '';
    }
    
    /**
     * Get unique categories from menu
     * @returns {Array} Category list
     */
    function getCategories() {
        return [...new Set(_menuData.map(item => item.category))];
    }
    
    /**
     * Get category counts
     * @returns {Object} Category counts
     */
    function getCategoryCounts() {
        const counts = { all: _menuData.length };
        
        _menuData.forEach(item => {
            const cat = item.category || 'other';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        
        return counts;
    }
    
    /**
     * Get category emoji
     * @param {string} category - Category name
     * @returns {string} Emoji
     */
    function getCategoryEmoji(category) {
        return AFC_CONFIG.CATEGORIES.EMOJIS[category] || '🍽️';
    }
    
    /**
     * Format category name for display
     * @param {string} category - Category name
     * @returns {string} Formatted name
     */
    function formatCategoryName(category) {
        return (category || '')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    /**
     * Setup real-time sync with admin
     * @param {Function} onUpdate - Callback when menu updates
     */
    function setupSync(onUpdate) {
        // Cross-tab storage sync
        window.addEventListener('storage', (e) => {
            if (e.key === AFC_CONFIG.STORAGE_KEYS.MENU) {
                console.log('[AFC Menu] Cross-tab sync detected');
                load();
                if (onUpdate) onUpdate(_menuData);
            }
        });
        
        // Same-tab custom event sync
        window.addEventListener('afc-menu-updated', (e) => {
            if (e.detail && e.detail.menuData) {
                _menuData = e.detail.menuData;
                if (onUpdate) onUpdate(_menuData);
            }
        });
        
        // Polling fallback (reduced frequency for battery)
        setInterval(() => {
            const stored = localStorage.getItem(AFC_CONFIG.STORAGE_KEYS.MENU);
            if (stored) {
                try {
                    const newMenu = JSON.parse(stored);
                    if (JSON.stringify(newMenu) !== JSON.stringify(_menuData)) {
                        _menuData = newMenu;
                        if (onUpdate) onUpdate(_menuData);
                    }
                } catch (e) {
                    console.error('[AFC Menu] Polling error:', e);
                }
            }
        }, AFC_CONFIG.SYNC.POLLING_INTERVAL);
    }
    
    /**
     * Compress image for storage
     * @param {File} file - Image file
     * @param {number} maxWidth - Max width
     * @param {number} quality - JPEG quality
     * @returns {Promise<string>} Data URL
     */
    function compressImage(file, maxWidth = 400, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedDataUrl);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Get storage usage info
     * @returns {Object} Storage stats
     */
    function getStorageInfo() {
        const MAX_STORAGE = 5 * 1024 * 1024; // 5MB
        let totalSize = 0;
        
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const itemSize = (localStorage[key].length + key.length) * 2;
                totalSize += itemSize;
            }
        }
        
        const usedPercent = Math.min((totalSize / MAX_STORAGE) * 100, 100);
        const usedMB = (totalSize / (1024 * 1024)).toFixed(2);
        
        return {
            totalSize,
            usedPercent,
            usedMB,
            maxMB: 5,
            isWarning: usedPercent >= 70,
            isCritical: usedPercent >= 90
        };
    }
    
    /**
     * Force reset menu to defaults
     * Useful for debugging cross-device sync issues
     */
    function resetToDefaults() {
        _menuData = [...AFC_CONFIG.DEFAULT_MENU];
        localStorage.removeItem(MENU_VERSION_KEY);
        save();
        console.log('[AFC Menu] Reset to defaults:', _menuData.length, 'items');
        return _menuData;
    }
    
    /**
     * Get current menu version
     * @returns {string} Version string
     */
    function getVersion() {
        return CURRENT_MENU_VERSION;
    }
    
    // Public API
    return {
        load,
        save,
        getAll,
        getFiltered,
        getById,
        addItem,
        updateItem,
        deleteItem,
        setFilter,
        getFilter,
        setSearch,
        getSearch,
        resetFilters,
        getCategories,
        getCategoryCounts,
        getCategoryEmoji,
        formatCategoryName,
        setupSync,
        compressImage,
        getStorageInfo,
        resetToDefaults,
        getVersion
    };
})();

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AFC_MENU;
}
