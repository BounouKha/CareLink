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
     * Set consent preferences (saves locally, sends to backend only if authenticated)
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
            // Always save locally first (primary storage)
            localStorage.setItem(this.storageKey, JSON.stringify(consent));
            console.log('🍪 Consent preferences saved locally:', consent.preferences);
            
            // Only send to backend if user is authenticated
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    await this.syncConsentToBackend(preferences);
                    console.log('🍪 Consent synced to backend for authenticated user');
                } catch (backendError) {
                    console.warn('🍪 Backend sync failed (local consent still valid):', backendError.message);
                }
            } else {
                console.log('🍪 Anonymous user - consent stored locally only');
            }
            
            return true;
        } catch (error) {
            console.error('Error saving consent preferences:', error);
            return false;
        }
    }/**
     * Sync consent to backend for audit trail
     */
    async syncConsentToBackend(preferences) {
        try {
            // Generate anonymous identifier if user not logged in
            const anonymousId = this.getOrCreateAnonymousId();
            
            const response = await fetch('http://localhost:8000/account/consent/storage/', {
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
                    consent_method: 'banner',
                    anonymous_id: anonymousId // Include anonymous ID for later linking
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
    }    /**
     * Check if consent exists locally (user has made a choice) - SYNC VERSION
     */
    hasLocalConsent() {
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

    /**
     * Get or create anonymous identifier for consent tracking
     */
    getOrCreateAnonymousId() {
        const anonymousKey = 'carelink_anonymous_consent_id';
        let anonymousId = localStorage.getItem(anonymousKey);
        
        if (!anonymousId) {
            // Generate a unique anonymous ID (not personally identifiable)
            anonymousId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(anonymousKey, anonymousId);
        }
        
        return anonymousId;
    }

    /**
     * Check backend consent status for authenticated users
     */
    async checkBackendConsentStatus() {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return null;

            const response = await fetch('http://localhost:8000/account/consent/status/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) return null;

            const data = await response.json();
            return data;
        } catch (error) {
            console.warn('Failed to check backend consent status:', error);
            return null;
        }
    }    /**
     * Check if user needs to give consent
     * - Anonymous users: Check localStorage only
     * - Logged-in users: Check if backend consent is active
     */
    async hasValidConsent() {
        try {
            // Always check local consent first
            const localConsent = this.getConsent();
            
            // If user is not authenticated, local consent is sufficient
            const token = localStorage.getItem('accessToken');
            if (!token) {
                if (!localConsent) {
                    console.log('🍪 Anonymous user - no local consent found');
                    return false;
                }
                console.log('🍪 Anonymous user with valid local consent');
                return true;
            }
            
            // For authenticated users, check backend status
            try {
                const backendStatus = await this.checkBackendConsentStatus();
                
                if (!backendStatus) {
                    // No backend record - check if we have local consent to sync
                    if (localConsent) {
                        console.log('🍪 No backend record but local consent exists - user needs to re-consent');
                        return false; // Force re-consent to sync with backend
                    }
                    console.log('🍪 No backend record and no local consent');
                    return false;
                }
                
                // Check backend status
                if (backendStatus.status === 'active' && backendStatus.has_consent) {
                    console.log('🍪 Authenticated user with active backend consent');
                    return true;
                }
                
                if (backendStatus.status === 'withdrawn') {
                    console.log('🍪 Backend consent was withdrawn - clearing local consent');
                    this.clearConsent(); // Clear stale local consent
                    return false;
                }
                
                if (backendStatus.status === 'expired') {
                    console.log('🍪 Backend consent expired - clearing local consent');
                    this.clearConsent(); // Clear expired local consent
                    return false;
                }
                
                if (backendStatus.status === 'no_consent') {
                    console.log('🍪 No backend consent record found');
                    return false;
                }
                
                // Default: no valid consent
                console.log('🍪 Backend status unclear, requiring new consent:', backendStatus.status);
                return false;
                
            } catch (backendError) {
                console.warn('🍪 Could not check backend status, using local consent:', backendError);
                // If backend check fails but we have local consent, allow it
                return localConsent !== null;
            }
        } catch (error) {
            console.error('🍪 Error in hasValidConsent:', error);
            return false;
        }
    }

    /**
     * Sync localStorage consent to backend when user logs in
     */
    async syncLocalConsentOnLogin() {
        try {
            const localConsent = this.getConsent();
            if (!localConsent) {
                console.log('🍪 No local consent to sync');
                return false;
            }

            // Sync the local preferences to backend
            await this.syncConsentToBackend(localConsent.preferences);
            console.log('🍪 Local consent synced to backend after login');
            return true;
        } catch (error) {
            console.warn('🍪 Failed to sync local consent on login:', error);
            return false;
        }
    }
}

// Create singleton instance
const consentManager = new ConsentManager();

export default consentManager;

// Export utility functions
export const hasConsent = (category) => consentManager.hasConsent(category);
export const hasValidConsent = () => consentManager.hasValidConsent(); // Returns Promise
export const setConsent = (preferences) => consentManager.setConsent(preferences);
export const clearConsent = () => consentManager.clearConsent();
export const getConsentHistory = () => consentManager.getConsentHistory();
export const withdrawConsent = (reason) => consentManager.withdrawConsent(reason);
