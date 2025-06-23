import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types
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
  // Relations
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
  // Relations
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
  // Relations
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
  // Relations
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
  // Relations
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
  // Relations
  admin?: Admin
  related_error?: ErrorLog
}

// Database service functions
export const dbService = {
  // Companies
  async getCompanies() {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data as Company[]
  },

  // Categories
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data as Category[]
  },

  // Products
  async getProducts(limit?: number) {
    let query = supabase
      .from('products')
      .select(`
        *,
        company:companies(*),
        category:categories(*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (limit) {
      query = query.limit(limit)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data as Product[]
  },

  // Admins
  async getAdmins() {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('is_active', true)
      .order('full_name')
    
    if (error) throw error
    return data as Admin[]
  },

  // Transactions
  async getRecentTransactions(limit = 50) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        product:products(*)
      `)
      .order('transaction_time', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data as Transaction[]
  },

  // Access Logs
  async getAccessLogs(limit = 100) {
    const { data, error } = await supabase
      .from('access_logs')
      .select(`
        *,
        admin:admins(*)
      `)
      .order('login_time', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data as AccessLog[]
  },

  // Error Logs
  async getErrorLogs(resolved?: boolean) {
    let query = supabase
      .from('error_logs')
      .select(`
        *,
        product:products(*),
        admin:admins(*),
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

  // Notifications
  async getNotifications(adminId?: string) {
    let query = supabase
      .from('notifications')
      .select(`
        *,
        admin:admins(*),
        related_error:error_logs(*)
      `)
      .order('created_at', { ascending: false })
    
    if (adminId) {
      query = query.or(`admin_id.eq.${adminId},admin_id.is.null`)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data as Notification[]
  },

  // Analytics
  async getDashboardStats() {
    const [
      { count: totalProducts },
      { count: totalTransactions },
      { count: activeAdmins },
      { count: unresolvedErrors }
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
      supabase.from('admins').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('error_logs').select('*', { count: 'exact', head: true }).eq('resolved', false)
    ])

    return {
      totalProducts: totalProducts || 0,
      totalTransactions: totalTransactions || 0,
      activeAdmins: activeAdmins || 0,
      unresolvedErrors: unresolvedErrors || 0
    }
  }
}