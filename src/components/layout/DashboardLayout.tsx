import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { dbService, type Notification } from '../../lib/supabase';
import { useAuthContext } from '../../hooks/AuthContext';

export const DashboardLayout: React.FC = () => {
  const { admin } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

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

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* --- MODIFIED: Pass the 'setNotifications' function as a prop --- */}
        <TopBar
          notifications={notifications}
          loading={loadingNotifications}
          onRefresh={loadNotifications}
          setNotifications={setNotifications}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}