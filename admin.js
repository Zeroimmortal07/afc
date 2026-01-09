/**
 * AFC Admin Dashboard
 * Complete admin functionality for managing menu items and orders
 */

// ============================================
// STORAGE & STATE
// ============================================

const STORAGE_KEYS = {
    MENU: 'menuItems',
    ORDERS: 'orders',
    AUTH: 'adminAuth'
};

let adminState = {
    menuData: [],
    orders: [],
    currentFilter: 'all',
    currentEditingId: null,
    currentItemImage: null
};

// ============================================
// INITIALIZATION
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
    loadMenuData();
    loadOrdersData();
    updateStats();
    renderMenu();
    renderOrders();
    setupImageUploadDragDrop();
});

// ============================================
// AUTHENTICATION
// ============================================

function checkAdminAccess() {
    const isAuth = sessionStorage.getItem(STORAGE_KEYS.AUTH);
    if (!isAuth) {
        const password = prompt('Enter Admin Password:');
        if (password !== 'admin123') {
            alert('Unauthorized Access!');
            window.location.href = 'index.html';
            return;
        }
        sessionStorage.setItem(STORAGE_KEYS.AUTH, 'true');
    }
}

function logout() {
    if (confirm('Logout from admin panel?')) {
        sessionStorage.removeItem(STORAGE_KEYS.AUTH);
        window.location.href = 'index.html';
    }
}

// ============================================
// DATA MANAGEMENT
// ============================================

function loadMenuData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.MENU);
        adminState.menuData = stored ? JSON.parse(stored) : getDefaultMenu();
        saveMenuData();
    } catch (e) {
        console.error('Error loading menu:', e);
        adminState.menuData = getDefaultMenu();
    }
}

function loadOrdersData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
        adminState.orders = stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Error loading orders:', e);
        adminState.orders = [];
    }
}

function saveMenuData() {
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(adminState.menuData));
    // Trigger storage event for other tabs/windows
    window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEYS.MENU,
        newValue: JSON.stringify(adminState.menuData),
        storageArea: localStorage
    }));
}

function saveOrdersData() {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(adminState.orders));
}

function getDefaultMenu() {
    return [
        {
            id: 1,
            name: "Chicken Curry",
            price: 150,
            category: "curry",
            description: "Tender chicken in aromatic spices",
            emoji: "🍛",
            image: null
        },
        {
            id: 2,
            name: "Butter Chicken",
            price: 180,
            category: "curry",
            description: "Creamy and delicious butter chicken",
            emoji: "🍛",
            image: null
        },
        {
            id: 3,
            name: "Dal Makhani",
            price: 120,
            category: "curry",
            description: "Rich and creamy lentil curry",
            emoji: "🍲",
            image: null
        },
        {
            id: 4,
            name: "Chicken Biryani",
            price: 220,
            category: "biryani",
            description: "Fragrant rice with tender chicken",
            emoji: "🍚",
            image: null
        },
        {
            id: 5,
            name: "Mutton Biryani",
            price: 250,
            category: "biryani",
            description: "Premium biryani with tender mutton",
            emoji: "🍚",
            image: null
        },
        {
            id: 6,
            name: "Vegetable Biryani",
            price: 140,
            category: "biryani",
            description: "Mixed vegetables with aromatic rice",
            emoji: "🍚",
            image: null
        },
        {
            id: 7,
            name: "Naan",
            price: 40,
            category: "bread",
            description: "Soft and fluffy Indian bread",
            emoji: "🍞",
            image: null
        },
        {
            id: 8,
            name: "Roti",
            price: 20,
            category: "bread",
            description: "Traditional Indian flatbread",
            emoji: "🫓",
            image: null
        },
        {
            id: 9,
            name: "Paratha",
            price: 50,
            category: "bread",
            description: "Flaky stuffed Indian bread",
            emoji: "🥪",
            image: null
        },
        {
            id: 10,
            name: "Mango Lassi",
            price: 60,
            category: "beverages",
            description: "Refreshing mango yogurt drink",
            emoji: "🥤",
            image: null
        },
        {
            id: 11,
            name: "Masala Chai",
            price: 30,
            category: "beverages",
            description: "Traditional spiced tea",
            emoji: "☕",
            image: null
        },
        {
            id: 12,
            name: "Fresh Juice",
            price: 50,
            category: "beverages",
            description: "Fresh fruit juice",
            emoji: "🧃",
            image: null
        }
    ];
}

// ============================================
// STATS & DASHBOARD
// ============================================

function updateStats() {
    const totalItems = adminState.menuData.length;
    const totalOrders = adminState.orders.length;
    const completedOrders = adminState.orders.filter(o => o.status === 'completed').length;
    const pendingOrders = adminState.orders.filter(o => o.status === 'pending').length;
    const totalRevenue = adminState.orders.reduce((sum, o) => sum + o.total, 0);

    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('completedOrders').textContent = completedOrders;
    document.getElementById('pendingOrders').textContent = pendingOrders;
    document.getElementById('totalRevenue').textContent = `₹${totalRevenue}`;
}

function refreshDashboard() {
    loadMenuData();
    loadOrdersData();
    updateStats();
    renderMenu();
    renderOrders();
    showNotification('Dashboard refreshed!', 'success');
}

// ============================================
// MENU MANAGEMENT
// ============================================

function renderMenu() {
    const tbody = document.getElementById('itemsTableBody');
    const noData = document.getElementById('noItems');

    // Update item count display
    const itemCountEl = document.getElementById('itemCount');
    if (itemCountEl) {
        itemCountEl.textContent = `${adminState.menuData.length} items`;
    }

    if (adminState.menuData.length === 0) {
        tbody.innerHTML = '';
        if (noData) noData.style.display = 'block';
        return;
    }

    if (noData) noData.style.display = 'none';
    tbody.innerHTML = '';

    adminState.menuData.forEach(item => {
        const imageHTML = item.image
            ? `<img src="${item.image}" alt="${item.name}" class="table-item-image">`
            : `<span class="item-emoji">${item.emoji}</span>`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>
                <div class="item-display">
                    ${imageHTML}
                    <span>${item.name}</span>
                </div>
            </td>
            <td><span class="badge badge-${item.category}">${item.category}</span></td>
            <td>₹${item.price}</td>
            <td>${item.description}</td>
            <td>
                <button class="btn-action btn-edit" onclick="editItem(${item.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action btn-delete" onclick="deleteItem(${item.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openAddItemModal() {
    adminState.currentEditingId = null;
    adminState.currentItemImage = null;
    document.getElementById('modalTitle').textContent = 'Add New Item';
    document.getElementById('itemForm').reset();
    document.getElementById('itemEmoji').value = '🍽️';
    document.getElementById('imagePreview').innerHTML = '<p>No image selected</p>';
    document.getElementById('itemModal').classList.add('active');
    document.getElementById('itemName').focus();
}

function editItem(itemId) {
    const item = adminState.menuData.find(i => i.id === itemId);
    if (!item) return;

    adminState.currentEditingId = itemId;
    adminState.currentItemImage = item.image;

    document.getElementById('modalTitle').textContent = 'Edit Item';
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemDescription').value = item.description;
    document.getElementById('itemEmoji').value = item.emoji;

    const preview = document.getElementById('imagePreview');
    if (item.image) {
        preview.innerHTML = `<img src="${item.image}" alt="Preview">`;
    } else {
        preview.innerHTML = '<p>No image</p>';
    }

    document.getElementById('itemModal').classList.add('active');
    document.getElementById('itemName').focus();
}

function saveItem() {
    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    const price = parseInt(document.getElementById('itemPrice').value);
    const description = document.getElementById('itemDescription').value.trim();
    const emoji = document.getElementById('itemEmoji').value || '🍽️';

    // Validation
    if (!name || !category || !price) {
        showNotification('Please fill all required fields', 'error');
        return;
    }

    if (adminState.currentEditingId) {
        // Edit existing item
        const item = adminState.menuData.find(i => i.id === adminState.currentEditingId);
        if (item) {
            item.name = name;
            item.category = category;
            item.price = price;
            item.description = description;
            item.emoji = emoji;
            if (adminState.currentItemImage) {
                item.image = adminState.currentItemImage;
            }
            showNotification(`${name} updated!`, 'success');
        }
    } else {
        // Add new item
        const newId = Math.max(...adminState.menuData.map(i => i.id), 0) + 1;
        const newItem = {
            id: newId,
            name,
            category,
            price,
            description,
            emoji,
            image: adminState.currentItemImage || null
        };
        adminState.menuData.push(newItem);
        
        // Show success notification with item preview
        showSuccessNotificationWithItem(newItem);
    }

    saveMenuData();
    renderMenu();
    updateStats();
    closeItemModal();
}

function deleteItem(itemId) {
    const item = adminState.menuData.find(i => i.id === itemId);
    if (!item) return;

    if (confirm(`Delete "${item.name}"? This cannot be undone.`)) {
        adminState.menuData = adminState.menuData.filter(i => i.id !== itemId);
        saveMenuData();
        renderMenu();
        updateStats();
        showNotification(`${item.name} deleted`, 'success');
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
// IMAGE UPLOAD
// ============================================

function setupImageUploadDragDrop() {
    const uploadArea = document.querySelector('.image-upload-new');
    if (!uploadArea) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when item is dragged over it
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

    // Handle dropped files
    uploadArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        const fileInput = document.getElementById('itemImage');
        fileInput.files = files;
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);
    }, false);
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('❌ Image must be less than 5MB', 'error');
        event.target.value = '';
        return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        showNotification('❌ Only JPG, PNG, GIF, and WebP images allowed', 'error');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        adminState.currentItemImage = e.target.result;
        const previewDiv = document.getElementById('imagePreview');
        previewDiv.innerHTML = `
            <img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: 8px;">
            <p style="margin-top: 10px; color: #10B981; font-size: 13px;">✓ Image selected</p>
        `;
        showNotification('✓ Image uploaded successfully', 'success');
    };
    reader.onerror = () => {
        showNotification('❌ Error reading file', 'error');
        event.target.value = '';
    };
    reader.readAsDataURL(file);
}

// ============================================
// ORDER MANAGEMENT
// ============================================

function renderOrders() {
    const tbody = document.getElementById('ordersTableBody');
    const noData = document.getElementById('noOrders');

    // Update order count display
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
        const date = new Date(order.date).toLocaleString('en-IN');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${date}</td>
            <td>${order.customerName}</td>
            <td>${order.phone}</td>
            <td>${order.items.length} items</td>
            <td>₹${order.total}</td>
            <td>
                <select class="status-select" onchange="updateOrderStatus(${order.id}, this.value)">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </td>
            <td>
                <span class="badge ${order.payment === 'paid' ? 'badge-completed' : 'badge-pending'}">
                    ${order.payment}
                </span>
            </td>
            <td>
                <button class="btn-action btn-view" onclick="viewOrderDetails(${order.id})" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <a href="https://wa.me/${order.phone.replace(/[^\d]/g, '')}?text=Your order #${order.id} is ${order.status}" 
                   target="_blank" class="btn-action btn-whatsapp" title="Send WhatsApp">
                    <i class="fab fa-whatsapp"></i>
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
        showNotification(`Order #${orderId} marked as ${newStatus}`, 'success');
    }
}

function viewOrderDetails(orderId) {
    const order = adminState.orders.find(o => o.id === orderId);
    if (!order) return;

    const itemsHTML = order.items
        .map(item => `
            <div class="order-item">
                <span>${item.quantity}x ${item.name}</span>
                <span>₹${item.price * item.quantity}</span>
            </div>
        `)
        .join('');

    const date = new Date(order.date).toLocaleString('en-IN');

    document.getElementById('orderDetails').innerHTML = `
        <div class="order-detail-section">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${order.customerName}</p>
            <p><strong>Phone:</strong> ${order.phone}</p>
            <p><strong>Address:</strong> ${order.address}</p>
            <p><strong>Date:</strong> ${date}</p>
        </div>

        <div class="order-detail-section">
            <h3>Order Items</h3>
            <div class="order-items">
                ${itemsHTML}
            </div>
        </div>

        <div class="order-detail-section">
            <h3>Order Summary</h3>
            <p><strong>Total:</strong> ₹${order.total}</p>
            <p><strong>Status:</strong> <span class="badge badge-${order.status}">${order.status}</span></p>
            <p><strong>Payment:</strong> <span class="badge badge-${order.payment}">${order.payment}</span></p>
        </div>
    `;

    document.getElementById('orderModal').classList.add('active');
}

function filterOrders(status) {
    adminState.currentFilter = status;
    document.querySelectorAll('.filter-badge').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    renderOrders();
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

// ============================================
// TAB NAVIGATION
// ============================================

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn-new').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const tab = document.getElementById(tabName + 'Tab');
    if (tab) tab.classList.add('active');

    // Activate the clicked button
    if (event && event.target) {
        const btn = event.target.closest('.tab-btn-new');
        if (btn) btn.classList.add('active');
    }
}

// ============================================
// UI UTILITIES
// ============================================

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    requestAnimationFrame(() => {
        notification.classList.add('show');
    });

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showSuccessNotificationWithItem(item) {
    const notification = document.createElement('div');
    notification.className = 'notification-success-full';
    
    const imageHTML = item.image 
        ? `<img src="${item.image}" alt="${item.name}" class="success-item-image">` 
        : `<div class="success-item-emoji">${item.emoji}</div>`;
    
    notification.innerHTML = `
        <div class="success-notification-content">
            <div class="success-notification-header">
                <i class="fas fa-check-circle"></i>
                <span>Item Added Successfully!</span>
            </div>
            <div class="success-item-preview">
                ${imageHTML}
                <div class="success-item-info">
                    <h3>${item.name}</h3>
                    <p class="success-item-category">${item.category}</p>
                    <p class="success-item-price">₹${item.price}</p>
                </div>
            </div>
            <button class="success-notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
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
