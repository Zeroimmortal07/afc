/**
 * AFC Admin Dashboard Main Script
 * Uses modular architecture for better maintainability
 * @version 2.0.0
 */

// ============================================
// STATE MANAGEMENT
// ============================================

const adminState = {
    currentFilter: 'all',
    currentEditingId: null,
    currentItemImage: null,
    orders: []
};

// ============================================
// INITIALIZATION
// ============================================

window.addEventListener('DOMContentLoaded', async () => {
    console.log('[AFC Admin] Initializing...');
    
    // Check authentication
    const hasAccess = await AFC_AUTH.checkAdminAccess();
    if (!hasAccess) {
        window.location.href = 'index.html';
        return;
    }
    
    // Setup session monitor
    AFC_AUTH.setupSessionMonitor(
        (minutes) => {
            AFC_UI.showToast(`Session expires in ${minutes} minute(s)`, 'warning');
        },
        () => {
            AFC_UI.showToast('Session expired. Please login again.', 'error');
            setTimeout(() => window.location.reload(), 2000);
        }
    );
    
    // Initialize theme
    AFC_UI.theme.init();
    
    // Load data
    AFC_MENU.load();
    loadOrdersData();
    
    // Render UI
    updateStats();
    updateStorageIndicator();
    renderMenu();
    renderOrders();
    renderPromoCodes();
    setupImageUploadDragDrop();
    
    console.log('[AFC Admin] Initialized');
});

// ============================================
// ORDERS MANAGEMENT
// ============================================

function loadOrdersData() {
    try {
        const stored = localStorage.getItem(AFC_CONFIG.STORAGE_KEYS.ORDERS);
        adminState.orders = stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('[AFC Admin] Error loading orders:', e);
        adminState.orders = [];
    }
}

function saveOrdersData() {
    try {
        localStorage.setItem(AFC_CONFIG.STORAGE_KEYS.ORDERS, JSON.stringify(adminState.orders));
    } catch (e) {
        console.error('[AFC Admin] Error saving orders:', e);
    }
}

// ============================================
// STATS & DASHBOARD
// ============================================

function updateStats() {
    const menuData = AFC_MENU.getAll();
    const totalItems = menuData.length;
    const totalOrders = adminState.orders.length;
    const completedOrders = adminState.orders.filter(o => o.status === 'completed').length;
    const pendingOrders = adminState.orders.filter(o => o.status === 'pending').length;
    const totalRevenue = adminState.orders.reduce((sum, o) => sum + (o.total || 0), 0);

    const setTextContent = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setTextContent('totalItems', totalItems);
    setTextContent('totalOrders', totalOrders);
    setTextContent('completedOrders', completedOrders);
    setTextContent('pendingOrders', pendingOrders);
    setTextContent('totalRevenue', AFC_UI.formatCurrency(totalRevenue));
}

function updateStorageIndicator() {
    const storage = AFC_MENU.getStorageInfo();
    
    const storageUsedEl = document.getElementById('storageUsed');
    const storageBarEl = document.getElementById('storageBar');
    
    if (storageUsedEl) {
        storageUsedEl.textContent = `${storage.usedPercent.toFixed(0)}%`;
        storageUsedEl.title = `${storage.usedMB}MB / ${storage.maxMB}MB used`;
    }
    
    if (storageBarEl) {
        storageBarEl.style.width = `${storage.usedPercent}%`;
        storageBarEl.classList.remove('warning', 'critical');
        if (storage.isCritical) {
            storageBarEl.classList.add('critical');
        } else if (storage.isWarning) {
            storageBarEl.classList.add('warning');
        }
    }
}

function refreshDashboard() {
    AFC_MENU.load();
    loadOrdersData();
    updateStats();
    updateStorageIndicator();
    renderMenu();
    renderOrders();
    AFC_UI.showToast('Dashboard refreshed!', 'success');
}

// ============================================
// MENU MANAGEMENT
// ============================================

function renderMenu() {
    const menuData = AFC_MENU.getAll();
    const tbody = document.getElementById('itemsTableBody');
    const noData = document.getElementById('noItems');

    if (!tbody) return;

    const itemCountEl = document.getElementById('itemCount');
    if (itemCountEl) {
        itemCountEl.textContent = `${menuData.length} items`;
    }

    if (menuData.length === 0) {
        tbody.innerHTML = '';
        if (noData) noData.style.display = 'block';
        return;
    }

    if (noData) noData.style.display = 'none';
    tbody.innerHTML = '';

    menuData.forEach(item => {
        const imageHTML = item.image
            ? `<img src="${AFC_UI.escapeHtml(item.image)}" alt="${AFC_UI.escapeHtml(item.name)}" class="table-item-image">`
            : `<span class="item-emoji">${item.emoji || '🍽️'}</span>`;

        const categoryDisplay = AFC_MENU.formatCategoryName(item.category);
        const isPredefined = AFC_CONFIG.CATEGORIES.PREDEFINED.includes(item.category);
        const badgeClass = isPredefined ? item.category : 'other';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>
                <div class="item-display">
                    ${imageHTML}
                    <span>${AFC_UI.escapeHtml(item.name)}</span>
                </div>
            </td>
            <td><span class="badge badge-${badgeClass}">${AFC_UI.escapeHtml(categoryDisplay)}</span></td>
            <td>${AFC_UI.formatCurrency(item.price)}</td>
            <td>${AFC_UI.escapeHtml(item.description || '')}</td>
            <td>
                <button class="btn-action btn-edit" onclick="editItem(${item.id})" title="Edit" aria-label="Edit ${AFC_UI.escapeHtml(item.name)}">
                    <i class="fas fa-edit" aria-hidden="true"></i>
                </button>
                <button class="btn-action btn-delete" onclick="deleteItem(${item.id})" title="Delete" aria-label="Delete ${AFC_UI.escapeHtml(item.name)}">
                    <i class="fas fa-trash" aria-hidden="true"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openAddItemModal() {
    adminState.currentEditingId = null;
    adminState.currentItemImage = null;
    
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Add New Item';
    document.getElementById('itemForm').reset();
    document.getElementById('itemEmoji').value = '🍽️';
    document.getElementById('imagePreview').innerHTML = '<p>No image selected</p>';
    document.getElementById('customCategoryWrapper').style.display = 'none';
    document.getElementById('customCategory').value = '';
    document.getElementById('itemModal').classList.add('active');
    document.getElementById('itemName').focus();
}

function editItem(itemId) {
    const item = AFC_MENU.getById(itemId);
    if (!item) return;

    adminState.currentEditingId = itemId;
    adminState.currentItemImage = item.image;

    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Item';
    document.getElementById('itemName').value = item.name || '';
    setItemCategory(item.category);
    document.getElementById('itemPrice').value = item.price || '';
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemEmoji').value = item.emoji || '🍽️';

    const preview = document.getElementById('imagePreview');
    if (item.image) {
        preview.innerHTML = `<img src="${item.image}" alt="Preview">`;
    } else {
        preview.innerHTML = '<p>No image</p>';
    }

    document.getElementById('itemModal').classList.add('active');
    document.getElementById('itemName').focus();
}

async function saveItem() {
    const name = document.getElementById('itemName').value.trim();
    const category = getSelectedCategory();
    const price = parseInt(document.getElementById('itemPrice').value);
    const description = document.getElementById('itemDescription').value.trim();
    const emoji = document.getElementById('itemEmoji').value || '🍽️';

    if (!name || !category || !price) {
        AFC_UI.showToast('Please fill all required fields', 'error');
        return;
    }
    
    if (document.getElementById('itemCategory').value === 'other' && 
        !document.getElementById('customCategory').value.trim()) {
        AFC_UI.showToast('Please enter a custom category name', 'error');
        return;
    }

    const saveBtn = document.querySelector('.btn-save');
    AFC_UI.setButtonLoading(saveBtn, true, 'Saving...');

    try {
        if (adminState.currentEditingId) {
            AFC_MENU.updateItem(adminState.currentEditingId, {
                name,
                category,
                price,
                description,
                emoji,
                image: adminState.currentItemImage
            });
            AFC_UI.showToast(`${name} updated!`, 'success');
        } else {
            const newItem = AFC_MENU.addItem({
                name,
                category,
                price,
                description,
                emoji,
                image: adminState.currentItemImage
            });
            showSuccessNotificationWithItem(newItem);
        }

        renderMenu();
        updateStats();
        updateStorageIndicator();
        closeItemModal();
        
    } catch (e) {
        AFC_UI.showToast('Error saving item', 'error');
        console.error('[AFC Admin] Save error:', e);
    }
    
    AFC_UI.setButtonLoading(saveBtn, false);
}

async function deleteItem(itemId) {
    const item = AFC_MENU.getById(itemId);
    if (!item) return;

    const confirmed = await AFC_UI.showConfirm({
        title: 'Delete Item',
        message: `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
        confirmText: 'Delete',
        type: 'danger'
    });

    if (confirmed) {
        AFC_MENU.deleteItem(itemId);
        renderMenu();
        updateStats();
        updateStorageIndicator();
        AFC_UI.showToast(`${item.name} deleted`, 'success');
    }
}

function closeItemModal() {
    document.getElementById('itemModal').classList.remove('active');
    document.getElementById('itemForm').reset();
    document.getElementById('imagePreview').innerHTML = '<p>No image selected</p>';
    document.getElementById('itemImage').value = '';
    adminState.currentEditingId = null;
    adminState.currentItemImage = null;
}

// ============================================
// CATEGORY HELPERS
// ============================================

function handleCategoryChange(selectEl) {
    const customWrapper = document.getElementById('customCategoryWrapper');
    const customInput = document.getElementById('customCategory');
    
    if (selectEl.value === 'other') {
        customWrapper.style.display = 'block';
        customInput.required = true;
        customInput.focus();
    } else {
        customWrapper.style.display = 'none';
        customInput.required = false;
        customInput.value = '';
    }
}

function getSelectedCategory() {
    const selectEl = document.getElementById('itemCategory');
    const customInput = document.getElementById('customCategory');
    
    if (selectEl.value === 'other') {
        return customInput.value.trim().toLowerCase().replace(/\s+/g, '-') || 'other';
    }
    return selectEl.value;
}

function setItemCategory(category) {
    const selectEl = document.getElementById('itemCategory');
    const customWrapper = document.getElementById('customCategoryWrapper');
    const customInput = document.getElementById('customCategory');
    
    if (AFC_CONFIG.CATEGORIES.PREDEFINED.includes(category)) {
        selectEl.value = category;
        customWrapper.style.display = 'none';
        customInput.value = '';
    } else {
        selectEl.value = 'other';
        customWrapper.style.display = 'block';
        customInput.value = (category || '').replace(/-/g, ' ');
    }
}

// ============================================
// IMAGE UPLOAD
// ============================================

function setupImageUploadDragDrop() {
    const uploadArea = document.querySelector('.image-upload-new');
    if (!uploadArea) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('drag-over');
        }, false);
    });

    uploadArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        const fileInput = document.getElementById('itemImage');
        fileInput.files = files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }, false);
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        AFC_UI.showToast('Image must be less than 5MB', 'error');
        event.target.value = '';
        return;
    }

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        AFC_UI.showToast('Only JPG, PNG, GIF, and WebP images allowed', 'error');
        event.target.value = '';
        return;
    }

    try {
        const compressedDataUrl = await AFC_MENU.compressImage(file, 400, 0.7);
        adminState.currentItemImage = compressedDataUrl;
        
        const originalSize = file.size;
        const compressedSize = new Blob([compressedDataUrl]).size;
        const reduction = Math.round((1 - compressedSize / originalSize) * 100);
        
        document.getElementById('imagePreview').innerHTML = `
            <img src="${compressedDataUrl}" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: 8px;">
            <p style="margin-top: 10px; color: #10B981; font-size: 13px;">
                ✓ Image compressed (${reduction > 0 ? reduction + '% smaller' : 'optimized'})
            </p>
        `;
        AFC_UI.showToast('Image uploaded & compressed', 'success');
    } catch (err) {
        console.error('[AFC Admin] Image compression error:', err);
        AFC_UI.showToast('Error processing image', 'error');
    }
}

// ============================================
// ORDER MANAGEMENT
// ============================================

function renderOrders() {
    const tbody = document.getElementById('ordersTableBody');
    const noData = document.getElementById('noOrders');

    const orderCountEl = document.getElementById('orderCount');
    if (orderCountEl) {
        orderCountEl.textContent = `${adminState.orders.length} orders`;
    }

    let filtered = adminState.orders;
    if (adminState.currentFilter !== 'all') {
        filtered = adminState.orders.filter(o => o.status === adminState.currentFilter);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        if (noData) noData.style.display = 'flex';
        return;
    }

    if (noData) noData.style.display = 'none';
    tbody.innerHTML = '';

    filtered.forEach(order => {
        const date = AFC_UI.formatDate(order.date);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${date}</td>
            <td>${AFC_UI.escapeHtml(order.customerName || 'N/A')}</td>
            <td>${AFC_UI.escapeHtml(order.phone || 'N/A')}</td>
            <td>${(order.items || []).length} items</td>
            <td>${AFC_UI.formatCurrency(order.total)}</td>
            <td>
                <select class="status-select" onchange="updateOrderStatus(${order.id}, this.value)" aria-label="Order status">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </td>
            <td>
                <button class="btn-action btn-view" onclick="viewOrderDetails(${order.id})" title="View" aria-label="View order details">
                    <i class="fas fa-eye" aria-hidden="true"></i>
                </button>
                <a href="https://wa.me/${(order.phone || '').replace(/[^\d]/g, '')}?text=Your order %23${order.id} is ${order.status}" 
                   target="_blank" class="btn-action btn-whatsapp" title="Send WhatsApp" aria-label="Send WhatsApp message">
                    <i class="fab fa-whatsapp" aria-hidden="true"></i>
                </a>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateOrderStatus(orderId, newStatus) {
    const order = adminState.orders.find(o => o.id === orderId);
    if (order) {
        order.status = newStatus;
        saveOrdersData();
        updateStats();
        AFC_UI.showToast(`Order #${orderId} marked as ${newStatus}`, 'success');
    }
}

function viewOrderDetails(orderId) {
    const order = adminState.orders.find(o => o.id === orderId);
    if (!order) return;

    const itemsHTML = (order.items || [])
        .map(item => `
            <div class="order-item">
                <span>${item.quantity}x ${AFC_UI.escapeHtml(item.name)}</span>
                <span>${AFC_UI.formatCurrency(item.price * item.quantity)}</span>
            </div>
        `)
        .join('');

    document.getElementById('orderDetails').innerHTML = `
        <div class="order-detail-section">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${AFC_UI.escapeHtml(order.customerName || 'N/A')}</p>
            <p><strong>Phone:</strong> ${AFC_UI.escapeHtml(order.phone || 'N/A')}</p>
            <p><strong>Address:</strong> ${AFC_UI.escapeHtml(order.address || 'N/A')}</p>
            <p><strong>Date:</strong> ${AFC_UI.formatDate(order.date)}</p>
        </div>

        <div class="order-detail-section">
            <h3>Order Items</h3>
            <div class="order-items">${itemsHTML}</div>
        </div>

        <div class="order-detail-section">
            <h3>Order Summary</h3>
            <p><strong>Total:</strong> ${AFC_UI.formatCurrency(order.total)}</p>
            <p><strong>Status:</strong> <span class="badge badge-${order.status}">${order.status}</span></p>
        </div>
    `;

    document.getElementById('orderModal').classList.add('active');
}

function filterOrders(status, e) {
    adminState.currentFilter = status;
    document.querySelectorAll('.filter-badge').forEach(btn => btn.classList.remove('active'));
    if (e && e.target) {
        e.target.classList.add('active');
    }
    renderOrders();
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

// ============================================
// CSV EXPORT
// ============================================

function exportOrdersToCSV() {
    if (adminState.orders.length === 0) {
        AFC_UI.showToast('No orders to export', 'error');
        return;
    }

    const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'Address', 'Items', 'Total', 'Status'];
    
    const rows = adminState.orders.map(order => {
        const itemsStr = (order.items || [])
            .map(item => `${item.quantity}x ${item.name}`)
            .join('; ');
        
        return [
            order.id,
            AFC_UI.formatDate(order.date),
            order.customerName || '',
            order.phone || '',
            (order.address || '').replace(/"/g, '""'),
            itemsStr,
            order.total,
            order.status
        ];
    });

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `afc-orders-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    AFC_UI.showToast('Orders exported to CSV', 'success');
}

function exportMenuToCSV() {
    const menuData = AFC_MENU.getAll();
    
    if (menuData.length === 0) {
        AFC_UI.showToast('No menu items to export', 'error');
        return;
    }

    const headers = ['ID', 'Name', 'Category', 'Price', 'Description', 'Emoji'];
    
    const rows = menuData.map(item => [
        item.id,
        item.name || '',
        item.category || '',
        item.price || 0,
        (item.description || '').replace(/"/g, '""'),
        item.emoji || ''
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `afc-menu-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    AFC_UI.showToast('Menu exported to CSV', 'success');
}

// ============================================
// PROMO CODE MANAGEMENT
// ============================================

function renderPromoCodes() {
    const container = document.getElementById('promoCodesTable');
    if (!container) return;

    const promoCodes = AFC_CART.getPromoCodes();

    if (promoCodes.length === 0) {
        container.innerHTML = '<p class="no-data-text">No promo codes yet</p>';
        return;
    }

    container.innerHTML = promoCodes.map(promo => `
        <tr>
            <td><code>${AFC_UI.escapeHtml(promo.code)}</code></td>
            <td>${promo.type === 'percent' ? promo.discount + '%' : AFC_UI.formatCurrency(promo.discount)}</td>
            <td>${AFC_UI.formatCurrency(promo.minOrder)}</td>
            <td>${promo.usedCount || 0}${promo.usageLimit ? '/' + promo.usageLimit : ''}</td>
            <td>
                <span class="badge ${promo.active ? 'badge-completed' : 'badge-pending'}">
                    ${promo.active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <button class="btn-action btn-edit" onclick="togglePromoCode('${promo.code}')" 
                        title="${promo.active ? 'Deactivate' : 'Activate'}" aria-label="Toggle promo code">
                    <i class="fas fa-${promo.active ? 'pause' : 'play'}" aria-hidden="true"></i>
                </button>
                <button class="btn-action btn-delete" onclick="deletePromoCode('${promo.code}')" 
                        title="Delete" aria-label="Delete promo code">
                    <i class="fas fa-trash" aria-hidden="true"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openPromoModal() {
    document.getElementById('promoModal').classList.add('active');
    document.getElementById('promoCode').focus();
}

function closePromoModal() {
    document.getElementById('promoModal').classList.remove('active');
    document.getElementById('promoForm').reset();
}

function savePromoCode() {
    const code = document.getElementById('promoCode').value.trim();
    const discount = parseFloat(document.getElementById('promoDiscount').value);
    const type = document.getElementById('promoType').value;
    const minOrder = parseFloat(document.getElementById('promoMinOrder').value) || 0;
    const maxDiscount = parseFloat(document.getElementById('promoMaxDiscount').value) || null;
    const usageLimit = parseInt(document.getElementById('promoUsageLimit').value) || null;

    if (!code || !discount) {
        AFC_UI.showToast('Please fill required fields', 'error');
        return;
    }

    const success = AFC_CART.addPromoCode({
        code,
        discount,
        type,
        minOrder,
        maxDiscount,
        usageLimit,
        active: true
    });

    if (success) {
        AFC_UI.showToast(`Promo code ${code} created!`, 'success');
        renderPromoCodes();
        closePromoModal();
    } else {
        AFC_UI.showToast('Promo code already exists', 'error');
    }
}

function togglePromoCode(code) {
    const newStatus = AFC_CART.togglePromoCode(code);
    renderPromoCodes();
    AFC_UI.showToast(`Promo code ${newStatus ? 'activated' : 'deactivated'}`, 'success');
}

async function deletePromoCode(code) {
    const confirmed = await AFC_UI.showConfirm({
        title: 'Delete Promo Code',
        message: `Delete promo code "${code}"?`,
        confirmText: 'Delete',
        type: 'danger'
    });

    if (confirmed) {
        AFC_CART.deletePromoCode(code);
        renderPromoCodes();
        AFC_UI.showToast('Promo code deleted', 'success');
    }
}

// ============================================
// TAB NAVIGATION
// ============================================

function switchTab(tabName, e) {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn-new').forEach(btn => {
        btn.classList.remove('active');
    });

    const tab = document.getElementById(tabName + 'Tab');
    if (tab) tab.classList.add('active');

    if (e && e.target) {
        const btn = e.target.closest('.tab-btn-new');
        if (btn) btn.classList.add('active');
    }
}

// ============================================
// UI UTILITIES
// ============================================

function showSuccessNotificationWithItem(item) {
    const notification = document.createElement('div');
    notification.className = 'notification-success-full';
    
    const imageHTML = item.image 
        ? `<img src="${item.image}" alt="${AFC_UI.escapeHtml(item.name)}" class="success-item-image">` 
        : `<div class="success-item-emoji">${item.emoji || '🍽️'}</div>`;
    
    notification.innerHTML = `
        <div class="success-notification-content">
            <div class="success-notification-header">
                <i class="fas fa-check-circle" aria-hidden="true"></i>
                <span>Item Added Successfully!</span>
            </div>
            <div class="success-item-preview">
                ${imageHTML}
                <div class="success-item-info">
                    <h3>${AFC_UI.escapeHtml(item.name)}</h3>
                    <p class="success-item-category">${AFC_UI.escapeHtml(AFC_MENU.formatCategoryName(item.category))}</p>
                    <p class="success-item-price">${AFC_UI.formatCurrency(item.price)}</p>
                </div>
            </div>
            <button class="success-notification-close" onclick="this.parentElement.parentElement.remove()" aria-label="Close">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);

    requestAnimationFrame(() => {
        notification.classList.add('show');
    });

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function navigateHome() {
    window.location.href = 'index.html';
}

function logout() {
    AFC_UI.showConfirm({
        title: 'Logout',
        message: 'Are you sure you want to logout?',
        confirmText: 'Logout',
        type: 'warning'
    }).then(confirmed => {
        if (confirmed) {
            AFC_AUTH.logout();
            window.location.href = 'index.html';
        }
    });
}

function toggleTheme() {
    const newTheme = AFC_UI.theme.toggle();
    AFC_UI.showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'success');
}

// ============================================
// LEGACY SUPPORT
// ============================================

function showNotification(message, type = 'success') {
    AFC_UI.showToast(message, type);
}
