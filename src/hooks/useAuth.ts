import { useState, useEffect } from 'react'
import { supabase, type Admin } from '../lib/supabase'
import { detectLocation, getCurrentUTCTime } from '../utils/location'

interface AuthState {
  admin: Admin | null
  loading: boolean
  error: string | null
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    admin: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedAdmin = localStorage.getItem('quickcart_admin')
    if (savedAdmin) {
      try {
        const admin = JSON.parse(savedAdmin)
        setAuthState({ admin, loading: false, error: null })
      } catch (error) {
        localStorage.removeItem('quickcart_admin')
        setAuthState({ admin: null, loading: false, error: null })
      }
    } else {
      setAuthState({ admin: null, loading: false, error: null })
    }
  }, [])

  // vvvvv  DIAGNOSTIC CODE ADDED  vvvvv
  useEffect(() => {
    const testAdminQuery = async () => {
      console.log("--- Running Diagnostic Query from useAuth ---");

      // Test 1: The exact query from the login function
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', 'admin@quickcart.com')
        .eq('is_active', true);

      console.log("Query 1 (with is_active):");
      console.log("Data:", adminData);
      console.log("Error:", adminError);

      // Test 2: A simpler query without the 'is_active' check
      const { data: simpleData, error: simpleError } = await supabase
        .from('admins')
        .select('email, is_active')
        .eq('email', 'admin@quickcart.com');
      
      console.log("Query 2 (without is_active):");
      console.log("Data:", simpleData);
      console.log("Error:", simpleError);
      console.log("---------------------------------");
    };

    testAdminQuery();
  }, []);
  // ^^^^^ END OF DIAGNOSTIC CODE ^^^^^

  const login = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))
    const trimmedEmail = email.trim();

    try {
      // Get admin by email (simplified auth for demo)
      const { data: admin, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', trimmedEmail)
        .eq('is_active', true)
        .single()

      if (error || !admin) {
        throw new Error('Invalid credentials')
      }

      // Detect location for access logging
      const location = await detectLocation()

      // Log the access
      await supabase.from('access_logs').insert({
        admin_id: admin.id,
        email: admin.email,
        login_time: getCurrentUTCTime(),
        location: `${location.city}, ${location.country}`,
        ip_address: location.ip,
        user_agent: navigator.userAgent,
        success: true
      })

      // Update admin's last login
      await supabase
        .from('admins')
        .update({ last_login: getCurrentUTCTime() })
        .eq('id', admin.id)

      // Save to localStorage
      localStorage.setItem('quickcart_admin', JSON.stringify(admin))
      
      setAuthState({ admin, loading: false, error: null })
      return admin
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      
      // Log failed access attempt
      try {
        const location = await detectLocation()
        await supabase.from('access_logs').insert({
          admin_id: null,
          email: email,
          login_time: getCurrentUTCTime(),
          location: `${location.city}, ${location.country}`,
          ip_address: location.ip,
          user_agent: navigator.userAgent,
          success: false
        })
      } catch (logError) {
        console.error('Failed to log access attempt:', logError)
      }
      
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }))
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('quickcart_admin')
    setAuthState({ admin: null, loading: false, error: null })
  }

  return {
    ...authState,
    login,
    logout
  }
}