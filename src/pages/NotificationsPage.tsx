import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Bell, Check, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { dbService, type Notification } from '../lib/supabase';
import { useAuthContext } from '../hooks/AuthContext';
import { formatDateTime } from '../utils/format';

interface NotificationsContext {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  loadingNotifications: boolean;
  loadNotifications: () => Promise<void>;
}

export const NotificationsPage: React.FC = () => {
    const { admin } = useAuthContext();
    const navigate = useNavigate();
    const { notifications, setNotifications, loadingNotifications, loadNotifications } = useOutletContext<NotificationsContext>();
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleMarkAsRead = async (id: string) => {
    if (!admin) return;
    
    try {
        await dbService.markNotificationAsRead(admin.id, id);
        // Refresh notifications after update
        await loadNotifications();
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
    };

    const handleMarkAllAsRead = async () => {
        if (!admin) return;
        
        setIsProcessing(true);
        try {
            await dbService.markAllNotificationsAsRead(admin.id);
            // Refresh notifications after update
            await loadNotifications();
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
        
        setIsProcessing(false);
    };

    const handleClearAll = async () => {
        setIsProcessing(true);
        if (!admin) {
            setIsProcessing(false);
            return;
        }
        
        try {
            await dbService.clearNotificationsForUser(admin.id);
            // Clear local state instead of reloading
            setNotifications([]);
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        }
        
        setShowClearConfirm(false);
        setIsProcessing(false);
    };

    const handleViewSource = (notification: Notification) => {
        if (notification.related_error_id) {
            navigate('/errors');
        }
    };

    return (
        <>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Header - Remove Add Notification button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                            <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-quickcart-600 mr-2 sm:mr-3" />
                            Notifications
                        </h1>
                        <p className="text-sm sm:text-base text-gray-600 mt-1">Manage system notifications and alerts</p>
                    </div>
                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        {notifications.some(n => !n.is_read) && (
                            <Button 
                                onClick={handleMarkAllAsRead} 
                                disabled={isProcessing}
                                className="w-full sm:w-auto"
                                variant="outline"
                            >
                                <Check className="h-4 w-4 mr-2" />
                                Mark All Read
                            </Button>
                        )}
                        {notifications.length > 0 && (
                            <Button 
                                onClick={() => setShowClearConfirm(true)} 
                                disabled={isProcessing}
                                className="w-full sm:w-auto"
                                variant="outline"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Clear All
                            </Button>
                        )}
                    </div>
                </div>

                {/* Notifications List */}
                <Card>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-200">
                            {loadingNotifications ? (
                                <div className="p-6 text-center">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">You have no notifications.</div>
                            ) : (
                                notifications.map(notification => (
                                    <div key={notification.id} className={`p-4 ${!notification.is_read ? 'bg-blue-50' : 'bg-white'}`}>
                                        {/* Mobile Layout */}
                                        <div className="block sm:hidden">
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className={`font-medium pr-2 ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                                                    {notification.title}
                                                </h3>
                                                <Badge variant={notification.is_read ? "default" : "info"} className="flex-shrink-0">
                                                    {notification.is_read ? "Read" : "Unread"}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-3">{notification.message}</p>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex flex-wrap gap-2">
                                                    {!notification.is_read && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            onClick={() => handleMarkAsRead(notification.id)}
                                                            className="flex-1 min-w-0"
                                                        >
                                                            <Check className="h-4 w-4 mr-1" />
                                                            Mark Read
                                                        </Button>
                                                    )}
                                                    {notification.related_error_id && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            onClick={() => handleViewSource(notification)}
                                                            className="flex-1 min-w-0"
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            View
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400">{formatDateTime(notification.created_at)}</p>
                                            </div>
                                        </div>

                                        {/* Desktop Layout */}
                                        <div className="hidden sm:flex items-start justify-between">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className={`font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                                                        {notification.title}
                                                    </h3>
                                                    <Badge variant={notification.is_read ? "default" : "info"}>
                                                        {notification.is_read ? "Read" : "Unread"}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                                                <p className="text-xs text-gray-400">{formatDateTime(notification.created_at)}</p>
                                            </div>
                                            <div className="flex items-center space-x-2 flex-shrink-0">
                                                {!notification.is_read && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        onClick={() => handleMarkAsRead(notification.id)}
                                                    >
                                                        <Check className="h-4 w-4 mr-2" />
                                                        Mark Read
                                                    </Button>
                                                )}
                                                {notification.related_error_id && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        onClick={() => handleViewSource(notification)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Source
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <ConfirmDialog
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={handleClearAll}
                title="Clear All Notifications?"
                message="Are you sure you want to permanently delete all your notifications? This action cannot be undone."
                type="danger"
                confirmText="Yes, Clear All"
                loading={isProcessing}
            />
        </>
    );
};