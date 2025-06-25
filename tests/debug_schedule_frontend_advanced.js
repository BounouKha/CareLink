/**
 * Advanced Frontend Schedule Debug Script
 * 
 * Usage: Open browser console on your calendar page and paste this script
 * This will help diagnose why backend data (18 schedules) doesn't match frontend display
 */

console.log('🔍 Starting Advanced Schedule Frontend Debug...');

// 1. Check current date range being displayed
function checkDateRange() {
    console.log('\n📅 CHECKING DATE RANGE:');
    console.log('='.repeat(30));
    
    // Look for common date picker elements
    const dateInputs = document.querySelectorAll('input[type="date"], .date-picker, [class*="date"]');
    dateInputs.forEach((input, i) => {
        console.log(`Date Input ${i+1}:`, input.value || input.textContent);
    });
    
    // Check for week navigation
    const weekElements = document.querySelectorAll('[class*="week"], [class*="calendar-nav"]');
    weekElements.forEach((el, i) => {
        console.log(`Week Element ${i+1}:`, el.textContent?.trim());
    });
    
    // Check current URL for date parameters
    const urlParams = new URLSearchParams(window.location.search);
    console.log('URL Date Params:', Object.fromEntries(urlParams));
}

// 2. Intercept API calls
function interceptAPIRequests() {
    console.log('\n🌐 INTERCEPTING API REQUESTS:');
    console.log('='.repeat(35));
    
    // Store original fetch
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && (
            url.includes('schedule') || 
            url.includes('timeslot') || 
            url.includes('appointment') ||
            url.includes('calendar')
        )) {
            console.log('📡 API Request:', url);
            
            return originalFetch.apply(this, args)
                .then(response => {
                    const clonedResponse = response.clone();
                    clonedResponse.json().then(data => {
                        console.log('📥 API Response for', url, ':', data);
                        if (Array.isArray(data)) {
                            console.log(`   → Found ${data.length} items`);
                        }
                    }).catch(() => {
                        console.log('📥 API Response (non-JSON) for', url);
                    });
                    return response;
                });
        }
        return originalFetch.apply(this, args);
    };
    
    console.log('✅ API interception enabled. Navigate or refresh to see requests.');
}

// 3. Check Redux/State management
function checkAppState() {
    console.log('\n🗄️ CHECKING APP STATE:');
    console.log('='.repeat(25));
    
    // Check for common state management
    if (window.__REDUX_DEVTOOLS_EXTENSION__) {
        console.log('🔴 Redux DevTools detected - check Redux state');
    }
    
    // Look for React components
    const reactElements = document.querySelectorAll('[data-reactroot], [data-react-class]');
    if (reactElements.length > 0) {
        console.log('⚛️ React components detected:', reactElements.length);
    }
    
    // Check localStorage for schedule data
    Object.keys(localStorage).forEach(key => {
        if (key.toLowerCase().includes('schedule') || 
            key.toLowerCase().includes('calendar') ||
            key.toLowerCase().includes('timeslot')) {
            console.log(`🗃️ LocalStorage[${key}]:`, localStorage.getItem(key));
        }
    });
    
    // Check sessionStorage
    Object.keys(sessionStorage).forEach(key => {
        if (key.toLowerCase().includes('schedule') || 
            key.toLowerCase().includes('calendar') ||
            key.toLowerCase().includes('timeslot')) {
            console.log(`📝 SessionStorage[${key}]:`, sessionStorage.getItem(key));
        }
    });
}

// 4. Check DOM for schedule elements
function checkScheduleDOM() {
    console.log('\n🏗️ CHECKING SCHEDULE DOM:');
    console.log('='.repeat(28));
    
    // Look for calendar/schedule containers
    const scheduleContainers = document.querySelectorAll(
        '[class*="calendar"], [class*="schedule"], [class*="timeslot"], [class*="appointment"]'
    );
    
    console.log(`Found ${scheduleContainers.length} schedule-related DOM elements:`);
    scheduleContainers.forEach((el, i) => {
        console.log(`  ${i+1}. ${el.tagName}.${el.className}:`, {
            textContent: el.textContent?.substring(0, 100) + '...',
            children: el.children.length,
            style: el.style.display
        });
    });
    
    // Check for hidden elements
    const hiddenElements = document.querySelectorAll('[style*="display: none"], [hidden]');
    const hiddenScheduleElements = Array.from(hiddenElements).filter(el => 
        el.textContent?.includes('schedule') || 
        el.className?.includes('schedule') ||
        el.className?.includes('timeslot')
    );
    
    if (hiddenScheduleElements.length > 0) {
        console.log('👻 Hidden schedule elements found:', hiddenScheduleElements.length);
    }
}

// 5. Check for JavaScript errors
function checkForErrors() {
    console.log('\n❌ CHECKING FOR ERRORS:');
    console.log('='.repeat(25));
    
    // Override console.error to catch errors
    const originalError = console.error;
    console.error = function(...args) {
        if (args.some(arg => 
            typeof arg === 'string' && (
                arg.includes('schedule') || 
                arg.includes('timeslot') ||
                arg.includes('calendar')
            )
        )) {
            console.log('🚨 Schedule-related error:', ...args);
        }
        originalError.apply(console, args);
    };
    
    console.log('✅ Error monitoring enabled.');
}

// 6. Check user permissions and filters
function checkUserContext() {
    console.log('\n👤 CHECKING USER CONTEXT:');
    console.log('='.repeat(28));
    
    // Check for user info in DOM
    const userElements = document.querySelectorAll('[class*="user"], [class*="profile"], [data-user]');
    userElements.forEach((el, i) => {
        if (el.textContent?.trim()) {
            console.log(`User Element ${i+1}:`, el.textContent.trim().substring(0, 50));
        }
    });
    
    // Check for filter controls
    const filterElements = document.querySelectorAll('select, [class*="filter"], [class*="dropdown"]');
    console.log(`Filter controls found: ${filterElements.length}`);
    filterElements.forEach((el, i) => {
        if (el.value || el.selectedOptions?.length) {
            console.log(`  Filter ${i+1} (${el.tagName}):`, el.value || Array.from(el.selectedOptions).map(o => o.text));
        }
    });
}

// 7. Main execution
function runFullDiagnosis() {
    checkDateRange();
    checkAppState();
    checkScheduleDOM();
    checkUserContext();
    checkForErrors();
    interceptAPIRequests();
    
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('='.repeat(20));
    console.log('1. Check the date range - is it showing 2025-06-29 to 2025-07-05?');
    console.log('2. Watch for API requests when you navigate the calendar');
    console.log('3. Look for any JavaScript errors in the console');
    console.log('4. Check if any filters are applied that might hide schedules');
    console.log('5. Verify user permissions or role-based filtering');
    console.log('\n🔄 Try navigating to the week 2025-06-29 to 2025-07-05 and watch the console output.');
}

// Auto-run the diagnosis
runFullDiagnosis();

// Export functions for manual use
window.scheduleDebug = {
    checkDateRange,
    checkAppState,
    checkScheduleDOM,
    checkUserContext,
    runFullDiagnosis
};

console.log('\n✅ Debug script loaded! Functions available as window.scheduleDebug');
