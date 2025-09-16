const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

class Database {
    constructor() {
        // For Vercel serverless: use in-memory database that reinitializes on each cold start
        const dbPath = process.env.NODE_ENV === 'production' 
            ? ':memory:' 
            : './bhadrak_health_club.db';
        
        this.dbPath = dbPath;
        this.db = null;
        this.initialized = false;
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    async getDatabase() {
        if (!this.db || (this.isProduction && !this.initialized)) {
            await this.connect();
        }
        return this.db;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, async (err) => {
                if (err) {
                    console.error('Database connection error:', err);
                    reject(err);
                } else {
                    console.log(`Connected to SQLite database (${this.isProduction ? 'in-memory' : 'file'})`);
                    // Always reinitialize in production (Vercel serverless)
                    if (!this.initialized || this.isProduction) {
                        await this.init();
                    }
                    resolve(this.db);
                }
            });
        });
    }

    async init() {
        return new Promise((resolve, reject) => {
            if (this.initialized) {
                resolve();
                return;
            }

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

                // Customers table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS customers (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        phone TEXT NOT NULL,
                        password TEXT,
                        address TEXT,
                        is_registered BOOLEAN DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Orders table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS orders (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        customer_id INTEGER,
                        customer_name TEXT NOT NULL,
                        customer_phone TEXT NOT NULL,
                        customer_address TEXT,
                        total_amount DECIMAL(10, 2) NOT NULL,
                        payment_method TEXT NOT NULL,
                        payment_status TEXT DEFAULT 'Pending',
                        order_status TEXT DEFAULT 'Pending',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (customer_id) REFERENCES customers(id)
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
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (order_id) REFERENCES orders(id),
                        FOREIGN KEY (product_id) REFERENCES products(id)
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating order_items table:', err);
                        reject(err);
                        return;
                    }

                    // Check if admin user exists, if not create default one
                    this.db.get('SELECT COUNT(*) as count FROM admin_users', [], (err, result) => {
                        if (err) {
                            console.error('Error checking admin users:', err);
                            reject(err);
                            return;
                        }

                        if (result.count === 0) {
                            const hashedPassword = bcrypt.hashSync('admin123', 10);
                            this.db.run(
                                'INSERT INTO admin_users (username, password, email) VALUES (?, ?, ?)',
                                ['admin', hashedPassword, 'admin@bhadrakhealth.com'],
                                (err) => {
                                    if (err) {
                                        console.error('Error creating default admin:', err);
                                        reject(err);
                                    } else {
                                        console.log('Default admin user created');
                                        this.addSampleData().then(() => {
                                            this.initialized = true;
                                            console.log('Database fully initialized');
                                            resolve();
                                        }).catch(reject);
                                    }
                                }
                            );
                        } else {
                            console.log('Admin user already exists');
                            // In production, always add sample data on cold start
                            if (this.isProduction) {
                                this.addSampleData().then(() => {
                                    this.initialized = true;
                                    console.log('Sample data refreshed for serverless');
                                    resolve();
                                }).catch(reject);
                            } else {
                                this.initialized = true;
                                resolve();
                            }
                        }
                    });
                });
            });
        });
    }

    async addSampleData() {
        return new Promise((resolve, reject) => {
            // In production (serverless), always add sample data since it's in-memory
            // In development, check if products already exist
            const shouldCheckExisting = !this.isProduction;
            
            if (shouldCheckExisting) {
                this.db.get('SELECT COUNT(*) as count FROM products', [], (err, result) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (result.count === 0) {
                        this.insertSampleProducts(resolve, reject);
                    } else {
                        resolve();
                    }
                });
            } else {
                // Production: always insert sample data
                this.insertSampleProducts(resolve, reject);
            }
        });
    }

    insertSampleProducts(resolve, reject) {
        const sampleProducts = [
            ['Whey Protein Isolate', 'High-quality whey protein for muscle building', 2999.00, 'Protein', 50],
            ['Mass Gainer', 'Advanced mass gainer for weight gain', 3599.00, 'Mass Gainer', 30],
            ['BCAA Powder', 'Branched Chain Amino Acids for recovery', 1799.00, 'Amino Acids', 40],
            ['Pre-Workout', 'Energy booster for intense workouts', 2299.00, 'Pre-Workout', 35],
            ['Creatine Monohydrate', 'Pure creatine for strength and power', 1299.00, 'Creatine', 60],
            ['Fish Oil Capsules', 'Omega-3 fatty acids for health', 899.00, 'Health', 80],
            ['Multivitamin', 'Complete vitamin and mineral complex', 1199.00, 'Vitamins', 70],
            ['Casein Protein', 'Slow-digesting protein for overnight recovery', 3299.00, 'Protein', 25]
        ];

        const stmt = this.db.prepare('INSERT INTO products (name, description, price, category, stock_quantity) VALUES (?, ?, ?, ?, ?)');
        
        let completed = 0;
        sampleProducts.forEach(product => {
            stmt.run(product, (err) => {
                if (err) {
                    console.error('Error inserting sample product:', err);
                }
                completed++;
                if (completed === sampleProducts.length) {
                    stmt.finalize();
                    console.log('Sample products added');
                    resolve();
                }
            });
        });
    }
}

// Singleton instance
let databaseInstance = null;

function getDatabaseInstance() {
    if (!databaseInstance) {
        databaseInstance = new Database();
    }
    return databaseInstance;
}

module.exports = getDatabaseInstance;