import React from 'react';
import ContractStatusBadge from './ContractStatusBadge';
import { formatRole, getViewableContractFields } from '../../utils/roleUtils';
import { useCareTranslation } from '../../hooks/useCareTranslation';
import './ProviderCard.css';

/**
 * ProviderCard Component
 * Displays provider information in a card format with role-based contract details
 */
const ProviderCard = ({ 
    provider, 
    onClick, 
    userRole,
    showFullDetails = false 
}) => {
    const viewableFields = getViewableContractFields({ role: userRole });
    const { providers: providersT } = useCareTranslation();      // Get active contract information from API response
    const activeContract = provider.active_contract_status === 'active' ? {
        status: 'active',
        start_date: provider.active_contract_start_date,
        end_date: provider.active_contract_end_date,
        // Add other contract fields as needed
    } : null;
      // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return providersT('notAvailable');
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };// Calculate contract status summary based on API response format
    const getContractSummary = () => {
        const contractsCount = provider.contracts_count || 0;
        const contractStatus = provider.active_contract_status || 'no_contract';
        
        if (contractsCount === 0) {
            return { count: 0, active: 0, status: providersT('noContracts') };
        }
        
        let status = providersT('noActiveContracts');
        let active = 0;
        
        if (contractStatus === 'active') {
            active = 1;
            status = providersT('oneActive');
        } else if (contractStatus === 'pending') {
            status = providersT('pendingActivation');
        } else if (contractStatus === 'inactive') {
            status = providersT('inactiveContracts');
        }
        
        return {
            count: contractsCount,
            active: active,
            status: status
        };
    };

    const contractSummary = getContractSummary();    return (
        <div 
            className={`provider-card-component ${onClick ? 'provider-card-clickable' : ''}`}
            onClick={onClick}
            role={onClick ? 'button' : 'article'}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            } : undefined}
        >
            {/* Provider Header */}
            <div className="provider-card-header">
                <div className="provider-card-info">                    <h3 className="provider-card-name">
                        {provider.user?.full_name || 
                         (provider.user?.firstname && provider.user?.lastname 
                            ? `${provider.user.firstname} ${provider.user.lastname}`.trim()
                            : provider.user?.email || 'No Name')
                        }
                    </h3>
                    <p className="provider-card-email">
                        {provider.user?.email}
                    </p>                    <p className="provider-card-role">
                        {provider.active_contract_department || providersT('noDepartment')}
                    </p>
                    {provider.active_contract_start_date && (
                        <p className="provider-card-member-since">
                            {providersT('memberSince')}: {formatDate(provider.active_contract_start_date)}
                        </p>
                    )}
                </div>
                  {/* Provider Status */}                <div className="provider-card-status">
                    <span className={`provider-card-status-indicator ${provider.user?.is_active ? 'provider-card-active' : 'provider-card-inactive'}`}>
                        {provider.user?.is_active ? providersT('active') : providersT('inactive')}
                    </span>
                </div>
            </div>            {/* Contract Summary */}
            <div className="provider-card-contract-summary">
                <div className="provider-card-summary-item">
                    <span className="provider-card-summary-label">{providersT('contracts')}:</span>
                    <span className="provider-card-summary-value">{contractSummary.count}</span>
                </div>
                <div className="provider-card-summary-item">
                    <span className="provider-card-summary-label">{providersT('status')}:</span>
                    <span className={`provider-card-summary-value ${contractSummary.active > 0 ? 'provider-card-positive' : 'provider-card-neutral'}`}>
                        {contractSummary.status}
                    </span>
                </div>
            </div>            {/* Active Contract Details */}
            {activeContract && viewableFields.length > 0 && (
                <div className="provider-card-active-contract">
                    <div className="provider-card-contract-header">
                        <h4>{providersT('activeContract')}</h4>
                        <ContractStatusBadge 
                            status={activeContract.status}
                            complianceStatus={activeContract.compliance_status}
                            size="small"
                        />
                    </div>
                      <div className="provider-card-contract-details">                        {viewableFields.includes('contract_type') && activeContract.type_contract && (
                            <div className="provider-card-detail-item">
                                <span className="provider-card-detail-label">{providersT('contractType')}:</span>
                                <span className="provider-card-detail-value">{activeContract.type_contract}</span>
                            </div>
                        )}
                        
                        {viewableFields.includes('service_type') && activeContract.service_type && (
                            <div className="provider-card-detail-item">
                                <span className="provider-card-detail-label">{providersT('service')}:</span>
                                <span className="provider-card-detail-value">{activeContract.service_type}</span>
                            </div>
                        )}
                        
                        {viewableFields.includes('weekly_hours') && activeContract.weekly_hours && (
                            <div className="provider-card-detail-item">
                                <span className="provider-card-detail-label">{providersT('weeklyHours')}:</span>
                                <span className="provider-card-detail-value">{activeContract.weekly_hours}h</span>
                            </div>
                        )}
                          {(viewableFields.includes('start_date') || viewableFields.includes('end_date')) && (
                            <div className="provider-card-detail-item">
                                <span className="provider-card-detail-label">{providersT('period')}:</span>
                                <span className="provider-card-detail-value">
                                    {formatDate(activeContract.start_date)} - {formatDate(activeContract.end_date)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}            {/* Provider Statistics */}
            {provider.statistics && (
                <div className="provider-card-provider-stats">
                    <div className="provider-card-stat-item">
                        <span className="provider-card-stat-value">{provider.statistics.total_contracts || 0}</span>
                        <span className="provider-card-stat-label">{providersT('totalContracts')}</span>
                    </div>
                    <div className="provider-card-stat-item">
                        <span className="provider-card-stat-value">{provider.statistics.active_contracts || 0}</span>
                        <span className="provider-card-stat-label">{providersT('active')}</span>
                    </div>
                    <div className="provider-card-stat-item">
                        <span className="provider-card-stat-value">{provider.statistics.total_weekly_hours || 0}h</span>
                        <span className="provider-card-stat-label">{providersT('totalWeeklyHours')}</span>
                    </div>
                </div>
            )}            {/* Action Indicator */}
            {onClick && (
                <div className="provider-card-action-indicator">
                    <span>{providersT('viewDetails')} →</span>
                </div>
            )}
        </div>
    );
};

export default ProviderCard;
