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
    
    setLoadingNotifications(true);
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
    if (admin) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [admin, loadNotifications]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          notifications={notifications}
          setNotifications={setNotifications}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ notifications, setNotifications, loadingNotifications, loadNotifications }} />
        </main>
      </div>
    </div>
  );
}