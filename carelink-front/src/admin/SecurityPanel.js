import React, { useState, useEffect } from 'react';
import './SecurityPanel.css';
import './IDSNotifications.css';
import tokenManager from '../utils/tokenManager';

const SecurityPanel = () => {
    const [notifications, setNotifications] = useState([]);
    const [stats, setStats] = useState(null);
    const [selectedTimeRange, setSelectedTimeRange] = useState(24);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionType, setActionType] = useState('');
    const [ipAddress, setIpAddress] = useState('');
    const [reason, setReason] = useState('');
    
    // IP Audit states
    const [auditIpAddress, setAuditIpAddress] = useState('');
    const [auditResults, setAuditResults] = useState([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditError, setAuditError] = useState(null);
    const [showAuditResults, setShowAuditResults] = useState(false);
    const [auditPagination, setAuditPagination] = useState(null);
    const [currentAuditPage, setCurrentAuditPage] = useState(1);

    // Fetch security notifications
    const fetchNotifications = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const token = await tokenManager.getValidAccessToken();
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
            const token = await tokenManager.getValidAccessToken();
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
            const token = await tokenManager.getValidAccessToken();
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

    // IP Address Audit Function
    const performIpAudit = async (page = 1) => {
        if (!auditIpAddress) {
            alert('Please enter an IP address to audit');
            return;
        }

        // Validate IP address format
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(auditIpAddress)) {
            alert('Please enter a valid IP address format (e.g., 127.0.0.1)');
            return;
        }

        setAuditLoading(true);
        setAuditError(null);
        
        // Only clear results if it's a new search (page 1)
        if (page === 1) {
            setAuditResults([]);
            setCurrentAuditPage(1);
        }

        try {
            const token = await tokenManager.getValidAccessToken();
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const response = await fetch(`http://localhost:8000/account/security/audit/ip/${auditIpAddress}/?page=${page}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('No security events found for this IP address');
                }
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch IP audit data');
            }

            const data = await response.json();
            setAuditResults(data.events || []);
            setAuditPagination(data.pagination || null);
            setCurrentAuditPage(page);
            setShowAuditResults(true);
            
            if (data.events && data.events.length === 0 && page === 1) {
                alert('No security events found for this IP address');
            }
        } catch (err) {
            setAuditError(err.message);
            alert(`Audit Error: ${err.message}`);
        } finally {
            setAuditLoading(false);
        }
    };

    const clearAuditResults = () => {
        setAuditResults([]);
        setAuditIpAddress('');
        setShowAuditResults(false);
        setAuditError(null);
        setAuditPagination(null);
        setCurrentAuditPage(1);
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

            {/* IP Address Audit */}
            <div className="ip-audit-section">
                <h3>🔍 IP Address Audit</h3>
                <p>Search security events by IP address to view complete audit trail</p>
                
                <div className="audit-form">
                    <input
                        type="text"
                        placeholder="Enter IP address (e.g., 127.0.0.1)"
                        value={auditIpAddress}
                        onChange={(e) => setAuditIpAddress(e.target.value)}
                        className="audit-ip-input"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                performIpAudit(1);
                            }
                        }}
                    />
                    
                    <button 
                        onClick={() => performIpAudit(1)}
                        disabled={!auditIpAddress || auditLoading}
                        className="audit-button"
                    >
                        {auditLoading ? '🔄 Auditing...' : '🔍 Audit IP'}
                    </button>
                    
                    {showAuditResults && (
                        <button 
                            onClick={clearAuditResults}
                            className="clear-audit-button"
                        >
                            Clear Results
                        </button>
                    )}
                </div>

                {/* Audit Results */}
                {showAuditResults && (
                    <div className="audit-results">
                        <h4>📊 Audit Results for {auditIpAddress}</h4>
                        
                        {auditResults.length === 0 ? (
                            <div className="no-audit-results">
                                <p>✅ No security events found for this IP address</p>
                            </div>
                        ) : (
                            <>
                                <div className="audit-summary">
                                    <span className="audit-count">
                                        {auditPagination ? (
                                            <>
                                                Showing {((auditPagination.current_page - 1) * auditPagination.page_size) + 1}-{Math.min(auditPagination.current_page * auditPagination.page_size, auditPagination.total_events)} 
                                                of {auditPagination.total_events} security event(s)
                                            </>
                                        ) : (
                                            `Found ${auditResults.length} security event(s)`
                                        )}
                                    </span>
                                </div>
                                
                                {/* Pagination Controls */}
                                {auditPagination && auditPagination.total_pages > 1 && (
                                    <div className="pagination-controls">
                                        <button 
                                            onClick={() => performIpAudit(auditPagination.previous_page)}
                                            disabled={!auditPagination.has_previous || auditLoading}
                                            className="pagination-btn"
                                        >
                                            ← Previous
                                        </button>
                                        
                                        <span className="pagination-info">
                                            Page {auditPagination.current_page} of {auditPagination.total_pages}
                                        </span>
                                        
                                        <button 
                                            onClick={() => performIpAudit(auditPagination.next_page)}
                                            disabled={!auditPagination.has_next || auditLoading}
                                            className="pagination-btn"
                                        >
                                            Next →
                                        </button>
                                    </div>
                                )}
                                
                                <div className="audit-events-list">
                                    {auditResults.map((event, index) => (
                                        <div 
                                            key={event.id || index} 
                                            className="audit-event-item"
                                            style={{ borderLeftColor: getThreatLevelColor(event.threat_level) }}
                                        >
                                            <div className="audit-event-header">
                                                <span className={`threat-level-${event.threat_level.toLowerCase()}`}>
                                                    {event.threat_level}
                                                </span>
                                                <span className="audit-event-time">
                                                    {event.formatted_date}
                                                </span>
                                            </div>
                                            
                                            <div className="audit-event-content">
                                                <div className="audit-event-title">{event.title}</div>
                                                <div className="audit-event-details">
                                                    <strong>Path:</strong> {event.path}<br/>
                                                    <strong>Method:</strong> {event.method || 'N/A'}<br/>
                                                    <strong>User Agent:</strong> {event.user_agent || 'N/A'}
                                                </div>
                                                
                                                {event.threats && event.threats.length > 0 && (
                                                    <div className="audit-threat-details">
                                                        <strong>Threat Details:</strong>
                                                        <ul>
                                                            {event.threats.map((threat, idx) => (
                                                                <li key={idx}>
                                                                    <span className="threat-type">{threat.type}</span>
                                                                    {threat.field && (
                                                                        <span className="threat-field">
                                                                            : {threat.field}
                                                                        </span>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                
                                                {event.description && (
                                                    <div className="audit-event-description">
                                                        <strong>Description:</strong> {event.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Bottom Pagination Controls */}
                                {auditPagination && auditPagination.total_pages > 1 && (
                                    <div className="pagination-controls bottom-pagination">
                                        <button 
                                            onClick={() => performIpAudit(auditPagination.previous_page)}
                                            disabled={!auditPagination.has_previous || auditLoading}
                                            className="pagination-btn"
                                        >
                                            ← Previous
                                        </button>
                                        
                                        <span className="pagination-info">
                                            Page {auditPagination.current_page} of {auditPagination.total_pages}
                                        </span>
                                        
                                        <button 
                                            onClick={() => performIpAudit(auditPagination.next_page)}
                                            disabled={!auditPagination.has_next || auditLoading}
                                            className="pagination-btn"
                                        >
                                            Next →
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
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