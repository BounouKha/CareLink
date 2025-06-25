import React from 'react';
import './ContractStatusBadge.css';

/**
 * ContractStatusBadge Component
 * Displays color-coded status badges for contracts
 */
const ContractStatusBadge = ({ 
    status, 
    complianceStatus = null, 
    size = 'medium',
    showText = true 
}) => {
    // Define status configurations
    const statusConfig = {
        'active': {
            color: '#28a745',
            backgroundColor: '#d4edda',
            borderColor: '#c3e6cb',
            text: 'Active',
            icon: '✓'
        },
        'inactive': {
            color: '#6c757d',
            backgroundColor: '#f8f9fa',
            borderColor: '#dee2e6',
            text: 'Inactive',
            icon: '○'
        },
        'expired': {
            color: '#dc3545',
            backgroundColor: '#f8d7da',
            borderColor: '#f5c6cb',
            text: 'Expired',
            icon: '✕'
        },
        'pending': {
            color: '#ffc107',
            backgroundColor: '#fff3cd',
            borderColor: '#ffeaa7',
            text: 'Pending',
            icon: '⏳'
        },
        'suspended': {
            color: '#fd7e14',
            backgroundColor: '#fdebd0',
            borderColor: '#fdd8a5',
            text: 'Suspended',
            icon: '⏸'
        }
    };

    // Compliance status overlay
    const complianceConfig = {
        'compliant': {
            color: '#28a745',
            text: 'Compliant',
            icon: '✓'
        },
        'non_compliant': {
            color: '#dc3545',
            text: 'Non-Compliant',
            icon: '⚠'
        },
        'warning': {
            color: '#ffc107',
            text: 'Warning',
            icon: '⚠'
        }
    };

    const config = statusConfig[status?.toLowerCase()] || statusConfig['inactive'];
    const complianceInfo = complianceStatus ? complianceConfig[complianceStatus.toLowerCase()] : null;

    // Size classes
    const sizeClass = {
        'small': 'badge-small',
        'medium': 'badge-medium',
        'large': 'badge-large'
    }[size] || 'badge-medium';

    const badgeStyle = {
        color: config.color,
        backgroundColor: config.backgroundColor,
        borderColor: config.borderColor,
    };

    return (
        <div className={`contract-status-badge ${sizeClass}`}>
            <span 
                className="status-badge"
                style={badgeStyle}
                title={`Status: ${config.text}${complianceInfo ? ` | Compliance: ${complianceInfo.text}` : ''}`}
            >
                <span className="status-icon">{config.icon}</span>
                {showText && <span className="status-text">{config.text}</span>}
                {complianceInfo && (
                    <span 
                        className="compliance-indicator"
                        style={{ color: complianceInfo.color }}
                        title={`Compliance: ${complianceInfo.text}`}
                    >
                        {complianceInfo.icon}
                    </span>
                )}
            </span>
        </div>
    );
};

export default ContractStatusBadge;
