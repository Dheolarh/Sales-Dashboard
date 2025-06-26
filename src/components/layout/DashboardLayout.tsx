import React, { useState, useEffect, useCallback } from 'react' // --- MODIFIED ---
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { dbService, type Notification } from '../../lib/supabase' // --- ADDED ---
import { useAuthContext } from '../../hooks/AuthContext' // --- ADDED ---

export const DashboardLayout: React.FC = () => {
  // --- ADDED: State management for notifications ---
  const { admin } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  // --- ADDED: Centralized function to load notifications ---
  const loadNotifications = useCallback(async () => {
    if (!admin) return;
    try {
      const data = await dbService.getNotifications(admin.id);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [admin]);

  // --- ADDED: useEffect to load data on mount and set up polling ---
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [loadNotifications]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* --- MODIFIED: Pass state and functions down to TopBar --- */}
        <TopBar
          notifications={notifications}
          loading={loadingNotifications}
          onRefresh={loadNotifications}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}