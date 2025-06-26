import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { dbService, supabase, type Notification } from '../lib/supabase';
import { useAuthContext } from '../hooks/AuthContext';
import { formatDateTime } from '../utils/format';

export const NotificationsPage: React.FC = () => {
    const { admin } = useAuthContext();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const loadNotifications = useCallback(async () => {
        if (!admin) return;
        setLoading(true);
        try {
            const data = await dbService.getNotifications(admin.id);
            setNotifications(data);
        } catch (error) {
            console.error("Failed to load notifications:", error);
        } finally {
            setLoading(false);
        }
    }, [admin]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const handleMarkAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    };

    const handleMarkAllAsRead = async () => {
        setIsProcessing(true);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length > 0) {
            await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
        }
        setIsProcessing(false);
    };

    const handleClearAll = async () => {
        setIsProcessing(true);
        if (!admin) return;
        await supabase.from('notifications').delete().eq('admin_id', admin.id);
        setNotifications([]);
        setShowClearConfirm(false);
        setIsProcessing(false);
    };

    const handleViewSource = (notification: Notification) => {
        if (notification.related_error_id) {
            navigate('/errors');
        }
        // Add other navigation logic here for other notification types
    };

    return (
        <>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <Bell className="h-8 w-8 text-quickcart-600 mr-3" />
                            All Notifications
                        </h1>
                        <p className="text-gray-600 mt-1">View and manage all your system notifications.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" onClick={handleMarkAllAsRead} disabled={isProcessing || !notifications.some(n => !n.is_read)}>
                            <Check className="h-4 w-4 mr-2" /> Mark All as Read
                        </Button>
                        <Button variant="destructive" onClick={() => setShowClearConfirm(true)} disabled={isProcessing || notifications.length === 0}>
                            <Trash2 className="h-4 w-4 mr-2" /> Clear All
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-200">
                            {loading ? <p className="p-6">Loading...</p> :
                                notifications.length === 0 ? <p className="p-6 text-center text-gray-500">You have no notifications.</p> :
                                    notifications.map(notification => (
                                        <div key={notification.id} className={`p-4 flex items-start justify-between ${!notification.is_read ? 'bg-blue-50' : 'bg-white'}`}>
                                            <div>
                                                <div className="flex items-center gap-4 mb-1">
                                                    <h3 className={`font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>{notification.title}</h3>
                                                    <Badge variant={notification.is_read ? "default" : "info"}>{notification.is_read ? "Read" : "Unread"}</Badge>
                                                </div>
                                                <p className="text-sm text-gray-600">{notification.message}</p>
                                                <p className="text-xs text-gray-400 mt-2">{formatDateTime(notification.created_at)}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {!notification.is_read && (
                                                    <Button size="sm" variant="outline" onClick={() => handleMarkAsRead(notification.id)}>Mark as Read</Button>
                                                )}
                                                {notification.related_error_id && (
                                                    <Button size="sm" variant="outline" onClick={() => handleViewSource(notification)}>
                                                        <Eye className="h-4 w-4 mr-2" /> View Source
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
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