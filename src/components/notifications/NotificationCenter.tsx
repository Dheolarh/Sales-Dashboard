import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCircle, Info, Clock, Trash2, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { dbService } from '../../lib/supabase';
import { formatDateTime } from '../../utils/format';
import type { Notification } from '../../lib/supabase';
import { useAuthContext } from '../../hooks/AuthContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  setNotifications,
}) => {
  const { admin } = useAuthContext();
  const navigate = useNavigate();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleMarkAllAsRead = async () => {
    if (!admin) return;
    
    try {
      await dbService.markAllNotificationsAsRead(admin.id);
      // Refresh notifications after update
      const updated = await dbService.getNotifications(admin.id);
      setNotifications(updated);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!admin) return;
    
    try {
      await dbService.markNotificationAsRead(notificationId, admin.id);
      // Refresh notifications after update
      const updated = await dbService.getNotifications(admin.id);
      setNotifications(updated);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    if (!admin) {
      setIsClearing(false);
      return;
    }
    
    try {
      await dbService.clearNotificationsForUser(admin.id);
      setNotifications([]); // Clear local state
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
    
    setIsClearing(false);
    setShowClearConfirm(false);
  };

  const handleViewAll = () => {
    onClose();
    navigate('/notifications');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-quickcart-600" />
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <Badge variant="error" size="sm">
                    {notifications.filter(n => !n.is_read).length}
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {notifications.some(n => !n.is_read) && (
                  <Button size="sm" variant="ghost" onClick={handleMarkAllAsRead} className="text-xs">
                    Mark all read
                  </Button>
                )}
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-md">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                  <p className="text-gray-600">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map(notification => (
                    <div key={notification.id} className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-blue-50' : ''}`} onClick={() => handleMarkAsRead(notification.id)}>
                      <h4 className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-500'}`}>{notification.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(notification.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="border-t border-gray-200 p-4 space-y-2">
              <Button variant="outline" className="w-full" onClick={handleViewAll}>
                View All Notifications
              </Button>
              {notifications.length > 0 && (
                <Button variant="destructive" className="w-full" onClick={() => setShowClearConfirm(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Notifications
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
        title="Clear All Notifications?"
        message="This will permanently delete all of your notifications. This action cannot be undone."
        type="danger"
        confirmText="Yes, Clear All"
        loading={isClearing}
      />
    </>
  );
};