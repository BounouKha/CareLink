import React, { useState, useEffect } from 'react';
import ContractStatusBadge from './ContractStatusBadge';
import { formatRole, getViewableContractFields, canEditContracts } from '../../utils/roleUtils';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import './ProviderDetail.css';

/**
 * ProviderDetail Component
 * Displays detailed provider information with role-based contract access
 */
const ProviderDetail = ({ 
    providerId, 
    onClose, 
    userRole,
    onContractUpdate 
}) => {
    const [provider, setProvider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');    // Use the same authenticated API as the main component
    const { get } = useAuthenticatedApi();
    const { common, providers: providersT } = useCareTranslation();

    const viewableFields = getViewableContractFields({ role: userRole });
    const canEdit = canEditContracts({ role: userRole });

    useEffect(() => {
        fetchProviderDetails();
    }, [providerId]);    const fetchProviderDetails = async () => {
        try {
            setLoading(true);
            console.log(`[ProviderDetail] Fetching details for provider ID: ${providerId}`);
              const data = await get(`http://localhost:8000/account/providers/${providerId}/`);
            console.log(`[ProviderDetail] Provider details received:`, data);
            console.log(`[ProviderDetail] Service data:`, data.service);
            
            setProvider(data);
        } catch (err) {
            console.error('Error fetching provider details:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };    const formatDate = (dateString) => {
        if (!dateString) return providersT('notAvailable');
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };    const formatDateTime = (dateString) => {
        if (!dateString) return providersT('notAvailable');
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getContractsByStatus = () => {
        if (!provider?.contracts) return {};
        
        return provider.contracts.reduce((acc, contract) => {
            const status = contract.status || 'unknown';
            if (!acc[status]) acc[status] = [];
            acc[status].push(contract);
            return acc;
        }, {});
    };

    const renderContractRow = (contract) => (
        <tr key={contract.id} className="contract-row">
            <td>
                <ContractStatusBadge 
                    status={contract.status}
                    complianceStatus={contract.compliance_status}
                    size="small"
                />
            </td>            {viewableFields.includes('contract_type') && (
                <td>{contract.department || providersT('notAvailable')}</td>
            )}
            {viewableFields.includes('weekly_hours') && (
                <td>{contract.weekly_hours ? `${contract.weekly_hours}h` : providersT('notAvailable')}</td>
            )}
            {viewableFields.includes('start_date') && (
                <td>{formatDate(contract.start_date)}</td>
            )}
            {viewableFields.includes('end_date') && (
                <td>{formatDate(contract.end_date)}</td>
            )}
            {canEdit && viewableFields.includes('created_at') && (
                <td>{formatDateTime(contract.created_at)}</td>
            )}
            {canEdit && (
                <td>                    <button 
                        className="btn-small btn-outline"
                        onClick={() => onContractUpdate && onContractUpdate(contract.id)}
                    >
                        Edit
                    </button>
                </td>
            )}
        </tr>
    );    if (loading) {
        return (
            <div className="provider-detail-modal-wrapper">
                <div className="provider-modal-content">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading provider details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="provider-detail-modal-wrapper">
                <div className="provider-modal-content">
                    <div className="error-state">
                        <h3>Error Loading Provider</h3>
                        <p>{error}</p>                        <button className="btn-primary" onClick={onClose}>
                            {common('close')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!provider) {
        return null;
    }

    const contractsByStatus = getContractsByStatus();
    const totalContracts = provider.contracts?.length || 0;
    const activeContracts = contractsByStatus.active?.length || 0;    return (
        <div className="provider-detail-modal-wrapper" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="provider-modal-content">
                {/* Modal Header */}
                <div className="provider-modal-header">                    <div className="provider-title-section">
                        <h2>{provider.user?.full_name || `${provider.user?.firstname} ${provider.user?.lastname}` || provider.user?.email || 'Unknown Provider'}</h2>                        <span className={`provider-status-badge ${provider.user?.is_active ? 'active' : 'inactive'}`}>
                            {provider.user?.is_active ? providersT('activeProvider') : providersT('inactiveProvider')}
                        </span>
                    </div>
                    <button className="provider-modal-close-btn" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>                {/* Tab Navigation */}
                <div className="provider-tab-navigation">
                    <button 
                        className={`provider-tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        {providersT('overview')}
                    </button>
                    <button 
                        className={`provider-tab-button ${activeTab === 'contracts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('contracts')}
                    >
                        {providersT('contracts')} ({totalContracts})
                    </button>
                    {provider.statistics && (
                        <button 
                            className={`provider-tab-button ${activeTab === 'statistics' ? 'active' : ''}`}
                            onClick={() => setActiveTab('statistics')}
                        >
                            {providersT('statistics')}
                        </button>
                    )}
                </div>

                {/* Tab Content */}
                <div className="provider-tab-content">
                    {activeTab === 'overview' && (
                        <div className="provider-overview-tab">
                            {/* Basic Information */}
                            <div className="provider-info-section">                                <h3>{providersT('basicInformation')}</h3>
                                <div className="provider-info-grid">
                                    <div className="provider-info-item">
                                        <label>{providersT('fullName')}:</label>
                                        <span>{provider.user?.firstname} {provider.user?.lastname}</span>
                                    </div>
                                    <div className="provider-info-item">
                                        <label>Email:</label>
                                        <span>{provider.user?.email}</span>
                                    </div>                                    <div className="provider-info-item">
                                        <label>{providersT('service')}:</label>
                                        <span>{provider.service?.description || provider.service?.name || providersT('noServiceAssigned')}</span>
                                    </div>
                                    <div className="provider-info-item">
                                        <label>Status:</label>
                                        <span className={provider.user?.is_active ? 'provider-status-active' : 'provider-status-inactive'}>
                                            {provider.user?.is_active ? providersT('active') : providersT('inactive')}
                                        </span>
                                    </div>                                    <div className="provider-info-item">
                                        <label>{providersT('memberSince')}:</label>
                                        <span>{formatDate(provider.user?.created_at)}</span>
                                    </div>
                                </div>
                            </div>                            {/* Contract Summary */}
                            <div className="provider-info-section">
                                <h3>{providersT('contractSummary')}</h3>
                                <div className="provider-contract-summary-grid">                                    <div className="provider-summary-card">
                                        <div className="provider-summary-number">{totalContracts}</div>
                                        <div className="provider-summary-label">{providersT('totalContracts')}</div>
                                    </div>
                                    <div className="provider-summary-card active">
                                        <div className="provider-summary-number">{activeContracts}</div>
                                        <div className="provider-summary-label">{providersT('activeContracts')}</div>
                                    </div>                                    <div className="provider-summary-card">
                                        <div className="provider-summary-number">{contractsByStatus.expired?.length || 0}</div>
                                        <div className="provider-summary-label">{providersT('expiredContracts')}</div>
                                    </div>
                                    <div className="provider-summary-card">
                                        <div className="provider-summary-number">{provider.statistics?.total_weekly_hours || 0}h</div>
                                        <div className="provider-summary-label">{providersT('totalWeeklyHours')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'contracts' && (
                        <div className="contracts-tab">
                            {totalContracts === 0 ? (
                                <div className="empty-state">
                                    <p>{providersT('noContractsFound')}</p>
                                    {canEdit && (
                                        <button className="btn-primary">
                                            {providersT('createContract')}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="contracts-table-container">
                                    <table className="contracts-table">                                        <thead>                                            <tr>
                                                <th>Status</th>
                                                {viewableFields.includes('contract_type') && <th>{providersT('department')}</th>}
                                                {viewableFields.includes('weekly_hours') && <th>{providersT('weeklyHours')}</th>}
                                                {viewableFields.includes('start_date') && <th>{providersT('startDate')}</th>}
                                                {viewableFields.includes('end_date') && <th>{providersT('endDate')}</th>}
                                                {canEdit && viewableFields.includes('created_at') && <th>{providersT('created')}</th>}
                                                {canEdit && <th>{providersT('actions')}</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {provider.contracts.map(renderContractRow)}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'statistics' && provider.statistics && (
                        <div className="statistics-tab">
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <h4>Contract Statistics</h4>
                                    <div className="stat-items">
                                        <div className="stat-item">
                                            <span className="stat-label">Total Contracts:</span>
                                            <span className="stat-value">{provider.statistics.total_contracts || 0}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Active Contracts:</span>
                                            <span className="stat-value">{provider.statistics.active_contracts || 0}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Expired Contracts:</span>
                                            <span className="stat-value">{provider.statistics.expired_contracts || 0}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="stat-card">
                                    <h4>Hours & Workload</h4>
                                    <div className="stat-items">
                                        <div className="stat-item">
                                            <span className="stat-label">Total Weekly Hours:</span>
                                            <span className="stat-value">{provider.statistics.total_weekly_hours || 0}h</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Average Contract Duration:</span>
                                            <span className="stat-value">{provider.statistics.avg_contract_duration || 0} days</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="modal-footer">                    <button className="btn-secondary" onClick={onClose}>
                        {common('close')}
                    </button>
                    {canEdit && (                        <button className="btn-primary" onClick={() => console.log('Edit provider')}>
                            {providersT('editProvider')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProviderDetail;
