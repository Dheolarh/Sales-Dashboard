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

export interface ActivityLog {
  id: string
  admin_id: string
  session_id?: string
  action_type: string
  details?: Record<string, any>
  created_at: string
}

export interface ChatSession {
  id: string
  admin_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface ActivityLog {
  id: string
  admin_id: string
  session_id?: string
  action_type: string
  details?: Record<string, any>
  created_at: string
}

// Database service functions
export const dbService = {

  async getSystemSettings() {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*');

    if (error) throw error;

    const config = data.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);

    return config;
  },

  // --- NEW: Function to update all system settings ---
  async updateSystemSettings(config: Record<string, any>) {
    const settingsToUpsert = Object.entries(config).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('system_settings')
      .upsert(settingsToUpsert, { onConflict: 'key' });

    if (error) throw error;
    return data;
  },

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

  // Notifications
  async getNotifications(adminId?: string) {
    if (!adminId) {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          admin:admins(*),
          related_error:error_logs(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Notification[];
    }

    // Get notifications with read status for the specific user
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        admin:admins(*),
        related_error:error_logs(*),
        notification_read_status!left(is_read, read_at)
      `)
      .eq('notification_read_status.admin_id', adminId)
      .or(`admin_id.eq.${adminId},admin_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform the data to include read status
    return data?.map(notification => ({
      ...notification,
      is_read: notification.notification_read_status?.[0]?.is_read || false,
      read_at: notification.notification_read_status?.[0]?.read_at || null
    })) as Notification[];
  },

  // Add method to mark notification as read for specific user
  async markNotificationAsRead(notificationId: string, adminId: string) {
    const { error } = await supabase
      .from('notification_read_status')
      .upsert({
        notification_id: notificationId,
        admin_id: adminId,
        is_read: true,
        read_at: new Date().toISOString()
      });
    
    if (error) throw error;
  },

  // Add method to mark all notifications as read for specific user
  async markAllNotificationsAsRead(adminId: string) {
    // First get all notifications for this user that aren't already read
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select(`
        id,
        notification_read_status!left(is_read)
      `)
      .eq('notification_read_status.admin_id', adminId)
      .or(`admin_id.eq.${adminId},admin_id.is.null`);

    if (fetchError) throw fetchError;

    // Filter out already read notifications
    const unreadNotifications = notifications?.filter(n => 
      !n.notification_read_status?.[0]?.is_read
    ) || [];

    if (unreadNotifications.length === 0) return;

    // Create read status entries for unread notifications
    const readStatusUpdates = unreadNotifications.map(notification => ({
      notification_id: notification.id,
      admin_id: adminId,
      is_read: true,
      read_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('notification_read_status')
      .upsert(readStatusUpdates);

    if (error) throw error;
  },

  // Update clearNotificationsForUser function
  async clearNotificationsForUser(adminId: string) {
    // Delete all notifications for this user
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('admin_id', adminId);

    if (error) throw error;
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
  },

  // New function to get a product by name (case-insensitive)
  async getProductByName(name: string) {
    const { data, error } = await supabase
      .from('products')
      .select(`*, company:companies(*), category:categories(*)`)
      .ilike('name', `%${name}%`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as Product | null;
  },

  // New function to add a new product
  async addProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  // New function to update product stock
  async updateProductStock(productId: string, newStock: number) {
    const { data, error } = await supabase
      .from('products')
      .update({ current_stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  // New function to delete a product by its ID
  async deleteProduct(productId: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw error;
    return { success: true, message: `Product ${productId} deleted.` };
  },

  /* --- MODIFIED: getProductSales now accepts an optional date range --- */
  async getProductSales(productId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('transactions')
      .select('quantity, total_amount')
      .eq('product_id', productId);

    if (startDate) {
      query = query.gte('transaction_time', startDate);
    }
    if (endDate) {
      query = query.lte('transaction_time', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    const totalQuantity = data.reduce((sum, t) => sum + t.quantity, 0);
    const totalRevenue = data.reduce((sum, t) => sum + t.total_amount, 0);

    return { totalQuantity, totalRevenue };
  },

  async getProductsByCategory(categoryName: string) {
    // First, find the category by name to get its ID
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name')
      .ilike('name', `%${categoryName}%`)
      .single();

    if (categoryError || !category) {
      throw new Error(`Category matching '${categoryName}' not found.`);
    }

    // Then, fetch all products in that category
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('name, sku, selling_price, current_stock')
      .eq('category_id', category.id);

    if (productsError) {
      throw productsError;
    }

    return {
      categoryName: category.name,
      products: products || []
    };
  },

  /* --- NEW: Function to log user activity --- */
  logActivity(activity: {
    admin_id: string;
    action_type: string;
    details?: Record<string, any>;
    session_id?: string;
  }) {
    // This is a "fire and forget" operation, so we don't wait for the result
    supabase.from('activity_logs').insert({ ...activity }).then(({ error }) => {
      if (error) {
        console.error("Failed to log activity:", error);
      }
    });
  },

  /* --- NEW: Function for the AI to get admin activity --- */
  async getAdminActivity(adminName: string, limit = 10) {
    // First, find the admin by name
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, full_name')
      .ilike('full_name', `%${adminName}%`)
      .single();

    if (adminError || !admin) {
      throw new Error(`Admin '${adminName}' not found.`);
    }

    // Then, fetch their activity
    const { data: activities, error: activityError } = await supabase
      .from('activity_logs')
      .select('action_type, details, created_at')
      .eq('admin_id', admin.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (activityError) {
      throw activityError;
    }

    return {
      adminName: admin.full_name,
      recentActivity: activities,
    };
  },

  async getChatSessions(adminId: string) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ChatSession[];
  },

  async getChatMessages(sessionId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as ChatMessage[];
  },

  async createChatSession(adminId: string, title: string) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ admin_id: adminId, title })
      .select()
      .single();

    if (error) throw error;
    return data as ChatSession;
  },

  async addChatMessage(message: { session_id: string; role: 'user' | 'assistant'; content: string }) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(message)
      .select()
      .single();
    
    // Also update the session's updated_at timestamp
    await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', message.session_id);

    if (error) throw error;
    return data as ChatMessage;
  },

  async renameChatSession(sessionId: string, newTitle: string) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({ title: newTitle, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data as ChatSession;
  },

  async deleteChatSession(sessionId: string) {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);
    
    if (error) throw error;
    return { success: true };
  },

}

export class SupabaseService {
  // ...existing methods...

  // Add this missing method
  async clearNotificationsForUser(adminId: string) {
    try {
      // Get all notifications for this user
      const notifications = await this.getNotifications(adminId);
      
      if (notifications.length === 0) return;

      // Mark all notifications as read (this effectively "clears" them for the user)
      const clearUpdates = notifications.map(notification => ({
        notification_id: notification.id,
        admin_id: adminId,
        is_read: true,
        read_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('notification_read_status')
        .upsert(clearUpdates);

      if (error) throw error;
    } catch (error) {
      console.error('Error clearing notifications for user:', error);
      throw error;
    }
  }

  // Also make sure you have these methods
  async markNotificationAsRead(notificationId: string, adminId: string) {
    try {
      const { error } = await supabase
        .from('notification_read_status')
        .upsert({
          notification_id: notificationId,
          admin_id: adminId,
          is_read: true,
          read_at: new Date().toISOString()
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(adminId: string) {
    try {
      // Get all unread notifications for this user
      const notifications = await this.getNotifications(adminId);
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      if (unreadNotifications.length === 0) return;

      const readStatusUpdates = unreadNotifications.map(notification => ({
        notification_id: notification.id,
        admin_id: adminId,
        is_read: true,
        read_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('notification_read_status')
        .upsert(readStatusUpdates);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Update the existing getNotifications method to include read status
  async getNotifications(adminId?: string) {
    if (!adminId) {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          admin:admins(*),
          related_error:error_logs(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Notification[];
    }

    // Get notifications with read status for the specific user
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        admin:admins(*),
        related_error:error_logs(*),
        notification_read_status!left(is_read, read_at)
      `)
      .eq('notification_read_status.admin_id', adminId)
      .or(`admin_id.eq.${adminId},admin_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform the data to include read status
    return data?.map(notification => ({
      ...notification,
      is_read: notification.notification_read_status?.[0]?.is_read || false,
      read_at: notification.notification_read_status?.[0]?.read_at || null
    })) as Notification[];
  }

  // ...rest of existing methods...
}