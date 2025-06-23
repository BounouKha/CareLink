import React, { useState, useEffect, useCallback, useRef } from 'react';
import './LogsManagement.css';

const LogsManagement = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const isInitialLoad = useRef(true);
    const [filters, setFilters] = useState({
        type: 'user_actions', // user_actions, admin, errors, general
        search: '',
        since_date: '',
        action_type: ''
    });

    const logTypes = [
        { value: 'user_actions', label: 'User Actions', icon: '👤' },
        { value: 'admin', label: 'Admin Actions', icon: '⚙️' },
        { value: 'errors', label: 'Error Logs', icon: '❌' },
        { value: 'general', label: 'General Logs', icon: '📋' }
    ];

    const fetchLogs = async (page = 1) => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found. Please log in.');
            }

            const params = new URLSearchParams({
                page: page.toString(),
                page_size: '20',
                type: filters.type,
                ...(filters.search && { search: filters.search }),
                ...(filters.since_date && { since_date: filters.since_date }),
                ...(filters.action_type && { action_type: filters.action_type })
            });

            const response = await fetch(`http://localhost:8000/account/logs/?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch logs');
            }

            const data = await response.json();
            setLogs(data.results || data.logs || []);
            setTotalPages(Math.ceil((data.count || data.total_logs || 0) / 20));
            setCurrentPage(page);
        } catch (err) {
            setError(err.message);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch('http://localhost:8000/account/logs/stats/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch log stats:', err);
        }
    };    // Load initial data on component mount ONLY
    useEffect(() => {
        console.log('[LogsManagement] Initial load');
        fetchLogs(1);
        fetchStats();
        isInitialLoad.current = false;
    }, []); // Empty dependency - runs only once on mount

    // Handle filter changes (skip initial load to avoid double fetch)
    useEffect(() => {
        if (isInitialLoad.current) return; // Skip initial load
        
        console.log('[LogsManagement] Filter effect triggered:', filters);
        
        // Fetch immediately when filters change (especially for tab switching)
        fetchLogs(1);
        fetchStats();
        setCurrentPage(1);
    }, [filters]); // Run when any filter changes

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
            setCurrentPage(newPage);
            fetchLogs(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const formatLogEntry = (log) => {
        if (filters.type === 'user_actions') {
            return {
                id: log.id,
                timestamp: log.created_at,
                user: log.user_name || `${log.user?.firstname || ''} ${log.user?.lastname || ''}`.trim(),
                action: log.action_type,
                target: log.target_model ? `${log.target_model} (ID: ${log.target_id})` : 'N/A',
                details: log.details || log.description || 'No details available'
            };
        } else {
            // File-based logs
            return {
                id: log.line_number || Math.random(),
                timestamp: log.timestamp,
                level: log.level || 'INFO',
                message: log.message,
                details: log.full_line || log.message
            };
        }
    };    const renderLogEntry = (log, index) => {
        const formatted = formatLogEntry(log);
        // Use a combination of timestamp, index, and ID for a unique key
        const uniqueKey = `${formatted.timestamp}-${index}-${formatted.id}`;
        
        if (filters.type === 'user_actions') {
            return (
                <div key={uniqueKey} className="log-entry">
                    <div className="log-header">
                        <div className="log-timestamp">{formatDate(formatted.timestamp)}</div>
                        <div className="log-user">{formatted.user}</div>
                        <span className={`log-action action-${formatted.action?.toLowerCase()}`}>
                            {formatted.action}
                        </span>
                    </div>
                    <div className="log-content">
                        <div className="log-target">{formatted.target}</div>
                        <div className="log-details">{formatted.details}</div>
                        {/* Enhanced information display */}
                        {(log.affected_patient_name || log.affected_provider_name) && (
                            <div className="log-context">
                                {log.affected_patient_name && (
                                    <span className="context-item patient">
                                        👤 Patient: {log.affected_patient_name}
                                    </span>
                                )}
                                {log.affected_provider_name && (
                                    <span className="context-item provider">
                                        🏥 Provider: {log.affected_provider_name}
                                    </span>
                                )}
                            </div>
                        )}
                        {log.additional_data && (
                            <div className="log-additional">
                                <details className="additional-data">
                                    <summary>Additional Details</summary>
                                    <pre>{JSON.stringify(log.additional_data, null, 2)}</pre>
                                </details>
                            </div>
                        )}
                    </div>
                </div>
            );        } else {
            return (
                <div key={uniqueKey} className="log-entry">
                    <div className="log-header">
                        <div className="log-timestamp">{formatDate(formatted.timestamp)}</div>
                        <span className={`log-level level-${formatted.level?.toLowerCase()}`}>
                            {formatted.level}
                        </span>
                    </div>
                    <div className="log-content">
                        <div className="log-message">{formatted.message}</div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="logs-management">
            <div className="logs-header">
                <h1>System Logs</h1>
                <p className="logs-subtitle">Monitor system activities, user actions, and events</p>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="logs-stats">
                    <div className="stat-card">
                        <div className="stat-icon">👤</div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.total_user_actions || 0}</div>
                            <div className="stat-label">User Actions</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📅</div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.actions_today || 0}</div>
                            <div className="stat-label">Today</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📈</div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.actions_this_week || 0}</div>
                            <div className="stat-label">This Week</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">👥</div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.active_users || 0}</div>
                            <div className="stat-label">Active Users</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="logs-filters">
                <div className="filter-group">
                    <label>Log Type:</label>
                    <div className="log-type-buttons">
                        {logTypes.map(type => (
                            <button
                                key={type.value}
                                onClick={() => handleFilterChange('type', type.value)}
                                className={`log-type-btn ${filters.type === type.value ? 'active' : ''}`}
                            >
                                <span className="type-icon">{type.icon}</span>
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="filter-row">
                    <div className="filter-item">
                        <label>Search:</label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            placeholder="Search logs..."
                            className="filter-input"
                        />
                    </div>

                    <div className="filter-item">
                        <label>Since Date:</label>
                        <input
                            type="date"
                            value={filters.since_date}
                            onChange={(e) => handleFilterChange('since_date', e.target.value)}
                            className="filter-input"
                        />
                    </div>

                    {filters.type === 'user_actions' && (
                        <div className="filter-item">
                            <label>Action Type:</label>
                            <select
                                value={filters.action_type}
                                onChange={(e) => handleFilterChange('action_type', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All Actions</option>
                                <option value="CREATE">Create</option>
                                <option value="UPDATE">Update</option>
                                <option value="DELETE">Delete</option>
                                <option value="LOGIN">Login</option>
                                <option value="LOGOUT">Logout</option>
                                <option value="VIEW">View</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="alert alert-error">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* Logs List */}
            <div className="logs-container">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner">⟳</div>
                        <p>Loading logs...</p>
                    </div>
                ) : logs.length > 0 ? (                    <div className="logs-list">
                        {logs.map((log, index) => renderLogEntry(log, index))}
                    </div>
                ) : (
                    <div className="no-logs">
                        <div className="no-logs-icon">📋</div>
                        <h3>No logs found</h3>
                        <p>Try adjusting your filters or check back later.</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button 
                        onClick={() => handlePageChange(currentPage - 1)} 
                        disabled={currentPage <= 1}
                        className="btn btn-secondary"
                    >
                        ← Previous
                    </button>
                    <span className="pagination-info">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={() => handlePageChange(currentPage + 1)} 
                        disabled={currentPage >= totalPages}
                        className="btn btn-secondary"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
};

export default LogsManagement;
