// Fixed server.js for consistent database operations in serverless environment
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const getDatabaseInstance = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'bhadrak_health_club_secret_key_2024';

// Global database instance for serverless consistency
let database = null;
let db = null;
let isInitializing = false;

// Initialize database connection with proper serverless handling
async function initializeDatabase() {
    // Prevent multiple simultaneous initializations
    if (isInitializing) {
        while (isInitializing) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        return db;
    }

    if (!database) {
        isInitializing = true;
        try {
            console.log('Initializing database for serverless function...');
            database = getDatabaseInstance();
            db = await database.getDatabase();
            console.log('Database successfully initialized for serverless function');
        } finally {
            isInitializing = false;
        }
    }
    return db;
}

// Middleware
app.use(cors());
app.use(express.json());

// Database initialization middleware - ensures DB is ready for all requests
app.use(async (req, res, next) => {
    try {
        // Always ensure database is initialized for each request in serverless
        if (!db || (process.env.NODE_ENV === 'production' && !database.initialized)) {
            db = await initializeDatabase();
        }
        req.db = db;
        next();
    } catch (error) {
        console.error('Database initialization error:', error);
        res.status(500).json({ 
            message: 'Database connection failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

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
    const db = req.db;

    db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Admin login database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: 'admin', type: 'admin' },
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
    const db = req.db;

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
    const db = req.db;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    db.get('SELECT * FROM customers WHERE email = ? AND is_registered = 1', [email], (err, customer) => {
        if (err) {
            console.error('Customer login database error:', err);
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
    const db = req.db;
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
            console.error('Products fetch error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(products);
    });
});

// Get single product (public)
app.get('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const db = req.db;

    db.get('SELECT * FROM products WHERE id = ? AND is_active = 1', [id], (err, product) => {
        if (err) {
            console.error('Single product fetch error:', err);
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
    const db = req.db;

    if (!name || !price || !category) {
        return res.status(400).json({ message: 'Name, price, and category are required' });
    }

    db.run(
        `INSERT INTO products (name, description, price, category, stock_quantity, image_url) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, description, price, category, stock_quantity || 0, image_url],
        function(err) {
            if (err) {
                console.error('Add product error:', err);
                return res.status(500).json({ message: 'Failed to add product' });
            }

            res.status(201).json({
                message: 'Product added successfully',
                product_id: this.lastID
            });
        }
    );
});

// Upload product image
app.post('/api/admin/products/upload-image', authenticateToken, upload.single('productImage'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }
        
        const imageUrl = `/uploads/${req.file.filename}`;
        
        res.json({ 
            message: 'Product image uploaded successfully',
            imageUrl: imageUrl,
            filename: req.file.filename 
        });
    } catch (error) {
        console.error('Product image upload error:', error);
        res.status(500).json({ message: 'Failed to upload product image' });
    }
});

// Add new product with image upload (multipart form)
app.post('/api/admin/products/with-image', authenticateToken, upload.single('productImage'), (req, res) => {
    const { name, description, price, category, stock_quantity } = req.body;
    const db = req.db;

    if (!name || !price || !category) {
        return res.status(400).json({ message: 'Name, price, and category are required' });
    }

    // If image uploaded, use the uploaded image URL, otherwise use provided image_url
    const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;

    db.run(
        `INSERT INTO products (name, description, price, category, stock_quantity, image_url) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, description, price, category, stock_quantity || 0, image_url],
        function(err) {
            if (err) {
                console.error('Add product with image error:', err);
                return res.status(500).json({ message: 'Failed to add product' });
            }

            res.status(201).json({
                message: 'Product added successfully',
                product_id: this.lastID,
                image_url: image_url
            });
        }
    );
});

// Update product (admin only)
app.put('/api/admin/products/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, description, price, category, stock_quantity, image_url, is_active } = req.body;
    const db = req.db;

    db.run(
        `UPDATE products 
         SET name = ?, description = ?, price = ?, category = ?, 
             stock_quantity = ?, image_url = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, description, price, category, stock_quantity, image_url, is_active !== undefined ? is_active : 1, id],
        function(err) {
            if (err) {
                console.error('Update product error:', err);
                return res.status(500).json({ message: 'Failed to update product' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Product not found' });
            }

            res.json({ message: 'Product updated successfully' });
        }
    );
});

// Delete single product (admin only) - Sets is_active to 0
app.delete('/api/admin/products/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const db = req.db;

    db.run('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Delete product error:', err);
            return res.status(500).json({ message: 'Failed to delete product' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ 
            message: 'Product deleted successfully',
            productId: id
        });
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        message: 'Bhadrak Health Club API is running!', 
        timestamp: new Date().toISOString(),
        database: req.db ? 'connected' : 'not connected'
    });
});

// Get product categories
app.get('/api/categories', (req, res) => {
    const db = req.db;
    
    db.all('SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category', [], (err, categories) => {
        if (err) {
            console.error('Categories fetch error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(categories.map(cat => cat.category));
    });
});

// Deactivate all products (admin only) - Safer: Just makes them inactive
app.put('/api/admin/products/deactivate-all', authenticateToken, (req, res) => {
    const db = req.db;
    
    db.run('UPDATE products SET is_active = 0', [], function(err) {
        if (err) {
            console.error('Error deactivating products:', err);
            return res.status(500).json({ message: 'Failed to deactivate products' });
        }
        
        console.log(`Deactivated ${this.changes} products`);
        res.json({ 
            message: 'All products deactivated successfully',
            productsDeactivated: this.changes
        });
    });
});

// Clear all products (admin only) - DANGER: This removes all products!
app.delete('/api/admin/products/clear-all', authenticateToken, (req, res) => {
    const db = req.db;
    
    // First, delete all order items that reference products
    db.run('DELETE FROM order_items', [], function(orderItemsErr) {
        if (orderItemsErr) {
            console.error('Error clearing order items:', orderItemsErr);
            return res.status(500).json({ message: 'Failed to clear order items' });
        }
        
        // Then delete all products
        db.run('DELETE FROM products', [], function(productsErr) {
            if (productsErr) {
                console.error('Error clearing products:', productsErr);
                return res.status(500).json({ message: 'Failed to clear products' });
            }
            
            console.log(`Cleared all products. Order items deleted: ${this.changes}, Products deleted: ${this.changes}`);
            res.json({ 
                message: 'All products cleared successfully',
                orderItemsDeleted: this.changes,
                productsDeleted: this.changes
            });
        });
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Express error:', error);
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
        }
    }
    res.status(500).json({ message: error.message || 'Internal server error' });
});

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