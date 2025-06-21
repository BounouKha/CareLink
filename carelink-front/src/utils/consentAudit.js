/**
 * Consent Audit Utility for Legal/Compliance Teams
 * Provides methods to export and verify consent data for GDPR compliance
 */

class ConsentAudit {
    /**
     * Export consent data in a format suitable for legal documentation
     */
    static exportConsentData() {
        const consent = localStorage.getItem('carelink_consent_preferences');
        if (!consent) {
            return {
                status: 'no_consent',
                message: 'No consent data found - user has not made consent choice',
                timestamp: new Date().toISOString()
            };
        }

        try {
            const data = JSON.parse(consent);
            const now = new Date();
            const expiry = new Date(data.expiryDate);
            const isExpired = expiry < now;

            return {
                status: isExpired ? 'expired' : 'valid',
                consentData: {
                    version: data.version,
                    givenOn: data.timestamp,
                    expiresOn: data.expiryDate,
                    daysRemaining: Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)),
                    preferences: data.preferences,
                    userAgent: data.userAgent?.substring(0, 100) + '...', // Truncated for privacy
                    pageUrl: data.pageUrl,
                    ipDisclaimer: data.ipDisclaimer
                },
                exportedOn: new Date().toISOString(),
                exportedBy: 'CareLink Consent Audit System'
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'Error reading consent data: ' + error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Generate a human-readable consent report
     */
    static generateConsentReport() {
        const audit = this.exportConsentData();
        
        if (audit.status === 'no_consent') {
            return `
📋 CARELINK CONSENT AUDIT REPORT
================================
Status: NO CONSENT DATA
Generated: ${audit.timestamp}

This user has not yet provided consent for cookie usage.
No tracking or non-essential cookies are active.
            `.trim();
        }

        if (audit.status === 'error') {
            return `
📋 CARELINK CONSENT AUDIT REPORT
================================
Status: ERROR
Generated: ${audit.timestamp}
Error: ${audit.message}
            `.trim();
        }

        const data = audit.consentData;
        const status = audit.status === 'expired' ? 'EXPIRED' : 'VALID';
        
        return `
📋 CARELINK CONSENT AUDIT REPORT
================================
Status: ${status}
Generated: ${audit.exportedOn}

CONSENT DETAILS:
├── Version: ${data.version}
├── Given on: ${new Date(data.givenOn).toLocaleString()}
├── Expires on: ${new Date(data.expiresOn).toLocaleString()}
└── Days remaining: ${data.daysRemaining}

COOKIE PREFERENCES:
├── Essential Cookies: ${data.preferences.essential ? 'ACCEPTED' : 'DENIED'}
├── Analytics Cookies: ${data.preferences.analytics ? 'ACCEPTED' : 'DENIED'}
├── Marketing Cookies: ${data.preferences.marketing ? 'ACCEPTED' : 'DENIED'}
└── Functional Cookies: ${data.preferences.functional ? 'ACCEPTED' : 'DENIED'}

TECHNICAL DETAILS:
├── Browser: ${data.userAgent}
├── Consent Page: ${data.pageUrl}
└── Privacy Note: ${data.ipDisclaimer}

This report serves as proof of user consent for GDPR compliance.
        `.trim();
    }

    /**
     * Download consent data as JSON file for records
     */
    static downloadConsentProof() {
        const audit = this.exportConsentData();
        const dataStr = JSON.stringify(audit, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `carelink-consent-proof-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    /**
     * Copy consent report to clipboard
     */
    static async copyReportToClipboard() {
        const report = this.generateConsentReport();
        try {
            await navigator.clipboard.writeText(report);
            console.log('✅ Consent report copied to clipboard');
            return true;
        } catch (error) {
            console.error('❌ Failed to copy to clipboard:', error);
            return false;
        }
    }
}

// Make available globally
window.ConsentAudit = ConsentAudit;

// Quick access functions
window.exportConsent = () => ConsentAudit.exportConsentData();
window.downloadConsentProof = () => ConsentAudit.downloadConsentProof();
window.copyConsentReport = () => ConsentAudit.copyReportToClipboard();

export default ConsentAudit;
