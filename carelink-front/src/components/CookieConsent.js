import React, { useState, useEffect } from 'react';
import consentManager from '../utils/consentManager';
import './CookieConsent.css';

const CookieConsent = () => {
    const [showBanner, setShowBanner] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [preferences, setPreferences] = useState({
        analytics: false,
        preferences: true, // Default to true for better UX
        marketing: false
    });    useEffect(() => {
        // Check consent status
        const checkConsent = async () => {
            try {
                const hasValidConsent = await consentManager.hasValidConsent();
                console.log('🍪 Cookie consent check result:', hasValidConsent);
                
                if (!hasValidConsent) {
                    // Small delay to let page load first
                    setTimeout(() => setShowBanner(true), 1000);
                }
            } catch (error) {
                console.error('🍪 Error checking consent status:', error);
                // On error, assume no consent to be safe
                setTimeout(() => setShowBanner(true), 1000);
            }
        };
        
        checkConsent();
    }, []);

    const handleAcceptAll = () => {
        const allConsent = {
            analytics: true,
            preferences: true,
            marketing: true
        };
        
        consentManager.setConsent(allConsent);
        setShowBanner(false);
        
        // Trigger page reload to apply new cookie settings
        setTimeout(() => window.location.reload(), 500);
    };

    const handleAcceptEssential = () => {
        const essentialOnly = {
            analytics: false,
            preferences: false,
            marketing: false
        };
        
        consentManager.setConsent(essentialOnly);
        setShowBanner(false);
    };

    const handleCustomize = () => {
        consentManager.setConsent(preferences);
        setShowBanner(false);
        
        // Reload if analytics or preferences were enabled
        if (preferences.analytics || preferences.preferences) {
            setTimeout(() => window.location.reload(), 500);
        }
    };

    const handlePreferenceChange = (category, value) => {
        setPreferences(prev => ({
            ...prev,
            [category]: value
        }));
    };

    if (!showBanner) return null;

    const categories = consentManager.getConsentCategories();

    return (
        <div className="cookie-consent-overlay">
            <div className="cookie-consent-banner">
                {/* Header */}
                <div className="cookie-consent-header">
                    <div className="cookie-icon">🍪</div>
                    <h3>Cookie & Privacy Settings</h3>
                    <div className="healthcare-badge">
                        <i className="fas fa-shield-alt"></i>
                        Healthcare Compliant
                    </div>
                </div>

                {/* Main Content */}
                <div className="cookie-consent-content">
                    <p className="cookie-consent-description">
                        CareLink uses cookies to provide secure healthcare services and improve your experience. 
                        We respect your privacy and comply with GDPR regulations.
                    </p>

                    {/* Essential Notice */}
                    <div className="essential-notice">
                        <div className="essential-icon">⚕️</div>
                        <div>
                            <strong>Essential cookies are required</strong> for healthcare functionality, 
                            patient safety, and security compliance.
                        </div>
                    </div>

                    {/* Cookie Categories */}
                    {!showDetails ? (
                        <div className="cookie-summary">
                            <p>We use cookies for:</p>
                            <ul>
                                <li><strong>Healthcare Services</strong> - Essential for patient care</li>
                                <li><strong>Security</strong> - Protect your medical data</li>
                                <li><strong>Analytics</strong> - Improve our services (optional)</li>
                                <li><strong>Preferences</strong> - Remember your settings (optional)</li>
                            </ul>
                        </div>
                    ) : (
                        <div className="cookie-details">
                            {Object.entries(categories).map(([key, category]) => (
                                <div key={key} className="cookie-category">
                                    <div className="category-header">
                                        <div className="category-info">
                                            <label className="category-label">
                                                <input
                                                    type="checkbox"
                                                    checked={key === 'essential' ? true : preferences[key]}
                                                    disabled={key === 'essential'}
                                                    onChange={(e) => handlePreferenceChange(key, e.target.checked)}
                                                />
                                                <strong>{category.name}</strong>
                                                {category.required && <span className="required-badge">Required</span>}
                                            </label>
                                        </div>
                                    </div>
                                    <p className="category-description">{category.description}</p>
                                    <div className="category-examples">
                                        Examples: {category.examples.join(', ')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="cookie-consent-actions">
                    <div className="primary-actions">
                        <button 
                            className="btn btn-accept-all"
                            onClick={handleAcceptAll}
                        >
                            <i className="fas fa-check"></i>
                            Accept All
                        </button>
                        
                        <button 
                            className="btn btn-essential"
                            onClick={handleAcceptEssential}
                        >
                            Essential Only
                        </button>
                    </div>

                    <div className="secondary-actions">
                        {!showDetails ? (
                            <button 
                                className="btn btn-customize"
                                onClick={() => setShowDetails(true)}
                            >
                                <i className="fas fa-cog"></i>
                                Customize Settings
                            </button>
                        ) : (
                            <div className="customize-actions">
                                <button 
                                    className="btn btn-save"
                                    onClick={handleCustomize}
                                >
                                    <i className="fas fa-save"></i>
                                    Save Preferences
                                </button>
                                <button 
                                    className="btn btn-back"
                                    onClick={() => setShowDetails(false)}
                                >
                                    <i className="fas fa-arrow-left"></i>
                                    Back
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Links */}
                <div className="cookie-consent-footer">
                    <div className="footer-links">
                        <a href="#" className="footer-link">Privacy Policy</a>
                        <a href="#" className="footer-link">Cookie Policy</a>
                        <a href="#" className="footer-link">Data Protection</a>
                    </div>
                    <div className="gdpr-compliance">
                        <i className="fas fa-shield-check"></i>
                        GDPR Compliant
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
