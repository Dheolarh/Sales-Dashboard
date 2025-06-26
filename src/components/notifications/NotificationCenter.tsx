import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // --- ADDED ---
import { Bell, X, CheckCircle, AlertTriangle, Info, Clock, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../utils/format';
import type { Notification } from '../../lib/supabase';
import { useAuthContext } from '../../hooks/AuthContext'; // --- ADDED ---
import { ConfirmDialog } from '../ui/ConfirmDialog'; // --- ADDED ---

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  loading: boolean;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>; // --- MODIFIED ---
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  loading,
  setNotifications, // --- MODIFIED ---
}) => {
  const { admin } = useAuthContext(); // --- ADDED ---
  const navigate = useNavigate(); // --- ADDED ---
  const [showClearConfirm, setShowClearConfirm] = useState(false); // --- ADDED ---
  const [isClearing, setIsClearing] = useState(false); // --- ADDED ---

  // --- FIX: Mark as Read on Click ---
  const handleMarkAsRead = async (notificationId: string) => {
    // Optimistically update the UI first for an instant effect
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Optional: Revert the UI change if the DB update fails
    }
  };

  // --- FIX: Mark All as Read ---
  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Optimistically update the UI
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // --- NEW: Clear All Notifications Functionality ---
  const handleClearAll = async () => {
    setIsClearing(true);
    if (!admin) return;
    try {
      // Delete from DB
      await supabase.from('notifications').delete().eq('admin_id', admin.id);
      // Update UI
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  // --- NEW: Fix "View All" button ---
  const handleViewAll = () => {
    onClose(); // Close the panel
    navigate('/notifications'); // Navigate to the notifications page
    // Note: You will need to create a route and a page for '/notifications' in App.tsx
  };

  // ... getNotificationIcon, getNotificationColor, etc. helpers remain the same ...

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              {/* ... Header Title and Badge ... */}
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
              {/* ... Loading and Empty states ... */}
              {!loading && notifications.length > 0 && (
                <div className="divide-y divide-gray-200">
                  {notifications.map(notification => {
                    // ... icon and color logic ...
                    return (
                      // --- MODIFIED: onClick now calls handleMarkAsRead ---
                      <div key={notification.id} onClick={() => handleMarkAsRead(notification.id)}>
                        {/* ... Rest of the notification item JSX ... */}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 space-y-2">
              {/* --- MODIFIED: This button now works --- */}
              <Button variant="outline" className="w-full" onClick={handleViewAll}>
                View All Notifications
              </Button>
              {/* --- NEW: Clear All button --- */}
              {notifications.length > 0 && (
                <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" onClick={() => setShowClearConfirm(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Notifications
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- NEW: Confirmation Dialog for Clearing --- */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
        title="Clear All Notifications?"
        message="Are you sure you want to permanently delete all your notifications? This action cannot be undone."
        type="danger"
        confirmText="Yes, Clear All"
        loading={isClearing}
      />
    </>
  );
};