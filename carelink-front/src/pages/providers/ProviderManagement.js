import React, { useState, useEffect, useCallback } from 'react';
import BaseLayout from '../../auth/layout/BaseLayout';
import ProviderCard from './ProviderCard';
import ProviderDetail from './ProviderDetail';
import { 
    canAccessProviderManagement, 
    getProviderManagementPermission, 
    canCreateProviders,
    PERMISSIONS 
} from '../../utils/roleUtils';
import { useAuthenticatedApi } from '../../hooks/useAuth';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import tokenManager from '../../utils/tokenManager';
import './ProviderManagement.css';

/**
 * ProviderManagement Component
 * Main page for managing providers with role-based access control
 */
const ProviderManagement = () => {
    const [providers, setProviders] = useState([]);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [contractFilter, setContractFilter] = useState('all');
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [statistics, setStatistics] = useState(null);

    // Use modern authentication API and translations
    const { get } = useAuthenticatedApi();
    const { common, providers: providersT } = useCareTranslation();    // Get user role and permissions from fetched userData
    const userRole = userData?.user?.role;
    const permission = userRole ? getProviderManagementPermission(userRole) : null;
    const canCreate = userRole ? canCreateProviders(userRole) : false;
    const isReadOnly = permission === PERMISSIONS.READ_ONLY;

    // Debug logging    console.log('ProviderManagement: userRole:', userRole);
    console.log('ProviderManagement: permission:', permission);
    console.log('ProviderManagement: canAccessProviderManagement:', userRole ? canAccessProviderManagement(userRole) : false);

    // Define fetch functions first
    const fetchProviders = useCallback(async () => {
        try {
            setLoading(true);
            const data = await get('http://localhost:8000/account/providers/');            console.log('ProviderManagement: Raw API response:', data);
            console.log('ProviderManagement: Response type:', typeof data);
            console.log('ProviderManagement: Is array:', Array.isArray(data));
            console.log('ProviderManagement: Response keys:', Object.keys(data || {}));
            console.log('ProviderManagement: data.providers exists:', !!data?.providers);
            console.log('ProviderManagement: data.providers length:', data?.providers?.length);
              const processedProviders = Array.isArray(data) ? data : data.providers || [];
            console.log('ProviderManagement: Processed providers:', processedProviders);
            console.log('ProviderManagement: Providers count:', processedProviders.length);
            
            setProviders(processedProviders);
        } catch (err) {
            console.error('ProviderManagement: Error fetching providers:', err);
            setError('Failed to load providers');
        } finally {
            setLoading(false);
        }
    }, [get]);    const fetchStatistics = useCallback(async () => {
        try {
            const data = await get('http://localhost:8000/account/providers/stats/');
            console.log('ProviderManagement: Statistics data:', data);
            setStatistics(data);
        } catch (err) {
            console.error('ProviderManagement: Error fetching statistics:', err);
            // Don't set error for statistics - it's not critical
        }
    }, [get]);

    // Fetch user data on component mount
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                if (!tokenManager.isAuthenticated()) {
                    window.location.href = '/login';
                    return;
                }

                const profileData = await get('http://localhost:8000/account/profile/');
                setUserData(profileData);
                console.log('ProviderManagement: User data loaded:', profileData);
            } catch (err) {
                console.error('ProviderManagement: Error fetching user profile:', err);
                if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                    tokenManager.handleLogout();
                    window.location.href = '/login';
                } else {
                    setError('Failed to load user profile');
                }
            }
        };

        fetchUserData();
    }, [get]);

    // Fetch providers when userData is available and user has access
    useEffect(() => {
        if (userData && userRole && canAccessProviderManagement(userRole)) {
            fetchProviders();
        } else if (userData && userRole && !canAccessProviderManagement(userRole)) {
            setError('Access denied. You do not have permission to view provider management.');
            setLoading(false);
        }
    }, [userData, userRole, fetchProviders]);

    // Fetch statistics when user has access
    useEffect(() => {
        if (userData && userRole && canAccessProviderManagement(userRole)) {
            fetchStatistics();
        }
    }, [userData, userRole, fetchStatistics]);

    // Handler functions
    const handleProviderClick = (provider) => {
        setSelectedProvider(provider.id);
    };

    const handleCloseDetail = () => {
        setSelectedProvider(null);
    };

    const handleContractUpdate = (contractId) => {
        console.log('Update contract:', contractId);
        // TODO: Implement contract editing
    };

    const getStatsSummary = () => {
        if (!statistics) return null;
        
        return {
            total: statistics.total_providers || 0,
            active: statistics.active_contracts || 0,
            withContracts: statistics.providers_with_contracts || 0,
            totalContracts: 0,
            activeContracts: statistics.active_contracts || 0,
            totalWeeklyHours: 0
        };
    };    // Filter providers based on search and filters
    const filteredProviders = providers.filter(provider => {
        const matchesSearch = !searchTerm || 
            `${provider.user?.firstname} ${provider.user?.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            provider.user?.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || 
            (statusFilter === 'active' && provider.user?.is_active) ||
            (statusFilter === 'inactive' && !provider.user?.is_active);        const matchesContract = contractFilter === 'all' ||
            (contractFilter === 'with_contracts' && provider.contracts_count > 0) ||
            (contractFilter === 'without_contracts' && (!provider.contracts_count || provider.contracts_count === 0)) ||
            (contractFilter === 'active_contracts' && provider.active_contract_status === 'active') ||
            (contractFilter === 'expired_contracts' && provider.active_contract_status === 'inactive');        return matchesSearch && matchesStatus && matchesContract;
    });    // Debug logging for filtering - can be removed in production
    if (providers.length > 0) {
        console.log('ProviderManagement: Filter Debug:', {
            totalProviders: providers.length,
            filteredProviders: filteredProviders.length,
            searchTerm,
            statusFilter,
            contractFilter,
            sampleProvider: providers[0] // Show structure of first provider
        });
    }

    const stats = getStatsSummary();// Show loading while user data or providers are loading
    if (loading || !userData) {
        return (
            <BaseLayout>
                <div className="provider-mgmt-container">                    <div className="provider-mgmt-loading-state">
                        <div className="provider-mgmt-spinner"></div>
                        <p>{!userData ? common('loading') + '...' : 'Loading providers...'}</p>
                    </div>
                </div>
            </BaseLayout>
        );
    }

    // Check access permissions after userData is loaded
    if (userData && userRole && !canAccessProviderManagement(userRole)) {
        return (
            <BaseLayout>
                <div className="provider-mgmt-container">                    <div className="provider-mgmt-error-state">
                        <h2>{common('accessDenied')}</h2>
                        <p>You do not have permission to view provider management.</p>
                        <p>{common('role')}: {userRole}</p>
                    </div>
                </div>
            </BaseLayout>
        );
    }

    // Show error state
    if (error) {
        return (
            <BaseLayout>
                <div className="provider-mgmt-container">                    <div className="provider-mgmt-error-state">
                        <h2>{common('error')}</h2>
                        <p>{error}</p>
                        <button className="provider-mgmt-btn-primary" onClick={fetchProviders}>
                            {common('retry')}
                        </button>
                    </div>
                </div>
            </BaseLayout>
        );
    }

    // Main provider management content
    return (
        <BaseLayout>
            <div className="provider-mgmt-container">
                {/* Header */}
                <div className="provider-mgmt-page-header">
                    <div className="provider-mgmt-header-content">
                        <h1>{providersT('title')}</h1>
                        <p className="provider-mgmt-header-subtitle">
                            {isReadOnly ? providersT('subtitleReadOnly') : providersT('subtitle')}
                        </p>
                        {userRole && (
                            <div className="provider-mgmt-role-indicator">
                                <small>{common('role')}: {userRole} | Access: {permission}</small>
                            </div>
                        )}
                    </div>
                </div>

                {/* Statistics */}
                {stats && (
                    <div className="provider-mgmt-statistics-section">
                        <div className="provider-mgmt-stats-grid">
                            <div className="provider-mgmt-stat-card">
                                <div className="provider-mgmt-stat-number">{stats.total}</div>
                                <div className="provider-mgmt-stat-label">{providersT('totalProviders')}</div>
                            </div>
                            <div className="provider-mgmt-stat-card provider-mgmt-stat-card-active">
                                <div className="provider-mgmt-stat-number">{stats.active}</div>
                                <div className="provider-mgmt-stat-label">{providersT('activeProviders')}</div>
                            </div>
                            <div className="provider-mgmt-stat-card">
                                <div className="provider-mgmt-stat-number">{stats.withContracts}</div>
                                <div className="provider-mgmt-stat-label">{providersT('withContracts')}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search and Filters */}
                <div className="provider-mgmt-filters-section">                    <div className="provider-mgmt-search-container">
                        <input
                            type="text"
                            placeholder={providersT('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="provider-mgmt-search-input"
                        />
                    </div>
                    
                    <div className="provider-mgmt-filter-container">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="provider-mgmt-filter-select"
                        >
                            <option value="all">{providersT('allStatus')}</option>
                            <option value="active">{providersT('active')}</option>
                            <option value="inactive">{providersT('inactive')}</option>
                        </select>
                          <select
                            value={contractFilter}
                            onChange={(e) => setContractFilter(e.target.value)}
                            className="provider-mgmt-filter-select"
                        >
                            <option value="all">{providersT('allProviders')}</option>
                            <option value="with_contracts">{providersT('withContractsFilter')}</option>
                            <option value="without_contracts">{providersT('withoutContracts')}</option>
                            <option value="active_contracts">{providersT('withActiveContracts')}</option>
                            <option value="expired_contracts">{providersT('withExpiredContracts')}</option>
                        </select>
                    </div>
                </div>                {/* Results Summary */}
                <div className="provider-mgmt-results-summary">                    <p>
                        Showing {filteredProviders.length} of {providers.length} providers
                        {searchTerm && ` matching "${searchTerm}"`}
                    </p>
                </div>

                {/* Providers List */}
                <div className="provider-mgmt-providers-section">
                    {filteredProviders.length === 0 ? (
                        <div className="provider-mgmt-empty-state">
                            <h3>{providersT('noProvidersFound')}</h3>
                            <p>
                                {searchTerm || statusFilter !== 'all' || contractFilter !== 'all'
                                    ? providersT('noProvidersFoundDescription')
                                    : providersT('noProvidersYet')
                                }
                            </p>
                            {canCreate && !searchTerm && statusFilter === 'all' && contractFilter === 'all' && (
                                <button className="provider-mgmt-btn-primary">
                                    {providersT('addFirstProvider')}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="provider-mgmt-providers-grid">
                            {filteredProviders.map(provider => (
                                <ProviderCard
                                    key={provider.id}
                                    provider={provider}
                                    onClick={() => handleProviderClick(provider)}
                                    userRole={userRole}
                                    showFullDetails={false}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Provider Detail Modal */}
                {selectedProvider && (
                    <ProviderDetail
                        providerId={selectedProvider}
                        onClose={handleCloseDetail}
                        userRole={userRole}                        onContractUpdate={handleContractUpdate}
                    />
                )}
            </div>
        </BaseLayout>
    );
};

export default ProviderManagement;