import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, User, LogOut, Globe, ExternalLink, Settings } from 'lucide-react';
import { useAuthContext } from '../../hooks/AuthContext';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { Badge } from '../ui/Badge';
import type { Notification } from '../../lib/supabase';
import { useSettingsContext } from '../../hooks/SettingsContext';
import { Button } from '../ui/Button';
import { dbService } from '../../lib/supabase'; // Changed from supabaseClient

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

  const markAllAsRead = async () => {
    if (!admin) return;
    
    // Optimistically update UI
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    
    try {
      await dbService.markAllNotificationsAsRead(admin.id);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Revert optimistic update on error
      setNotifications(prev => prev.map(n => ({ ...n, is_read: false })));
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!admin) return;
    
    // Mark as read when clicked
    if (!notification.is_read) {
      // Optimistically update UI
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      ));
      
      try {
        await dbService.markNotificationAsRead(notification.id, admin.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        // Revert optimistic update on error
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, is_read: false } : n
        ));
      }
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Mobile: Only notification bell */}
        <div className="flex lg:hidden items-center justify-between w-full">
          <div></div> {/* Empty spacer */}
          <div className="flex items-center space-x-4">
            {/* Visit Store Button - Mobile Center */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('/store', '_blank')}
              className="hidden sm:flex"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Store
            </Button>
            
            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="text-xs"
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                  
                  {/* Notifications List */}
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        No notifications
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            !notification.is_read ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notification.is_read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {notification.message}
                              </p>
                              {/* Time moved to bottom for mobile */}
                              <p className="text-xs text-gray-400 mt-2">
                                {formatDateTime(notification.created_at)}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Footer */}
                  {notifications.length > 5 && (
                    <div className="px-4 py-3 border-t border-gray-200">
                      <Link
                        to="/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="block w-full text-center text-xs text-blue-600 hover:text-blue-800"
                      >
                        View all notifications
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex items-center justify-between w-full">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-gray-900">Sales Dashboard</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Visit Store Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('/store', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Store
            </Button>
            
            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              {/* Same notification dropdown as mobile */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="text-xs"
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                  
                  {/* Notifications List */}
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        No notifications
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            !notification.is_read ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notification.is_read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                {formatDateTime(notification.created_at)}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Footer */}
                  {notifications.length > 5 && (
                    <div className="px-4 py-3 border-t border-gray-200">
                      <Link
                        to="/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="block w-full text-center text-xs text-blue-600 hover:text-blue-800"
                      >
                        View all notifications
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{admin?.username}</span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};