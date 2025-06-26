import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // --- ADDED ---
import { Bell, User, LogOut, Globe, ExternalLink, Settings } from 'lucide-react';
import { useAuthContext } from '../../hooks/AuthContext';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { Badge } from '../ui/Badge';
import type { Notification } from '../../lib/supabase';
import { useSettingsContext } from '../../hooks/SettingsContext';

// --- ADDED: An interface to define the props this component now expects ---
interface TopBarProps {
  notifications: Notification[];
  loading: boolean;
  onRefresh: () => void;
}

// --- MODIFIED: The component now accepts props ---
export const TopBar: React.FC<TopBarProps> = ({ notifications, loading, onRefresh }) => {
  const { admin, logout } = useAuthContext();
  const { preferences } = useSettingsContext();
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- REMOVED: The useEffect hook that fetched notifications locally is now gone. ---
  // That logic has been "lifted up" to DashboardLayout.tsx.

  // This useEffect for the clock can remain.
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- MODIFIED: The unread count is now calculated from the 'notifications' prop ---
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const openStore = () => {
    window.open('/store', '_blank');
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">Sales Dashboard</h1>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={openStore}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-quickcart-600 hover:text-quickcart-700 hover:bg-quickcart-50 rounded-md transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span>View Store</span>
            </button>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Globe className="h-4 w-4" />
              <span>
                {currentTime.toLocaleString('en-US', {
                  timeZone: preferences.timezone,
                  dateStyle: 'medium',
                  timeStyle: 'medium'
                })} {preferences.timezone}
              </span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="error"
                    size="sm"
                    className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 flex items-center justify-center text-xs"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </button>
            </div>

            {/* --- MODIFIED: Wrapped button content with a Link for proper navigation --- */}
            <Link to="/settings" className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
              <Settings className="h-5 w-5" />
            </Link>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-quickcart-600 text-white rounded-full flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{admin?.full_name}</div>
                  <div className="text-gray-600">{admin?.location}</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- MODIFIED: Pass the new props down to the NotificationCenter --- */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        loading={loading}
        onNotificationsUpdate={onRefresh}
      />
    </>
  )
}