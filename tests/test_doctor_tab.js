// Test script to verify doctor tab logic
console.log("=== Testing Doctor Tab Logic ===");

// Mock user data for testing
const mockUserData = {
    user: {
        id: 1,
        role: 'Patient',
        email: 'test@example.com',
        firstname: 'John',
        lastname: 'Doe'
    },
    patient: {
        id: 1,
        doctor_name: 'Dr. Smith',
        doctor_phone: '+32 2 123 45 67',
        doctor_email: 'dr.smith@clinic.be',
        doctor_address: '123 Medical Street'
    }
};

// Test the tab logic
function getAvailableTabs(userData) {
    const userRole = userData?.user?.role;
    
    // Base tabs that all authenticated users can see
    const baseTabs = [
        { id: 'user', label: 'User Information', icon: '👤' }
    ];
    
    // If user has no role or role is null/undefined, only show user information
    if (!userRole || userRole === 'null' || userRole === 'undefined') {
        return baseTabs;
    }
    
    // Additional tabs for users with roles
    const additionalTabs = [];
    
    // Medical information for patients and healthcare providers
    if (['Patient', 'Provider', 'Family Patient'].includes(userRole)) {
        additionalTabs.push({ id: 'medical', label: 'Medical Information', icon: '🏥' });
    }
    
    // Family information for family patients
    if (userRole === 'Family Patient') {
        additionalTabs.push({ id: 'family', label: 'Family Information', icon: '👨‍👩‍👧‍👦' });
    }
    
    // Medical folder for patients
    if (['Patient', 'Family Patient'].includes(userRole)) {
        additionalTabs.push({ id: 'folder', label: 'Medical Folder', icon: '📁' });
    }
    
    // Doctor information for patients
    if (['Patient', 'Family Patient'].includes(userRole)) {
        additionalTabs.push({ id: 'doctor', label: 'Doctor Information', icon: '👨‍⚕️' });
    }
    
    // Contact information for all users with roles
    if (userRole) {
        additionalTabs.push({ id: 'contact', label: 'Contact Information', icon: '📞' });
    }
    
    return [...baseTabs, ...additionalTabs];
}

// Test different user roles
const testCases = [
    { role: 'Patient', expected: ['user', 'medical', 'folder', 'doctor', 'contact'] },
    { role: 'Family Patient', expected: ['user', 'medical', 'family', 'folder', 'doctor', 'contact'] },
    { role: 'Provider', expected: ['user', 'medical', 'contact'] },
    { role: 'Coordinator', expected: ['user', 'contact'] },
    { role: null, expected: ['user'] },
    { role: 'null', expected: ['user'] },
    { role: 'undefined', expected: ['user'] }
];

console.log("Testing tab logic for different user roles:");
testCases.forEach(testCase => {
    const mockData = {
        user: { role: testCase.role }
    };
    const tabs = getAvailableTabs(mockData);
    const tabIds = tabs.map(tab => tab.id);
    const hasDoctorTab = tabIds.includes('doctor');
    const expected = testCase.expected.includes('doctor');
    
    console.log(`  Role: ${testCase.role || 'null'}`);
    console.log(`    Available tabs: ${tabIds.join(', ')}`);
    console.log(`    Has doctor tab: ${hasDoctorTab} (expected: ${expected})`);
    console.log(`    ✓ ${hasDoctorTab === expected ? 'PASS' : 'FAIL'}`);
    console.log('');
});

// Test patient ID resolution
function getPatientId(userData, userRole) {
    if (userRole === 'Patient') {
        return userData?.patient?.id || userData?.user?.id;
    } else if (userRole === 'Family Patient') {
        const linkedPatient = userData?.linked_patients?.[0] || userData?.linked_patient;
        return linkedPatient?.id;
    }
    return null;
}

console.log("Testing patient ID resolution:");
const patientId = getPatientId(mockUserData, 'Patient');
console.log(`  Patient ID for Patient role: ${patientId}`);
console.log(`  ✓ ${patientId === 1 ? 'PASS' : 'FAIL'}`);

console.log("\n=== Test Complete ==="); 