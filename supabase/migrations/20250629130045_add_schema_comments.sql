-- Comprehensive AI Schema Comments for QuickCart Dashboard

-- Table: products
-- Contains all information about individual products available for sale.
COMMENT ON TABLE public.products IS 'Contains all information about individual products available for sale. Each row is a unique product.';
COMMENT ON COLUMN public.products.id IS 'Unique identifier for each product.';
COMMENT ON COLUMN public.products.name IS 'The official display name of the product (e.g., "Coca-Cola Classic 330ml").';
COMMENT ON COLUMN public.products.sku IS 'Stock Keeping Unit, a unique internal identifier for the product.';
COMMENT ON COLUMN public.products.company_id IS 'Foreign key linking to the company or supplier in the `companies` table.';
COMMENT ON COLUMN public.products.category_id IS 'Foreign key linking to the product''s category in the `categories` table.';
COMMENT ON COLUMN public.products.cost_price IS 'The price the business paid to acquire one unit of the product.';
COMMENT ON COLUMN public.products.selling_price IS 'The retail price for a single unit of the product sold to a customer.';
COMMENT ON COLUMN public.products.current_stock IS 'The current number of units available in inventory. Ask about `inventory_logs` for history.';
COMMENT ON COLUMN public.products.is_active IS 'Indicates if the product is currently available for sale (true) or discontinued (false).';
COMMENT ON COLUMN public.products.embedding IS 'Vector embedding used for semantic search; you can ignore this for most queries.';

-- Table: transactions
-- Records every sale that occurs. Each row is a single line item in a sale.
COMMENT ON TABLE public.transactions IS 'Records every sale that occurs. Each row is a single line item in a sale. To get total revenue, sum the `total_amount` column.';
COMMENT ON COLUMN public.transactions.transaction_id IS 'A unique identifier for a single sales event or checkout.';
COMMENT ON COLUMN public.transactions.product_id IS 'Foreign key linking to the `products` table for the product that was sold.';
COMMENT ON COLUMN public.transactions.quantity IS 'The number of units of the product sold in this transaction line item.';
COMMENT ON COLUMN public.transactions.unit_price IS 'The price of a single unit of the product at the time of the transaction.';
COMMENT ON COLUMN public.transactions.total_amount IS 'The total price for this line item (quantity * unit_price).';
COMMENT ON COLUMN public.transactions.transaction_time IS 'The exact timestamp when the sale was completed.';
COMMENT ON COLUMN public.transactions.status IS 'The status of the transaction (e.g., completed, pending, cancelled).';

-- Table: categories
-- Represents the categories that products can belong to.
COMMENT ON TABLE public.categories IS 'Represents the categories that products can belong to, allowing for hierarchical organization.';
COMMENT ON COLUMN public.categories.name IS 'The name of the category (e.g., "Beverages", "Electronics").';
COMMENT ON COLUMN public.categories.parent_category_id IS 'If this is a sub-category, this links to the parent category''s ID.';

-- Table: companies
-- Lists the companies or suppliers that provide the products.
COMMENT ON TABLE public.companies IS 'Lists the companies or suppliers that provide the products (e.g., "Nestlé S.A.", "Samsung Electronics").';
COMMENT ON COLUMN public.companies.name IS 'The legal name of the company.';
COMMENT ON COLUMN public.companies.country IS 'The country where the company is headquartered.';

-- Table: inventory_logs
-- A detailed log of every change to a product's stock level.
COMMENT ON TABLE public.inventory_logs IS 'A detailed audit log of every change to a product''s stock level. Use this to investigate stock discrepancies.';
COMMENT ON COLUMN public.inventory_logs.product_id IS 'Foreign key linking to the product whose stock was changed.';
COMMENT ON COLUMN public.inventory_logs.admin_id IS 'Foreign key linking to the admin who made or recorded the change.';
COMMENT ON COLUMN public.inventory_logs.change_type IS 'The type of inventory change (e.g., "restock", "sale", "damage", "recount").';
COMMENT ON COLUMN public.inventory_logs.quantity_change IS 'The number of units added (positive) or removed (negative).';
COMMENT ON COLUMN public.inventory_logs.previous_stock IS 'The stock level before the change occurred.';
COMMENT ON COLUMN public.inventory_logs.new_stock IS 'The stock level after the change occurred.';
COMMENT ON COLUMN public.inventory_logs.reason IS 'A text description explaining the reason for the inventory change.';

-- Table: admins
-- Contains the list of administrative users for the dashboard.
COMMENT ON TABLE public.admins IS 'Contains the list of administrative users for the dashboard.';
COMMENT ON COLUMN public.admins.full_name IS 'The full name of the administrator.';
COMMENT ON COLUMN public.admins.role IS 'The permission level of the admin (e.g., "super_admin", "admin").';
COMMENT ON COLUMN public.admins.is_active IS 'Indicates if the admin account is currently active.';

-- Table: access_logs
-- Records user login and access events for security auditing.
COMMENT ON TABLE public.access_logs IS 'Records user login attempts for security and auditing purposes.';
COMMENT ON COLUMN public.access_logs.admin_id IS 'Foreign key linking to the admin who attempted to log in.';
COMMENT ON COLUMN public.access_logs.login_time IS 'The timestamp of the login attempt.';
COMMENT ON COLUMN public.access_logs.ip_address IS 'The IP address from which the login attempt was made.';
COMMENT ON COLUMN public.access_logs.success IS 'Whether the login attempt was successful (true) or not (false).';

-- Table: error_logs
-- A log of data integrity errors or discrepancies found in the system.
COMMENT ON TABLE public.error_logs IS 'A log of data integrity errors or discrepancies found by the system, often related to stock mismatches.';
COMMENT ON COLUMN public.error_logs.error_type IS 'The type of error, such as "stock_mismatch".';
COMMENT ON COLUMN public.error_logs.description IS 'A detailed message explaining the error.';
COMMENT ON COLUMN public.error_logs.discrepancy_amount IS 'The size of the difference between the expected and actual values.';
COMMENT ON COLUMN public.error_logs.severity IS 'The severity of the error (e.g., "medium", "high").';
COMMENT ON COLUMN public.error_logs.resolved IS 'Whether the error has been investigated and resolved.';

-- Table: notifications
-- A log of system notifications sent to users.
COMMENT ON TABLE public.notifications IS 'A log of system notifications sent to admin users, often related to errors or important system events.';
COMMENT ON COLUMN public.notifications.title IS 'The title of the notification.';
COMMENT ON COLUMN public.notifications.message IS 'The main content of the notification message.';
COMMENT ON COLUMN public.notifications.is_read IS 'Indicates whether the notification has been read by an admin.';

-- Table: chat_sessions and chat_messages
-- Tables for storing the history of this chat AI's conversations.
COMMENT ON TABLE public.chat_sessions IS 'Stores the overall chat sessions. Mostly for system use.';
COMMENT ON TABLE public.chat_messages IS 'Stores every individual message from both the user ("user" role) and the AI ("assistant" role). This is the history of our conversations.';