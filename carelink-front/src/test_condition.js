// Simple test to verify Family Patient role condition
const testUsers = [
    { id: 11, firstname: 'Sophia', lastname: 'Taylor', role: 'Family Patient' },
    { id: 19, firstname: 'Emma', lastname: 'White', role: 'Family Patient' },
    { id: 2, firstname: 'Jane', lastname: 'Smith', role: 'Patient' }
];

console.log('Testing Family Patient role condition:');
testUsers.forEach(user => {
    const isFamilyPatient = user.role === 'Family Patient';
    console.log(`${user.firstname} ${user.lastname} (${user.role}): ${isFamilyPatient}`);
});
