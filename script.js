// ============================================
// BUSINESS CONFIGURATION (SECURE)
// ============================================
// WhatsApp number is hardcoded here for security
// Users cannot change this value from the frontend
const BUSINESS_WHATSAPP_NUMBER = '+919167931883';
// ============================================

// Default Menu Data (fallback if localStorage is empty)
const DEFAULT_MENU_DATA = [
    {
        id: 1,
        name: "Chicken Curry",
        price: 150,
        category: "curry",
        description: "Tender chicken in aromatic spices",
        emoji: "🍛"
    },
    {
        id: 2,
        name: "Butter Chicken",
        price: 180,
        category: "curry",
        description: "Creamy and delicious butter chicken",
        emoji: "🍛"
    },
    {
        id: 3,
        name: "Dal Makhani",
        price: 120,
        category: "curry",
        description: "Rich and creamy lentil curry",
        emoji: "🍲"
    },
    {
        id: 4,
        name: "Chicken Biryani",
        price: 220,
        category: "biryani",
        description: "Fragrant rice with tender chicken",
        emoji: "🍚"
    },
    {
        id: 5,
        name: "Mutton Biryani",
        price: 250,
        category: "biryani",
        description: "Premium biryani with tender mutton",
        emoji: "🍚"
    },
    {
        id: 6,
        name: "Vegetable Biryani",
        price: 140,
        category: "biryani",
        description: "Mixed vegetables with aromatic rice",
        emoji: "🍚"
    },
    {
        id: 7,
        name: "Naan",
        price: 40,
        category: "bread",
        description: "Soft and fluffy Indian bread",
        emoji: "🍞"
    },
    {
        id: 8,
        name: "Roti",
        price: 20,
        category: "bread",
        description: "Traditional Indian flatbread",
        emoji: "🫓"
    },
    {
        id: 9,
        name: "Paratha",
        price: 50,
        category: "bread",
        description: "Flaky stuffed Indian bread",
        emoji: "🥪"
    },
    {
        id: 10,
        name: "Mango Lassi",
        price: 60,
        category: "beverages",
        description: "Refreshing mango yogurt drink",
        emoji: "🥤"
    },
    {
        id: 11,
        name: "Masala Chai",
        price: 30,
        category: "beverages",
        description: "Traditional spiced tea",
        emoji: "☕"
    },
    {
        id: 12,
        name: "Fresh Juice",
        price: 50,
        category: "beverages",
        description: "Fresh fruit juice",
        emoji: "🧃"
    }
];

// Load menu from localStorage or use defaults
let menuData = [];
function loadMenuFromStorage() {
    try {
        const stored = localStorage.getItem('menuItems');
        console.log('Loading from localStorage:', stored ? 'Found data' : 'No data');
        if (stored) {
            menuData = JSON.parse(stored);
            console.log('Loaded menu items:', menuData.length, 'items');
        } else {
            menuData = [...DEFAULT_MENU_DATA];
            console.log('Using default menu:', menuData.length, 'items');
        }
    } catch (e) {
        console.error('Error loading menu from storage:', e);
        menuData = [...DEFAULT_MENU_DATA];
    }
}

// Cart
let cart = [];
let currentFilter = "all";

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadMenuFromStorage();
    renderMenu();
    setupFormListener();
    
    // Listen for storage changes (updates from admin page in other tabs)
    window.addEventListener('storage', () => {
        console.log('Storage event detected');
        loadMenuFromStorage();
        renderMenu();
    });
    
    // Also poll localStorage every 2 seconds as a backup
    setInterval(() => {
        const stored = localStorage.getItem('menuItems');
        if (stored) {
            try {
                const newMenu = JSON.parse(stored);
                // Only re-render if data changed
                if (JSON.stringify(newMenu) !== JSON.stringify(menuData)) {
                    console.log('Menu changed detected via polling');
                    menuData = newMenu;
                    renderMenu();
                }
            } catch (e) {
                console.error('Error parsing menu:', e);
            }
        }
    }, 2000);
});

// Render Menu
function renderMenu() {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';

    const filteredMenu = currentFilter === 'all'
        ? menuData
        : menuData.filter(item => item.category === currentFilter);

    filteredMenu.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        
        // Show image if available, otherwise show emoji
        const imageHTML = item.image 
            ? `<img src="${item.image}" alt="${item.name}" class="menu-item-image" style="object-fit: cover;">` 
            : `<div class="menu-item-image">${item.emoji}</div>`;
        
        menuItem.innerHTML = `
            ${imageHTML}
            <div class="menu-item-content">
                <h3 class="menu-item-name">${item.name}</h3>
                <p class="menu-item-description">${item.description}</p>
                <div class="menu-item-footer">
                    <span class="menu-item-price">₹${item.price}</span>
                    <button class="btn-add" onclick="addToCart(${item.id})">Add</button>
                </div>
            </div>
        `;
        menuGrid.appendChild(menuItem);
    });
}

// Filter Category
function filterCategory(category) {
    currentFilter = category;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderMenu();
}

// Add to Cart
function addToCart(itemId) {
    const menuItem = menuData.find(item => item.id === itemId);
    const cartItem = cart.find(item => item.id === itemId);

    if (cartItem) {
        cartItem.quantity++;
    } else {
        cart.push({
            ...menuItem,
            quantity: 1
        });
    }

    updateCartCount();
    showNotification(`${menuItem.name} added to cart!`);
}

// Update Cart Count
function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

// Open Cart
function openCart() {
    document.getElementById('cartModal').classList.add('active');
    renderCartItems();
}

// Close Cart
function closeCart() {
    document.getElementById('cartModal').classList.remove('active');
}

// Render Cart Items
function renderCartItems() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const subtotal = document.getElementById('subtotal');

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '';
        cartEmpty.style.display = 'block';
        document.getElementById('checkoutBtn').disabled = true;
        subtotal.textContent = '₹0';
        return;
    }

    cartEmpty.style.display = 'none';
    document.getElementById('checkoutBtn').disabled = false;

    cartItemsDiv.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-quantity">Qty: ${item.quantity}</div>
            </div>
            <div class="cart-item-price">₹${item.price * item.quantity}</div>
            <button class="cart-item-remove" onclick="removeFromCart(${item.id})">Remove</button>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    subtotal.textContent = `₹${total}`;
}

// Remove from Cart
function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    updateCartCount();
    renderCartItems();
}

// Proceed to Checkout
function proceedToCheckout() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    closeCart();
    document.getElementById('reviewModal').classList.add('active');
    renderReviewItems();
}

// Render Review Items
function renderReviewItems() {
    const reviewItems = document.getElementById('reviewItems');
    const reviewTotal = document.getElementById('reviewTotal');

    reviewItems.innerHTML = cart.map(item => `
        <div class="review-item">
            <div>
                <div class="review-item-name">${item.quantity}x ${item.name}</div>
            </div>
            <div class="review-item-price">₹${item.price * item.quantity}</div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    reviewTotal.textContent = `₹${total}`;
}

// Close Review
function closeReview() {
    document.getElementById('reviewModal').classList.remove('active');
}

// Setup Form Listener
function setupFormListener() {
    const form = document.getElementById('orderForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        placeOrderViaWhatsApp();
    });
}

// Place Order via WhatsApp
function placeOrderViaWhatsApp() {
    const name = document.getElementById('customerName').value;
    const countryCode = document.getElementById('countryCode').value;
    const mobileNumber = document.getElementById('mobileNumber').value;
    const address = document.getElementById('deliveryAddress').value;

    if (!name || !mobileNumber || !address) {
        alert('Please fill all fields!');
        return;
    }

    // Create order message
    const orderItems = cart.map(item =>
        `${item.quantity}x ${item.name} - ₹${item.price * item.quantity}`
    ).join('\n');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const message = `*AFC Order*\n\n*Customer Details:*\nName: ${name}\nPhone: ${countryCode}${mobileNumber}\nAddress: ${address}\n\n*Order Items:*\n${orderItems}\n\n*Total: ₹${total}*\n\n*Please confirm this order*`;

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappNumber = BUSINESS_WHATSAPP_NUMBER.replace(/\D/g, '');

    // Open WhatsApp
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(whatsappURL, '_blank');

    // Clear form and cart after placing order
    setTimeout(() => {
        clearOrder();
    }, 500);
}

// Clear Order
function clearOrder() {
    document.getElementById('orderForm').reset();
    cart = [];
    updateCartCount();
    closeReview();
    showNotification('Order sent! Check WhatsApp for confirmation.');
}

// Show Notification
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
