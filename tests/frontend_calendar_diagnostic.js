/**
 * Frontend Calendar Data Diagnostic Test
 * 
 * Run this in your browser console while on the schedule calendar page
 * to diagnose data synchronization issues.
 * 
 * Usage:
 * 1. Open the schedule calendar page
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter to run
 */

(function() {
    console.log('🔍 Starting Calendar Data Diagnostic Test...');
    console.log('📅 Testing week: 29/06/2025 to 05/07/2025');
    
    // Helper function to format dates
    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    // Helper function to check if date is in target week
    function isInTargetWeek(dateStr) {
        const date = new Date(dateStr);
        const weekStart = new Date('2025-06-29');
        const weekEnd = new Date('2025-07-05');
        return date >= weekStart && date <= weekEnd;
    }
    
    // Test 1: Check what calendar data is currently loaded
    console.log('\n📊 TEST 1: Current Calendar Data');
    console.log('===============================');
    
    // Try to access calendar data from global scope or React state
    const calendarData = window.calendarData || window.scheduleData || [];
    console.log('Calendar data found:', calendarData.length, 'appointments');
    
    if (calendarData.length > 0) {
        console.log('Sample appointment:', calendarData[0]);
        
        // Filter for target week
        const weekAppointments = calendarData.filter(apt => 
            apt.date && isInTargetWeek(apt.date)
        );
        
        console.log(`Appointments in target week (29/06-05/07):`, weekAppointments.length);
        
        weekAppointments.forEach((apt, index) => {
            console.log(`  ${index + 1}. ${apt.date} | Patient: ${apt.patient || 'No Patient'} | Provider: ${apt.provider || 'Unknown'}`);
            if (apt.timeslots) {
                apt.timeslots.forEach((ts, i) => {
                    console.log(`     Timeslot ${i + 1}: ${ts.start_time}-${ts.end_time} (${ts.status || 'no status'})`);
                });
            }
        });
    }
    
    // Test 2: Make direct API calls to check backend data
    console.log('\n🌐 TEST 2: Direct API Data Check');
    console.log('=================================');
    
    async function testAPIData() {
        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            
            // Test schedule API
            console.log('Fetching schedule data from API...');
            const scheduleResponse = await fetch('http://localhost:8000/schedule/schedules/', {
                headers: headers
            });
            
            if (scheduleResponse.ok) {
                const scheduleData = await scheduleResponse.json();
                console.log('✅ Schedule API Response:', scheduleData.length, 'schedules');
                
                // Filter for target week
                const weekSchedules = scheduleData.filter(schedule => 
                    schedule.date && isInTargetWeek(schedule.date)
                );
                
                console.log(`📅 Schedules in target week:`, weekSchedules.length);
                
                // Analyze the data
                let totalTimeslots = 0;
                let blockedTimeCount = 0;
                
                weekSchedules.forEach((schedule, index) => {
                    const patientInfo = schedule.patient ? 
                        `${schedule.patient.firstname} ${schedule.patient.lastname}` : 
                        'Blocked Time';
                    
                    if (!schedule.patient) blockedTimeCount++;
                    
                    console.log(`  ${index + 1}. ${schedule.date} | ${patientInfo} | ${schedule.timeslots?.length || 0} timeslots`);
                    
                    if (schedule.timeslots) {
                        totalTimeslots += schedule.timeslots.length;
                        schedule.timeslots.forEach((ts, i) => {
                            console.log(`     ${ts.start_time}-${ts.end_time} | Service: ${ts.service?.name || 'None'} | Status: ${ts.status}`);
                        });
                    }
                });
                
                console.log(`\n📊 Week Summary:`);
                console.log(`   • Total schedules: ${weekSchedules.length}`);
                console.log(`   • Total timeslots: ${totalTimeslots}`);
                console.log(`   • Blocked time appointments: ${blockedTimeCount}`);
                
                // Check if this matches the user's observation
                if (totalTimeslots === 4) {
                    console.log('✅ This matches your observation of 4 busy timeslots!');
                } else {
                    console.log(`⚠️  Discrepancy: Found ${totalTimeslots} timeslots, but you reported 4`);
                }
                
            } else {
                console.log('❌ Failed to fetch schedule data:', scheduleResponse.status);
            }
            
            // Test service demands API
            console.log('\nFetching service demands data...');
            const demandsResponse = await fetch('http://localhost:8000/api/service-demands/', {
                headers: headers
            });
            
            if (demandsResponse.ok) {
                const demandsData = await demandsResponse.json();
                console.log('✅ Service Demands API Response:', demandsData.results?.length || demandsData.length || 0, 'demands');
                
                // Filter for pending demands
                const demands = demandsData.results || demandsData;
                const pendingDemands = demands.filter(demand => demand.status === 'pending');
                
                console.log(`📋 Pending demands: ${pendingDemands.length}`);
                
                pendingDemands.forEach((demand, index) => {
                    console.log(`  ${index + 1}. ${demand.title || 'No title'} | Patient: ${demand.patient?.firstname} ${demand.patient?.lastname} | Priority: ${demand.priority}`);
                });
                
                if (pendingDemands.length === 2) {
                    console.log('✅ This matches your observation of 2 pending demands!');
                } else {
                    console.log(`⚠️  Discrepancy: Found ${pendingDemands.length} pending demands, but you reported 2`);
                }
                
            } else {
                console.log('❌ Failed to fetch service demands:', demandsResponse.status);
            }
            
        } catch (error) {
            console.log('❌ Error during API test:', error);
        }
    }
    
    // Test 3: Check calendar filtering and display logic
    console.log('\n🎛️ TEST 3: Calendar Filtering Check');
    console.log('===================================');
    
    // Check current filter settings
    const providerFilter = document.querySelector('select[name="provider"], .provider-filter select');
    const statusFilter = document.querySelector('select[name="status"], .status-filter select');
    
    if (providerFilter) {
        console.log('Provider filter value:', providerFilter.value);
        if (providerFilter.value && providerFilter.value !== '' && providerFilter.value !== 'all') {
            console.log('⚠️  Provider filter is active - this might hide some appointments');
        }
    }
    
    if (statusFilter) {
        console.log('Status filter value:', statusFilter.value);
        if (statusFilter.value && statusFilter.value !== '' && statusFilter.value !== 'all') {
            console.log('⚠️  Status filter is active - this might hide some appointments');
        }
    }
    
    // Check current view
    const activeView = document.querySelector('.view-controls button.active');
    if (activeView) {
        console.log('Current view:', activeView.textContent);
    }
    
    // Test 4: Check for React/component state issues
    console.log('\n⚛️ TEST 4: React Component State Check');
    console.log('======================================');
    
    // Try to access React component data
    const reactRoot = document.querySelector('#root');
    if (reactRoot && reactRoot._reactInternalFiber) {
        console.log('React instance found, checking component state...');
        // This is a simplified check - actual implementation may vary
    } else {
        console.log('React instance not accessible from console');
    }
    
    // Check for any JavaScript errors in console
    console.log('\n🐛 TEST 5: Console Error Check');
    console.log('==============================');
    console.log('Check the console above for any red error messages that might indicate issues with:');
    console.log('• API authentication');
    console.log('• Data fetching failures');
    console.log('• Component rendering errors');
    console.log('• Network issues');
    
    // Run the API test
    testAPIData();
    
    // Test 6: Recommendations
    console.log('\n💡 TEST 6: Troubleshooting Recommendations');
    console.log('==========================================');
    console.log('Based on your observation (4 busy timeslots, 2 pending demands, nothing visible):');
    console.log('');
    console.log('Potential causes:');
    console.log('1. 🔍 Filters: Check if provider/status filters are hiding appointments');
    console.log('2. 📅 Date range: Verify the calendar is showing the correct week');
    console.log('3. 👤 Permissions: Check if you have access to view all appointments');
    console.log('4. 🔄 Cache: Try refreshing the page or clearing browser cache');
    console.log('5. 🌐 API issues: Check for failed network requests in Network tab');
    console.log('6. ⏰ Timezone: Verify timezone settings are correct');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check the API responses above');
    console.log('2. Clear all filters and refresh');
    console.log('3. Try switching calendar views (day/week/month)');
    console.log('4. Check browser Network tab for failed requests');
    
    console.log('\n✅ Diagnostic test completed!');
    console.log('Review the output above to identify potential issues.');
    
})();
