import React, { useState, useEffect } from 'react';
import tokenManager from '../utils/tokenManager';
import './InvoiceManagement.css';

const InvoiceManagement = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        patient: '',
        month: ''
    });
    const [regenerating, setRegenerating] = useState(false);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        pageSize: 20
    });
    const [searchTimeout, setSearchTimeout] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        // Clear existing timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Set new timeout for search
        const timeoutId = setTimeout(() => {
            setIsSearching(true);
            fetchInvoices(1).finally(() => {
                setIsSearching(false);
            });
        }, 500); // 500ms delay
        
        setSearchTimeout(timeoutId);
        
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [filters]);

    const fetchInvoices = async (page = 1) => {
        try {
            setLoading(true);
            
            // Build query parameters
            const params = new URLSearchParams();
            if (filters.status !== 'all') params.append('status', filters.status);
            if (filters.patient) params.append('patient', filters.patient);
            if (filters.month) params.append('month', filters.month);
            params.append('page', page);
            params.append('page_size', pagination.pageSize);
            
            const url = `http://localhost:8000/account/invoices/admin/?${params.toString()}`;
            console.log('Fetching invoices from:', url);
            
            const response = await tokenManager.authenticatedFetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log('Invoices data:', data);
            
            if (data.results) {
                // Paginated response
                setInvoices(data.results);
                setPagination({
                    currentPage: page,
                    totalPages: Math.ceil(data.count / pagination.pageSize),
                    totalCount: data.count,
                    pageSize: pagination.pageSize
                });
            } else {
                // Non-paginated response (fallback)
                setInvoices(data);
                setPagination({
                    currentPage: 1,
                    totalPages: 1,
                    totalCount: data.length,
                    pageSize: pagination.pageSize
                });
            }
        } catch (err) {
            setError('Failed to fetch invoices');
            console.error('Error fetching invoices:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateInvoice = async (invoiceId) => {
        try {
            console.log('🔄 Starting invoice regeneration for invoice ID:', invoiceId);
            setRegenerating(true);
            
            const response = await tokenManager.authenticatedFetch(`http://localhost:8000/account/invoices/${invoiceId}/regenerate/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            console.log('📡 Regenerate response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Regenerate error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Regenerate success result:', result);
            
            // Refresh the invoice list
            await fetchInvoices();
            alert('Invoice regenerated successfully!');
        } catch (err) {
            console.error('❌ Error regenerating invoice:', err);
            setError('Failed to regenerate invoice');
        } finally {
            setRegenerating(false);
        }
    };

    const handleResolveContest = async (invoiceId, resolution) => {
        try {
            const response = await tokenManager.authenticatedFetch(`http://localhost:8000/account/invoices/${invoiceId}/resolve-contest/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    resolution: resolution
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            await fetchInvoices();
            alert('Contest resolved successfully!');
        } catch (err) {
            setError('Failed to resolve contest');
            console.error('Error resolving contest:', err);
        }
    };

    const handleCreateNewInvoice = async (invoiceId) => {
        try {
            const response = await tokenManager.authenticatedFetch(`http://localhost:8000/account/invoices/${invoiceId}/create-new-after-contest/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            await fetchInvoices();
            alert(`New invoice created successfully! Invoice #${result.new_invoice_id} with amount €${result.new_invoice_amount}`);
        } catch (err) {
            setError('Failed to create new invoice');
            console.error('Error creating new invoice:', err);
        }
    };

    const filteredInvoices = invoices.filter(invoice => {
        if (filters.status !== 'all' && invoice.status !== filters.status) return false;
        if (filters.patient && !invoice.patient_name?.toLowerCase().includes(filters.patient.toLowerCase())) return false;
        return true;
    });

    const getStatusBadge = (status) => {
        const statusConfig = {
            'In Progress': { class: 'status-in-progress', icon: '⏳' },
            'Paid': { class: 'status-paid', icon: '✅' },
            'Contested': { class: 'status-contested', icon: '⚠️' },
            'Cancelled': { class: 'status-cancelled', icon: '❌' }
        };
        
        const config = statusConfig[status] || { class: 'status-default', icon: '📄' };
        return (
            <span className={`status-badge ${config.class}`}>
                {config.icon} {status}
            </span>
        );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('fr-BE', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-BE');
    };

    if (loading) {
        return (
            <div className="invoice-management">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading invoices...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="invoice-management">
                <div className="error-message">
                    <h3>Error</h3>
                    <p>{error}</p>
                    <button onClick={fetchInvoices} className="retry-button">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="invoice-management">
            <div className="invoice-header">
                <h2>Invoice Management</h2>
                <div className="invoice-stats">
                    <div className="stat-item">
                        <span className="stat-number">{invoices.length}</span>
                        <span className="stat-label">Total Invoices</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">{invoices.filter(i => i.status === 'Contested').length}</span>
                        <span className="stat-label">Contested</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">{invoices.filter(i => i.status === 'Paid').length}</span>
                        <span className="stat-label">Paid</span>
                    </div>
                </div>
            </div>

            <div className="invoice-filters">
                <div className="filter-group">
                    <label>Status:</label>
                    <select 
                        value={filters.status} 
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                    >
                        <option value="all">All Status</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Paid">Paid</option>
                        <option value="Contested">Contested</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>
                
                <div className="filter-group">
                    <label>Patient:</label>
                    <input 
                        type="text" 
                        placeholder="Search by patient name..."
                        value={filters.patient}
                        onChange={(e) => setFilters({...filters, patient: e.target.value})}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                            }
                        }}
                    />
                </div>
                
                <div className="filter-group">
                    <label>Month:</label>
                    <input 
                        type="month" 
                        value={filters.month}
                        onChange={(e) => setFilters({...filters, month: e.target.value})}
                    />
                </div>
            </div>

            <div className="invoice-list">
                {filteredInvoices.length === 0 ? (
                    <div className="no-invoices">
                        <div className="no-invoices-icon">📄</div>
                        <h3>No invoices found</h3>
                        <p>No invoices match your current filters.</p>
                    </div>
                ) : (
                    filteredInvoices.map(invoice => (
                        <div key={invoice.id} className="invoice-card">
                            <div className="invoice-header-row">
                                <div className="invoice-info">
                                    <h3>Invoice #{invoice.id}</h3>
                                    <p className="patient-name">{invoice.patient_name}</p>
                                    <p className="invoice-period">
                                        {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                                    </p>
                                </div>
                                <div className="invoice-actions">
                                    {getStatusBadge(invoice.status)}
                                    <div className="amount">{formatCurrency(invoice.amount)}</div>
                                </div>
                            </div>
                            
                            <div className="invoice-details">
                                <div className="detail-row">
                                    <span className="detail-label">Lines:</span>
                                    <span className="detail-value">{invoice.line_count || 0}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Created:</span>
                                    <span className="detail-value">{formatDate(invoice.created_at)}</span>
                                </div>
                                {invoice.status === 'Contested' && (
                                    <div className="contest-info">
                                        <span className="contest-badge">⚠️ Contested</span>
                                        <p className="contest-reason">{invoice.contest_reason || 'No reason provided'}</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="invoice-actions-row">
                                <button 
                                    onClick={() => setSelectedInvoice(invoice)}
                                    className="action-button view-button"
                                >
                                    👁️ View Details
                                </button>
                                
                                {invoice.status === 'Contested' && (
                                    <>
                                        <button 
                                            onClick={() => handleResolveContest(invoice.id, 'accepted')}
                                            className="action-button accept-button"
                                        >
                                            ✅ Accept Contest
                                        </button>
                                        <button 
                                            onClick={() => handleResolveContest(invoice.id, 'rejected')}
                                            className="action-button reject-button"
                                        >
                                            ❌ Reject Contest
                                        </button>
                                        <button 
                                            onClick={() => {
                                                console.log('🖱️ Regenerate button clicked for contested invoice:', invoice.id);
                                                handleRegenerateInvoice(invoice.id);
                                            }}
                                            disabled={regenerating}
                                            className="action-button regenerate-button"
                                        >
                                            {regenerating ? '🔄 Regenerating...' : '🔄 Regenerate'}
                                        </button>
                                    </>
                                )}
                                
                                {invoice.status !== 'Contested' && invoice.status !== 'Cancelled' && (
                                    <button 
                                        onClick={() => {
                                            console.log('🖱️ Regenerate button clicked for invoice:', invoice.id);
                                            handleRegenerateInvoice(invoice.id);
                                        }}
                                        disabled={regenerating}
                                        className="action-button regenerate-button"
                                    >
                                        {regenerating ? '🔄 Regenerating...' : '🔄 Regenerate'}
                                    </button>
                                )}
                                
                                {invoice.status === 'Cancelled' && !invoice.new_invoice_created_after_contest && (
                                    <button 
                                        onClick={() => {
                                            console.log('🖱️ Create new invoice button clicked for cancelled invoice:', invoice.id);
                                            handleCreateNewInvoice(invoice.id);
                                        }}
                                        className="action-button new-invoice-button"
                                    >
                                        📄 Create New Invoice
                                    </button>
                                )}
                                
                                {invoice.status === 'Cancelled' && invoice.new_invoice_created_after_contest && (
                                    <span className="info-badge">
                                        ✅ New invoice already created
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
                <div className="pagination-controls">
                    <div className="pagination-info">
                        Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} - {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} invoices
                    </div>
                    <div className="pagination-buttons">
                        <button 
                            onClick={() => fetchInvoices(pagination.currentPage - 1)}
                            disabled={pagination.currentPage <= 1}
                            className="pagination-button"
                        >
                            ← Previous
                        </button>
                        
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                                <button 
                                    key={pageNum}
                                    onClick={() => fetchInvoices(pageNum)}
                                    className={`pagination-button ${pageNum === pagination.currentPage ? 'active' : ''}`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        
                        <button 
                            onClick={() => fetchInvoices(pagination.currentPage + 1)}
                            disabled={pagination.currentPage >= pagination.totalPages}
                            className="pagination-button"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}

            {/* Invoice Details Modal */}
            {selectedInvoice && (
                <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Invoice #{selectedInvoice.id} Details</h3>
                            <button 
                                onClick={() => setSelectedInvoice(null)}
                                className="close-button"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="invoice-detail-section">
                                <h4>Invoice Information</h4>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="label">Patient:</span>
                                        <span className="value">{selectedInvoice.patient_name}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Amount:</span>
                                        <span className="value">{formatCurrency(selectedInvoice.amount)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Status:</span>
                                        <span className="value">{getStatusBadge(selectedInvoice.status)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Period:</span>
                                        <span className="value">
                                            {formatDate(selectedInvoice.period_start)} - {formatDate(selectedInvoice.period_end)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {selectedInvoice.lines && selectedInvoice.lines.length > 0 && (
                                <div className="invoice-detail-section">
                                    <h4>Invoice Lines</h4>
                                    <div className="lines-list">
                                        {selectedInvoice.lines.map((line, index) => (
                                            <div key={index} className="line-item">
                                                <div className="line-header">
                                                    <span className="service-name">{line.service_name}</span>
                                                    <span className="line-price">{formatCurrency(line.price)}</span>
                                                </div>
                                                <div className="line-details">
                                                    <span>{formatDate(line.date)} {line.start_time}-{line.end_time}</span>
                                                    {line.provider_name && (
                                                        <span>Provider: {line.provider_name}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {selectedInvoice.status === 'Contested' && selectedInvoice.contest && (
                                <div className="invoice-detail-section">
                                    <h4>Contest Information</h4>
                                    <div className="contest-details">
                                        <p><strong>Reason:</strong> {selectedInvoice.contest.reason}</p>
                                        <p><strong>Contested by:</strong> {selectedInvoice.contest.user_name}</p>
                                        <p><strong>Date:</strong> {formatDate(selectedInvoice.contest.created_at)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                onClick={() => setSelectedInvoice(null)}
                                className="close-modal-button"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceManagement; 