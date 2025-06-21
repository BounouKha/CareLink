import React, { useState, useEffect } from 'react';
import consentManager from '../utils/consentManager';
import BaseLayout from '../auth/layout/BaseLayout';
import './CookieConsent.css';

const CookiePreferences = () => {
    const [consent, setConsent] = useState(null);
    const [preferences, setPreferences] = useState({
        analytics: false,
        preferences: false,
        marketing: false
    });
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const currentConsent = consentManager.getConsent();
        setConsent(currentConsent);
        
        if (currentConsent) {
            setPreferences(currentConsent.preferences);
        }
    }, []);

    const handlePreferenceChange = (category, value) => {
        setPreferences(prev => ({
            ...prev,
            [category]: value
        }));
    };

    const handleSave = () => {
        consentManager.setConsent(preferences);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        
        // Refresh consent data
        const updatedConsent = consentManager.getConsent();
        setConsent(updatedConsent);
    };

    const handleRevokeAll = () => {
        if (window.confirm('Are you sure you want to revoke all non-essential cookies? This will reset your preferences.')) {
            const essentialOnly = {
                analytics: false,
                preferences: false,
                marketing: false
            };
            consentManager.setConsent(essentialOnly);
            setPreferences(essentialOnly);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }
    };

    const categories = consentManager.getConsentCategories();

    return (
        <BaseLayout>
            <div className="container mt-4">
                <div className="row justify-content-center">
                    <div className="col-lg-8">
                        <div className="card shadow-sm">
                            <div className="card-header bg-primary text-white">
                                <h3 className="mb-0">
                                    <i className="fas fa-cookie-bite me-2"></i>
                                    Cookie & Privacy Preferences
                                </h3>
                            </div>
                            
                            <div className="card-body">
                                {showSuccess && (
                                    <div className="alert alert-success">
                                        <i className="fas fa-check-circle me-2"></i>
                                        Your cookie preferences have been updated successfully!
                                    </div>
                                )}

                                {/* Current Status */}
                                {consent && (
                                    <div className="alert alert-info">
                                        <h5 className="alert-heading">Current Status</h5>
                                        <p><strong>Consent Given:</strong> {new Date(consent.timestamp).toLocaleString()}</p>
                                        <p><strong>Valid Until:</strong> {new Date(consent.expiryDate).toLocaleDateString()}</p>
                                        <p className="mb-0"><strong>Version:</strong> {consent.version}</p>
                                    </div>
                                )}

                                {/* Cookie Categories */}
                                <div className="mb-4">
                                    <h5 className="mb-3">Cookie Categories</h5>
                                    
                                    {Object.entries(categories).map(([key, category]) => (
                                        <div key={key} className="cookie-category mb-3">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <label className="form-check-label d-flex align-items-center">
                                                    <input
                                                        className="form-check-input me-3"
                                                        type="checkbox"
                                                        checked={key === 'essential' ? true : preferences[key]}
                                                        disabled={key === 'essential'}
                                                        onChange={(e) => handlePreferenceChange(key, e.target.checked)}
                                                    />
                                                    <div>
                                                        <strong>{category.name}</strong>
                                                        {category.required && (
                                                            <span className="badge bg-danger ms-2">Required</span>
                                                        )}
                                                    </div>
                                                </label>
                                            </div>
                                            
                                            <p className="text-muted mb-2">{category.description}</p>
                                            
                                            <div className="small text-secondary">
                                                <strong>Examples:</strong> {category.examples.join(', ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Action Buttons */}
                                <div className="d-flex gap-2 flex-wrap">
                                    <button 
                                        className="btn btn-primary"
                                        onClick={handleSave}
                                    >
                                        <i className="fas fa-save me-2"></i>
                                        Save Preferences
                                    </button>
                                    
                                    <button 
                                        className="btn btn-warning"
                                        onClick={handleRevokeAll}
                                    >
                                        <i className="fas fa-ban me-2"></i>
                                        Revoke All Non-Essential
                                    </button>
                                </div>

                                {/* GDPR Information */}
                                <div className="mt-4 pt-4 border-top">
                                    <h6 className="text-muted">Your Privacy Rights</h6>
                                    <ul className="list-unstyled small text-muted">
                                        <li><i className="fas fa-check text-success me-2"></i>Right to access your data</li>
                                        <li><i className="fas fa-check text-success me-2"></i>Right to rectify incorrect data</li>
                                        <li><i className="fas fa-check text-success me-2"></i>Right to erasure ("right to be forgotten")</li>
                                        <li><i className="fas fa-check text-success me-2"></i>Right to data portability</li>
                                        <li><i className="fas fa-check text-success me-2"></i>Right to withdraw consent</li>
                                    </ul>
                                    
                                    <p className="small text-muted mb-0">
                                        For any privacy-related questions or to exercise your rights, 
                                        please contact our Data Protection Officer at privacy@carelink.healthcare
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </BaseLayout>
    );
};

export default CookiePreferences;
