// Debug script to run in browser console
// This will help us track down the page refresh issue

console.log('🔧 JWT Debug Script Loaded');

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Create persistent log storage
window.authDebugLogs = window.authDebugLogs || [];

// Enhanced console logging that persists across page refreshes
console.log = function(...args) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type: 'log', args: args.map(arg => JSON.stringify(arg)) };
    window.authDebugLogs.push(logEntry);
    localStorage.setItem('authDebugLogs', JSON.stringify(window.authDebugLogs));
    originalConsoleLog.apply(console, args);
};

console.error = function(...args) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type: 'error', args: args.map(arg => JSON.stringify(arg)) };
    window.authDebugLogs.push(logEntry);
    localStorage.setItem('authDebugLogs', JSON.stringify(window.authDebugLogs));
    originalConsoleError.apply(console, args);
};

// Function to retrieve logs after page refresh
window.getAuthLogs = function() {
    const logs = localStorage.getItem('authDebugLogs');
    if (logs) {
        return JSON.parse(logs);
    }
    return [];
};

// Function to clear debug logs
window.clearAuthLogs = function() {
    window.authDebugLogs = [];
    localStorage.removeItem('authDebugLogs');
    console.log('🧹 Debug logs cleared');
};

// Function to display recent logs
window.showRecentLogs = function(count = 20) {
    const logs = window.getAuthLogs();
    const recentLogs = logs.slice(-count);
    console.log('📊 Recent Authentication Logs:');
    recentLogs.forEach(log => {
        const method = log.type === 'error' ? originalConsoleError : originalConsoleLog;
        method(`[${log.timestamp}] ${log.type.toUpperCase()}:`, ...log.args.map(arg => {
            try { return JSON.parse(arg); } catch { return arg; }
        }));
    });
};

// Monitor for page refresh and store state
window.addEventListener('beforeunload', function() {
    localStorage.setItem('authDebugPageRefresh', Date.now());
});

// Check if page was refreshed recently
const lastRefresh = localStorage.getItem('authDebugPageRefresh');
if (lastRefresh && (Date.now() - parseInt(lastRefresh)) < 5000) {
    console.log('🔄 Page was refreshed recently - showing logs from before refresh:');
    window.showRecentLogs();
}

console.log('🎯 Debug script ready. Use window.showRecentLogs() to see authentication logs after page refresh.');
