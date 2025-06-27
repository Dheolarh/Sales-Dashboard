/*
  # QuickCart Sales Dashboard Database Schema (Consolidated)
*/

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  contact_info jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories table (hierarchical)
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  parent_category_id uuid REFERENCES categories(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  company_id uuid REFERENCES companies(id) NOT NULL,
  category_id uuid REFERENCES categories(id) NOT NULL,
  cost_price decimal(10,2) NOT NULL DEFAULT 0,
  selling_price decimal(10,2) NOT NULL DEFAULT 0,
  current_stock integer NOT NULL DEFAULT 0,
  description text DEFAULT '',
  image_url text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  location text DEFAULT '',
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Access logs table
CREATE TABLE IF NOT EXISTS access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id),
  email text NOT NULL,
  login_time timestamptz DEFAULT now(),
  location text DEFAULT '',
  ip_address text DEFAULT '',
  user_agent text DEFAULT '',
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Transactions table (ecommerce sales)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE NOT NULL,
  product_id uuid REFERENCES products(id) NOT NULL,
  quantity integer NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  customer_location text DEFAULT '',
  transaction_time timestamptz DEFAULT now(),
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- Inventory logs table
CREATE TABLE IF NOT EXISTS inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) NOT NULL,
  admin_id uuid REFERENCES admins(id),
  change_type text NOT NULL, -- 'stock_in', 'stock_out', 'adjustment', 'sale'
  quantity_change integer NOT NULL,
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  reason text DEFAULT '',
  location text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Error logs table (AI monitoring)
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL, -- 'stock_mismatch', 'price_discrepancy', 'data_inconsistency'
  description text NOT NULL,
  product_id uuid REFERENCES products(id),
  admin_id uuid REFERENCES admins(id),
  expected_value decimal(10,2),
  actual_value decimal(10,2),
  discrepancy_amount decimal(10,2),
  severity text DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES admins(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
  admin_id uuid REFERENCES admins(id), -- null for broadcast notifications
  is_read boolean DEFAULT false,
  related_error_id uuid REFERENCES error_logs(id),
  created_at timestamptz DEFAULT now()
);

-- Chat Sessions Table (Corrected Schema)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id) NOT NULL,
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chat Messages Table (Corrected Schema)
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL, -- 'user' or 'assistant'
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Other tables
CREATE TABLE IF NOT EXISTS activity_logs ();
CREATE TABLE IF NOT EXISTS system_settings ();

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_time ON transactions(transaction_time);
CREATE INDEX IF NOT EXISTS idx_access_logs_admin_id ON access_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_time ON access_logs(login_time);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_product_id ON error_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);