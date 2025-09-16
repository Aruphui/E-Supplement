-- SQL commands to clear products
-- Run these commands directly in your SQLite database

-- Option 1: Deactivate all products (safer - makes them inactive)
UPDATE products SET is_active = 0;

-- Option 2: Delete all products permanently (dangerous!)
-- First delete related order items
DELETE FROM order_items;
-- Then delete products
DELETE FROM products;

-- Check products count after operation
SELECT COUNT(*) as total_products, 
       COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_products,
       COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_products
FROM products;