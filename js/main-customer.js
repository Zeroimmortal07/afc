/**
 * AFC Customer Page Main Script
 * Uses modular architecture for better maintainability
 * @version 3.0.0 - CONSISTENCY FIX
 */

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[AFC] Initializing customer page v3.0.0...');
    console.log('[AFC] User Agent:', navigator.userAgent);
    console.log('[AFC] Screen:', window.innerWidth, 'x', window.innerHeight);
    
    // Initialize theme
    AFC_UI.theme.init();
    
    // CRITICAL: Force fresh load to ensure consistency
    AFC_MENU.load();
    const loadedItems = AFC_MENU.getAll();
    console.log('[AFC] LOADED MENU ITEMS:', loadedItems.length, 'items');
    console.log('[AFC] First 3 items:', loadedItems.slice(0, 3).map(i => i.name));
    
    // Setup sync
    AFC_MENU.setupSync(handleMenuUpdate);
    
    // Render UI
    renderCategoryFilters();
    renderMenu();
    updateCartUI();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('[AFC] Customer page initialized - menu count:', loadedItems.length);
});

// ============================================
// MENU RENDERING
// ============================================

function handleMenuUpdate(menuData) {
    renderCategoryFilters();
    renderMenu();
    AFC_UI.showToast('Menu updated!', 'success');
}

function renderMenu() {
    const menuGrid = document.getElementById('menuGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!menuGrid) return;
    
    // Show skeleton loading
    if (menuGrid.children.length === 0) {
        AFC_UI.showSkeletonLoading(menuGrid, 'card', 6);
    }
    
    const filtered = AFC_MENU.getFiltered();
    
    if (filtered.length === 0) {
        menuGrid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    menuGrid.innerHTML = filtered.map(item => {
        const cartItem = AFC_CART.getItem(item.id);
        const inCart = cartItem ? cartItem.quantity : 0;
        
        const imageHTML = item.image 
            ? `<img src="${AFC_UI.escapeHtml(item.image)}" alt="${AFC_UI.escapeHtml(item.name)}" class="menu-card-image" loading="lazy">`
            : `<div class="menu-card-emoji">${item.emoji || '🍽️'}</div>`;
        
        const actionButton = inCart > 0 
            ? `<div class="card-qty-control">
                   <button class="qty-action-btn" onclick="updateQuantity(${item.id}, -1)" aria-label="Decrease quantity">
                       <i class="fas fa-minus" aria-hidden="true"></i>
                   </button>
                   <span class="qty-display" aria-label="Quantity: ${inCart}">${inCart}</span>
                   <button class="qty-action-btn" onclick="updateQuantity(${item.id}, 1)" aria-label="Increase quantity">
                       <i class="fas fa-plus" aria-hidden="true"></i>
                   </button>
               </div>`
            : `<button class="btn-add-to-cart" onclick="addToCart(${item.id})" aria-label="Add ${AFC_UI.escapeHtml(item.name)} to cart">
                    <i class="fas fa-plus" aria-hidden="true"></i>
                    <span>Add</span>
               </button>`;

        return `
            <article class="menu-card" data-id="${item.id}" role="listitem">
                <div class="menu-card-visual">
                    ${imageHTML}
                    <span class="menu-card-category">${AFC_UI.escapeHtml(AFC_MENU.formatCategoryName(item.category))}</span>
                </div>
                <div class="menu-card-content">
                    <h3 class="menu-card-title">${AFC_UI.escapeHtml(item.name)}</h3>
                    <p class="menu-card-description">${AFC_UI.escapeHtml(item.description || '')}</p>
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
    }).join('');
    
    updateMenuItemCount();
}

function renderCategoryFilters() {
    const container = document.querySelector('.categories-modern');
    if (!container) return;
    
    const categories = AFC_MENU.getCategories();
    const counts = AFC_MENU.getCategoryCounts();
    const currentFilter = AFC_MENU.getFilter();
    
    let html = `
        <button class="category-pill ${currentFilter === 'all' ? 'active' : ''}" 
                onclick="filterCategory('all', this)" 
                data-category="all"
                aria-pressed="${currentFilter === 'all'}">
            <span class="pill-icon" aria-hidden="true">🍽️</span>
            <span class="pill-text">All Items</span>
            <span class="pill-count">${counts.all}</span>
        </button>
    `;
    
    categories.forEach(category => {
        const emoji = AFC_MENU.getCategoryEmoji(category);
        const name = AFC_MENU.formatCategoryName(category);
        const isActive = currentFilter === category;
        
        html += `
            <button class="category-pill ${isActive ? 'active' : ''}" 
                    onclick="filterCategory('${AFC_UI.escapeHtml(category)}', this)" 
                    data-category="${AFC_UI.escapeHtml(category)}"
                    aria-pressed="${isActive}">
                <span class="pill-icon" aria-hidden="true">${emoji}</span>
                <span class="pill-text">${AFC_UI.escapeHtml(name)}</span>
                <span class="pill-count">${counts[category] || 0}</span>
            </button>
        `;
    });
    
    container.innerHTML = html;
}

function updateMenuItemCount() {
    const el = document.getElementById('menuItemCount');
    if (el) el.textContent = AFC_MENU.getAll().length;
}

// ============================================
// FILTERING & SEARCH
// ============================================

function filterCategory(category, clickedBtn = null) {
    AFC_MENU.setFilter(category);
    
    document.querySelectorAll('.category-pill').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    
    if (clickedBtn) {
        clickedBtn.classList.add('active');
        clickedBtn.setAttribute('aria-pressed', 'true');
    }
    
    renderMenu();
}

const handleSearch = AFC_UI.debounce((value) => {
    AFC_MENU.setSearch(value);
    renderMenu();
}, 300);

function resetFilters() {
    AFC_MENU.resetFilters();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    renderCategoryFilters();
    renderMenu();
}

function refreshMenu() {
    AFC_MENU.load();
    renderCategoryFilters();
    renderMenu();
    AFC_UI.showToast('Menu refreshed!', 'success');
}

// ============================================
// CART OPERATIONS
// ============================================

function addToCart(itemId) {
    const menuItem = AFC_MENU.getById(itemId);
    if (!menuItem) return;
    
    AFC_CART.addItem(menuItem);
    updateCartUI();
    renderMenu();
    AFC_UI.showToast(`${menuItem.name} added to cart!`, 'success');
}

async function removeFromCart(itemId) {
    const item = AFC_CART.getItem(itemId);
    if (!item) return;
    
    const confirmed = await AFC_UI.showConfirm({
        title: 'Remove Item',
        message: `Remove "${item.name}" from cart?`,
        confirmText: 'Remove',
        type: 'warning'
    });
    
    if (confirmed) {
        AFC_CART.removeItem(itemId);
        updateCartUI();
        renderCartItems();
        renderMenu();
    }
}

function updateQuantity(itemId, delta) {
    const result = AFC_CART.updateQuantity(itemId, delta);
    updateCartUI();
    renderCartItems();
    renderMenu();
}

function updateCartUI() {
    const summary = AFC_CART.getSummary();
    
    const cartCount = document.getElementById('cartCount');
    if (cartCount) cartCount.textContent = summary.itemCount;
    
    const cartTotalPreview = document.getElementById('cartTotalPreview');
    if (cartTotalPreview) cartTotalPreview.textContent = AFC_UI.formatCurrency(summary.total);
    
    const cartItemCount = document.getElementById('cartItemCount');
    if (cartItemCount) cartItemCount.textContent = `${summary.itemCount} item${summary.itemCount !== 1 ? 's' : ''}`;
    
    const subtotal = document.getElementById('subtotal');
    const cartTotal = document.getElementById('cartTotal');
    if (subtotal) subtotal.textContent = AFC_UI.formatCurrency(summary.subtotal);
    if (cartTotal) cartTotal.textContent = AFC_UI.formatCurrency(summary.total);
    
    // Show discount if applicable
    const discountRow = document.getElementById('discountRow');
    const discountAmount = document.getElementById('discountAmount');
    if (discountRow && discountAmount) {
        if (summary.discount > 0) {
            discountRow.style.display = 'flex';
            discountAmount.textContent = `-${AFC_UI.formatCurrency(summary.discount)}`;
        } else {
            discountRow.style.display = 'none';
        }
    }
    
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.disabled = summary.isEmpty;
}

// ============================================
// CART MODAL
// ============================================

function openCart() {
    document.getElementById('cartModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderCartItems();
    AFC_UI.a11y.announce('Cart opened');
}

function closeCart() {
    document.getElementById('cartModal').classList.remove('active');
    document.body.style.overflow = '';
}

function renderCartItems() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const items = AFC_CART.getItems();

    if (items.length === 0) {
        cartItemsDiv.innerHTML = '';
        if (cartEmpty) cartEmpty.style.display = 'flex';
        return;
    }

    if (cartEmpty) cartEmpty.style.display = 'none';

    cartItemsDiv.innerHTML = items.map(item => `
        <div class="cart-item-card" role="listitem">
            <div class="cart-item-visual">
                ${item.image 
                    ? `<img src="${AFC_UI.escapeHtml(item.image)}" alt="${AFC_UI.escapeHtml(item.name)}">` 
                    : `<span class="cart-item-emoji">${item.emoji || '🍽️'}</span>`}
            </div>
            <div class="cart-item-details">
                <h4 class="cart-item-name">${AFC_UI.escapeHtml(item.name)}</h4>
                <p class="cart-item-price">${AFC_UI.formatCurrency(item.price)} each</p>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)" aria-label="Decrease">
                    <i class="fas fa-minus" aria-hidden="true"></i>
                </button>
                <span class="qty-value">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)" aria-label="Increase">
                    <i class="fas fa-plus" aria-hidden="true"></i>
                </button>
            </div>
            <div class="cart-item-total">
                ${AFC_UI.formatCurrency(item.price * item.quantity)}
            </div>
            <button class="cart-item-remove-btn" onclick="removeFromCart(${item.id})" aria-label="Remove ${AFC_UI.escapeHtml(item.name)}">
                <i class="fas fa-trash" aria-hidden="true"></i>
            </button>
        </div>
    `).join('');

    // Render promo code section
    renderPromoCodeSection();
    
    updateCartUI();
}

function renderPromoCodeSection() {
    const promoContainer = document.getElementById('promoCodeSection');
    if (!promoContainer) return;
    
    const appliedPromo = AFC_CART.getAppliedPromo();
    
    if (appliedPromo) {
        promoContainer.innerHTML = `
            <div class="promo-applied">
                <span class="promo-tag">
                    <i class="fas fa-tag" aria-hidden="true"></i>
                    ${AFC_UI.escapeHtml(appliedPromo.code)}
                </span>
                <button class="promo-remove-btn" onclick="removePromoCode()" aria-label="Remove promo code">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
        `;
    } else {
        promoContainer.innerHTML = `
            <div class="promo-input-group">
                <input type="text" id="promoCodeInput" placeholder="Enter promo code" aria-label="Promo code">
                <button class="promo-apply-btn" onclick="applyPromoCode()">Apply</button>
            </div>
        `;
    }
}

function applyPromoCode() {
    const input = document.getElementById('promoCodeInput');
    if (!input) return;
    
    const code = input.value.trim();
    const result = AFC_CART.applyPromoCode(code);
    
    if (result.success) {
        AFC_UI.showToast(result.message, 'success');
        renderCartItems();
        updateCartUI();
    } else {
        AFC_UI.showToast(result.message, 'error');
    }
}

function removePromoCode() {
    AFC_CART.removePromoCode();
    renderCartItems();
    updateCartUI();
    AFC_UI.showToast('Promo code removed', 'info');
}

// ============================================
// CHECKOUT & ORDER
// ============================================

function proceedToCheckout() {
    if (AFC_CART.getSummary().isEmpty) {
        AFC_UI.showToast('Your cart is empty!', 'error');
        return;
    }
    closeCart();
    document.getElementById('reviewModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    renderReviewItems();
}

function renderReviewItems() {
    const reviewItems = document.getElementById('reviewItems');
    const reviewTotal = document.getElementById('reviewTotal');
    const items = AFC_CART.getItems();
    const summary = AFC_CART.getSummary();

    reviewItems.innerHTML = items.map(item => `
        <div class="review-item">
            <div class="review-item-info">
                <span class="review-item-qty">${item.quantity}x</span>
                <span class="review-item-name">${AFC_UI.escapeHtml(item.name)}</span>
            </div>
            <span class="review-item-price">${AFC_UI.formatCurrency(item.price * item.quantity)}</span>
        </div>
    `).join('');
    
    // Add discount row if applicable
    if (summary.discount > 0) {
        reviewItems.innerHTML += `
            <div class="review-item review-discount">
                <div class="review-item-info">
                    <span class="review-item-name">Discount (${AFC_UI.escapeHtml(summary.promoCode || '')})</span>
                </div>
                <span class="review-item-price discount-price">-${AFC_UI.formatCurrency(summary.discount)}</span>
            </div>
        `;
    }

    reviewTotal.textContent = AFC_UI.formatCurrency(summary.total);
}

function closeReview() {
    document.getElementById('reviewModal').classList.remove('active');
    document.body.style.overflow = '';
}

async function placeOrderViaWhatsApp() {
    const name = document.getElementById('customerName').value.trim();
    const countryCode = document.getElementById('countryCode').value;
    const mobileNumber = document.getElementById('mobileNumber').value.trim();
    const address = document.getElementById('deliveryAddress').value.trim();

    if (!name || !mobileNumber || !address) {
        AFC_UI.showToast('Please fill all required fields!', 'error');
        return;
    }

    if (!AFC_API.validatePhone(mobileNumber)) {
        AFC_UI.showToast('Please enter a valid phone number', 'error');
        return;
    }

    if (AFC_CART.getSummary().isEmpty) {
        AFC_UI.showToast('Your cart is empty!', 'error');
        return;
    }

    const submitBtn = document.querySelector('.btn-whatsapp-order');
    AFC_UI.setButtonLoading(submitBtn, true, 'Sending...');

    const phone = `${countryCode}${mobileNumber}`;
    const items = AFC_CART.getItems();
    const summary = AFC_CART.getSummary();
    
    const orderItems = items.map(item =>
        `• ${item.quantity}x ${item.name} - ₹${item.price * item.quantity}`
    ).join('\n');

    // Send to Google Sheets
    await AFC_API.sendOrderToSheet({
        phone,
        customerName: name,
        address,
        items: orderItems,
        total: summary.total,
        promoCode: summary.promoCode || '',
        discount: summary.discount
    });

    // Save to order history
    AFC_CART.saveOrderToHistory({
        customerName: name,
        phone,
        address
    });

    // Build and open WhatsApp
    const whatsappMessage = AFC_API.buildWhatsAppMessage({
        name,
        phone,
        address,
        items: orderItems,
        total: summary.total,
        promoCode: summary.promoCode,
        discount: summary.discount
    });

    AFC_API.openWhatsApp(whatsappMessage);

    AFC_UI.setButtonLoading(submitBtn, false);
    AFC_UI.showToast('Order placed successfully!', 'success');
    
    setTimeout(clearOrder, 500);
}

function clearOrder() {
    document.getElementById('orderForm').reset();
    AFC_CART.clear();
    updateCartUI();
    closeReview();
    renderMenu();
}

// ============================================
// ORDER HISTORY
// ============================================

function openOrderHistory() {
    const modal = document.getElementById('orderHistoryModal');
    if (!modal) return;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderOrderHistory();
}

function closeOrderHistory() {
    const modal = document.getElementById('orderHistoryModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function renderOrderHistory() {
    const container = document.getElementById('orderHistoryList');
    if (!container) return;
    
    const history = AFC_CART.getOrderHistory();
    
    if (history.length === 0) {
        container.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-receipt" aria-hidden="true"></i>
                <h3>No order history</h3>
                <p>Your past orders will appear here</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = history.map(order => `
        <div class="history-card">
            <div class="history-header">
                <span class="history-id">${AFC_UI.escapeHtml(order.id)}</span>
                <span class="history-date">${AFC_UI.formatDate(order.date)}</span>
            </div>
            <div class="history-items">
                ${order.items.map(item => `
                    <span class="history-item">${item.quantity}x ${AFC_UI.escapeHtml(item.name)}</span>
                `).join('')}
            </div>
            <div class="history-footer">
                <span class="history-total">${AFC_UI.formatCurrency(order.summary?.total || 0)}</span>
                <button class="btn-reorder" onclick="reorderFromHistory('${order.id}')">
                    <i class="fas fa-redo" aria-hidden="true"></i>
                    Reorder
                </button>
            </div>
        </div>
    `).join('');
}

async function reorderFromHistory(orderId) {
    const confirmed = await AFC_UI.showConfirm({
        title: 'Reorder',
        message: 'Replace your current cart with this order?',
        confirmText: 'Reorder',
        type: 'info'
    });
    
    if (confirmed) {
        AFC_CART.reorderFromHistory(orderId);
        updateCartUI();
        renderMenu();
        closeOrderHistory();
        AFC_UI.showToast('Items added to cart!', 'success');
    }
}

// ============================================
// THEME TOGGLE
// ============================================

function toggleTheme() {
    const newTheme = AFC_UI.theme.toggle();
    AFC_UI.showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'success');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Form submission
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
            closeOrderHistory();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.focus();
        }
    });
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
    }
}

// In browser console on deployed site:
console.log('Menu items:', AFC_MENU.getAll().length);
console.log('Version:', AFC_MENU.getVersion());
console.log('Items:', AFC_MENU.getAll().map(i => i.name));

// ============================================
// LEGACY SUPPORT
// ============================================

// These functions maintain backward compatibility
function showToast(message, type) {
    AFC_UI.showToast(message, type);
}

function showNotification(message) {
    AFC_UI.showToast(message, 'success');
}

function updateCartCount() {
    updateCartUI();
}

function setupFormListener() {
    setupEventListeners();
}
