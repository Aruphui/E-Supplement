const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

class Database {
    constructor() {
        this.db = new sqlite3.Database('./bhadrak_health_club.db');
        this.init();
    }

    init() {
        // Create tables
        this.db.serialize(() => {
            // Admin users table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS admin_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Products table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    price DECIMAL(10, 2) NOT NULL,
                    category TEXT NOT NULL,
                    stock_quantity INTEGER DEFAULT 0,
                    image_url TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Customers table (enhanced for authentication)
            this.db.run(`
                CREATE TABLE IF NOT EXISTS customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    email TEXT UNIQUE,
                    password TEXT,
                    address TEXT,
                    is_registered BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Add missing columns if they don't exist (for existing databases)
            this.db.run(`ALTER TABLE customers ADD COLUMN password TEXT`, (err) => {
                // Ignore error if column already exists
            });
            this.db.run(`ALTER TABLE customers ADD COLUMN is_registered BOOLEAN DEFAULT 0`, (err) => {
                // Ignore error if column already exists
            });

            // Orders table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER,
                    customer_name TEXT NOT NULL,
                    customer_phone TEXT NOT NULL,
                    customer_address TEXT,
                    total_amount DECIMAL(10, 2) NOT NULL,
                    payment_method TEXT CHECK(payment_method IN ('Cash', 'UPI')) NOT NULL,
                    payment_status TEXT CHECK(payment_status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
                    order_status TEXT CHECK(order_status IN ('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled')) DEFAULT 'Pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (customer_id) REFERENCES customers (id)
                )
            `);

            // Order items table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS order_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    product_name TEXT NOT NULL,
                    quantity INTEGER NOT NULL,
                    unit_price DECIMAL(10, 2) NOT NULL,
                    total_price DECIMAL(10, 2) NOT NULL,
                    FOREIGN KEY (order_id) REFERENCES orders (id),
                    FOREIGN KEY (product_id) REFERENCES products (id)
                )
            `);

            // Insert default admin user
            const defaultPassword = bcrypt.hashSync('admin123', 10);
            this.db.run(`
                INSERT OR IGNORE INTO admin_users (username, password, email) 
                VALUES ('admin', ?, 'admin@bhadrakhealth.com')
            `, [defaultPassword]);

            // Insert some sample products
            this.insertSampleProducts();
        });
    }

    insertSampleProducts() {
        const sampleProducts = [
            {
                name: 'Whey Protein Powder',
                description: 'High-quality whey protein for muscle building and recovery',
                price: 2500.00,
                category: 'Protein',
                stock_quantity: 50,
                image_url: 'https://via.placeholder.com/300x300?text=Whey+Protein'
            },
            {
                name: 'Creatine Monohydrate',
                description: 'Pure creatine monohydrate for strength and power',
                price: 1200.00,
                category: 'Performance',
                stock_quantity: 30,
                image_url: 'https://via.placeholder.com/300x300?text=Creatine'
            },
            {
                name: 'BCAA Powder',
                description: 'Branch-chain amino acids for muscle recovery',
                price: 1800.00,
                category: 'Recovery',
                stock_quantity: 25,
                image_url: 'https://via.placeholder.com/300x300?text=BCAA'
            },
            {
                name: 'Pre-Workout',
                description: 'Energy booster for intense workout sessions',
                price: 2200.00,
                category: 'Energy',
                stock_quantity: 20,
                image_url: 'https://via.placeholder.com/300x300?text=Pre-Workout'
            },
            {
                name: 'Multivitamin',
                description: 'Complete multivitamin for daily health support',
                price: 800.00,
                category: 'Vitamins',
                stock_quantity: 40,
                image_url: 'https://via.placeholder.com/300x300?text=Multivitamin'
            }
        ];

        sampleProducts.forEach(product => {
            this.db.run(`
                INSERT OR IGNORE INTO products (name, description, price, category, stock_quantity, image_url) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [product.name, product.description, product.price, product.category, product.stock_quantity, product.image_url]);
        });
    }

    getDatabase() {
        return this.db;
    }
}

module.exports = Database;