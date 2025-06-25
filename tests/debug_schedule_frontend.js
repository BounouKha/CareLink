/*
Frontend Schedule Data Debug Script
Copy and paste this into your browser console while on the schedule page
*/

console.log('🔍 Starting Schedule Data Debug...');

// Check if we're on the schedule page
if (!window.location.pathname.includes('schedule')) {
    console.warn('⚠️ Please navigate to the schedule page first');
}

// Function to analyze calendar data
function analyzeScheduleData() {
    // Look for React components and their data
    const reactRoot = document.querySelector('#root');
    if (reactRoot && reactRoot._reactInternalFiber) {
        console.log('📱 React app detected');
    }
    
    // Check local storage for cached data
    const keys = Object.keys(localStorage);
    const scheduleKeys = keys.filter(key => key.includes('schedule') || key.includes('appointment'));
    console.log('💾 Schedule-related localStorage keys:', scheduleKeys);
    
    scheduleKeys.forEach(key => {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            console.log(`📝 ${key}:`, data);
        } catch (e) {
            console.log(`📝 ${key}:`, localStorage.getItem(key));
        }
    });
    
    // Check for any schedule data in window object
    if (window.scheduleData) {
        console.log('📅 window.scheduleData:', window.scheduleData);
    }
    
    // Look for network requests
    console.log('🌐 Checking for schedule API calls...');
    
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        if (args[0].includes('schedule') || args[0].includes('appointment')) {
            console.log('🔄 Schedule API call:', args[0]);
        }
        return originalFetch.apply(this, args);
    };
    
    // Check for appointments in DOM
    const appointmentElements = document.querySelectorAll('[class*="appointment"], [class*="timeslot"], [class*="schedule"]');
    console.log(`📋 Found ${appointmentElements.length} appointment/schedule elements in DOM`);
    
    // Check for specific week data (June 29 - July 5)
    const weekStart = new Date('2025-06-29');
    const weekEnd = new Date('2025-07-05');
    console.log(`🗓️ Looking for data between ${weekStart.toDateString()} and ${weekEnd.toDateString()}`);
    
    // Check for any data attributes
    appointmentElements.forEach((el, index) => {
        if (index < 10) { // Limit to first 10 to avoid spam
            console.log(`📋 Element ${index}:`, {
                className: el.className,
                dataset: el.dataset,
                textContent: el.textContent.substring(0, 100)
            });
        }
    });
}

// Function to check browser console for errors
function checkConsoleErrors() {
    console.log('🔍 Check browser console for any errors related to:');
    console.log('   - Failed API requests to schedule endpoints');
    console.log('   - React component errors');
    console.log('   - Data parsing/formatting errors');
    console.log('   - Permission/authentication errors');
}

// Function to simulate API call
async function testScheduleAPI() {
    try {
        console.log('🔄 Testing schedule API directly...');
        const response = await fetch('/api/schedule/', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Schedule API response:', data);
            
            // Filter for the specific week
            if (data.results || data.appointments) {
                const appointments = data.results || data.appointments || data;
                const weekAppointments = appointments.filter(apt => {
                    const aptDate = new Date(apt.date);
                    return aptDate >= new Date('2025-06-29') && aptDate <= new Date('2025-07-05');
                });
                console.log(`📅 Appointments for week 29/06-05/07:`, weekAppointments);
            }
        } else {
            console.error('❌ Schedule API error:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('❌ Schedule API call failed:', error);
    }
}

// Run the analysis
analyzeScheduleData();
checkConsoleErrors();

// Test API (you may need to adjust the endpoint)
setTimeout(() => {
    testScheduleAPI();
}, 1000);

console.log('✅ Debug script completed! Check the output above for insights.');
console.log('💡 If you see data but it\'s not showing in the calendar, the issue is likely in the frontend rendering logic.');
console.log('💡 If you don\'t see data, the issue is likely in the backend API or database.');
