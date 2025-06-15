/**
 * Quick Authentication Test - Run this in browser console
 * Tests the JWT token authentication issue step by step
 */

console.log('🔧 Starting Quick Auth Test...');

// Step 1: Check current authentication state
console.log('1️⃣ Current Authentication State:');
console.log('tokenMigrationManager:', window.tokenMigrationManager);

if (window.tokenMigrationManager) {
    const isAuth = window.tokenMigrationManager.isAuthenticated();
    const accessToken = window.tokenMigrationManager.getAccessToken();
    const refreshToken = window.tokenMigrationManager.getRefreshToken();
    
    console.log('Is Authenticated:', isAuth);
    console.log('Access Token:', accessToken ? accessToken.substring(0, 30) + '...' : 'null');
    console.log('Refresh Token:', refreshToken ? refreshToken.substring(0, 30) + '...' : 'null');
    
    // Check cookies directly
    console.log('\n2️⃣ Cookie Check:');
    const cookies = document.cookie.split(';').map(c => c.trim());
    const carelinkCookies = cookies.filter(c => c.startsWith('carelink_'));
    console.log('CareLink Cookies:', carelinkCookies);
    
    // Check migration info
    console.log('\n3️⃣ Migration Info:');
    const migrationInfo = window.tokenMigrationManager.getMigrationInfo();
    console.log('Migration Info:', migrationInfo);
    
    // Manual test - try to set tokens and check
    console.log('\n4️⃣ Manual Token Test:');
    
    // If we have tokens but isAuthenticated is false, there's a bug
    if ((accessToken || refreshToken) && !isAuth) {
        console.error('🚨 BUG DETECTED: Tokens exist but isAuthenticated returns false');
        
        // Let's debug the enhanced token manager directly
        const manager = window.tokenMigrationManager.getCurrentManager();
        console.log('Current Manager:', manager);
        
        if (manager && manager.isAuthenticated) {
            const managerAuth = manager.isAuthenticated();
            console.log('Manager.isAuthenticated():', managerAuth);
            
            // Test token retrieval directly
            const managerAccess = manager.getAccessToken();
            const managerRefresh = manager.getRefreshToken();
            console.log('Manager Access Token:', managerAccess ? 'Present' : 'Missing');
            console.log('Manager Refresh Token:', managerRefresh ? 'Present' : 'Missing');
        }
    }
} else {
    console.error('❌ tokenMigrationManager not available');
}

console.log('🔧 Quick Auth Test Complete');
