import React, { useState, useEffect } from 'react';
import { getConsentHistory, withdrawConsent } from '../utils/consentManager';
import './ConsentManagement.css';

const ConsentManagement = () => {
    const [consentHistory, setConsentHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);

    useEffect(() => {
        fetchConsentHistory();
    }, []);

    const fetchConsentHistory = async () => {
        try {
            setLoading(true);
            const history = await getConsentHistory();
            
            if (history && history.status === 'success') {
                setConsentHistory(history.consents || []);
            } else {
                setError('Unable to load consent history. You may not be logged in.');
            }
        } catch (err) {
            setError('Failed to load consent history: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdrawConsent = async () => {
        if (!window.confirm('Are you sure you want to withdraw your consent? This will disable all non-essential cookies.')) {
            return;
        }

        try {
            setWithdrawing(true);
            await withdrawConsent('User requested withdrawal via management page');
            
            alert('Consent withdrawn successfully. The page will refresh to apply changes.');
            window.location.reload();
        } catch (err) {
            setError('Failed to withdraw consent: ' + err.message);
        } finally {
            setWithdrawing(false);
        }
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getConsentStatus = (consent) => {
        const now = new Date();
        const expiry = new Date(consent.expiry_date);
        
        if (expiry < now) {
            return { status: 'Expired', class: 'expired' };
        }
        
        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 30) {
            return { status: `Expires in ${daysLeft} days`, class: 'expiring' };
        }
        
        return { status: 'Active', class: 'active' };
    };

    if (loading) {
        return (
            <div className="consent-management">
                <h2>Loading consent history...</h2>
            </div>
        );
    }

    return (
        <div className="consent-management">
            <div className="consent-header">
                <h2>🍪 Cookie Consent Management</h2>
                <p>Manage your cookie preferences and view your consent history for GDPR compliance.</p>
            </div>

            {error && (
                <div className="error-message">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div className="consent-actions">
                <button 
                    onClick={handleWithdrawConsent}
                    disabled={withdrawing}
                    className="withdraw-button"
                >
                    {withdrawing ? 'Withdrawing...' : 'Withdraw All Consent'}
                </button>
                
                <button 
                    onClick={() => window.location.href = '/privacy-policy'}
                    className="policy-button"
                >
                    View Privacy Policy
                </button>
            </div>

            <div className="consent-history">
                <h3>Your Consent History</h3>
                
                {consentHistory.length === 0 ? (
                    <div className="no-history">
                        <p>No consent history found. This could mean:</p>
                        <ul>
                            <li>You haven't provided consent yet</li>
                            <li>You're not logged in</li>
                            <li>Your consent was provided while not logged in</li>
                        </ul>
                    </div>
                ) : (
                    <div className="history-list">
                        {consentHistory.map((consent, index) => {
                            const statusInfo = getConsentStatus(consent);
                            
                            return (
                                <div key={consent.id || index} className="consent-record">
                                    <div className="consent-record-header">
                                        <span className="consent-date">
                                            {formatDateTime(consent.consent_timestamp)}
                                        </span>
                                        <span className={`consent-status ${statusInfo.class}`}>
                                            {statusInfo.status}
                                        </span>
                                    </div>
                                    
                                    <div className="consent-details">
                                        <div className="consent-version">
                                            Version: {consent.consent_version}
                                        </div>
                                        
                                        <div className="consent-choices">
                                            <div className="choice-item">
                                                <span className="choice-name">Essential Cookies:</span>
                                                <span className="choice-value granted">✅ Always Granted</span>
                                            </div>
                                            <div className="choice-item">
                                                <span className="choice-name">Analytics Cookies:</span>
                                                <span className={`choice-value ${consent.analytics_cookies === 'granted' ? 'granted' : 'denied'}`}>
                                                    {consent.analytics_cookies === 'granted' ? '✅ Granted' : '❌ Denied'}
                                                </span>
                                            </div>
                                            <div className="choice-item">
                                                <span className="choice-name">Marketing Cookies:</span>
                                                <span className={`choice-value ${consent.marketing_cookies === 'granted' ? 'granted' : 'denied'}`}>
                                                    {consent.marketing_cookies === 'granted' ? '✅ Granted' : '❌ Denied'}
                                                </span>
                                            </div>
                                            <div className="choice-item">
                                                <span className="choice-name">Functional Cookies:</span>
                                                <span className={`choice-value ${consent.functional_cookies === 'granted' ? 'granted' : 'denied'}`}>
                                                    {consent.functional_cookies === 'granted' ? '✅ Granted' : '❌ Denied'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="consent-metadata">
                                            <small>
                                                Method: {consent.consent_method} | 
                                                Expires: {formatDateTime(consent.expiry_date)}
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="consent-info">
                <h4>Important Information</h4>
                <ul>
                    <li><strong>Essential cookies</strong> are always active as they're required for healthcare functionality</li>
                    <li><strong>Consent expires</strong> after 365 days as required by GDPR</li>
                    <li><strong>Your consent history</strong> is stored for compliance and audit purposes</li>
                    <li><strong>You can withdraw consent</strong> at any time using the button above</li>
                    <li><strong>IP addresses are never stored</strong> to protect your privacy</li>
                </ul>
            </div>
        </div>
    );
};

export default ConsentManagement;
