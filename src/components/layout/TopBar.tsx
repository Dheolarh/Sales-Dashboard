import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, User, LogOut, Globe, ExternalLink, Settings } from 'lucide-react';
import { useAuthContext } from '../../hooks/AuthContext';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { Badge } from '../ui/Badge';
import type { Notification } from '../../lib/supabase';
import { useSettingsContext } from '../../hooks/SettingsContext';

// Defines the props the component now receives from DashboardLayout
interface TopBarProps {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export const TopBar: React.FC<TopBarProps> = ({ notifications, setNotifications }) => {
  const { admin, logout } = useAuthContext();
  const { preferences } = useSettingsContext();
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge variant="error" size="sm" className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 flex items-center justify-center text-xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </button>
            </div>

            <Link to="/settings" className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
              <Settings className="h-5 w-5" />
            </Link>

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
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        setNotifications={setNotifications}
      />
    </>
  )
}