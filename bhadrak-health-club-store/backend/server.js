const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'bhadrak_health_club_secret_key_2024';

// Initialize database
const database = new Database();
const db = database.getDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
// Use /tmp directory in serverless environment
const uploadsDir = process.env.NODE_ENV === 'production' 
    ? '/tmp/uploads'
    : path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Serve static files for user store and admin portal
app.use('/admin', express.static(path.join(__dirname, '../admin-portal')));
app.use('/', express.static(path.join(__dirname, '../user-store')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        if (file.fieldname === 'logo') {
            cb(null, 'logo' + path.extname(file.originalname));
        } else {
            cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
        }
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Admin access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid admin token' });
        }
        
        // Check if user is admin
        if (user.type !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        
        req.user = user;
        next();
    });
};

// ==================== AUTH ROUTES ====================

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    });
});

// Customer registration
app.post('/api/customers/register', (req, res) => {
    console.log('Registration request received:', req.body);
    const { name, email, phone, password, address } = req.body;

    if (!name || !email || !phone || !password) {
        console.log('Missing required fields');
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if customer already exists
    db.get('SELECT * FROM customers WHERE email = ?', [email], (err, existingCustomer) => {
        if (err) {
            console.error('Database error during registration:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (existingCustomer) {
            console.log('Email already registered:', email);
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = bcrypt.hashSync(password, 10);

        db.run(
            `INSERT INTO customers (name, email, phone, password, address, is_registered) 
             VALUES (?, ?, ?, ?, ?, 1)`,
            [name, email, phone, hashedPassword, address],
            function(err) {
                if (err) {
                    console.error('Failed to insert customer:', err);
                    return res.status(500).json({ message: 'Failed to register customer' });
                }

                console.log('Customer registered successfully:', this.lastID);
                const token = jwt.sign(
                    { id: this.lastID, email: email, role: 'customer' },
                    JWT_SECRET,
                    { expiresIn: '30d' }
                );

                res.status(201).json({
                    message: 'Registration successful',
                    token,
                    customer: {
                        id: this.lastID,
                        name,
                        email,
                        phone,
                        address
                    }
                });
            }
        );
    });
});

// Customer login
app.post('/api/customers/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    db.get('SELECT * FROM customers WHERE email = ? AND is_registered = 1', [email], (err, customer) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (!customer || !bcrypt.compareSync(password, customer.password)) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: customer.id, email: customer.email, role: 'customer' },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            message: 'Login successful',
            token,
            customer: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address
            }
        });
    });
});

// ==================== PRODUCT ROUTES ====================

// Get all products (public)
app.get('/api/products', (req, res) => {
    const { category, search } = req.query;
    let query = 'SELECT * FROM products WHERE is_active = 1';
    const params = [];

    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }

    if (search) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name ASC';

    db.all(query, params, (err, products) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(products);
    });
});

// Get single product (public)
app.get('/api/products/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM products WHERE id = ? AND is_active = 1', [id], (err, product) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(product);
    });
});

// Add new product (admin only)
app.post('/api/admin/products', authenticateToken, (req, res) => {
    const { name, description, price, category, stock_quantity, image_url } = req.body;

    if (!name || !price || !category) {
        return res.status(400).json({ message: 'Name, price, and category are required' });
    }

    db.run(
        `INSERT INTO products (name, description, price, category, stock_quantity, image_url) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, description, price, category, stock_quantity || 0, image_url],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Failed to add product' });
            }

            res.status(201).json({
                message: 'Product added successfully',
                product_id: this.lastID
            });
        }
    );
});

// Update product (admin only)
app.put('/api/admin/products/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, description, price, category, stock_quantity, image_url, is_active } = req.body;

    db.run(
        `UPDATE products 
         SET name = ?, description = ?, price = ?, category = ?, 
             stock_quantity = ?, image_url = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, description, price, category, stock_quantity, image_url, is_active, id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Failed to update product' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Product not found' });
            }

            res.json({ message: 'Product updated successfully' });
        }
    );
});

// Delete product (admin only)
app.delete('/api/admin/products/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('UPDATE products SET is_active = 0 WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Failed to delete product' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    });
});

// ==================== ORDER ROUTES ====================

// Create new order (public/authenticated)
app.post('/api/orders', authenticateToken, (req, res) => {
    const { customer_name, customer_phone, customer_address, items, payment_method } = req.body;
    
    // Ensure only customers can place orders (not admins)
    if (req.user.role !== 'customer') {
        return res.status(403).json({ message: 'Only customers can place orders' });
    }
    
    const customerId = req.user.id; // Get customer ID from authenticated token

    if (!customer_name || !customer_phone || !items || items.length === 0 || !payment_method) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Calculate total amount
    let total_amount = 0;
    const orderItems = [];

    // Validate items and calculate total
    let itemsProcessed = 0;
    const totalItems = items.length;

    items.forEach(item => {
        db.get('SELECT * FROM products WHERE id = ? AND is_active = 1', [item.product_id], (err, product) => {
            if (err || !product) {
                return res.status(400).json({ message: `Product with ID ${item.product_id} not found` });
            }

            if (product.stock_quantity < item.quantity) {
                return res.status(400).json({ 
                    message: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}` 
                });
            }

            const itemTotal = product.price * item.quantity;
            total_amount += itemTotal;

            orderItems.push({
                product_id: item.product_id,
                product_name: product.name,
                quantity: item.quantity,
                unit_price: product.price,
                total_price: itemTotal
            });

            itemsProcessed++;

            // If all items processed, create the order
            if (itemsProcessed === totalItems) {
                // Set payment status based on payment method
                const payment_status = payment_method === 'Cash' ? 'Approved' : 'Pending';

                db.run(
                    `INSERT INTO orders (customer_id, customer_name, customer_phone, customer_address, total_amount, payment_method, payment_status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [customerId, customer_name, customer_phone, customer_address, total_amount, payment_method, payment_status],
                    function(err) {
                        if (err) {
                            return res.status(500).json({ message: 'Failed to create order' });
                        }

                        const orderId = this.lastID;

                        // Insert order items
                        const stmt = db.prepare(`
                            INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price) 
                            VALUES (?, ?, ?, ?, ?, ?)
                        `);

                        orderItems.forEach(orderItem => {
                            stmt.run([
                                orderId, 
                                orderItem.product_id, 
                                orderItem.product_name, 
                                orderItem.quantity, 
                                orderItem.unit_price, 
                                orderItem.total_price
                            ]);

                            // Update stock quantity
                            db.run('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', 
                                [orderItem.quantity, orderItem.product_id]);
                        });

                        stmt.finalize();

                        res.status(201).json({
                            message: 'Order created successfully',
                            order_id: orderId,
                            payment_status: payment_status,
                            requires_approval: payment_method === 'UPI'
                        });
                    }
                );
            }
        });
    });
});

// Get customer orders (authenticated customers only)
app.get('/api/customers/orders', authenticateToken, (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ message: 'Access denied' });
    }

    const customerId = req.user.id;

    db.all(`
        SELECT o.*, COUNT(oi.id) as item_count 
        FROM orders o 
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.customer_id = ?
        GROUP BY o.id 
        ORDER BY o.created_at DESC
    `, [customerId], (err, orders) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(orders);
    });
});

// Get single customer order with items (authenticated customers only)
app.get('/api/customers/orders/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'customer') {
        return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const customerId = req.user.id;

    db.get('SELECT * FROM orders WHERE id = ? AND customer_id = ?', [id, customerId], (err, order) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        db.all('SELECT * FROM order_items WHERE order_id = ?', [id], (err, items) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({
                ...order,
                items
            });
        });
    });
});

// Get all orders (admin only)
app.get('/api/admin/orders', authenticateToken, (req, res) => {
    const { status, payment_method } = req.query;
    let query = `
        SELECT o.*, COUNT(oi.id) as item_count 
        FROM orders o 
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE 1=1
    `;
    const params = [];

    if (status) {
        query += ' AND o.order_status = ?';
        params.push(status);
    }

    if (payment_method) {
        query += ' AND o.payment_method = ?';
        params.push(payment_method);
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC';

    db.all(query, params, (err, orders) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(orders);
    });
});

// Get single order with items (admin only)
app.get('/api/admin/orders/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM orders WHERE id = ?', [id], (err, order) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        db.all('SELECT * FROM order_items WHERE order_id = ?', [id], (err, items) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({
                ...order,
                items
            });
        });
    });
});

// Update payment status (admin only)
app.put('/api/admin/orders/:id/payment', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { payment_status } = req.body;

    if (!['Pending', 'Approved', 'Rejected'].includes(payment_status)) {
        return res.status(400).json({ message: 'Invalid payment status' });
    }

    db.run(
        'UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [payment_status, id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Failed to update payment status' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Order not found' });
            }

            res.json({ message: 'Payment status updated successfully' });
        }
    );
});

// Update order status (admin only)
app.put('/api/admin/orders/:id/status', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { order_status } = req.body;

    if (!['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].includes(order_status)) {
        return res.status(400).json({ message: 'Invalid order status' });
    }

    db.run(
        'UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [order_status, id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Failed to update order status' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Order not found' });
            }

            res.json({ message: 'Order status updated successfully' });
        }
    );
});

// ==================== PAYMENT MANAGEMENT ROUTES ====================

// Get pending payments (admin only)
app.get('/api/admin/payments/pending', authenticateToken, (req, res) => {
    const query = `
        SELECT 
            id, 
            order_id,
            customer_name, 
            customer_phone, 
            total_amount, 
            payment_method,
            payment_status,
            created_at,
            updated_at
        FROM orders 
        WHERE payment_status = "Pending" AND payment_method = "UPI"
        ORDER BY created_at DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching pending payments:', err);
            return res.status(500).json({ message: 'Failed to fetch pending payments' });
        }
        
        res.json(rows);
    });
});

// Approve payment (admin only)
app.post('/api/admin/payments/:id/approve', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    db.run(
        `UPDATE orders SET 
            payment_status = "Paid", 
            order_status = "Confirmed",
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND payment_status = "Pending"`,
        [id],
        function(err) {
            if (err) {
                console.error('Error approving payment:', err);
                return res.status(500).json({ message: 'Failed to approve payment' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Payment not found or already processed' });
            }
            
            res.json({ 
                message: 'Payment approved successfully',
                changes: this.changes 
            });
        }
    );
});

// Reject payment (admin only)
app.post('/api/admin/payments/:id/reject', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    db.run(
        `UPDATE orders SET 
            payment_status = "Failed", 
            order_status = "Cancelled",
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND payment_status = "Pending"`,
        [id],
        function(err) {
            if (err) {
                console.error('Error rejecting payment:', err);
                return res.status(500).json({ message: 'Failed to reject payment' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Payment not found or already processed' });
            }
            
            res.json({ 
                message: 'Payment rejected',
                changes: this.changes 
            });
        }
    );
});

// Get payment details (admin only)
app.get('/api/admin/payments/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT 
            id, 
            order_id,
            customer_name, 
            customer_phone, 
            customer_address,
            total_amount, 
            payment_method,
            payment_status,
            order_status,
            items,
            created_at,
            updated_at
        FROM orders 
        WHERE id = ?
    `;
    
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Error fetching payment details:', err);
            return res.status(500).json({ message: 'Failed to fetch payment details' });
        }
        
        if (!row) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        
        // Parse items JSON if it exists
        if (row.items) {
            try {
                row.items = JSON.parse(row.items);
            } catch (parseErr) {
                console.error('Error parsing order items:', parseErr);
                row.items = [];
            }
        }
        
        res.json(row);
    });
});

// ==================== DASHBOARD ROUTES ====================

// Get admin dashboard stats
app.get('/api/admin/dashboard', authenticateToken, (req, res) => {
    const { period = 'all' } = req.query; // all, week, month, year
    
    let dateCondition = '';
    if (period === 'week') {
        dateCondition = "AND created_at >= datetime('now', '-7 days')";
    } else if (period === 'month') {
        dateCondition = "AND created_at >= datetime('now', '-30 days')";
    } else if (period === 'year') {
        dateCondition = "AND created_at >= datetime('now', '-365 days')";
    }

    db.serialize(() => {
        const stats = {};

        // Total products
        db.get('SELECT COUNT(*) as total_products FROM products WHERE is_active = 1', [], (err, result) => {
            stats.total_products = result ? result.total_products : 0;
        });

        // Total orders (with date filter)
        db.get(`SELECT COUNT(*) as total_orders FROM orders WHERE 1=1 ${dateCondition}`, [], (err, result) => {
            stats.total_orders = result ? result.total_orders : 0;
        });

        // Pending payments
        db.get(`SELECT COUNT(*) as pending_payments FROM orders WHERE payment_status = "Pending" ${dateCondition}`, [], (err, result) => {
            stats.pending_payments = result ? result.pending_payments : 0;
        });

        // Total revenue (with date filter)
        db.get(`SELECT SUM(total_amount) as total_revenue FROM orders WHERE payment_status = "Approved" ${dateCondition}`, [], (err, result) => {
            stats.total_revenue = result ? result.total_revenue || 0 : 0;
        });

        // Recent orders
        db.all(`
            SELECT o.id, o.customer_name, o.total_amount, o.payment_method, 
                   o.payment_status, o.order_status, o.created_at 
            FROM orders o 
            WHERE 1=1 ${dateCondition}
            ORDER BY o.created_at DESC 
            LIMIT 5
        `, [], (err, recent_orders) => {
            stats.recent_orders = recent_orders || [];
        });

        // Sales analytics by period
        if (period !== 'all') {
            let groupBy = '';
            if (period === 'week') {
                groupBy = "strftime('%Y-%m-%d', created_at)";
            } else if (period === 'month') {
                groupBy = "strftime('%Y-%m-%d', created_at)";
            } else if (period === 'year') {
                groupBy = "strftime('%Y-%m', created_at)";
            }

            db.all(`
                SELECT ${groupBy} as period, 
                       COUNT(*) as orders_count,
                       SUM(total_amount) as revenue
                FROM orders 
                WHERE payment_status = "Approved" ${dateCondition}
                GROUP BY ${groupBy}
                ORDER BY period ASC
            `, [], (err, analytics) => {
                stats.analytics = analytics || [];
                
                // Top selling products in period
                db.all(`
                    SELECT oi.product_name, SUM(oi.quantity) as total_sold, SUM(oi.total_price) as revenue
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    WHERE o.payment_status = "Approved" ${dateCondition}
                    GROUP BY oi.product_id, oi.product_name
                    ORDER BY total_sold DESC
                    LIMIT 5
                `, [], (err, top_products) => {
                    stats.top_products = top_products || [];
                    res.json(stats);
                });
            });
        } else {
            res.json(stats);
        }
    });
});

// Get product categories
app.get('/api/categories', (req, res) => {
    db.all('SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category', [], (err, categories) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(categories.map(cat => cat.category));
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        message: 'Bhadrak Health Club API is running!', 
        timestamp: new Date().toISOString() 
    });
});

// Logo Management Routes
app.get('/api/logo', authenticateAdmin, (req, res) => {
    const logoPath = path.join(uploadsDir, 'logo.png');
    const logoPathJpg = path.join(uploadsDir, 'logo.jpg');
    const logoPathJpeg = path.join(uploadsDir, 'logo.jpeg');
    
    // Check for different logo file extensions
    if (fs.existsSync(logoPath)) {
        res.sendFile(logoPath);
    } else if (fs.existsSync(logoPathJpg)) {
        res.sendFile(logoPathJpg);
    } else if (fs.existsSync(logoPathJpeg)) {
        res.sendFile(logoPathJpeg);
    } else {
        res.status(404).json({ message: 'Logo not found' });
    }
});

app.get('/api/public/logo', (req, res) => {
    const logoPath = path.join(uploadsDir, 'logo.png');
    const logoPathJpg = path.join(uploadsDir, 'logo.jpg');
    const logoPathJpeg = path.join(uploadsDir, 'logo.jpeg');
    
    // Check for different logo file extensions
    if (fs.existsSync(logoPath)) {
        res.sendFile(logoPath);
    } else if (fs.existsSync(logoPathJpg)) {
        res.sendFile(logoPathJpg);
    } else if (fs.existsSync(logoPathJpeg)) {
        res.sendFile(logoPathJpeg);
    } else {
        res.status(404).json({ message: 'Logo not found' });
    }
});

app.post('/api/upload-logo', authenticateAdmin, upload.single('logo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No logo file provided' });
        }
        
        // Remove old logo files
        const logoExtensions = ['.png', '.jpg', '.jpeg'];
        logoExtensions.forEach(ext => {
            const oldLogoPath = path.join(uploadsDir, 'logo' + ext);
            if (fs.existsSync(oldLogoPath) && oldLogoPath !== req.file.path) {
                fs.unlinkSync(oldLogoPath);
            }
        });
        
        res.json({ 
            message: 'Logo uploaded successfully',
            filename: req.file.filename 
        });
    } catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({ message: 'Failed to upload logo' });
    }
});

app.delete('/api/logo', authenticateAdmin, (req, res) => {
    try {
        const logoExtensions = ['.png', '.jpg', '.jpeg'];
        let logoRemoved = false;
        
        logoExtensions.forEach(ext => {
            const logoPath = path.join(uploadsDir, 'logo' + ext);
            if (fs.existsSync(logoPath)) {
                fs.unlinkSync(logoPath);
                logoRemoved = true;
            }
        });
        
        if (logoRemoved) {
            res.json({ message: 'Logo removed successfully' });
        } else {
            res.status(404).json({ message: 'No logo found to remove' });
        }
    } catch (error) {
        console.error('Logo removal error:', error);
        res.status(500).json({ message: 'Failed to remove logo' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
        }
    }
    res.status(500).json({ message: error.message });
});

// Start server
// Export the app for Vercel serverless deployment
// Don't start server in serverless environment
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`🚀 Bhadrak Health Club API server running on port ${PORT}`);
        console.log(`📊 Admin can login with: username: admin, password: admin123`);
    });
}

module.exports = app;