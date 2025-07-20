import React, { useState, useEffect } from 'react';
import './SecurityPanel.css';
import './IDSNotifications.css';

const SecurityPanel = () => {
    const [notifications, setNotifications] = useState([]);
    const [stats, setStats] = useState(null);
    const [selectedTimeRange, setSelectedTimeRange] = useState(24);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionType, setActionType] = useState('');
    const [ipAddress, setIpAddress] = useState('');
    const [reason, setReason] = useState('');

    // Fetch security notifications
    const fetchNotifications = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/account/security/notifications/?hours=${selectedTimeRange}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch security notifications');
            }

            const data = await response.json();
            setNotifications(data.notifications);
        } catch (err) {
            setError(err.message);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch security statistics
    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/account/security/stats/?hours=${selectedTimeRange}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch security statistics');
            }

            const data = await response.json();
            setStats(data);
        } catch (err) {
            setError(err.message);
            setStats(null);
        }
    };

    // Perform security action
    const performAction = async () => {
        if (!ipAddress) {
            alert('Please enter an IP address');
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch('http://localhost:8000/account/security/actions/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: actionType,
                    ip_address: ipAddress,
                    reason: reason || undefined
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to perform security action');
            }

            const result = await response.json();
            alert(result.message);
            
            // Reset form and refresh data
            setActionType('');
            setIpAddress('');
            setReason('');
            fetchNotifications();
            fetchStats();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    useEffect(() => {
        fetchNotifications();
        fetchStats();
    }, [selectedTimeRange]);

    if (loading) {
        return (
            <div className="security-loading">
                <div className="loading-spinner"></div>
                <p>Loading security data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="security-error">
                <h3>Error Loading Security Data</h3>
                <p>{error}</p>
                <button onClick={fetchNotifications}>Retry</button>
            </div>
        );
    }

    const getThreatLevelColor = (level) => {
        switch (level) {
            case 'CRITICAL': return '#dc3545';
            case 'HIGH': return '#fd7e14';
            case 'MEDIUM': return '#ffc107';
            case 'LOW': return '#28a745';
            default: return '#6c757d';
        }
    };

    return (
        <div className="security-panel">
            <div className="security-header">
                <h2>🛡️ Security Monitoring</h2>
                <p>Real-time security threat detection and response</p>
            </div>

            {/* Time Range Selector */}
            <div className="time-range-selector">
                <label>Time Range:</label>
                <select 
                    value={selectedTimeRange} 
                    onChange={(e) => setSelectedTimeRange(parseInt(e.target.value))}
                >
                    <option value={1}>Last Hour</option>
                    <option value={24}>Last 24 Hours</option>
                    <option value={168}>Last Week</option>
                    <option value={720}>Last Month</option>
                </select>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="security-stats">
                    <div className="stat-card">
                        <h3>{stats.total_events}</h3>
                        <p>Total Events</p>
                    </div>
                    <div className="stat-card">
                        <h3>{stats.by_threat_level.CRITICAL || 0}</h3>
                        <p>Critical Threats</p>
                    </div>
                    <div className="stat-card">
                        <h3>{stats.by_threat_level.HIGH || 0}</h3>
                        <p>High Threats</p>
                    </div>
                    <div className="stat-card">
                        <h3>{Object.keys(stats.by_ip).length}</h3>
                        <p>Unique IPs</p>
                    </div>
                </div>
            )}

            {/* Security Actions */}
            <div className="security-actions">
                <h3>🎛️ Security Actions</h3>
                <div className="action-form">
                    <select 
                        value={actionType} 
                        onChange={(e) => setActionType(e.target.value)}
                        className="action-select"
                    >
                        <option value="">Select Action</option>
                        <option value="ban_ip">Ban IP</option>
                        <option value="unban_ip">Unban IP</option>
                        <option value="whitelist_ip">Whitelist IP</option>
                    </select>
                    
                    <input
                        type="text"
                        placeholder="IP Address (e.g., 192.168.1.100)"
                        value={ipAddress}
                        onChange={(e) => setIpAddress(e.target.value)}
                        className="ip-input"
                    />
                    
                    <input
                        type="text"
                        placeholder="Reason (optional)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="reason-input"
                    />
                    
                    <button 
                        onClick={performAction}
                        disabled={!actionType || !ipAddress}
                        className="action-button"
                    >
                        Execute Action
                    </button>
                </div>
            </div>

            {/* Security Notifications */}
            <div className="security-notifications">
                <h3>🚨 Security Notifications</h3>
                <div className="notifications-list">
                    {notifications.length === 0 ? (
                        <div className="no-notifications">
                            <p>No security notifications in the selected time range.</p>
                        </div>
                    ) : (
                        notifications.map((notification, index) => (
                            <div 
                                key={notification.id || index} 
                                className="ids-notification-item"
                                style={{ borderLeftColor: getThreatLevelColor(notification.threat_level) }}
                            >
                                <div className="ids-notification-header-item">
                                    <span className={`ids-threat-level-${notification.threat_level.toLowerCase()}`}>
                                        {notification.threat_level}
                                    </span>
                                    <span className="ids-notification-time">
                                        {new Date(notification.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                
                                <div className="ids-notification-content">
                                    <div className="ids-notification-title">{notification.title}</div>
                                    <div className="ids-notification-message">
                                        <strong>IP:</strong> {notification.client_ip}<br/>
                                        <strong>Path:</strong> {notification.path}
                                    </div>
                                    
                                    {notification.threats && notification.threats.length > 0 && (
                                        <div className="ids-threat-details">
                                            <strong>Threats:</strong>
                                            <ul>
                                                {notification.threats.map((threat, idx) => (
                                                    <li key={idx}>
                                                        {threat.type}: {threat.field || 'N/A'}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SecurityPanel; 