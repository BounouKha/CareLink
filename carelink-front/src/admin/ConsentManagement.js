import React, { useState, useEffect, useCallback } from 'react';
import './ConsentManagement.css';

const ConsentManagement = () => {
    const [consents, setConsents] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        status: 'all', // all, granted, withdrawn, expired
        type: 'all', // all, essential, analytics, marketing, functional
        search: '',
        since_date: ''
    });

    const consentStatuses = [
        { value: 'all', label: 'All Consents', icon: '📋' },
        { value: 'granted', label: 'Granted', icon: '✅' },
        { value: 'withdrawn', label: 'Withdrawn', icon: '❌' },
        { value: 'expired', label: 'Expired', icon: '⏰' }
    ];

    const consentTypes = [
        { value: 'all', label: 'All Types', icon: '🍪' },
        { value: 'essential', label: 'Essential', icon: '🔒' },
        { value: 'analytics', label: 'Analytics', icon: '📊' },
        { value: 'marketing', label: 'Marketing', icon: '📢' },
        { value: 'functional', label: 'Functional', icon: '⚙️' }
    ];

    const fetchConsents = async (page = 1) => {
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
                ...(filters.status !== 'all' && { status: filters.status }),
                ...(filters.type !== 'all' && { type: filters.type }),
                ...(filters.search && { search: filters.search }),
                ...(filters.since_date && { since_date: filters.since_date })
            });

            const response = await fetch(`http://localhost:8000/account/consent/admin/list/?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch consents');
            }

            const data = await response.json();
            if (data.status === 'success') {
                setConsents(data.consents || []);
                setTotalPages(data.pagination?.total_pages || 1);
                setCurrentPage(page);
                
                // Update stats from the response
                if (data.stats) {
                    setStats(data.stats);
                }
            } else {
                throw new Error(data.message || 'Failed to fetch consents');
            }
        } catch (err) {
            setError(err.message);
            setConsents([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch('http://localhost:8000/account/consent/stats/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    setStats(data.stats);
                }
            }
        } catch (err) {
            console.error('Failed to fetch consent stats:', err);
        }
    };

    // Load initial data on component mount ONLY
    useEffect(() => {
        console.log('[ConsentManagement] Initial load');
        fetchConsents(1);
        fetchStats();
    }, []); // Empty dependency - runs only once on mount

    // Handle filter changes with debouncing (separate from initial load)
    useEffect(() => {
        // Don't run on initial mount - filters are already set
        const hasNonDefaultFilters = filters.search || filters.since_date || filters.status !== 'all' || filters.type !== 'all';
        if (!hasNonDefaultFilters) return;
        
        console.log('[ConsentManagement] Filter effect triggered:', filters);
        const timeoutId = setTimeout(() => {
            fetchConsents(1);
            setCurrentPage(1);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [filters]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
            setCurrentPage(newPage);
            fetchConsents(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const formatConsentEntry = (consent) => {
        const userDisplay = consent.user_email || 'Anonymous User';
        const sessionInfo = consent.session_id ? ` (Session: ${consent.session_id.substring(0, 8)}...)` : '';
        
        // Create cookie permissions summary
        const permissions = [];
        if (consent.essential_cookies === 'granted') permissions.push('Essential');
        if (consent.analytics_cookies === 'granted') permissions.push('Analytics');
        if (consent.marketing_cookies === 'granted') permissions.push('Marketing');
        if (consent.functional_cookies === 'granted') permissions.push('Functional');
        
        const deniedPermissions = [];
        if (consent.essential_cookies === 'denied') deniedPermissions.push('Essential');
        if (consent.analytics_cookies === 'denied') deniedPermissions.push('Analytics');
        if (consent.marketing_cookies === 'denied') deniedPermissions.push('Marketing');
        if (consent.functional_cookies === 'denied') deniedPermissions.push('Functional');

        return {
            id: consent.id,
            timestamp: consent.consent_timestamp,
            user: userDisplay + sessionInfo,
            action: consent.status,
            target: 'Cookie Consent',
            details: permissions.length > 0 ? 
                `Granted: ${permissions.join(', ')}` + 
                (deniedPermissions.length > 0 ? ` | Denied: ${deniedPermissions.join(', ')}` : '') :
                `All cookies denied`,
            consent: consent,
            ip_address: consent.ip_address,
            user_agent: consent.user_agent
        };
    };

    const renderConsentEntry = (consent) => {
        const formatted = formatConsentEntry(consent);
        
        return (
            <div key={formatted.id} className="log-entry consent-entry">
                <div className="log-header">
                    <div className="log-timestamp">{formatDate(formatted.timestamp)}</div>
                    <div className="log-user">{formatted.user}</div>
                    <span className={`log-action action-${formatted.action?.toLowerCase()}`}>
                        🍪 {formatted.action}
                    </span>
                </div>
                <div className="log-content">
                    <div className="log-target">{formatted.target}</div>
                    <div className="log-details">{formatted.details}</div>
                    
                    {/* Cookie permissions display */}
                    <div className="consent-permissions">
                        <div className="permission-item">
                            <span className={`permission-badge ${consent.essential_cookies === 'granted' ? 'granted' : 'denied'}`}>
                                🔒 Essential: {consent.essential_cookies}
                            </span>
                        </div>
                        <div className="permission-item">
                            <span className={`permission-badge ${consent.analytics_cookies === 'granted' ? 'granted' : 'denied'}`}>
                                📊 Analytics: {consent.analytics_cookies}
                            </span>
                        </div>
                        <div className="permission-item">
                            <span className={`permission-badge ${consent.marketing_cookies === 'granted' ? 'granted' : 'denied'}`}>
                                📢 Marketing: {consent.marketing_cookies}
                            </span>
                        </div>
                        <div className="permission-item">
                            <span className={`permission-badge ${consent.functional_cookies === 'granted' ? 'granted' : 'denied'}`}>
                                ⚙️ Functional: {consent.functional_cookies}
                            </span>
                        </div>
                    </div>

                    {/* Additional consent information */}
                    {(consent.withdrawn_at || consent.ip_address) && (
                        <div className="log-context">
                            {consent.withdrawn_at && (
                                <span className="context-item withdrawn">
                                    ❌ Withdrawn: {formatDate(consent.withdrawn_at)}
                                </span>
                            )}
                            {consent.ip_address && (
                                <span className="context-item ip">
                                    🌐 IP: {consent.ip_address}
                                </span>
                            )}
                            <span className="context-item expiry">
                                ⏰ Expires: {formatDate(consent.expiry_date)}
                            </span>
                        </div>
                    )}

                    {/* Withdrawal reason or user agent details */}
                    {(consent.withdrawal_reason || consent.user_agent) && (
                        <div className="log-additional">
                            <details className="additional-data">
                                <summary>Additional Details</summary>
                                <div className="consent-details">
                                    {consent.withdrawal_reason && (
                                        <div><strong>Withdrawal Reason:</strong> {consent.withdrawal_reason}</div>
                                    )}
                                    {consent.user_agent && (
                                        <div><strong>User Agent:</strong> {consent.user_agent}</div>
                                    )}
                                    <div><strong>Days Until Expiry:</strong> {consent.days_until_expiry}</div>
                                </div>
                            </details>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="logs-container consent-container">
            <div className="logs-header">
                <h1>Consent Management</h1>
                <p className="logs-subtitle">Monitor user privacy preferences and GDPR compliance</p>
            </div>            {/* Stats Cards */}
            {stats && (
                <div className="consent-stats">
                    <div className="stat-card">
                        <div className="stat-icon">👥</div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.total_users || 0}</div>
                            <div className="stat-label">Total Users</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.granted_consents || 0}</div>
                            <div className="stat-label">Active Consents</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">❌</div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.withdrawn_consents || 0}</div>
                            <div className="stat-label">Withdrawn</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📊</div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.compliance_rate || 0}%</div>
                            <div className="stat-label">Compliance Rate</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="logs-filters">
                <div className="filter-section">
                    <label>Consent Status:</label>
                    <div className="log-type-buttons">
                        {consentStatuses.map(status => (
                            <button
                                key={status.value}
                                onClick={() => handleFilterChange('status', status.value)}
                                className={`log-type-btn ${filters.status === status.value ? 'active' : ''}`}
                            >
                                <span className="type-icon">{status.icon}</span>
                                {status.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="filter-section">
                    <label>Cookie Type:</label>
                    <div className="log-type-buttons">
                        {consentTypes.map(type => (
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
                            placeholder="Search by email or session..."
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
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="error-message">
                    <div className="error-icon">❌</div>
                    <div className="error-text">{error}</div>
                    <button 
                        onClick={() => fetchConsents(currentPage)}
                        className="retry-btn"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Consent Entries */}
            <div className="logs-content">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading consent data...</p>
                    </div>
                ) : consents.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🍪</div>
                        <h3>No Consent Records Found</h3>
                        <p>No consent records match your current filters.</p>
                    </div>
                ) : (
                    <div className="logs-list">
                        {consents.map(renderConsentEntry)}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="logs-pagination">
                    <div className="pagination-info">
                        Showing page {currentPage} of {totalPages}
                    </div>
                    <div className="pagination-controls">
                        <button 
                            onClick={() => handlePageChange(1)} 
                            disabled={currentPage === 1}
                            className="btn btn-secondary"
                        >
                            First
                        </button>
                        <button 
                            onClick={() => handlePageChange(currentPage - 1)} 
                            disabled={currentPage === 1}
                            className="btn btn-secondary"
                        >
                            Previous
                        </button>
                        
                        <div className="page-numbers">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const page = Math.max(1, currentPage - 2) + i;
                                if (page > totalPages) return null;
                                return (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`btn ${currentPage === page ? 'btn-primary' : 'btn-secondary'}`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <button 
                            onClick={() => handlePageChange(currentPage + 1)} 
                            disabled={currentPage === totalPages}
                            className="btn btn-secondary"
                        >
                            Next
                        </button>
                        <button 
                            onClick={() => handlePageChange(totalPages)} 
                            disabled={currentPage === totalPages}
                            className="btn btn-secondary"
                        >
                            Last
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsentManagement;
