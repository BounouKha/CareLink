import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import tokenManager from '../utils/tokenManager';
import './NotificationCenter.css';

const NotificationCenter = ({ isOpen, onClose, currentUser }) => {
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        total_notifications: 0,
        unread_notifications: 0,
        unread_by_type: {}
    });
    const [filters, setFilters] = useState({
        type: 'all',
        is_read: 'all',
        priority: 'all'
    });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Fetch notifications
    const fetchNotifications = useCallback(async (pageNum = 1, resetList = false) => {
        try {
            setLoading(pageNum === 1);
            
            const params = new URLSearchParams({
                page: pageNum.toString(),
                page_size: '20'
            });
            
            if (filters.type !== 'all') params.append('type', filters.type);
            if (filters.is_read !== 'all') params.append('is_read', filters.is_read);
            if (filters.priority !== 'all') params.append('priority', filters.priority);
            
            const response = await tokenManager.authenticatedFetch(
                `http://localhost:8000/account/notifications/?${params.toString()}`
            );
            
            if (response.ok) {
                const data = await response.json();
                
                if (resetList || pageNum === 1) {
                    setNotifications(data.results);
                } else {
                    setNotifications(prev => [...prev, ...data.results]);
                }
                
                setHasMore(!!data.next);
                setError(null);
            } else {
                throw new Error('Failed to fetch notifications');
            }
        } catch (err) {
            setError('Failed to load notifications');
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Fetch notification stats
    const fetchStats = useCallback(async () => {
        try {
            const response = await tokenManager.authenticatedFetch('http://localhost:8000/account/notifications/stats/');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Error fetching notification stats:', err);
        }
    }, []);

    // Mark notification as read
    const markAsRead = async (notificationId) => {
        try {
            const response = await tokenManager.authenticatedFetch(
                `http://localhost:8000/account/notifications/${notificationId}/`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'mark_read' })
                }
            );
            
            if (response.ok) {
                setNotifications(prev => prev.map(notif => 
                    notif.id === notificationId 
                        ? { ...notif, is_read: true, read_at: new Date().toISOString() }
                        : notif
                ));
                fetchStats(); // Refresh stats
            }
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    // Mark all notifications as read
    const markAllAsRead = async () => {
        try {
            const response = await tokenManager.authenticatedFetch(
                'http://localhost:8000/account/notifications/mark-all-read/',
                { method: 'POST' }
            );
            
            if (response.ok) {
                setNotifications(prev => prev.map(notif => ({
                    ...notif,
                    is_read: true,
                    read_at: new Date().toISOString()
                })));
                fetchStats(); // Refresh stats
            }
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    // Clear all notifications (delete them)
    const clearAllNotifications = async () => {
        if (!window.confirm(t('notifications.confirmClearAll', 'Are you sure you want to delete all notifications? This action cannot be undone.'))) {
            return;
        }
        
        try {
            const response = await tokenManager.authenticatedFetch(
                'http://localhost:8000/account/notifications/clear-all/',
                { method: 'DELETE' }
            );
            
            if (response.ok) {
                setNotifications([]);
                setStats({
                    total_notifications: 0,
                    unread_notifications: 0,
                    unread_by_type: {}
                });
                setError(null);
            }
        } catch (err) {
            console.error('Error clearing all notifications:', err);
            setError('Failed to clear notifications');
        }
    };

    // Get notification icon based on type
    const getNotificationIcon = (type) => {
        const iconMap = {
            'schedule_new': 'bi bi-calendar-plus',
            'schedule_confirmed': 'bi bi-calendar-check',
            'schedule_cancelled': 'bi bi-calendar-x',
            'schedule_modified': 'bi bi-calendar-event',
            'schedule_change_request': 'bi bi-calendar-date',
            'ticket_new': 'bi bi-ticket-perforated',
            'ticket_assigned': 'bi bi-person-check',
            'ticket_updated': 'bi bi-pencil-square',
            'ticket_resolved': 'bi bi-check-circle',
            'ticket_comment': 'bi bi-chat-dots',
            'appointment_comment': 'bi bi-chat-square-text',
            'demand_new': 'bi bi-plus-circle',
            'demand_updated': 'bi bi-arrow-repeat',
            'demand_assigned': 'bi bi-person-check-fill',
            'provider_assigned': 'bi bi-person-heart',
            'provider_unavailable': 'bi bi-person-x',
            'system_maintenance': 'bi bi-gear',
            'system_alert': 'bi bi-exclamation-triangle'
        };
        return iconMap[type] || 'bi bi-bell';
    };

    // Get notification color based on priority
    const getPriorityColor = (priority) => {
        const colorMap = {
            'urgent': 'text-danger',
            'high': 'text-warning',
            'normal': 'text-info',
            'low': 'text-muted'
        };
        return colorMap[priority] || 'text-info';
    };

    // Get notification type display name
    const getTypeDisplayName = (type) => {
        const typeMap = {
            'schedule_new': t('notifications.types.schedule_new', 'New Appointment'),
            'schedule_confirmed': t('notifications.types.schedule_confirmed', 'Appointment Confirmed'),
            'schedule_cancelled': t('notifications.types.schedule_cancelled', 'Appointment Cancelled'),
            'schedule_modified': t('notifications.types.schedule_modified', 'Appointment Modified'),
            'schedule_change_request': t('notifications.types.schedule_change_request', 'Schedule Change Request'),
            'ticket_new': t('notifications.types.ticket_new', 'New Ticket'),
            'ticket_assigned': t('notifications.types.ticket_assigned', 'Ticket Assigned'),
            'ticket_updated': t('notifications.types.ticket_updated', 'Ticket Updated'),
            'ticket_resolved': t('notifications.types.ticket_resolved', 'Ticket Resolved'),
            'ticket_comment': t('notifications.types.ticket_comment', 'Ticket Comment'),
            'appointment_comment': t('notifications.types.appointment_comment', 'Appointment Comment'),
            'demand_new': t('notifications.types.demand_new', 'New Service Demand'),
            'demand_updated': t('notifications.types.demand_updated', 'Service Demand Updated'),
            'demand_assigned': t('notifications.types.demand_assigned', 'Service Demand Assigned'),
            'provider_assigned': t('notifications.types.provider_assigned', 'Provider Assigned'),
            'provider_unavailable': t('notifications.types.provider_unavailable', 'Provider Unavailable'),
            'system_maintenance': t('notifications.types.system_maintenance', 'System Maintenance'),
            'system_alert': t('notifications.types.system_alert', 'System Alert')
        };
        return typeMap[type] || type.replace('_', ' ');
    };

    // Handle notification click
    const handleNotificationClick = (notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        
        // Navigate based on notification type
        if (notification.schedule && notification.notification_type.startsWith('schedule_')) {
            // Navigate to schedule/appointment view
            window.location.href = `/schedule/${notification.schedule}`;
        } else if (notification.ticket && notification.notification_type.startsWith('ticket_')) {
            // Navigate to ticket view
            window.location.href = `/helpdesk/tickets/${notification.ticket}`;
        } else if (notification.service_demand && notification.notification_type.startsWith('demand_')) {
            // Navigate to service demand view
            window.location.href = `/service-demands/${notification.service_demand}`;
        }
    };

    // Load more notifications
    const loadMore = () => {
        if (hasMore && !loading) {
            setPage(prev => prev + 1);
            fetchNotifications(page + 1, false);
        }
    };

    // Apply filters
    const applyFilters = () => {
        setPage(1);
        fetchNotifications(1, true);
    };

    // Reset filters
    const resetFilters = () => {
        setFilters({
            type: 'all',
            is_read: 'all',
            priority: 'all'
        });
        setPage(1);
    };

    // Initial load and filter changes
    useEffect(() => {
        if (isOpen) {
            fetchNotifications(1, true);
            fetchStats();
        }
    }, [isOpen, fetchNotifications, fetchStats]);

    // Manual refresh function
    const refreshNotifications = () => {
        fetchStats();
        fetchNotifications(1, true);
    };

    // Auto-refresh notifications every 2 minutes when open
    useEffect(() => {
        let interval;
        if (isOpen) {
            interval = setInterval(() => {
                fetchStats();
                if (page === 1) {
                    fetchNotifications(1, true);
                }
            }, 120000); // 2 minutes (120 seconds)
        }
        return () => clearInterval(interval);
    }, [isOpen, page, fetchNotifications, fetchStats]);

    if (!isOpen) return null;

    return (
        <div className="notification-center-overlay" onClick={onClose}>
            <div className="notification-center" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="notification-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h4 className="mb-0">
                                <i className="bi bi-bell me-2"></i>
                                {t('notifications.title', 'Notifications')}
                            </h4>
                            <small className="text-muted">
                                {stats.unread_notifications} {t('notifications.unread', 'unread')} of {stats.total_notifications} {t('notifications.total', 'total')}
                            </small>
                        </div>
                        <div className="d-flex gap-2 notification-header-buttons">
                            <button 
                                className="btn btn-sm btn-outline-info"
                                onClick={refreshNotifications}
                                title={t('notifications.refresh', 'Refresh notifications')}
                            >
                                <i className="bi bi-arrow-clockwise"></i>
                            </button>
                            {stats.unread_notifications > 0 && (
                                <button 
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={markAllAsRead}
                                    title={t('notifications.markAllRead', 'Mark all as read')}
                                >
                                    <i className="bi bi-check-all"></i>
                                </button>
                            )}
                            {stats.total_notifications > 0 && (
                                <button 
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={clearAllNotifications}
                                    title={t('notifications.clearAll', 'Clear all notifications')}
                                >
                                    <i className="bi bi-trash"></i>
                                </button>
                            )}
                            <button 
                                className="btn btn-sm btn-outline-secondary"
                                onClick={onClose}
                                title={t('common.close', 'Close')}
                            >
                                <i className="bi bi-x"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="notification-filters">
                    <div className="row g-2">
                        <div className="col-md-3">
                            <select 
                                className="form-select form-select-sm"
                                value={filters.type}
                                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            >
                                <option value="all">{t('notifications.filters.allTypes', 'All Types')}</option>
                                <option value="schedule_new">{t('notifications.types.schedule_new', 'New Appointments')}</option>
                                <option value="schedule_confirmed">{t('notifications.types.schedule_confirmed', 'Confirmed')}</option>
                                <option value="schedule_cancelled">{t('notifications.types.schedule_cancelled', 'Cancelled')}</option>
                                <option value="ticket_new">{t('notifications.types.ticket_new', 'New Tickets')}</option>
                                <option value="ticket_comment">{t('notifications.types.ticket_comment', 'Ticket Comments')}</option>
                                <option value="appointment_comment">{t('notifications.types.appointment_comment', 'Appointment Comments')}</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select 
                                className="form-select form-select-sm"
                                value={filters.is_read}
                                onChange={(e) => setFilters(prev => ({ ...prev, is_read: e.target.value }))}
                            >
                                <option value="all">{t('notifications.filters.allStatus', 'All Status')}</option>
                                <option value="false">{t('notifications.filters.unread', 'Unread')}</option>
                                <option value="true">{t('notifications.filters.read', 'Read')}</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select 
                                className="form-select form-select-sm"
                                value={filters.priority}
                                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                            >
                                <option value="all">{t('notifications.filters.allPriorities', 'All Priorities')}</option>
                                <option value="urgent">{t('notifications.priority.urgent', 'Urgent')}</option>
                                <option value="high">{t('notifications.priority.high', 'High')}</option>
                                <option value="normal">{t('notifications.priority.normal', 'Normal')}</option>
                                <option value="low">{t('notifications.priority.low', 'Low')}</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <div className="d-flex gap-1">
                                <button 
                                    className="btn btn-sm btn-primary"
                                    onClick={applyFilters}
                                >
                                    {t('common.apply', 'Apply')}
                                </button>
                                <button 
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={resetFilters}
                                    title={t('notifications.resetFilters', 'Reset filters')}
                                >
                                    {t('notifications.resetFilters', 'Reset')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notifications List */}
                <div className="notification-list">
                    {loading && page === 1 ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">{t('common.loading', 'Loading...')}</span>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger" role="alert">
                                                                <i className="bi bi-exclamation-triangle me-2"></i>
                            {error}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                            <i className="bi bi-bell-slash fs-1 mb-2"></i>
                            <p>{t('notifications.empty', 'No notifications found')}</p>
                        </div>
                    ) : (
                        <>
                            {notifications.map((notification) => (
                                <div 
                                    key={notification.id}
                                    className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-icon">
                                        <i className={`${getNotificationIcon(notification.notification_type)} ${getPriorityColor(notification.priority)}`}></i>
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-header-item">
                                            <span className="notification-title">{notification.title}</span>
                                            <span className="notification-time">{notification.time_ago}</span>
                                        </div>
                                        <div className="notification-message">
                                            {notification.message}
                                        </div>
                                        <div className="notification-meta">
                                            <span className="notification-type">
                                                {getTypeDisplayName(notification.notification_type)}
                                            </span>
                                            {notification.sender_name && notification.sender_name !== 'System' && (
                                                <span className="notification-sender">
                                                    {t('notifications.from', 'from')} {notification.sender_name}
                                                </span>
                                            )}
                                            {notification.priority !== 'normal' && (
                                                <span className={`notification-priority ${getPriorityColor(notification.priority)}`}>
                                                    {t(`notifications.priority.${notification.priority}`, notification.priority)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {!notification.is_read && (
                                        <div className="notification-unread-indicator">
                                            <div className="unread-dot"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            {/* Load More Button */}
                            {hasMore && (
                                <div className="text-center py-3">
                                    <button 
                                        className="btn btn-outline-primary"
                                        onClick={loadMore}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                {t('common.loading', 'Loading...')}
                                            </>
                                        ) : (
                                            t('notifications.loadMore', 'Load More')
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationCenter; 