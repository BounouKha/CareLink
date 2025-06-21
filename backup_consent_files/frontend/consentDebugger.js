/**
 * Debug utility to inspect cookie consent data
 * Use this in browser console for testing
 */

class ConsentDebugger {
    static inspectStorage() {
        console.log('🔍 Cookie Consent Storage Inspector');
        console.log('====================================');
        
        const key = 'carelink_consent_preferences';
        const stored = localStorage.getItem(key);
        
        if (!stored) {
            console.log('❌ No consent data found');
            return null;
        }
        
        try {
            const consent = JSON.parse(stored);
            
            console.log('✅ Consent Data Found:');
            console.log('├── Version:', consent.version);
            console.log('├── Given on:', new Date(consent.timestamp).toLocaleString());
            console.log('├── Expires on:', new Date(consent.expiryDate).toLocaleString());
            console.log('├── Days until expiry:', Math.ceil((new Date(consent.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)));
            console.log('└── Preferences:');
            
            Object.entries(consent.preferences).forEach(([key, value]) => {
                const icon = value ? '✅' : '❌';
                console.log(`    ${icon} ${key}: ${value}`);
            });
            
            console.log('\n📊 Storage Details:');
            console.log('├── Storage size:', new Blob([stored]).size, 'bytes');
            console.log('├── User agent (first 50 chars):', consent.userAgent?.substring(0, 50) + '...');
            console.log('└── IP disclaimer:', consent.ipDisclaimer);
            
            return consent;
        } catch (error) {
            console.error('❌ Error parsing consent data:', error);
            return null;
        }
    }
    
    static clearConsent() {
        localStorage.removeItem('carelink_consent_preferences');
        console.log('🗑️ Consent data cleared - banner will show on next page load');
    }
    
    static simulateExpiredConsent() {
        const stored = localStorage.getItem('carelink_consent_preferences');
        if (stored) {
            const consent = JSON.parse(stored);
            consent.expiryDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
            localStorage.setItem('carelink_consent_preferences', JSON.stringify(consent));
            console.log('⏰ Simulated expired consent - will be cleared on next check');
        }
    }
    
    static showAllLocalStorage() {
        console.log('🗄️ All CareLink localStorage:');
        Object.keys(localStorage).forEach(key => {
            if (key.includes('carelink') || key.includes('consent')) {
                const value = localStorage.getItem(key);
                const size = new Blob([value]).size;
                console.log(`├── ${key}: ${size} bytes`);
                
                if (key === 'carelink_consent_preferences') {
                    console.log('│   └── (Cookie consent data)');
                }
            }
        });
    }
}

// Make available globally for testing
window.ConsentDebugger = ConsentDebugger;

// Quick access functions
window.inspectConsent = () => ConsentDebugger.inspectStorage();
window.clearConsent = () => ConsentDebugger.clearConsent();
window.showAllStorage = () => ConsentDebugger.showAllLocalStorage();

export default ConsentDebugger;
