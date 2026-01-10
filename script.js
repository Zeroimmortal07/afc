// ============================================
// BUSINESS CONFIGURATION (SECURE)
// ============================================
const BUSINESS_WHATSAPP_NUMBER = '+919167931883';
const STORAGE_KEY = 'menuItems';

// Default Menu Data (fallback if localStorage is empty)
const DEFAULT_MENU_DATA = [
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
];

// State Management
let menuData = [];
let cart = [];
let currentFilter = 'all';
let searchQuery = '';

// Load menu from localStorage or use defaults
function loadMenuFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        console.log('[AFC] Loading from localStorage:', stored ? 'Found data' : 'No data');
        
        if (stored) {
            const parsed = JSON.parse(stored);
            // Validate that it's an array
            if (Array.isArray(parsed) && parsed.length > 0) {
                menuData = parsed;
                console.log('[AFC] Loaded menu items:', menuData.length, 'items');
            } else {
                console.warn('[AFC] Stored data is empty or invalid, using defaults');
                menuData = [...DEFAULT_MENU_DATA];
            }
        } else {
            menuData = [...DEFAULT_MENU_DATA];
            console.log('[AFC] No stored data, using default menu:', menuData.length, 'items');
            // Save defaults so they're available for admin page
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(menuData));
                console.log('[AFC] Saved default menu to localStorage');
            } catch (saveError) {
                console.warn('[AFC] Could not save default menu:', saveError);
            }
        }
    } catch (e) {
        console.error('[AFC] Error loading menu from storage:', e);
        menuData = [...DEFAULT_MENU_DATA];
    }
    updateMenuItemCount();
    updateCategoryCounts();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadMenuFromStorage();
    renderCategoryFilters(); // Render dynamic category filters
    renderMenu();
    setupEventListeners();
    setupStorageSync();
});

// Real-time sync with admin panel
function setupStorageSync() {
    // Listen for storage changes from admin panel (cross-tab)
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            console.log('[AFC] Storage change detected (cross-tab) - syncing...');
            syncMenuFromStorage();
        }
    });
    
    // Listen for custom event from admin panel (same-tab sync)
    window.addEventListener('afc-menu-updated', (e) => {
        console.log('[AFC] Custom menu update event received - syncing...');
        if (e.detail && e.detail.menuData) {
            menuData = e.detail.menuData;
            updateMenuItemCount();
            updateCategoryCounts();
            renderCategoryFilters();
            renderMenu();
            showToast('Menu updated!', 'success');
        }
    });
    
    // Polling fallback for edge cases (reduced frequency)
    setInterval(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const newMenu = JSON.parse(stored);
                if (JSON.stringify(newMenu) !== JSON.stringify(menuData)) {
                    console.log('[AFC] Menu change detected via polling');
                    syncMenuFromStorage();
                }
            } catch (e) {
                console.error('[AFC] Polling error:', e);
            }
        }
    }, 2000);
}

// Helper function to sync menu from storage and update UI
function syncMenuFromStorage() {
    loadMenuFromStorage();
    renderCategoryFilters();
    renderMenu();
    showToast('Menu updated!', 'success');
}

function refreshMenu() {
    loadMenuFromStorage();
    renderCategoryFilters(); // Update category filters
    renderMenu();
    showToast('Menu refreshed!', 'success');
}

// Render Menu
function renderMenu() {
    const menuGrid = document.getElementById('menuGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!menuGrid) {
        console.error('[AFC] menuGrid element not found!');
        return;
    }
    
    console.log('[AFC] renderMenu() called, items:', menuData.length);
    
    // Apply filters
    let filtered = menuData;
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(item => item.category === currentFilter);
    }
    
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(item => {
            // Defensive null checks
            const name = (item.name || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            const category = (item.category || '').toLowerCase();
            return name.includes(query) || description.includes(query) || category.includes(query);
        });
    }
    
    // Handle empty state
    if (filtered.length === 0) {
        menuGrid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    // Render menu cards
    menuGrid.innerHTML = filtered.map(item => {
        try {
            const cartItem = cart.find(c => c.id === item.id);
            const inCart = cartItem ? cartItem.quantity : 0;
            
            const imageHTML = item.image 
                ? `<img src="${item.image}" alt="${item.name || 'Item'}" class="menu-card-image" loading="lazy">`
                : `<div class="menu-card-emoji">${item.emoji || '🍽️'}</div>`;
            
            // Logic: Show Add button or Quantity controls
            const actionButton = inCart > 0 
                ? `<div class="card-qty-control">
                       <button class="qty-action-btn" onclick="updateQuantity(${item.id}, -1)">
                           <i class="fas fa-minus"></i>
                       </button>
                       <span class="qty-display">${inCart}</span>
                       <button class="qty-action-btn" onclick="updateQuantity(${item.id}, 1)">
                           <i class="fas fa-plus"></i>
                       </button>
                   </div>`
                : `<button class="btn-add-to-cart" onclick="addToCart(${item.id})">
                        <i class="fas fa-plus"></i>
                        <span>Add</span>
                   </button>`;

            return `
                <article class="menu-card" data-id="${item.id}">
                    <div class="menu-card-visual">
                        ${imageHTML}
                        <span class="menu-card-category">${item.category || 'Other'}</span>
                    </div>
                    <div class="menu-card-content">
                        <h3 class="menu-card-title">${item.name || 'Unnamed Item'}</h3>
                        <p class="menu-card-description">${item.description || ''}</p>
                        <div class="menu-card-footer">
                            <div class="menu-card-price">
                                <span class="price-currency">₹</span>
                                <span class="price-amount">${item.price || 0}</span>
                            </div>
                            ${actionButton}
                        </div>
                    </div>
                </article>
            `;
        } catch (e) {
            console.error('[AFC] Error rendering item:', item, e);
            return '';
        }
    }).join('');
    
    console.log('[AFC] Rendered', filtered.length, 'items');
    updateMenuItemCount();
}

// Filter Category
function filterCategory(category, clickedBtn = null) {
    currentFilter = category;
    
    // Update active state on pills
    document.querySelectorAll('.category-pill').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    } else {
        const btn = document.querySelector(`.category-pill[data-category="${category}"]`);
        if (btn) btn.classList.add('active');
    }
    
    renderMenu();
}

// Category emoji mapping for known categories
const CATEGORY_EMOJIS = {
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
};

function getCategoryEmoji(category) {
    return CATEGORY_EMOJIS[category] || '🍽️';
}

function formatCategoryName(category) {
    return category
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function renderCategoryFilters() {
    const container = document.querySelector('.categories-modern');
    if (!container) return;
    
    // Get unique categories from menu data
    const uniqueCategories = [...new Set(menuData.map(item => item.category))];
    
    // Build category counts
    const counts = { all: menuData.length };
    uniqueCategories.forEach(cat => {
        counts[cat] = menuData.filter(i => i.category === cat).length;
    });
    
    // Generate HTML for category pills
    let html = `
        <button class="category-pill ${currentFilter === 'all' ? 'active' : ''}" onclick="filterCategory('all', this)" data-category="all">
            <span class="pill-icon">🍽️</span>
            <span class="pill-text">All Items</span>
            <span class="pill-count">${counts.all}</span>
        </button>
    `;
    
    uniqueCategories.forEach(category => {
        const emoji = getCategoryEmoji(category);
        const name = formatCategoryName(category);
        const isActive = currentFilter === category ? 'active' : '';
        
        html += `
            <button class="category-pill ${isActive}" onclick="filterCategory('${category}', this)" data-category="${category}">
                <span class="pill-icon">${emoji}</span>
                <span class="pill-text">${name}</span>
                <span class="pill-count">${counts[category]}</span>
            </button>
        `;
    });
    
    container.innerHTML = html;
}

function updateCategoryCounts() {
    // Re-render category filters to update counts dynamically
    renderCategoryFilters();
}

function updateMenuItemCount() {
    const el = document.getElementById('menuItemCount');
    if (el) el.textContent = menuData.length;
}

// Search Functionality
function handleSearch(value) {
    searchQuery = value;
    renderMenu();
}

function resetFilters() {
    currentFilter = 'all';
    searchQuery = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    document.querySelectorAll('.category-pill').forEach(btn => {
        btn.classList.remove('active');
    });
    const allBtn = document.querySelector('.category-pill[data-category="all"]');
    if (allBtn) allBtn.classList.add('active');
    
    renderMenu();
}

// Add to Cart
function addToCart(itemId) {
    const menuItem = menuData.find(item => item.id === itemId);
    if (!menuItem) return;
    
    const cartItem = cart.find(item => item.id === itemId);

    if (cartItem) {
        cartItem.quantity++;
    } else {
        cart.push({ ...menuItem, quantity: 1 });
    }

    updateCartUI();
    renderMenu();
    showToast(`${menuItem.name} added to cart!`, 'success');
}

// Remove from Cart
function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    updateCartUI();
    renderCartItems();
    renderMenu();
}

// Update Quantity
function updateQuantity(itemId, delta) {
    const cartItem = cart.find(item => item.id === itemId);
    if (!cartItem) return;
    
    cartItem.quantity += delta;
    
    if (cartItem.quantity <= 0) {
        removeFromCart(itemId);
    } else {
        updateCartUI();
        renderCartItems();
        renderMenu();
    }
}

// Update Cart UI
function updateCartUI() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const cartCount = document.getElementById('cartCount');
    if (cartCount) cartCount.textContent = count;
    
    const cartTotalPreview = document.getElementById('cartTotalPreview');
    if (cartTotalPreview) cartTotalPreview.textContent = `₹${total}`;
    
    const cartItemCount = document.getElementById('cartItemCount');
    if (cartItemCount) cartItemCount.textContent = `${count} item${count !== 1 ? 's' : ''}`;
    
    const subtotal = document.getElementById('subtotal');
    const cartTotal = document.getElementById('cartTotal');
    if (subtotal) subtotal.textContent = `₹${total}`;
    if (cartTotal) cartTotal.textContent = `₹${total}`;
    
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
}

// Legacy function support
function updateCartCount() {
    updateCartUI();
}

// Open Cart
function openCart() {
    document.getElementById('cartModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderCartItems();
}

// Close Cart
function closeCart() {
    document.getElementById('cartModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Render Cart Items
function renderCartItems() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '';
        if (cartEmpty) cartEmpty.style.display = 'flex';
        return;
    }

    if (cartEmpty) cartEmpty.style.display = 'none';

    cartItemsDiv.innerHTML = cart.map(item => `
        <div class="cart-item-card">
            <div class="cart-item-visual">
                ${item.image 
                    ? `<img src="${item.image}" alt="${item.name}">` 
                    : `<span class="cart-item-emoji">${item.emoji}</span>`}
            </div>
            <div class="cart-item-details">
                <h4 class="cart-item-name">${item.name}</h4>
                <p class="cart-item-price">₹${item.price} each</p>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="qty-value">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="cart-item-total">
                ₹${item.price * item.quantity}
            </div>
            <button class="cart-item-remove-btn" onclick="removeFromCart(${item.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');

    updateCartUI();
}

// Proceed to Checkout
function proceedToCheckout() {
    if (cart.length === 0) {
        showToast('Your cart is empty!', 'error');
        return;
    }
    closeCart();
    document.getElementById('reviewModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderReviewItems();
}

// Render Review Items
function renderReviewItems() {
    const reviewItems = document.getElementById('reviewItems');
    const reviewTotal = document.getElementById('reviewTotal');

    reviewItems.innerHTML = cart.map(item => `
        <div class="review-item">
            <div class="review-item-info">
                <span class="review-item-qty">${item.quantity}x</span>
                <span class="review-item-name">${item.name}</span>
            </div>
            <span class="review-item-price">₹${item.price * item.quantity}</span>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    reviewTotal.textContent = `₹${total}`;
}

// Close Review
function closeReview() {
    document.getElementById('reviewModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Setup Event Listeners
function setupEventListeners() {
    const form = document.getElementById('orderForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            placeOrderViaWhatsApp();
        });
    }
    
    // Close modals on backdrop click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCart();
            closeReview();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.focus();
        }
    });
}

// Legacy alias
function setupFormListener() {
    setupEventListeners();
}

// ============================================
// GOOGLE SHEETS API CONFIGURATION
// ============================================
function sendOrderToSheet(phone, items, total) {
  fetch("https://script.google.com/macros/s/AKfycbyjr6GTwbHKJ6QP6wNigTHI7iLfCSR0dbMZTDumKnTLI_NSbjbeAYlAmEqWLHknqBK24g/exec", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      phone: phone,
      items: items,
      total: total
    })
  })
  .then(res => res.json())
  .then(data => {
    console.log("Stored in Sheet:", data);
  })
  .catch(err => {
    console.error("Sheet error:", err);
  });
}

/**
 * Build WhatsApp message from order data
 * @param {Object} details - Customer and order details
 * @returns {string} - Formatted message
 */
function buildWhatsAppMessage(details) {
    const { name, phone, address, items, total } = details;
    
    return `*🍽️ AFC Order*

*Customer Details:*
📛 Name: ${name}
📱 Phone: ${phone}
📍 Address: ${address}

*Order Items:*
${items}

*💰 Total: ₹${total}*

_Please confirm this order_`;
}

/**
 * Open WhatsApp with prefilled message
 * @param {string} message - Message to send
 */
function openWhatsApp(message) {
    const encodedMessage = encodeURIComponent(message);
    const whatsappNumber = BUSINESS_WHATSAPP_NUMBER.replace(/\D/g, '');
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(whatsappURL, '_blank');
}

/**
 * Main order submission handler
 * Flow: Validate → Send to Sheets → Open WhatsApp → Clear cart
 */
function placeOrderViaWhatsApp() {
    // 1. Get form values
    const name = document.getElementById('customerName').value.trim();
    const countryCode = document.getElementById('countryCode').value;
    const mobileNumber = document.getElementById('mobileNumber').value.trim();
    const address = document.getElementById('deliveryAddress').value.trim();

    // 2. Validate required fields
    if (!name || !mobileNumber || !address) {
        showToast('Please fill all required fields!', 'error');
        return;
    }

    if (cart.length === 0) {
        showToast('Your cart is empty!', 'error');
        return;
    }

    // 3. Prepare order data
    const phone = `${countryCode}${mobileNumber}`;
    const orderItems = cart.map(item =>
        `• ${item.quantity}x ${item.name} - ₹${item.price * item.quantity}`
    ).join('\n');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 4. Show loading state
    const submitBtn = document.querySelector('.btn-whatsapp-order');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Sending...</span>';
    }

    // 5. Send to Google Sheets
    sendOrderToSheet(phone, orderItems, total);

    // 6. Restore button state
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }

    // 7. Build WhatsApp message and open
    const whatsappMessage = buildWhatsAppMessage({
        name,
        phone,
        address,
        items: orderItems,
        total
    });

    openWhatsApp(whatsappMessage);

    // 8. Clear order and show success
    showToast('Order placed successfully!', 'success');
    setTimeout(() => {
        clearOrder();
    }, 500);
}

// Clear Order
function clearOrder() {
    document.getElementById('orderForm').reset();
    cart = [];
    updateCartUI();
    closeReview();
    renderMenu();
}

// Toast Notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        // Fallback to old notification style
        showNotification(message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Show Notification (Legacy Support)
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10B981;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        z-index: 2000;
        animation: slideIn 0.3s ease-in-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    const cartModal = document.getElementById('cartModal');
    const reviewModal = document.getElementById('reviewModal');

    if (e.target === cartModal) closeCart();
    if (e.target === reviewModal) closeReview();
});

// Mobile menu interactions
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCart();
        closeReview();
    }
});
