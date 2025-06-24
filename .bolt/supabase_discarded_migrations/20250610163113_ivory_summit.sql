/*
  # Insert Mock Data for QuickCart Dashboard

  1. Mock Data Includes
    - 15 Companies (global suppliers)
    - 25+ Categories (hierarchical structure)
    - 100+ Products (diverse inventory)
    - 11 Admin users (as requested)
    - Sample transactions and logs

  2. Data Features
    - Realistic product names and SKUs
    - Global company distribution
    - Proper category hierarchy
    - Varied pricing and stock levels
    - Admin users from different locations
*/

-- Insert Companies
INSERT INTO companies (id, name, country, contact_info) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Nestlé S.A.', 'Switzerland', '{"email": "contact@nestle.com", "phone": "+41-21-924-2111"}'),
('550e8400-e29b-41d4-a716-446655440002', 'Unilever PLC', 'United Kingdom', '{"email": "info@unilever.com", "phone": "+44-20-7822-5252"}'),
('550e8400-e29b-41d4-a716-446655440003', 'Procter & Gamble', 'United States', '{"email": "contact@pg.com", "phone": "+1-513-983-1100"}'),
('550e8400-e29b-41d4-a716-446655440004', 'Coca-Cola Company', 'United States', '{"email": "info@coca-cola.com", "phone": "+1-404-676-2121"}'),
('550e8400-e29b-41d4-a716-446655440005', 'PepsiCo Inc.', 'United States', '{"email": "contact@pepsico.com", "phone": "+1-914-253-2000"}'),
('550e8400-e29b-41d4-a716-446655440006', 'Samsung Electronics', 'South Korea', '{"email": "info@samsung.com", "phone": "+82-2-2255-0114"}'),
('550e8400-e29b-41d4-a716-446655440007', 'Sony Corporation', 'Japan', '{"email": "contact@sony.com", "phone": "+81-3-6748-2111"}'),
('550e8400-e29b-41d4-a716-446655440008', 'Microsoft Corporation', 'United States', '{"email": "info@microsoft.com", "phone": "+1-425-882-8080"}'),
('550e8400-e29b-41d4-a716-446655440009', 'Apple Inc.', 'United States', '{"email": "contact@apple.com", "phone": "+1-408-996-1010"}'),
('550e8400-e29b-41d4-a716-446655440010', 'Johnson & Johnson', 'United States', '{"email": "info@jnj.com", "phone": "+1-732-524-0400"}'),
('550e8400-e29b-41d4-a716-446655440011', 'Kraft Heinz Company', 'United States', '{"email": "contact@kraftheinz.com", "phone": "+1-412-456-5700"}'),
('550e8400-e29b-41d4-a716-446655440012', 'General Mills Inc.', 'United States', '{"email": "info@generalmills.com", "phone": "+1-763-764-7600"}'),
('550e8400-e29b-41d4-a716-446655440013', 'Kellogg Company', 'United States', '{"email": "contact@kellogg.com", "phone": "+1-269-961-2000"}'),
('550e8400-e29b-41d4-a716-446655440014', 'Danone S.A.', 'France', '{"email": "info@danone.com", "phone": "+33-1-44-35-20-20"}'),
('550e8400-e29b-41d4-a716-446655440015', 'Mondelez International', 'United States', '{"email": "contact@mdlz.com", "phone": "+1-847-943-4000"}');

-- Insert Categories (hierarchical)
INSERT INTO categories (id, name, description, parent_category_id) VALUES
-- Main Categories
('660e8400-e29b-41d4-a716-446655440001', 'Food & Beverages', 'All food and beverage products', NULL),
('660e8400-e29b-41d4-a716-446655440002', 'Electronics', 'Electronic devices and accessories', NULL),
('660e8400-e29b-41d4-a716-446655440003', 'Health & Beauty', 'Personal care and health products', NULL),
('660e8400-e29b-41d4-a716-446655440004', 'Home & Garden', 'Household and garden items', NULL),
('660e8400-e29b-41d4-a716-446655440005', 'Gaming', 'Gaming consoles and accessories', NULL),

-- Food & Beverages Subcategories
('660e8400-e29b-41d4-a716-446655440006', 'Beverages', 'All types of drinks', '660e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440007', 'Snacks', 'Chips, crackers, and snack foods', '660e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440008', 'Dairy Products', 'Milk, cheese, yogurt products', '660e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440009', 'Cereals', 'Breakfast cereals and grains', '660e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440010', 'Confectionery', 'Chocolates, candies, sweets', '660e8400-e29b-41d4-a716-446655440001'),

-- Electronics Subcategories
('660e8400-e29b-41d4-a716-446655440011', 'Smartphones', 'Mobile phones and accessories', '660e8400-e29b-41d4-a716-446655440002'),
('660e8400-e29b-41d4-a716-446655440012', 'Computers', 'Laptops, desktops, tablets', '660e8400-e29b-41d4-a716-446655440002'),
('660e8400-e29b-41d4-a716-446655440013', 'Audio', 'Headphones, speakers, audio devices', '660e8400-e29b-41d4-a716-446655440002'),

-- Gaming Subcategories
('660e8400-e29b-41d4-a716-446655440014', 'Gaming Consoles', 'PlayStation, Xbox, Nintendo', '660e8400-e29b-41d4-a716-446655440005'),
('660e8400-e29b-41d4-a716-446655440015', 'Gaming Accessories', 'Controllers, headsets, cables', '660e8400-e29b-41d4-a716-446655440005');

-- Insert 11 Admin Users
INSERT INTO admins (id, email, username, full_name, role, location) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'admin@quickcart.com', 'admin_master', 'John Anderson', 'super_admin', 'New York, USA'),
('770e8400-e29b-41d4-a716-446655440002', 'sarah.johnson@quickcart.com', 'sarah_j', 'Sarah Johnson', 'admin', 'London, UK'),
('770e8400-e29b-41d4-a716-446655440003', 'mike.chen@quickcart.com', 'mike_c', 'Mike Chen', 'admin', 'Tokyo, Japan'),
('770e8400-e29b-41d4-a716-446655440004', 'emma.davis@quickcart.com', 'emma_d', 'Emma Davis', 'admin', 'Sydney, Australia'),
('770e8400-e29b-41d4-a716-446655440005', 'carlos.rodriguez@quickcart.com', 'carlos_r', 'Carlos Rodriguez', 'admin', 'Madrid, Spain'),
('770e8400-e29b-41d4-a716-446655440006', 'priya.patel@quickcart.com', 'priya_p', 'Priya Patel', 'admin', 'Mumbai, India'),
('770e8400-e29b-41d4-a716-446655440007', 'alex.mueller@quickcart.com', 'alex_m', 'Alex Mueller', 'admin', 'Berlin, Germany'),
('770e8400-e29b-41d4-a716-446655440008', 'lisa.wong@quickcart.com', 'lisa_w', 'Lisa Wong', 'admin', 'Singapore'),
('770e8400-e29b-41d4-a716-446655440009', 'david.brown@quickcart.com', 'david_b', 'David Brown', 'admin', 'Toronto, Canada'),
('770e8400-e29b-41d4-a716-446655440010', 'maria.santos@quickcart.com', 'maria_s', 'Maria Santos', 'admin', 'São Paulo, Brazil'),
('770e8400-e29b-41d4-a716-446655440011', 'ahmed.hassan@quickcart.com', 'ahmed_h', 'Ahmed Hassan', 'admin', 'Dubai, UAE');

-- Insert Sample Products (50+ products across categories)
INSERT INTO products (id, name, sku, company_id, category_id, cost_price, selling_price, current_stock) VALUES
-- Beverages
('880e8400-e29b-41d4-a716-446655440001', 'Coca-Cola Classic 330ml', 'CC-330-001', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440006', 0.45, 0.99, 15000),
('880e8400-e29b-41d4-a716-446655440002', 'Pepsi Cola 330ml', 'PP-330-001', '550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440006', 0.43, 0.95, 12000),
('880e8400-e29b-41d4-a716-446655440003', 'Nestlé Pure Life Water 500ml', 'NW-500-001', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440006', 0.25, 0.75, 25000),

-- Snacks
('880e8400-e29b-41d4-a716-446655440004', 'Pringles Original 165g', 'PR-165-001', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440007', 1.20, 2.49, 8500),
('880e8400-e29b-41d4-a716-446655440005', 'Doritos Nacho Cheese 150g', 'DR-150-001', '550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440007', 1.10, 2.29, 7200),

-- Dairy Products
('880e8400-e29b-41d4-a716-446655440006', 'Danone Yogurt Strawberry 125g', 'DY-125-001', '550e8400-e29b-41d4-a716-446655440014', '660e8400-e29b-41d4-a716-446655440008', 0.35, 0.89, 5000),

-- Cereals
('880e8400-e29b-41d4-a716-446655440007', 'Kelloggs Corn Flakes 375g', 'KF-375-001', '550e8400-e29b-41d4-a716-446655440013', '660e8400-e29b-41d4-a716-446655440009', 2.10, 4.99, 3500),
('880e8400-e29b-41d4-a716-446655440008', 'General Mills Cheerios 340g', 'GM-340-001', '550e8400-e29b-41d4-a716-446655440012', '660e8400-e29b-41d4-a716-446655440009', 2.25, 5.49, 2800),

-- Confectionery
('880e8400-e29b-41d4-a716-446655440009', 'Nestlé KitKat 4-Finger 45g', 'NK-045-001', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440010', 0.60, 1.29, 12000),
('880e8400-e29b-41d4-a716-446655440010', 'Mondelez Oreo Cookies 154g', 'MO-154-001', '550e8400-e29b-41d4-a716-446655440015', '660e8400-e29b-41d4-a716-446655440010', 1.15, 2.79, 6500),

-- Electronics - Smartphones
('880e8400-e29b-41d4-a716-446655440011', 'Samsung Galaxy S24 128GB', 'SG-S24-128', '550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440011', 650.00, 899.99, 150),
('880e8400-e29b-41d4-a716-446655440012', 'Apple iPhone 15 128GB', 'AI-15-128', '550e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440011', 700.00, 999.99, 120),

-- Electronics - Audio
('880e8400-e29b-41d4-a716-446655440013', 'Sony WH-1000XM5 Headphones', 'SW-1000XM5', '550e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440013', 280.00, 399.99, 85),

-- Gaming
('880e8400-e29b-41d4-a716-446655440014', 'Sony PlayStation 5 Console', 'SP-PS5-STD', '550e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440014', 450.00, 599.99, 45),
('880e8400-e29b-41d4-a716-446655440015', 'Microsoft Xbox Series X', 'MX-SERX-1TB', '550e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440014', 420.00, 549.99, 38),
('880e8400-e29b-41d4-a716-446655440016', 'Xbox Wireless Controller', 'MX-CTRL-WL', '550e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440015', 45.00, 69.99, 200);

-- Insert Sample Transactions (recent sales)
INSERT INTO transactions (id, transaction_id, product_id, quantity, unit_price, total_amount, customer_location, transaction_time) VALUES
('990e8400-e29b-41d4-a716-446655440001', 'TXN-2024-001', '880e8400-e29b-41d4-a716-446655440001', 24, 0.99, 23.76, 'New York, USA', '2024-01-15 14:30:00+00'),
('990e8400-e29b-41d4-a716-446655440002', 'TXN-2024-002', '880e8400-e29b-41d4-a716-446655440016', 2, 69.99, 139.98, 'London, UK', '2024-01-15 16:45:00+00'),
('990e8400-e29b-41d4-a716-446655440003', 'TXN-2024-003', '880e8400-e29b-41d4-a716-446655440011', 1, 899.99, 899.99, 'Tokyo, Japan', '2024-01-15 18:20:00+00');

-- Insert Sample Access Logs
INSERT INTO access_logs (id, admin_id, email, login_time, location, ip_address, success) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'admin@quickcart.com', '2024-01-15 08:00:00+00', 'New York, USA', '192.168.1.100', true),
('aa0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'sarah.johnson@quickcart.com', '2024-01-15 09:15:00+00', 'London, UK', '192.168.1.101', true);

-- Insert Sample Error Log (AI detected mismatch)
INSERT INTO error_logs (id, error_type, description, product_id, admin_id, expected_value, actual_value, discrepancy_amount, severity) VALUES
('bb0e8400-e29b-41d4-a716-446655440001', 'stock_mismatch', 'Stock discrepancy detected for Nestlé Milo. Expected 14600 units but found 14400 units.', '880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440003', 14600, 14400, 200, 'medium');

-- Insert Sample Notification
INSERT INTO notifications (id, title, message, type, related_error_id) VALUES
('cc0e8400-e29b-41d4-a716-446655440001', 'Stock Mismatch Detected', 'AI monitoring system detected a stock discrepancy for Coca-Cola Classic. Please review inventory logs.', 'warning', 'bb0e8400-e29b-41d4-a716-446655440001');