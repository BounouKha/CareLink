/**
 * GDPR Consent Management for CareLink Healthcare
 * Manages user cookie consent preferences with healthcare compliance
 */

class ConsentManager {
    constructor() {
        this.storageKey = 'carelink_consent_preferences';
        this.consentVersion = '1.0'; // Track consent version for future updates
        this.consentExpiry = 365; // Days until consent expires (GDPR requirement)
    }

    /**
     * Get current consent preferences
     */
    getConsent() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) return null;

            const consent = JSON.parse(stored);
            
            // Check if consent is expired
            if (this.isConsentExpired(consent)) {
                this.clearConsent();
                return null;
            }

            // Check if consent version matches (for future updates)
            if (consent.version !== this.consentVersion) {
                this.clearConsent();
                return null;
            }

            return consent;
        } catch (error) {
            console.error('Error reading consent preferences:', error);
            return null;
        }
    }    /**
     * Set consent preferences (saves locally + sends to backend for audit)
     */
    async setConsent(preferences) {
        const consent = {
            version: this.consentVersion,
            timestamp: new Date().toISOString(),
            expiryDate: new Date(Date.now() + (this.consentExpiry * 24 * 60 * 60 * 1000)).toISOString(),
            preferences: {
                essential: true, // Always true - required for healthcare functionality
                analytics: preferences.analytics || false,
                functional: preferences.functional || false,
                marketing: preferences.marketing || false
            },
            userAgent: navigator.userAgent.substring(0, 100), // Limited info for audit
            ipDisclaimer: 'IP not stored for privacy protection'
        };

        try {
            // Save locally first (primary storage)
            localStorage.setItem(this.storageKey, JSON.stringify(consent));
            console.log('🍪 Consent preferences saved locally:', consent.preferences);
            
            // Send to backend for audit trail (best effort - don't fail if backend is down)
            try {
                await this.syncConsentToBackend(preferences);
                console.log('🍪 Consent synced to backend for audit');
            } catch (backendError) {
                console.warn('🍪 Backend sync failed (local consent still valid):', backendError.message);
            }
            
            return true;
        } catch (error) {
            console.error('Error saving consent preferences:', error);
            return false;
        }
    }

    /**
     * Sync consent to backend for audit trail
     */
    async syncConsentToBackend(preferences) {
        try {
            const response = await fetch('http://localhost:8000/account/consent/store/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Include auth token if user is logged in
                    ...(localStorage.getItem('accessToken') && {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    })
                },
                body: JSON.stringify({
                    analytics: preferences.analytics || false,
                    marketing: preferences.marketing || false,
                    functional: preferences.functional || false,
                    page_url: window.location.href,
                    user_agent: navigator.userAgent,
                    consent_method: 'banner'
                })
            });

            if (!response.ok) {
                throw new Error(`Backend sync failed: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.warn('Failed to sync consent to backend:', error);
            // Don't throw - local consent should still work
            return null;
        }
    }

    /**
     * Check if user has given consent for a specific category
     */
    hasConsent(category = 'essential') {
        const consent = this.getConsent();
        if (!consent) return category === 'essential'; // Essential cookies always allowed
        
        return consent.preferences[category] === true;
    }

    /**
     * Check if consent exists (user has made a choice)
     */
    hasValidConsent() {
        return this.getConsent() !== null;
    }

    /**
     * Clear all consent data
     */
    clearConsent() {
        localStorage.removeItem(this.storageKey);
        console.log('🍪 Consent preferences cleared');
    }

    /**
     * Check if consent is expired
     */
    isConsentExpired(consent) {
        if (!consent.expiryDate) return true;
        return new Date(consent.expiryDate) < new Date();
    }

    /**
     * Get consent summary for display
     */
    getConsentSummary() {
        const consent = this.getConsent();
        if (!consent) return null;

        return {
            granted: consent.timestamp,
            expires: consent.expiryDate,
            version: consent.version,
            categories: consent.preferences
        };
    }

    /**
     * Healthcare-specific: Check if medical cookies are allowed
     */
    canUseMedicalCookies() {
        // Medical cookies are always essential for healthcare functionality
        return true;
    }

    /**
     * GDPR: Update consent for specific category
     */
    updateConsent(category, value) {
        const current = this.getConsent();
        if (!current) {
            // If no consent exists, create new one
            return this.setConsent({ [category]: value });
        }

        // Update specific category
        current.preferences[category] = value;
        current.timestamp = new Date().toISOString(); // Update timestamp
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(current));
            console.log(`🍪 Updated consent for ${category}:`, value);
            return true;
        } catch (error) {
            console.error('Error updating consent:', error);
            return false;
        }
    }

    /**
     * Get consent history from backend (for logged-in users)
     */
    async getConsentHistory() {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                return null; // Only works for authenticated users
            }

            const response = await fetch('http://localhost:8000/account/consent/history/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch consent history: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching consent history:', error);
            return null;
        }
    }

    /**
     * Withdraw consent (GDPR right)
     */
    async withdrawConsent(reason = 'User requested withdrawal') {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('Must be logged in to withdraw consent');
            }

            const response = await fetch('http://localhost:8000/account/consent/withdraw/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            if (!response.ok) {
                throw new Error(`Failed to withdraw consent: ${response.status}`);
            }

            // Also clear local consent
            this.clearConsent();
            
            return await response.json();
        } catch (error) {
            console.error('Error withdrawing consent:', error);
            throw error;
        }
    }

    /**
     * Get consent categories with descriptions
     */
    getConsentCategories() {
        return {
            essential: {
                name: 'Essential',
                description: 'Required for healthcare services, authentication, and security',
                required: true,
                examples: ['Login sessions', 'Security tokens', 'Medical data protection']
            },
            analytics: {
                name: 'Analytics', 
                description: 'Help us improve our healthcare services',
                required: false,
                examples: ['Page performance', 'Error tracking', 'Usage statistics']
            },            preferences: {
                name: 'Functional',
                description: 'Remember your settings and preferences',
                required: false,
                examples: ['Language settings', 'UI preferences', 'Accessibility options']
            },
            marketing: {
                name: 'Marketing',
                description: 'Health tips and service updates (optional)',
                required: false,
                examples: ['Health newsletters', 'Service announcements', 'Wellness tips']
            }
        };
    }
}

// Create singleton instance
const consentManager = new ConsentManager();

export default consentManager;

// Export utility functions
export const hasConsent = (category) => consentManager.hasConsent(category);
export const hasValidConsent = () => consentManager.hasValidConsent();
export const setConsent = (preferences) => consentManager.setConsent(preferences);
export const clearConsent = () => consentManager.clearConsent();
export const getConsentHistory = () => consentManager.getConsentHistory();
export const withdrawConsent = (reason) => consentManager.withdrawConsent(reason);
