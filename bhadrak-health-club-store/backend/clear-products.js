// Simple script to clear all products from database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const dbPath = './bhadrak_health_club.db';
const db = new sqlite3.Database(dbPath);

console.log('🔄 Connecting to database...');

// Option 1: Deactivate all products (safer)
function deactivateAllProducts() {
    return new Promise((resolve, reject) => {
        db.run('UPDATE products SET is_active = 0', [], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.changes);
        });
    });
}

// Option 2: Delete all products (dangerous)
function deleteAllProducts() {
    return new Promise((resolve, reject) => {
        // First delete order items
        db.run('DELETE FROM order_items', [], function(err) {
            if (err) {
                reject(err);
                return;
            }
            
            const orderItemsDeleted = this.changes;
            
            // Then delete products
            db.run('DELETE FROM products', [], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                resolve({
                    orderItemsDeleted,
                    productsDeleted: this.changes
                });
            });
        });
    });
}

// Get command line argument
const action = process.argv[2];

async function main() {
    try {
        if (action === 'deactivate') {
            console.log('🔄 Deactivating all products...');
            const changes = await deactivateAllProducts();
            console.log(`✅ Successfully deactivated ${changes} products`);
            
        } else if (action === 'delete') {
            console.log('⚠️  WARNING: This will permanently delete all products!');
            console.log('🔄 Deleting all products and related order items...');
            const result = await deleteAllProducts();
            console.log(`✅ Successfully deleted ${result.productsDeleted} products and ${result.orderItemsDeleted} order items`);
            
        } else {
            console.log('❌ Invalid action. Use:');
            console.log('   node clear-products.js deactivate  (safer - just hides products)');
            console.log('   node clear-products.js delete      (dangerous - permanently deletes)');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        db.close();
        console.log('🔒 Database connection closed');
    }
}

main();