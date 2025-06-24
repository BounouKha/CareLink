import React from 'react';
import { useTranslation } from 'react-i18next';
import './ProviderStats.css';

const ProviderStats = ({ stats }) => {
    const { t } = useTranslation();

    if (!stats) return null;

    const formatNumber = (num) => {
        return new Intl.NumberFormat().format(num);
    };

    const getPercentage = (value, total) => {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    };

    return (
        <div className="provider-stats">
            <div className="stats-header">
                <h3>{t('providers.stats.title')}</h3>
            </div>

            <div className="stats-grid">
                {/* Provider Overview */}
                <div className="stat-card provider-overview">
                    <h4>{t('providers.stats.providers')}</h4>
                    <div className="stat-items">
                        <div className="stat-item">
                            <span className="stat-number">{formatNumber(stats.providers.total)}</span>
                            <span className="stat-label">{t('providers.stats.total')}</span>
                        </div>
                        <div className="stat-breakdown">
                            <div className="breakdown-item">
                                <span className="breakdown-number">{formatNumber(stats.providers.internal)}</span>
                                <span className="breakdown-label">{t('providers.stats.internal')}</span>
                                <span className="breakdown-percentage">
                                    ({getPercentage(stats.providers.internal, stats.providers.total)}%)
                                </span>
                            </div>
                            <div className="breakdown-item">
                                <span className="breakdown-number">{formatNumber(stats.providers.external)}</span>
                                <span className="breakdown-label">{t('providers.stats.external')}</span>
                                <span className="breakdown-percentage">
                                    ({getPercentage(stats.providers.external, stats.providers.total)}%)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contract Overview */}
                <div className="stat-card contract-overview">
                    <h4>{t('providers.stats.contracts')}</h4>
                    <div className="stat-items">
                        <div className="stat-item">
                            <span className="stat-number">{formatNumber(stats.contracts.total)}</span>
                            <span className="stat-label">{t('contracts.total')}</span>
                        </div>
                        <div className="stat-item active">
                            <span className="stat-number">{formatNumber(stats.contracts.active)}</span>
                            <span className="stat-label">{t('contracts.active')}</span>
                        </div>
                        {stats.contracts.expiring_soon > 0 && (
                            <div className="stat-item warning">
                                <span className="stat-number">{formatNumber(stats.contracts.expiring_soon)}</span>
                                <span className="stat-label">{t('contracts.expiring_soon')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contract Status Breakdown */}
                <div className="stat-card contract-status">
                    <h4>{t('contracts.status_breakdown')}</h4>
                    <div className="status-chart">
                        {stats.contract_statuses.map(status => (
                            <div key={status.status} className="status-item">
                                <div className="status-bar">
                                    <div 
                                        className={`status-fill status-${status.status}`}
                                        style={{ 
                                            width: `${getPercentage(status.count, stats.contracts.total)}%` 
                                        }}
                                    ></div>
                                </div>
                                <div className="status-info">
                                    <span className="status-label">
                                        {t(`contracts.status.${status.status}`)}
                                    </span>
                                    <span className="status-count">
                                        {formatNumber(status.count)} 
                                        ({getPercentage(status.count, stats.contracts.total)}%)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contract Types */}
                <div className="stat-card contract-types">
                    <h4>{t('contracts.type_breakdown')}</h4>
                    <div className="type-list">
                        {stats.contract_types.map(type => (
                            <div key={type.type_contract} className="type-item">
                                <span className="type-name">{type.type_contract}</span>
                                <span className="type-count">
                                    {formatNumber(type.count)}
                                    <span className="type-percentage">
                                        ({getPercentage(type.count, stats.contracts.total)}%)
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Providers by Service */}
                {stats.providers_by_service.length > 0 && (
                    <div className="stat-card providers-by-service">
                        <h4>{t('providers.stats.by_service')}</h4>
                        <div className="service-list">
                            {stats.providers_by_service.slice(0, 5).map(service => (
                                <div key={service.service__name} className="service-item">
                                    <span className="service-name">{service.service__name}</span>
                                    <span className="service-count">
                                        {formatNumber(service.count)}
                                        <span className="service-percentage">
                                            ({getPercentage(service.count, stats.providers.total)}%)
                                        </span>
                                    </span>
                                </div>
                            ))}
                            {stats.providers_by_service.length > 5 && (
                                <div className="service-item more">
                                    <span className="service-name">
                                        {t('providers.stats.and_more', { 
                                            count: stats.providers_by_service.length - 5 
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProviderStats;
