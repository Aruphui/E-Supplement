// Admin Portal JavaScript
const API_BASE = window.ADMIN_CONFIG ? window.ADMIN_CONFIG.API_BASE : 'http://localhost:3001/api';
let authToken = localStorage.getItem('adminToken');
let currentEditingProductId = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    if (authToken) {
        showDashboardScreen();
    } else {
        showLoginScreen();
    }

    // Setup form event listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    
    // Setup filter change listeners
    document.getElementById('orderStatusFilter').addEventListener('change', loadOrders);
    document.getElementById('dashboardPeriodFilter').addEventListener('change', loadDashboardData);
    document.getElementById('paymentMethodFilter').addEventListener('change', loadOrders);
});

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            document.getElementById('adminUsername').textContent = data.user.username;
            showDashboardScreen();
            loadDashboardData();
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please check your connection.', 'error');
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('adminToken');
    showLoginScreen();
    showNotification('Logged out successfully', 'info');
}

// Screen Navigation
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardScreen').style.display = 'none';
}

function showDashboardScreen() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardScreen').style.display = 'flex';
    // Show dashboard content by default
    showDashboard();
}

function showDashboard() {
    setActiveTab('dashboardTab');
    showContent('dashboardContent');
    loadDashboardData();
}

function showProducts() {
    console.log('showProducts called');
    setActiveTab('productsTab');
    showContent('productsContent');
    
    // Add a small delay to ensure DOM is ready
    setTimeout(() => {
        loadProducts();
    }, 100);
}

function showOrders() {
    console.log('showOrders called');
    setActiveTab('ordersTab');
    showContent('ordersContent');
    loadOrders();
}

function showPayments() {
    console.log('showPayments called');
    setActiveTab('paymentsTab');
    showContent('paymentsContent');
    
    // Add a small delay to ensure DOM is ready
    setTimeout(() => {
        loadPendingPayments();
    }, 100);
}

function setActiveTab(activeTabId) {
    // Remove active class from all tabs
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.classList.remove('active');
    });
    // Add active class to current tab
    document.getElementById(activeTabId).classList.add('active');
}

function showContent(contentId) {
    console.log('Showing content:', contentId);
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(content => {
        content.style.display = 'none';
        console.log('Hiding:', content.id);
    });
    // Show selected content
    const targetContent = document.getElementById(contentId);
    if (targetContent) {
        targetContent.style.display = 'block';
        console.log('Showing:', contentId);
    } else {
        console.error('Content not found:', contentId);
    }
}

// Dashboard Functions
async function loadDashboardData() {
    const period = document.getElementById('dashboardPeriodFilter').value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/dashboard?period=${period}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update stats
            document.getElementById('totalProducts').textContent = data.total_products || 0;
            document.getElementById('totalOrders').textContent = data.total_orders || 0;
            document.getElementById('pendingPayments').textContent = data.pending_payments || 0;
            document.getElementById('totalRevenue').textContent = `₹${(data.total_revenue || 0).toFixed(2)}`;
            
            // Load recent orders
            loadRecentOrders(data.recent_orders || []);
            
            // Show analytics if period-specific data exists
            if (data.analytics && data.analytics.length > 0) {
                showAnalytics(data.analytics, data.top_products || []);
            } else {
                hideAnalytics();
            }
        } else {
            showNotification('Failed to load dashboard data', 'error');
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

function showAnalytics(analyticsData, topProducts) {
    const analyticsSection = document.getElementById('analyticsSection');
    analyticsSection.style.display = 'block';
    
    // Render sales chart (simple text-based for now)
    const salesChart = document.getElementById('salesChart');
    let chartHtml = '<div class="simple-chart">';
    
    analyticsData.forEach(item => {
        const percentage = (item.revenue / Math.max(...analyticsData.map(d => d.revenue))) * 100;
        chartHtml += `
            <div class="chart-item">
                <div class="chart-label">${item.period}</div>
                <div class="chart-bar">
                    <div class="chart-fill" style="width: ${percentage}%"></div>
                    <span class="chart-value">₹${parseFloat(item.revenue || 0).toFixed(0)}</span>
                </div>
            </div>
        `;
    });
    chartHtml += '</div>';
    salesChart.innerHTML = chartHtml;
    
    // Render top products
    const topProductsContainer = document.getElementById('topProducts');
    let topProductsHtml = '<div class="top-products-list">';
    
    topProducts.forEach((product, index) => {
        topProductsHtml += `
            <div class="top-product-item">
                <div class="product-rank">${index + 1}</div>
                <div class="product-details">
                    <div class="product-name">${product.product_name}</div>
                    <div class="product-stats">${product.total_sold} sold • ₹${parseFloat(product.revenue).toFixed(0)}</div>
                </div>
            </div>
        `;
    });
    
    if (topProducts.length === 0) {
        topProductsHtml += '<div class="no-data">No data available</div>';
    }
    
    topProductsHtml += '</div>';
    topProductsContainer.innerHTML = topProductsHtml;
}

function hideAnalytics() {
    document.getElementById('analyticsSection').style.display = 'none';
}

function loadRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersBody');
    tbody.innerHTML = '';
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No recent orders</td></tr>';
        return;
    }
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${order.customer_name}</td>
            <td>₹${parseFloat(order.total_amount).toFixed(2)}</td>
            <td><span class="badge badge-${order.payment_method.toLowerCase()}">${order.payment_method}</span></td>
            <td><span class="badge badge-${order.payment_status.toLowerCase()}">${order.payment_status}</span></td>
            <td>${new Date(order.created_at).toLocaleDateString()}</td>
        `;
        tbody.appendChild(row);
    });
}

// Debug function - can be called from browser console
function debugProducts() {
    console.log('=== DEBUG PRODUCTS ===');
    console.log('API_BASE:', API_BASE);
    
    const tbody = document.getElementById('productsTableBody');
    console.log('productsTableBody element:', tbody);
    
    const productsContent = document.getElementById('productsContent');
    console.log('productsContent element:', productsContent);
    console.log('productsContent display:', productsContent ? productsContent.style.display : 'not found');
    
    // Test API call
    fetch(`${API_BASE}/products`)
        .then(response => {
            console.log('API response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('API response data:', data);
        })
        .catch(error => {
            console.error('API error:', error);
        });
}

// Test function to add a manual row
function testAddRow() {
    const tbody = document.getElementById('productsTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr style="background: red; color: white;">
                <td>TEST</td>
                <td>TEST PRODUCT</td>
                <td>TEST CATEGORY</td>
                <td>₹100.00</td>
                <td>50</td>
                <td>Active</td>
                <td>Actions</td>
            </tr>
        `;
        console.log('Test row added to products table');
    } else {
        console.error('Products table body not found');
    }
}

// Product Functions
async function loadProducts() {
    console.log('Loading products...');
    try {
        const response = await fetch(`${API_BASE}/products`);
        console.log('Products response status:', response.status);
        const products = await response.json();
        console.log('Products received:', products);
        
        const tbody = document.getElementById('productsTableBody');
        console.log('Products table body element:', tbody);
        
        if (!tbody) {
            console.error('productsTableBody element not found!');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No products found</td></tr>';
            return;
        }
        
        products.forEach((product, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="product-image-placeholder">
                        <i class="fas fa-box"></i>
                    </div>
                </td>
                <td><strong>${product.name}</strong></td>
                <td><span class="badge badge-category">${product.category}</span></td>
                <td>₹${parseFloat(product.price).toFixed(2)}</td>
                <td>${product.stock_quantity}</td>
                <td><span class="badge badge-${product.is_active ? 'active' : 'inactive'}">${product.is_active ? 'Active' : 'Inactive'}</span></td>
                <td class="action-buttons">
                    <button onclick="editProduct(${product.id})" class="btn-action btn-edit" title="Edit Product">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteProduct(${product.id})" class="btn-action btn-delete" title="Delete Product">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
            
            // Log first few products for debugging
            if (index < 3) {
                console.log(`Added product ${index + 1}:`, product.name, row);
            }
        });
        
        console.log('Products table populated with', products.length, 'items');
        console.log('Table HTML:', tbody.innerHTML.substring(0, 200) + '...');
    } catch (error) {
        console.error('Products error:', error);
        const tbody = document.getElementById('productsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading products. Please try again.</td></tr>';
        }
        showNotification('Failed to load products', 'error');
    }
}

// Product Modal Functions
function showProductModal() {
    showAddProduct();
}

function showAddProduct() {
    currentEditingProductId = null;
    document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-plus"></i> Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('productModal').style.display = 'block';
}

async function editProduct(productId) {
    currentEditingProductId = productId;
    
    try {
        const response = await fetch(`${API_BASE}/products/${productId}`);
        const product = await response.json();
        
        document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Product';
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock_quantity;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productImage').value = product.image_url || '';
        
        document.getElementById('productModal').style.display = 'block';
    } catch (error) {
        console.error('Edit product error:', error);
        showNotification('Failed to load product details', 'error');
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const productData = {
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        price: parseFloat(document.getElementById('productPrice').value),
        category: document.getElementById('productCategory').value,
        stock_quantity: parseInt(document.getElementById('productStock').value),
        image_url: document.getElementById('productImage').value || null,
        is_active: 1
    };
    
    try {
        const url = currentEditingProductId 
            ? `${API_BASE}/admin/products/${currentEditingProductId}`
            : `${API_BASE}/admin/products`;
        const method = currentEditingProductId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(productData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            closeProductModal();
            loadProducts();
            loadDashboardData(); // Refresh stats
        } else {
            showNotification(data.message || 'Failed to save product', 'error');
        }
    } catch (error) {
        console.error('Product save error:', error);
        showNotification('Failed to save product', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            loadProducts();
            loadDashboardData(); // Refresh stats
        } else {
            showNotification(data.message || 'Failed to delete product', 'error');
        }
    } catch (error) {
        console.error('Delete product error:', error);
        showNotification('Failed to delete product', 'error');
    }
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    currentEditingProductId = null;
}

// Order Functions
async function loadOrders() {
    const statusFilter = document.getElementById('orderStatusFilter').value;
    const paymentFilter = document.getElementById('paymentMethodFilter').value;
    
    let url = `${API_BASE}/admin/orders`;
    const params = new URLSearchParams();
    
    if (statusFilter) params.append('status', statusFilter);
    if (paymentFilter) params.append('payment_method', paymentFilter);
    
    if (params.toString()) {
        url += '?' + params.toString();
    }
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const orders = await response.json();
        
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = '';
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No orders found</td></tr>';
            return;
        }
        
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${order.id}</td>
                <td>${order.customer_name}</td>
                <td>${order.customer_phone}</td>
                <td>₹${parseFloat(order.total_amount).toFixed(2)}</td>
                <td><span class="badge badge-${order.payment_method.toLowerCase()}">${order.payment_method}</span></td>
                <td><span class="badge badge-${order.payment_status.toLowerCase()}">${order.payment_status}</span></td>
                <td><span class="badge badge-${order.order_status.toLowerCase()}">${order.order_status}</span></td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td class="action-buttons">
                    <button onclick="viewOrder(${order.id})" class="btn-action btn-edit" title="View Order">
                        <i class="fas fa-eye"></i>
                    </button>
                    <select onchange="updateOrderStatus(${order.id}, this.value)" class="filter-select" style="min-width: 120px;">
                        <option value="">Change Status</option>
                        <option value="Pending" ${order.order_status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Confirmed" ${order.order_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Shipped" ${order.order_status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${order.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="Cancelled" ${order.order_status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Orders error:', error);
        showNotification('Failed to load orders', 'error');
    }
}

async function viewOrder(orderId) {
    try {
        const response = await fetch(`${API_BASE}/admin/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const order = await response.json();
        
        let itemsHtml = '';
        order.items.forEach(item => {
            itemsHtml += `
                <tr>
                    <td>${item.product_name}</td>
                    <td>${item.quantity}</td>
                    <td>₹${parseFloat(item.unit_price).toFixed(2)}</td>
                    <td>₹${parseFloat(item.total_price).toFixed(2)}</td>
                </tr>
            `;
        });
        
        document.getElementById('orderModalBody').innerHTML = `
            <div class="order-details">
                <div class="order-info">
                    <h4>Order #${order.id}</h4>
                    <p><strong>Customer:</strong> ${order.customer_name}</p>
                    <p><strong>Phone:</strong> ${order.customer_phone}</p>
                    <p><strong>Address:</strong> ${order.customer_address || 'Not provided'}</p>
                    <p><strong>Payment Method:</strong> ${order.payment_method}</p>
                    <p><strong>Payment Status:</strong> <span class="badge badge-${order.payment_status.toLowerCase()}">${order.payment_status}</span></p>
                    <p><strong>Order Status:</strong> <span class="badge badge-${order.order_status.toLowerCase()}">${order.order_status}</span></p>
                    <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                
                <h4>Order Items</h4>
                <table class="order-items-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <div class="order-total">
                    <h4>Total Amount: ₹${parseFloat(order.total_amount).toFixed(2)}</h4>
                </div>
            </div>
        `;
        
        document.getElementById('orderModal').style.display = 'block';
    } catch (error) {
        console.error('View order error:', error);
        showNotification('Failed to load order details', 'error');
    }
}

async function updateOrderStatus(orderId, newStatus) {
    if (!newStatus) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ order_status: newStatus })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            loadOrders();
            loadDashboardData(); // Refresh stats
        } else {
            showNotification(data.message || 'Failed to update order status', 'error');
        }
    } catch (error) {
        console.error('Update order status error:', error);
        showNotification('Failed to update order status', 'error');
    }
}

function closeOrderModal() {
    document.getElementById('orderModal').style.display = 'none';
}

// Payment Functions
async function loadPendingPayments() {
    try {
        const response = await fetch(`${API_BASE}/admin/orders?payment_method=UPI`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const orders = await response.json();
        const pendingPayments = orders.filter(order => order.payment_status === 'Pending');
        
        const tbody = document.getElementById('paymentsTableBody');
        tbody.innerHTML = '';
        
        if (pendingPayments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No pending UPI payments</td></tr>';
            return;
        }
        
        pendingPayments.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${order.id}</td>
                <td>${order.customer_name}</td>
                <td>${order.customer_phone}</td>
                <td>₹${parseFloat(order.total_amount).toFixed(2)}</td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                    <button onclick="approvePayment(${order.id})" class="btn btn-sm btn-success">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button onclick="rejectPayment(${order.id})" class="btn btn-sm btn-danger">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Pending payments error:', error);
        showNotification('Failed to load pending payments', 'error');
    }
}

async function approvePayment(orderId) {
    await updatePaymentStatus(orderId, 'Approved');
}

async function rejectPayment(orderId) {
    if (!confirm('Are you sure you want to reject this payment?')) {
        return;
    }
    await updatePaymentStatus(orderId, 'Rejected');
}

async function updatePaymentStatus(orderId, status) {
    try {
        const response = await fetch(`${API_BASE}/admin/orders/${orderId}/payment`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ payment_status: status })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            loadPendingPayments();
            loadDashboardData(); // Refresh stats
        } else {
            showNotification(data.message || 'Failed to update payment status', 'error');
        }
    } catch (error) {
        console.error('Update payment status error:', error);
        showNotification('Failed to update payment status', 'error');
    }
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
    const orderModal = document.getElementById('orderModal');
    const logoModal = document.getElementById('logoModal');
    
    if (event.target === productModal) {
        closeProductModal();
    }
    if (event.target === orderModal) {
        closeOrderModal();
    }
    if (event.target === logoModal) {
        closeLogoModal();
    }
}

// Logo Management Functions
function showLogoModal() {
    const modal = document.getElementById('logoModal');
    modal.style.display = 'block';
    loadCurrentLogo();
}

function closeLogoModal() {
    const modal = document.getElementById('logoModal');
    modal.style.display = 'none';
    
    // Reset form
    document.getElementById('logoForm').reset();
    document.getElementById('newLogoPreview').style.display = 'none';
}

async function loadCurrentLogo() {
    try {
        const response = await fetch(`${API_BASE}/logo`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const currentLogoPreview = document.getElementById('currentLogoPreview');
        
        if (response.ok) {
            const blob = await response.blob();
            const logoUrl = URL.createObjectURL(blob);
            currentLogoPreview.innerHTML = `<img src="${logoUrl}" alt="Current Logo">`;
        } else {
            currentLogoPreview.innerHTML = '<p>No logo uploaded</p>';
        }
    } catch (error) {
        console.error('Error loading logo:', error);
        document.getElementById('currentLogoPreview').innerHTML = '<p>Error loading logo</p>';
    }
}

function previewLogo(input) {
    const preview = document.getElementById('newLogoPreview');
    const previewImage = document.getElementById('previewImage');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            preview.style.display = 'block';
        };
        
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.style.display = 'none';
    }
}

async function uploadLogo(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('logoFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select a logo file', 'error');
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Logo file size should be less than 5MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('logo', file);
    
    try {
        const response = await fetch(`${API_BASE}/upload-logo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (response.ok) {
            showNotification('Logo uploaded successfully', 'success');
            closeLogoModal();
            // Refresh current logo display
            loadCurrentLogo();
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Failed to upload logo', 'error');
        }
    } catch (error) {
        console.error('Logo upload error:', error);
        showNotification('Failed to upload logo', 'error');
    }
}

async function removeLogo() {
    if (!confirm('Are you sure you want to remove the current logo?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/logo`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            showNotification('Logo removed successfully', 'success');
            closeLogoModal();
            loadCurrentLogo();
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Failed to remove logo', 'error');
        }
    } catch (error) {
        console.error('Logo removal error:', error);
        showNotification('Failed to remove logo', 'error');
    }
}

// Payment Functions (using orders API for pending UPI payments)
async function loadPendingPayments() {
    console.log('Loading pending payments...');
    
    try {
        const authToken = localStorage.getItem('adminToken');
        if (!authToken) {
            showNotification('Please log in to view payments', 'error');
            return;
        }

        // Use the existing orders endpoint with payment status filter
        const response = await fetch(`${API_BASE}/admin/orders`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('Orders response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const allOrders = await response.json();
        console.log('All orders received:', allOrders);
        
        // Filter for pending UPI payments
        const pendingPayments = allOrders.filter(order => 
            order.payment_status === 'Pending' && order.payment_method === 'UPI'
        );
        
        console.log('Filtered pending payments:', pendingPayments);
        
        const paymentsTableBody = document.getElementById('paymentsTableBody');
        console.log('Payments table body element:', paymentsTableBody);
        
        if (!paymentsTableBody) {
            console.error('Payments table body not found');
            return;
        }

        // Clear existing content
        paymentsTableBody.innerHTML = '';
        
        if (!pendingPayments || pendingPayments.length === 0) {
            paymentsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--gray-400);">
                        <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                        <br>
                        No pending UPI payments found
                    </td>
                </tr>
            `;
            console.log('No pending payments to display');
            return;
        }

        // Populate payments table
        pendingPayments.forEach((payment, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${payment.order_id || payment.id}</td>
                <td>${payment.customer_name || 'Unknown'}</td>
                <td>${payment.customer_phone || 'N/A'}</td>
                <td>₹${payment.total_amount ? payment.total_amount.toFixed(2) : '0.00'}</td>
                <td>${payment.created_at ? new Date(payment.created_at).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="approveUpiPayment(${payment.id})" class="btn-action btn-approve" title="Approve Payment">
                            <i class="fas fa-check"></i>
                        </button>
                        <button onclick="rejectUpiPayment(${payment.id})" class="btn-action btn-reject" title="Reject Payment">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            `;
            paymentsTableBody.appendChild(row);
            console.log(`Added payment ${index + 1}:`, payment.customer_name);
        });
        
        console.log(`Payments table populated with ${pendingPayments.length} items`);
        showNotification(`Loaded ${pendingPayments.length} pending UPI payments`, 'success');
        
    } catch (error) {
        console.error('Error loading pending payments:', error);
        showNotification('Failed to load pending payments', 'error');
        
        // Show error message in table
        const paymentsTableBody = document.getElementById('paymentsTableBody');
        if (paymentsTableBody) {
            paymentsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--danger-300);">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                        <br>
                        Failed to load payments. Please try again.
                    </td>
                </tr>
            `;
        }
    }
}

async function approveUpiPayment(orderId) {
    if (!confirm('Are you sure you want to approve this UPI payment?')) {
        return;
    }
    
    try {
        const authToken = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin/orders/${orderId}/payment`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ payment_status: 'Approved' })
        });

        if (response.ok) {
            showNotification('UPI payment approved successfully', 'success');
            loadPendingPayments(); // Reload payments list
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Failed to approve payment', 'error');
        }
    } catch (error) {
        console.error('Error approving UPI payment:', error);
        showNotification('Failed to approve payment', 'error');
    }
}

async function rejectUpiPayment(orderId) {
    if (!confirm('Are you sure you want to reject this UPI payment? This action cannot be undone.')) {
        return;
    }
    
    try {
        const authToken = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin/orders/${orderId}/payment`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ payment_status: 'Rejected' })
        });

        if (response.ok) {
            showNotification('UPI payment rejected', 'success');
            loadPendingPayments(); // Reload payments list
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Failed to reject payment', 'error');
        }
    } catch (error) {
        console.error('Error rejecting UPI payment:', error);
        showNotification('Failed to reject payment', 'error');
    }
}