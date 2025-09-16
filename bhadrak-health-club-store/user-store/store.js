// User Store JavaScript
const API_BASE = window.APP_CONFIG ? window.APP_CONFIG.API_BASE : 'http://localhost:3001/api';
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let products = [];
let currentStep = 1;
let currentUser = null;
let authToken = localStorage.getItem('userToken');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    updateCartCount();
    loadCategories();
    loadProducts();
    loadStoreLogo(); // Load store logo

    // Setup form event listeners
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
    document.getElementById('userLoginForm').addEventListener('submit', handleLogin);
    document.getElementById('userRegisterForm').addEventListener('submit', handleRegister);
    document.getElementById('searchInput').addEventListener('input', filterProducts);
    document.getElementById('categoryFilter').addEventListener('change', filterProducts);
});

// Authentication Functions
function checkAuthStatus() {
    if (authToken) {
        // Verify token and get user info
        fetch(`${API_BASE}/customers/orders`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        }).then(response => {
            if (response.ok) {
                // Token is valid, user is logged in
                updateAuthUI(true);
            } else {
                // Token invalid, logout
                logout();
            }
        }).catch(() => {
            logout();
        });
    } else {
        updateAuthUI(false);
    }
}

function updateAuthUI(isLoggedIn) {
    const userAuthSection = document.getElementById('userAuthSection');
    
    if (isLoggedIn) {
        userAuthSection.innerHTML = `
            <a href="#" onclick="showOrders()" class="nav-link" id="ordersTab">
                <i class="fas fa-history"></i> My Orders
            </a>
            <div class="user-menu">
                <button onclick="logout()" class="btn btn-sm btn-secondary">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        `;
    } else {
        userAuthSection.innerHTML = `
            <a href="#" onclick="showAuth()" class="nav-link" id="authTab">
                <i class="fas fa-sign-in-alt"></i> Login
            </a>
        `;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE}/customers/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.customer;
            localStorage.setItem('userToken', authToken);
            
            updateAuthUI(true);
            showNotification('Login successful!', 'success');
            showHome();
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please check your connection.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const phone = document.getElementById('registerPhone').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const address = document.getElementById('registerAddress').value;
    
    try {
        const response = await fetch(`${API_BASE}/customers/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, phone, email, password, address })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.customer;
            localStorage.setItem('userToken', authToken);
            
            updateAuthUI(true);
            showNotification('Registration successful!', 'success');
            showHome();
        } else {
            showNotification(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed. Please check your connection.', 'error');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('userToken');
    updateAuthUI(false);
    showNotification('Logged out successfully', 'info');
    showHome();
}

// Navigation Functions
function showHome() {
    setActiveTab('homeTab');
    showSection('homeSection');
}

function showProducts() {
    setActiveTab('productsTab');
    showSection('productsSection');
    loadProducts();
}

function showCart() {
    setActiveTab('cartTab');
    showSection('cartSection');
    loadCart();
}

function showAuth() {
    setActiveTab('authTab');
    showSection('authSection');
}

function showOrders() {
    setActiveTab('ordersTab');
    showSection('ordersSection');
    loadUserOrders();
}

function showAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.style.display = 'none');
    
    if (tab === 'login') {
        document.querySelector('.auth-tab').classList.add('active');
        document.getElementById('loginForm').style.display = 'block';
    } else {
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
        document.getElementById('registerForm').style.display = 'block';
    }
}

function setActiveTab(activeTabId) {
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(activeTabId).classList.add('active');
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
}

// Product Functions
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        const categories = await response.json();
        
        const categoryFilter = document.getElementById('categoryFilter');
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Categories error:', error);
    }
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Products error:', error);
        showNotification('Failed to load products', 'error');
    }
}

function displayProducts(productsToShow) {
    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = '';

    if (productsToShow.length === 0) {
        productsGrid.innerHTML = '<div class="no-products">No products found</div>';
        return;
    }

    productsToShow.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image">
                <img src="${product.image_url || 'https://via.placeholder.com/300x300?text=No+Image'}" 
                     alt="${product.name}" onclick="showProductDetails(${product.id})">
            </div>
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 onclick="showProductDetails(${product.id})">${product.name}</h3>
                <p class="product-description">${product.description || ''}</p>
                <div class="product-footer">
                    <div class="product-price">₹${parseFloat(product.price).toFixed(2)}</div>
                    <button onclick="addToCart(${product.id})" class="btn btn-primary btn-sm">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
                <div class="product-stock ${product.stock_quantity <= 5 ? 'low-stock' : ''}">
                    ${product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
                </div>
            </div>
        `;
        productsGrid.appendChild(productCard);
    });
}

function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedCategory = document.getElementById('categoryFilter').value;

    let filteredProducts = products;

    if (selectedCategory) {
        filteredProducts = filteredProducts.filter(product => 
            product.category === selectedCategory
        );
    }

    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
    }

    displayProducts(filteredProducts);
}

async function showProductDetails(productId) {
    try {
        const response = await fetch(`${API_BASE}/products/${productId}`);
        const product = await response.json();

        document.getElementById('productModalTitle').textContent = product.name;
        document.getElementById('productModalBody').innerHTML = `
            <div class="product-details">
                <div class="product-detail-image">
                    <img src="${product.image_url || 'https://via.placeholder.com/400x400?text=No+Image'}" 
                         alt="${product.name}">
                </div>
                <div class="product-detail-info">
                    <span class="product-category-badge">${product.category}</span>
                    <h3>${product.name}</h3>
                    <p class="product-detail-description">${product.description || 'No description available'}</p>
                    <div class="product-detail-price">₹${parseFloat(product.price).toFixed(2)}</div>
                    <div class="product-detail-stock">
                        ${product.stock_quantity > 0 ? 
                            `<i class="fas fa-check-circle text-success"></i> ${product.stock_quantity} in stock` : 
                            '<i class="fas fa-times-circle text-danger"></i> Out of stock'
                        }
                    </div>
                    <div class="quantity-selector">
                        <label for="productQuantity">Quantity:</label>
                        <input type="number" id="productQuantity" value="1" min="1" max="${product.stock_quantity}">
                    </div>
                    <div class="product-actions">
                        <button onclick="addToCartWithQuantity(${product.id})" class="btn btn-primary" 
                                ${product.stock_quantity <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                        <button onclick="closeProductModal()" class="btn btn-secondary">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('productModal').style.display = 'block';
    } catch (error) {
        console.error('Product details error:', error);
        showNotification('Failed to load product details', 'error');
    }
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
}

// Cart Functions
function addToCart(productId, quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock_quantity <= 0) {
        showNotification('Product is out of stock', 'error');
        return;
    }

    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock_quantity) {
            showNotification(`Only ${product.stock_quantity} items available`, 'error');
            return;
        }
        existingItem.quantity = newQuantity;
    } else {
        if (quantity > product.stock_quantity) {
            showNotification(`Only ${product.stock_quantity} items available`, 'error');
            return;
        }
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            quantity: quantity,
            max_quantity: product.stock_quantity
        });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showNotification(`${product.name} added to cart`, 'success');
}

function addToCartWithQuantity(productId) {
    const quantity = parseInt(document.getElementById('productQuantity').value) || 1;
    addToCart(productId, quantity);
    closeProductModal();
}

function updateCartQuantity(productId, quantity) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    if (quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    if (quantity > item.max_quantity) {
        showNotification(`Only ${item.max_quantity} items available`, 'error');
        return;
    }

    item.quantity = quantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
    updateCartCount();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
    updateCartCount();
    showNotification('Item removed from cart', 'info');
}

function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

function loadCart() {
    const cartItems = document.getElementById('cartItems');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const cartTotal = document.getElementById('cartTotal');

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h3>Your cart is empty</h3>
                <p>Add some products to get started</p>
                <button onclick="showProducts()" class="btn btn-primary">
                    <i class="fas fa-shopping-bag"></i> Shop Now
                </button>
            </div>
        `;
        cartSubtotal.textContent = '₹0.00';
        cartTotal.textContent = '₹0.00';
        return;
    }

    let subtotal = 0;
    cartItems.innerHTML = '';

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.image_url || 'https://via.placeholder.com/80x80?text=No+Image'}" 
                     alt="${item.name}">
            </div>
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <div class="cart-item-price">₹${parseFloat(item.price).toFixed(2)}</div>
            </div>
            <div class="cart-item-quantity">
                <button onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})" class="qty-btn">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="quantity">${item.quantity}</span>
                <button onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})" class="qty-btn">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="cart-item-total">₹${itemTotal.toFixed(2)}</div>
            <button onclick="removeFromCart(${item.id})" class="remove-btn">
                <i class="fas fa-trash"></i>
            </button>
        `;
        cartItems.appendChild(cartItem);
    });

    cartSubtotal.textContent = `₹${subtotal.toFixed(2)}`;
    cartTotal.textContent = `₹${subtotal.toFixed(2)}`;
}

// User Orders Functions
async function loadUserOrders() {
    if (!authToken) {
        document.getElementById('userOrdersContent').innerHTML = `
            <div class="empty-orders">
                <i class="fas fa-sign-in-alt"></i>
                <h3>Please login to view your orders</h3>
                <button onclick="showAuth()" class="btn btn-primary">
                    <i class="fas fa-sign-in-alt"></i> Login
                </button>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/customers/orders`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const orders = await response.json();
            displayUserOrders(orders);
        } else {
            showNotification('Failed to load orders', 'error');
        }
    } catch (error) {
        console.error('Load orders error:', error);
        showNotification('Failed to load orders', 'error');
    }
}

function displayUserOrders(orders) {
    const ordersContent = document.getElementById('userOrdersContent');
    
    if (orders.length === 0) {
        ordersContent.innerHTML = `
            <div class="empty-orders">
                <i class="fas fa-shopping-bag"></i>
                <h3>No orders yet</h3>
                <p>Start shopping to see your orders here</p>
                <button onclick="showProducts()" class="btn btn-primary">
                    <i class="fas fa-shopping-bag"></i> Shop Now
                </button>
            </div>
        `;
        return;
    }

    let ordersHtml = '<div class="orders-grid">';
    
    orders.forEach(order => {
        ordersHtml += `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-id">Order #${order.id}</div>
                    <div class="order-date">${new Date(order.created_at).toLocaleDateString()}</div>
                </div>
                <div class="order-info">
                    <div class="order-items">${order.item_count} item${order.item_count > 1 ? 's' : ''}</div>
                    <div class="order-amount">₹${parseFloat(order.total_amount).toFixed(2)}</div>
                </div>
                <div class="order-status">
                    <span class="badge badge-${order.payment_status.toLowerCase()}">${order.payment_status}</span>
                    <span class="badge badge-${order.order_status.toLowerCase()}">${order.order_status}</span>
                </div>
                <div class="order-payment">
                    <i class="fas fa-${order.payment_method === 'Cash' ? 'money-bill-wave' : 'mobile-alt'}"></i>
                    ${order.payment_method}
                </div>
                <button onclick="viewUserOrder(${order.id})" class="btn btn-sm btn-primary">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        `;
    });
    
    ordersHtml += '</div>';
    ordersContent.innerHTML = ordersHtml;
}

async function viewUserOrder(orderId) {
    try {
        const response = await fetch(`${API_BASE}/customers/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const order = await response.json();
            showUserOrderDetails(order);
        } else {
            showNotification('Failed to load order details', 'error');
        }
    } catch (error) {
        console.error('View order error:', error);
        showNotification('Failed to load order details', 'error');
    }
}

function showUserOrderDetails(order) {
    let itemsHtml = '';
    order.items.forEach(item => {
        itemsHtml += `
            <div class="order-detail-item">
                <div class="item-name">${item.product_name}</div>
                <div class="item-quantity">Qty: ${item.quantity}</div>
                <div class="item-price">₹${parseFloat(item.unit_price).toFixed(2)}</div>
                <div class="item-total">₹${parseFloat(item.total_price).toFixed(2)}</div>
            </div>
        `;
    });

    document.getElementById('orderModalTitle').textContent = `Order #${order.id}`;
    document.getElementById('orderModalBody').innerHTML = `
        <div class="order-detail-container">
            <div class="order-detail-header">
                <div class="order-detail-info">
                    <h4>Order Information</h4>
                    <p><strong>Order ID:</strong> #${order.id}</p>
                    <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                    <p><strong>Payment Method:</strong> ${order.payment_method}</p>
                    <p><strong>Payment Status:</strong> <span class="badge badge-${order.payment_status.toLowerCase()}">${order.payment_status}</span></p>
                    <p><strong>Order Status:</strong> <span class="badge badge-${order.order_status.toLowerCase()}">${order.order_status}</span></p>
                </div>
                <div class="order-detail-delivery">
                    <h4>Delivery Information</h4>
                    <p><strong>Name:</strong> ${order.customer_name}</p>
                    <p><strong>Phone:</strong> ${order.customer_phone}</p>
                    ${order.customer_address ? `<p><strong>Address:</strong> ${order.customer_address}</p>` : ''}
                </div>
            </div>
            
            <div class="order-detail-items">
                <h4>Order Items</h4>
                ${itemsHtml}
            </div>
            
            <div class="order-detail-total">
                <h4>Total: ₹${parseFloat(order.total_amount).toFixed(2)}</h4>
            </div>
        </div>
    `;

    document.getElementById('orderModal').style.display = 'block';
}

// Checkout Functions
function showCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }
    
    currentStep = 1;
    showCheckoutStep(1);
    document.getElementById('checkoutModal').style.display = 'block';
}

function showCheckoutStep(step) {
    // Update step indicators
    document.querySelectorAll('.step').forEach((stepEl, index) => {
        stepEl.classList.toggle('active', index < step);
    });

    // Show current step content
    document.querySelectorAll('.checkout-step').forEach((stepContent, index) => {
        stepContent.style.display = index === step - 1 ? 'block' : 'none';
    });

    if (step === 3) {
        loadOrderReview();
    }
}

function nextStep() {
    if (currentStep === 1) {
        // Validate step 1
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();

        if (!name || !phone) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
    }

    currentStep++;
    showCheckoutStep(currentStep);
}

function prevStep() {
    currentStep--;
    showCheckoutStep(currentStep);
}

function loadOrderReview() {
    const orderReview = document.getElementById('orderReview');
    const customerName = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const customerAddress = document.getElementById('customerAddress').value;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

    let itemsHtml = '';
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        itemsHtml += `
            <div class="review-item">
                <span>${item.name} x ${item.quantity}</span>
                <span>₹${itemTotal.toFixed(2)}</span>
            </div>
        `;
    });

    orderReview.innerHTML = `
        <div class="review-section">
            <h5>Customer Information</h5>
            <p><strong>Name:</strong> ${customerName}</p>
            <p><strong>Phone:</strong> ${customerPhone}</p>
            ${customerAddress ? `<p><strong>Address:</strong> ${customerAddress}</p>` : ''}
        </div>
        
        <div class="review-section">
            <h5>Payment Method</h5>
            <p><strong>${paymentMethod}</strong></p>
            ${paymentMethod === 'UPI' ? '<small class="text-warning">Note: UPI payments require admin approval</small>' : ''}
        </div>
        
        <div class="review-section">
            <h5>Order Items</h5>
            ${itemsHtml}
            <div class="review-total">
                <strong>Total: ₹${total.toFixed(2)}</strong>
            </div>
        </div>
    `;
}

async function handleCheckout(e) {
    e.preventDefault();

    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const customerAddress = document.getElementById('customerAddress').value.trim();
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

    const orderData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        payment_method: paymentMethod,
        items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity
        }))
    };

    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add auth token if user is logged in
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(orderData)
        });

        const data = await response.json();

        if (response.ok) {
            // Clear cart
            cart = [];
            localStorage.removeItem('cart');
            updateCartCount();

            // Close checkout modal
            closeCheckoutModal();

            // Show success message
            showOrderSuccess(data);

        } else {
            showNotification(data.message || 'Failed to place order', 'error');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showNotification('Failed to place order. Please try again.', 'error');
    }
}

function showOrderSuccess(orderData) {
    const orderSuccessBody = document.getElementById('orderSuccessBody');
    
    orderSuccessBody.innerHTML = `
        <div class="success-content">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h4>Thank you for your order!</h4>
            <p>Your order <strong>#${orderData.order_id}</strong> has been placed successfully.</p>
            
            ${orderData.payment_status === 'Pending' ? `
                <div class="payment-pending">
                    <i class="fas fa-clock"></i>
                    <p><strong>Payment Status:</strong> Pending Admin Approval</p>
                    <small>Your UPI payment is pending approval from our admin. You will be notified once approved.</small>
                </div>
            ` : `
                <div class="payment-approved">
                    <i class="fas fa-check"></i>
                    <p><strong>Payment Status:</strong> Approved</p>
                    <small>Your order will be processed soon.</small>
                </div>
            `}
            
            <div class="success-actions">
                <button onclick="closeOrderSuccessModal(); showHome();" class="btn btn-primary">
                    <i class="fas fa-home"></i> Continue Shopping
                </button>
            </div>
        </div>
    `;

    document.getElementById('orderSuccessModal').style.display = 'block';
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').style.display = 'none';
    currentStep = 1;
}

function closeOrderSuccessModal() {
    document.getElementById('orderSuccessModal').style.display = 'none';
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" class="notification-close">&times;</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Modal close handlers
window.onclick = function(event) {
    const productModal = document.getElementById('productModal');
    const checkoutModal = document.getElementById('checkoutModal');
    const orderSuccessModal = document.getElementById('orderSuccessModal');
    
    if (event.target === productModal) {
        closeProductModal();
    }
    if (event.target === checkoutModal) {
        closeCheckoutModal();
    }
    if (event.target === orderSuccessModal) {
        closeOrderSuccessModal();
    }
}

// Logo Functions
async function loadStoreLogo() {
    try {
        const response = await fetch(`${API_BASE}/public/logo`);
        const logoContainer = document.querySelector('.logo');
        
        if (response.ok) {
            const blob = await response.blob();
            const logoUrl = URL.createObjectURL(blob);
            logoContainer.innerHTML = `<img src="${logoUrl}" alt="Bhadrak Health Club" class="logo-image">`;
        } else {
            // Keep default text logo if no image is available
            logoContainer.innerHTML = `
                <div class="logo-icon">💪</div>
                <div class="logo-text">
                    <div class="logo-title">Bhadrak Health Club</div>
                    <div class="logo-subtitle">Premium Supplements</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading logo:', error);
        // Keep default text logo on error
        const logoContainer = document.querySelector('.logo');
        logoContainer.innerHTML = `
            <div class="logo-icon">💪</div>
            <div class="logo-text">
                <div class="logo-title">Bhadrak Health Club</div>
                <div class="logo-subtitle">Premium Supplements</div>
            </div>
        `;
    }
}