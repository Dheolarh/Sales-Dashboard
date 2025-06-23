import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- Other interfaces remain the same ---
export interface Company {
  id: string
  name: string
  country: string
  contact_info: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description: string
  parent_category_id: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  sku: string
  company_id: string
  category_id: string
  cost_price: number
  selling_price: number
  current_stock: number
  description: string
  image_url: string
  is_active: boolean
  created_at: string
  updated_at: string
  company?: Company
  category?: Category
}

export interface Admin {
  id: string
  email: string
  username: string
  full_name: string
  role: string
  location: string
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface AccessLog {
  id: string
  admin_id: string | null
  email: string
  login_time: string
  location: string
  ip_address: string
  user_agent: string
  success: boolean
  created_at: string
  admin?: Admin
}

export interface Transaction {
  id: string
  transaction_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_amount: number
  customer_location: string
  transaction_time: string
  status: string
  created_at: string
  product?: Product
}

export interface InventoryLog {
  id: string
  product_id: string
  admin_id: string | null
  change_type: string
  quantity_change: number
  previous_stock: number
  new_stock: number
  reason: string
  location: string
  created_at: string
  product?: Product
  admin?: Admin
}

export interface ErrorLog {
  id: string
  error_type: string
  description: string
  product_id: string | null
  admin_id: string | null
  expected_value: number | null
  actual_value: number | null
  discrepancy_amount: number | null
  severity: string
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  product?: Product
  admin?: Admin
  resolved_by_admin?: Admin
}

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  admin_id: string | null
  is_read: boolean
  related_error_id: string | null
  created_at: string
  admin?: Admin
  related_error?: ErrorLog
}


export const dbService = {
  // ... other service functions (getCompanies, getCategories, etc.) ...
  getCompanies: async () => { /* ... */ },
  getCategories: async () => { /* ... */ },
  getProducts: async () => { /* ... */ },
  getAdmins: async () => { /* ... */ },
  getRecentTransactions: async () => { /* ... */ },
  getAccessLogs: async () => { /* ... */ },


  // Error Logs
  async getErrorLogs(resolved?: boolean) {
    let query = supabase
      .from('error_logs')
      .select(`
        *,
        product:products(*),
        admin:admins!error_logs_admin_id_fkey(*), 
        resolved_by_admin:admins!error_logs_resolved_by_fkey(*)
      `)
      .order('created_at', { ascending: false })
    
    if (resolved !== undefined) {
      query = query.eq('resolved', resolved)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data as ErrorLog[]
  },

  // ... other service functions (getNotifications, getDashboardStats) ...
  getNotifications: async () => { /* ... */ },
  getDashboardStats: async () => { /* ... */ },
}